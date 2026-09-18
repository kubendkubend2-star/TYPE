const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const User = require('../models/User');
const { optionalAuth, requireAuth } = require('../middleware/authMiddleware');

// 1. SAVE GAME RESULT
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      gameId,
      gameMode = 'solo',
      player1,
      player2,
      winner,
      text,
      player1WPM = 0,
      player2WPM = 0,
      player1Accuracy = 100,
      player2Accuracy = 100,
      player1Score = 0,
      player2Score = 0,
      player1CorrectCharacters = 0,
      player1WrongCharacters = 0,
      player2CorrectCharacters = 0,
      player2WrongCharacters = 0,
      duration = 60
    } = req.body;

    if (!gameId || !player1 || !player2 || !winner || !text) {
      return res.status(400).json({ success: false, message: 'Incomplete game match data.' });
    }

    // Check duplicate submission
    const existing = await Game.findOne({ gameId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Game result already recorded.', game: existing });
    }

    // Resolve Player 1 user if authenticated
    const p1UserId = req.user ? req.user._id : (player1.userId || null);
    const p1Username = req.user ? req.user.username : (player1.username || 'Player 1');
    const p1Photo = req.user ? req.user.profilePicture : (player1.profilePicture || '');

    const game = new Game({
      gameId,
      gameMode,
      winner,
      text,
      player1: {
        userId: p1UserId,
        username: p1Username,
        profilePicture: p1Photo
      },
      player2: {
        userId: player2.userId || null,
        username: player2.username || 'Opponent',
        isAI: Boolean(player2.isAI),
        aiDifficulty: player2.aiDifficulty || null
      },
      player1WPM: Math.round(player1WPM),
      player2WPM: Math.round(player2WPM),
      player1Accuracy: Math.round(player1Accuracy * 10) / 10,
      player2Accuracy: Math.round(player2Accuracy * 10) / 10,
      player1Score: Math.round(player1Score),
      player2Score: Math.round(player2Score),
      player1CorrectCharacters: Math.round(player1CorrectCharacters),
      player1WrongCharacters: Math.round(player1WrongCharacters),
      player2CorrectCharacters: Math.round(player2CorrectCharacters),
      player2WrongCharacters: Math.round(player2WrongCharacters),
      duration: Math.round(duration)
    });

    await game.save();

    // Update Player 1 statistics in User model if registered
    if (p1UserId) {
      const user = await User.findById(p1UserId);
      if (user) {
        user.totalGames += 1;
        if (winner === 'player1' || winner === user.username) {
          user.wins += 1;
        } else if (winner === 'player2' || (winner !== 'tie' && winner !== user.username)) {
          user.losses += 1;
        }

        user.bestWPM = Math.max(user.bestWPM, Math.round(player1WPM));
        user.bestAccuracy = Math.max(user.bestAccuracy, Math.round(player1Accuracy * 10) / 10);
        user.totalScore += Math.round(player1Score);
        await user.save();
      }
    }

    // If player 2 is also a registered user (PvP mode)
    if (player2.userId) {
      const p2User = await User.findById(player2.userId);
      if (p2User) {
        p2User.totalGames += 1;
        if (winner === 'player2' || winner === p2User.username) {
          p2User.wins += 1;
        } else if (winner === 'player1' || (winner !== 'tie' && winner !== p2User.username)) {
          p2User.losses += 1;
        }

        p2User.bestWPM = Math.max(p2User.bestWPM, Math.round(player2WPM));
        p2User.bestAccuracy = Math.max(p2User.bestAccuracy, Math.round(player2Accuracy * 10) / 10);
        p2User.totalScore += Math.round(player2Score);
        await p2User.save();
      }
    }

    res.status(201).json({ success: true, game });
  } catch (err) {
    console.error('Error recording game result:', err);
    res.status(500).json({ success: false, message: 'Server error while saving game result.' });
  }
});

// 2. GET RECENT GAME HISTORY FOR AUTHENTICATED USER
router.get('/history', requireAuth, async (req, res) => {
  try {
    const games = await Game.find({
      $or: [
        { 'player1.userId': req.user._id },
        { 'player2.userId': req.user._id },
        { 'player1.username': req.user.username },
        { 'player2.username': req.user.username }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, games });
  } catch (err) {
    console.error('Error fetching game history:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving match history.' });
  }
});

module.exports = router;
