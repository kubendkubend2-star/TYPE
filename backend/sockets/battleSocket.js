const BattleRoom = require('../models/BattleRoom');
const Game = require('../models/Game');
const User = require('../models/User');
const { getRandomPassage, generateRoomId } = require('../utils/textGenerator');
const { calculateWPM, calculateAccuracy, calculateScore, determineWinner } = require('../utils/scoring');

// In-memory active rooms for low-latency real-time updates
const activeRooms = new Map();

function initBattleSockets(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // 1. CREATE ROOM
    socket.on('createRoom', async (data) => {
      try {
        const { username = 'Player 1', userId = null, profilePicture = '' } = data || {};
        let roomId = generateRoomId();

        // Ensure uniqueness
        while (activeRooms.has(roomId) || (await BattleRoom.findOne({ roomId, status: 'WAITING' }))) {
          roomId = generateRoomId();
        }

        const typingText = getRandomPassage();

        const roomData = {
          roomId,
          status: 'WAITING',
          typingText,
          duration: 60,
          timerInterval: null,
          timeRemaining: 60,
          createdAt: Date.now(),
          player1: {
            socketId: socket.id,
            userId,
            username: username || 'Player 1',
            profilePicture: profilePicture || '',
            ready: false,
            progress: 0,
            wpm: 0,
            accuracy: 100,
            score: 0,
            correctCharacters: 0,
            wrongCharacters: 0,
            finished: false,
            finishTime: null
          },
          player2: null
        };

        activeRooms.set(roomId, roomData);
        socket.join(roomId);
        socket.roomId = roomId;

        // Persist room to DB
        const dbRoom = new BattleRoom({
          roomId,
          status: 'WAITING',
          typingText,
          player1: {
            socketId: socket.id,
            userId,
            username: roomData.player1.username,
            profilePicture: roomData.player1.profilePicture
          }
        });
        await dbRoom.save().catch((err) => console.warn('Room DB save warn:', err.message));

        socket.emit('roomCreated', {
          roomId,
          typingText,
          player1: roomData.player1
        });

        console.log(`🎮 Room ${roomId} created by ${username} (${socket.id})`);
      } catch (err) {
        console.error('Error creating room:', err);
        socket.emit('roomError', { message: 'Failed to create room.' });
      }
    });

    // 2. JOIN ROOM
    socket.on('joinRoom', async (data) => {
      try {
        const { roomId: rawRoomId, username = 'Player 2', userId = null, profilePicture = '' } = data || {};
        if (!rawRoomId) {
          return socket.emit('roomError', { message: 'Please provide a valid room code.' });
        }

        const roomId = rawRoomId.trim().toUpperCase();
        let room = activeRooms.get(roomId);

        // Fallback: check DB if room exists
        if (!room) {
          const dbRoom = await BattleRoom.findOne({ roomId });
          if (dbRoom && dbRoom.status === 'WAITING') {
            room = {
              roomId: dbRoom.roomId,
              status: dbRoom.status,
              typingText: dbRoom.typingText,
              duration: 60,
              timerInterval: null,
              timeRemaining: 60,
              createdAt: Date.now(),
              player1: {
                socketId: dbRoom.player1.socketId,
                userId: dbRoom.player1.userId,
                username: dbRoom.player1.username,
                profilePicture: dbRoom.player1.profilePicture,
                ready: false,
                progress: 0,
                wpm: 0,
                accuracy: 100,
                score: 0,
                correctCharacters: 0,
                wrongCharacters: 0,
                finished: false,
                finishTime: null
              },
              player2: null
            };
            activeRooms.set(roomId, room);
          }
        }

        if (!room) {
          return socket.emit('roomError', { message: `Battle room ${roomId} was not found or has expired.` });
        }

        // Check if room already has 2 players
        if (room.player1 && room.player2 && room.player1.socketId !== socket.id && room.player2.socketId !== socket.id) {
          return socket.emit('roomFull', {
            message: 'This battle already has two players.',
            roomId
          });
        }

        // Prevent joining an in-progress or finished game
        if (room.status !== 'WAITING' && room.status !== 'READY') {
          return socket.emit('roomError', { message: 'This battle has already started or ended.' });
        }

        // Attach Player 2
        room.player2 = {
          socketId: socket.id,
          userId,
          username: username || 'Player 2',
          profilePicture: profilePicture || '',
          ready: false,
          progress: 0,
          wpm: 0,
          accuracy: 100,
          score: 0,
          correctCharacters: 0,
          wrongCharacters: 0,
          finished: false,
          finishTime: null
        };

        socket.join(roomId);
        socket.roomId = roomId;

        // Update DB
        await BattleRoom.updateOne(
          { roomId },
          {
            player2: {
              socketId: socket.id,
              userId,
              username: room.player2.username,
              profilePicture: room.player2.profilePicture
            }
          }
        ).catch((err) => console.warn('Room DB update warn:', err.message));

        console.log(`🤝 ${username} joined Room ${roomId}`);

        // Broadcast to both players
        io.to(roomId).emit('playerJoined', {
          roomId,
          typingText: room.typingText,
          player1: room.player1,
          player2: room.player2
        });
      } catch (err) {
        console.error('Error joining room:', err);
        socket.emit('roomError', { message: 'Failed to join battle room.' });
      }
    });

    // 3. PLAYER READY TOGGLE
    socket.on('playerReady', async (data) => {
      try {
        const { roomId, ready = true } = data || {};
        const room = activeRooms.get(roomId);
        if (!room) return;

        if (room.player1 && room.player1.socketId === socket.id) {
          room.player1.ready = ready;
        } else if (room.player2 && room.player2.socketId === socket.id) {
          room.player2.ready = ready;
        }

        io.to(roomId).emit('playerReadyStatus', {
          player1Ready: room.player1 ? room.player1.ready : false,
          player2Ready: room.player2 ? room.player2.ready : false
        });

        // If both players are present and ready, start countdown!
        if (room.player1 && room.player2 && room.player1.ready && room.player2.ready && room.status === 'WAITING') {
          room.status = 'READY';
          io.to(roomId).emit('bothPlayersReady');

          let count = 3;
          const countdownInterval = setInterval(() => {
            io.to(roomId).emit('countdown', { count });
            count--;

            if (count < 0) {
              clearInterval(countdownInterval);
              startGame(io, room);
            }
          }, 1000);
        }
      } catch (err) {
        console.error('Error handling ready state:', err);
      }
    });

    // 4. TYPING PROGRESS UPDATE
    socket.on('typingProgress', (data) => {
      try {
        const { roomId, index, correctCharacters, wrongCharacters, wpm, accuracy, score, progressPct } = data || {};
        const room = activeRooms.get(roomId);
        if (!room || room.status !== 'PLAYING') return;

        let isPlayer1 = room.player1 && room.player1.socketId === socket.id;
        let player = isPlayer1 ? room.player1 : (room.player2 && room.player2.socketId === socket.id ? room.player2 : null);

        if (!player) return;

        player.progress = Math.min(100, Math.max(0, progressPct || 0));
        player.correctCharacters = correctCharacters || 0;
        player.wrongCharacters = wrongCharacters || 0;
        player.wpm = wpm || 0;
        player.accuracy = accuracy || 100;
        player.score = score || 0;

        // Broadcast to other player in room
        socket.to(roomId).emit('opponentProgress', {
          isPlayer1,
          progress: player.progress,
          wpm: player.wpm,
          accuracy: player.accuracy,
          score: player.score
        });

        // Check if finished
        if (index >= room.typingText.length && !player.finished) {
          player.finished = true;
          player.finishTime = 60 - room.timeRemaining;

          socket.to(roomId).emit('opponentFinished', {
            isPlayer1,
            finishTime: player.finishTime,
            score: player.score
          });

          // Check if match should end now
          if (room.player1.finished && room.player2.finished) {
            finishMatch(io, room, 'Both players finished');
          } else {
            // First player to finish: give opponent 5 second buffer or finish
            setTimeout(() => {
              if (room.status === 'PLAYING') {
                finishMatch(io, room, 'Time expired after first completion');
              }
            }, 5000);
          }
        }
      } catch (err) {
        console.error('Error handling typing progress:', err);
      }
    });

    // 5. PLAYER MANUAL LEAVE / CANCEL
    socket.on('leaveRoom', () => {
      handlePlayerLeave(io, socket);
    });

    // 6. DISCONNECT
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      handlePlayerLeave(io, socket);
    });
  });
}

