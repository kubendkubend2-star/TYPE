const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const User = require('../models/User');

async function getLeaderboardData(timeframe) {
  let dateFilter = null;
  const now = new Date();

  if (timeframe === 'today') {
    dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeframe === 'week') {
    dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  if (timeframe === 'all-time' || !dateFilter) {
    // Return top users ranked by highest WPM and total score
    const topUsers = await User.find({ totalGames: { $gt: 0 } })
      .sort({ bestWPM: -1, totalScore: -1 })
      .limit(30)
      .select('username profilePicture bestWPM bestAccuracy totalScore wins totalGames');

    if (topUsers.length > 0) {
      return topUsers.map((u, index) => ({
        rank: index + 1,
        username: u.username,
        profilePicture: u.profilePicture,
        wpm: u.bestWPM,
        accuracy: u.bestAccuracy,
        score: u.totalScore,
        wins: u.wins,
        totalGames: u.totalGames
      }));
    }
  }

  // Aggregate from Games within dateFilter
  const matchStage = dateFilter ? { createdAt: { $gte: dateFilter } } : {};

  const pipeline = [
    { $match: matchStage },
    {
      $project: {
        records: [
          {
            username: '$player1.username',
            profilePicture: '$player1.profilePicture',
            wpm: '$player1WPM',
            accuracy: '$player1Accuracy',
            score: '$player1Score'
          },
          {
            username: '$player2.username',
            profilePicture: '',
            wpm: '$player2WPM',
            accuracy: '$player2Accuracy',
            score: '$player2Score',
            isAI: '$player2.isAI'
          }
        ]
      }
    },
    { $unwind: '$records' },
    { $match: { 'records.isAI': { $ne: true } } },
    {
      $group: {
        _id: '$records.username',
        profilePicture: { $first: '$records.profilePicture' },
        maxWPM: { $max: '$records.wpm' },
        maxAccuracy: { $max: '$records.accuracy' },
        maxScore: { $max: '$records.score' }
      }
    },
    { $sort: { maxWPM: -1, maxScore: -1 } },
    { $limit: 30 }
  ];

  const results = await Game.aggregate(pipeline);

  return results.map((item, index) => ({
    rank: index + 1,
    username: item._id,
    profilePicture: item.profilePicture || '',
    wpm: item.maxWPM,
    accuracy: item.maxAccuracy,
    score: item.maxScore
  }));
}

// 1. DYNAMIC LEADERBOARD
router.get('/', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'all-time';
    const leaders = await getLeaderboardData(timeframe);
    res.json({ success: true, timeframe, leaders });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ success: false, message: 'Error retrieving leaderboard.' });
  }
});

// 2. TODAY LEADERBOARD
router.get('/today', async (req, res) => {
  try {
    const leaders = await getLeaderboardData('today');
    res.json({ success: true, timeframe: 'today', leaders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving daily leaderboard.' });
  }
});

// 3. WEEK LEADERBOARD
router.get('/week', async (req, res) => {
  try {
    const leaders = await getLeaderboardData('week');
    res.json({ success: true, timeframe: 'week', leaders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving weekly leaderboard.' });
  }
});

// 4. ALL-TIME LEADERBOARD
router.get('/all-time', async (req, res) => {
  try {
    const leaders = await getLeaderboardData('all-time');
    res.json({ success: true, timeframe: 'all-time', leaders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving all-time leaderboard.' });
  }
});

module.exports = router;
