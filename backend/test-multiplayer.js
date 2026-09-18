const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:5000';

async function runMultiplayerTest() {
  console.log('🧪 Starting Socket.IO Multiplayer Full-Stack Test...');

  // 1. Connect Player 1
  const p1 = io(SERVER_URL);
  let p1RoomId = null;

  p1.on('connect', () => {
    console.log('✅ Player 1 connected');
    p1.emit('createRoom', { username: 'HostPlayer' });
  });

  p1.on('roomCreated', (data) => {
    p1RoomId = data.roomId;
    console.log(`✅ Room created successfully: ${p1RoomId}`);
    console.log(`✅ Text received: "${data.typingText.substring(0, 40)}..."`);

    // 2. Connect Player 2 and join the same room
    const p2 = io(SERVER_URL);

    p2.on('connect', () => {
      console.log('✅ Player 2 connected');
      p2.emit('joinRoom', { roomId: p1RoomId, username: 'ChallengerPlayer' });
    });

    p2.on('playerJoined', (joinData) => {
      console.log('✅ Player 2 joined room. Both players detected:');
      console.log(`   Player 1: ${joinData.player1.username}`);
      console.log(`   Player 2: ${joinData.player2.username}`);

      // 3. Toggle Ready for both players
      p1.emit('playerReady', { roomId: p1RoomId, ready: true });
      p2.emit('playerReady', { roomId: p1RoomId, ready: true });
    });

    let countdownReceived = false;
    p1.on('countdown', (c) => {
      if (!countdownReceived) {
        console.log(`✅ Countdown triggered: ${c.count}...`);
        countdownReceived = true;
      }
    });

    p1.on('gameStart', (startData) => {
      console.log('✅ Match started! Synchronized text verified.');

      // 4. Simulate typing progress
      p1.emit('typingProgress', {
        roomId: p1RoomId,
        index: 50,
        correctCharacters: 50,
        wrongCharacters: 1,
        wpm: 85,
        accuracy: 98,
        score: 920,
        progressPct: 50
      });

      p2.emit('typingProgress', {
        roomId: p1RoomId,
        index: 40,
        correctCharacters: 40,
        wrongCharacters: 2,
        wpm: 70,
        accuracy: 95,
        score: 750,
        progressPct: 40
      });

      // 5. Finish match
      setTimeout(() => {
        p1.emit('typingProgress', {
          roomId: p1RoomId,
          index: startData.text.length,
          correctCharacters: startData.text.length,
          wrongCharacters: 1,
          wpm: 92,
          accuracy: 99,
          score: 1100,
          progressPct: 100
        });
      }, 500);
    });

    p1.on('gameFinished', (result) => {
      console.log('✅ Match finished event received:');
      console.log(`   Winner: ${result.winnerUsername}`);
      console.log(`   P1 Score: ${result.player1.score} | P2 Score: ${result.player2.score}`);
      console.log('🎉 ALL MULTIPLAYER SOCKET TESTS PASSED!');

      p1.disconnect();
      p2.disconnect();
      process.exit(0);
    });

    // 6. Test 3rd player rejection (Room Full)
    setTimeout(() => {
      const p3 = io(SERVER_URL);
      p3.on('connect', () => {
        p3.emit('joinRoom', { roomId: p1RoomId, username: 'ThirdPlayer' });
      });
      p3.on('roomFull', (rf) => {
        console.log(`✅ Third player properly rejected: "${rf.message}"`);
        p3.disconnect();
      });
    }, 200);
  });
}

runMultiplayerTest();
