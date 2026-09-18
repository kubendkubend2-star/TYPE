const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  player1: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, required: true },
    profilePicture: { type: String, default: '' }
  },
  player2: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, required: true },
    isAI: { type: Boolean, default: false },
    aiDifficulty: { type: String, default: null }
  },
  gameMode: {
    type: String,
    enum: ['solo', 'pvp'],
    required: true
  },
  winner: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  player1WPM: {
    type: Number,
    default: 0
  },
  player2WPM: {
    type: Number,
    default: 0
  },
  player1Accuracy: {
    type: Number,
    default: 0
  },
  player2Accuracy: {
    type: Number,
    default: 0
  },
  player1Score: {
    type: Number,
    default: 0
  },
  player2Score: {
    type: Number,
    default: 0
  },
  player1CorrectCharacters: {
    type: Number,
    default: 0
  },
  player1WrongCharacters: {
    type: Number,
    default: 0
  },
  player2CorrectCharacters: {
    type: Number,
    default: 0
  },
  player2WrongCharacters: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: 60
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('Game', GameSchema);