function startGame(io, room) {
  room.status = 'PLAYING';
  room.timeRemaining = 60;
  room.startedAt = Date.now();

  io.to(room.roomId).emit('gameStart', {
    startTime: room.startedAt,
    duration: 60,
    text: room.typingText
  });

  // Server-authoritative 60-second timer
  room.timerInterval = setInterval(() => {
    room.timeRemaining--;

    io.to(room.roomId).emit('timerUpdate', {
      timeRemaining: room.timeRemaining
    });

    if (room.timeRemaining <= 0) {
      clearInterval(room.timerInterval);
      finishMatch(io, room, 'Time up');
    }
  }, 1000);
}

async function finishMatch(io, room, reason = 'Complete') {
  if (room.status === 'FINISHED') return;
  room.status = 'FINISHED';

  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  const p1 = room.player1 || {};
  const p2 = room.player2 || {};

  // Server authoritative winner
  const winnerSide = determineWinner(p1, p2);
  const winnerUsername = winnerSide === 'player1' ? p1.username : p2.username;

  const matchResult = {
    roomId: room.roomId,
    reason,
    winner: winnerSide,
    winnerUsername,
    player1: {
      username: p1.username,
      wpm: p1.wpm || 0,
      accuracy: p1.accuracy || 100,
      correctCharacters: p1.correctCharacters || 0,
      wrongCharacters: p1.wrongCharacters || 0,
      score: p1.score || 0,
      finished: p1.finished || false
    },
    player2: {
      username: p2.username,
      wpm: p2.wpm || 0,
      accuracy: p2.accuracy || 100,
      correctCharacters: p2.correctCharacters || 0,
      wrongCharacters: p2.wrongCharacters || 0,
      score: p2.score || 0,
      finished: p2.finished || false
    }
  };

  io.to(room.roomId).emit('gameFinished', matchResult);

  // Save to MongoDB asynchronously
  try {
    const game = new Game({
      gameId: `pvp_${room.roomId}_${Date.now()}`,
      gameMode: 'pvp',
      winner: winnerUsername,
      text: room.typingText,
      player1: {
        userId: p1.userId || null,
        username: p1.username,
        profilePicture: p1.profilePicture || ''
      },
      player2: {
        userId: p2.userId || null,
        username: p2.username,
        isAI: false
      },
      player1WPM: p1.wpm || 0,
      player2WPM: p2.wpm || 0,
      player1Accuracy: p1.accuracy || 100,
      player2Accuracy: p2.accuracy || 100,
      player1Score: p1.score || 0,
      player2Score: p2.score || 0,
      player1CorrectCharacters: p1.correctCharacters || 0,
      player1WrongCharacters: p1.wrongCharacters || 0,
      player2CorrectCharacters: p2.correctCharacters || 0,
      player2WrongCharacters: p2.wrongCharacters || 0,
      duration: 60 - (room.timeRemaining || 0)
    });
    await game.save();

    // Update user stats
    if (p1.userId) {
      await User.findByIdAndUpdate(p1.userId, {
        $inc: {
          totalGames: 1,
          wins: winnerSide === 'player1' ? 1 : 0,
          losses: winnerSide === 'player2' ? 1 : 0,
          totalScore: p1.score || 0
        },
        $max: {
          bestWPM: p1.wpm || 0,
          bestAccuracy: p1.accuracy || 100
        }
      });
    }

    if (p2.userId) {
      await User.findByIdAndUpdate(p2.userId, {
        $inc: {
          totalGames: 1,
          wins: winnerSide === 'player2' ? 1 : 0,
          losses: winnerSide === 'player1' ? 1 : 0,
          totalScore: p2.score || 0
        },
        $max: {
          bestWPM: p2.wpm || 0,
          bestAccuracy: p2.accuracy || 100
        }
      });
    }

    // Update BattleRoom
    await BattleRoom.updateOne(
      { roomId: room.roomId },
      {
        status: 'FINISHED',
        winner: winnerUsername,
        finishedAt: Date.now()
      }
    );
  } catch (err) {
    console.error('Error persisting PvP match to DB:', err);
  }
}

function handlePlayerLeave(io, socket) {
  const roomId = socket.roomId;
  if (!roomId) return;

  const room = activeRooms.get(roomId);
  if (!room) return;

  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  const isPlayer1 = room.player1 && room.player1.socketId === socket.id;
  const leavingUser = isPlayer1 ? room.player1.username : (room.player2 ? room.player2.username : 'A player');

  // Notify the remaining player
  socket.to(roomId).emit('playerDisconnected', {
    message: `${leavingUser} disconnected from the battle.`,
    roomId
  });

  room.status = 'CANCELLED';
  activeRooms.delete(roomId);

  BattleRoom.updateOne({ roomId }, { status: 'CANCELLED' }).catch(() => {});
}

module.exports = {
  initBattleSockets
};
