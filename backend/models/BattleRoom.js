const mongoose = require('mongoose');

const BattleRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  player1: {
    socketId: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    ready: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
    wpm: { type: Number, default: 0 },
    accuracy: { type: Number, default: 100 },
    score: { type: Number, default: 0 },
    correctCharacters: { type: Number, default: 0 },
    wrongCharacters: { type: Number, default: 0 },
    finished: { type: Boolean, default: false },
    finishTime: { type: Number, default: null }
  },
  player2: {
    socketId: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    ready: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
    wpm: { type: Number, default: 0 },
    accuracy: { type: Number, default: 100 },
    score: { type: Number, default: 0 },
    correctCharacters: { type: Number, default: 0 },
    wrongCharacters: { type: Number, default: 0 },
    finished: { type: Boolean, default: false },
    finishTime: { type: Number, default: null }
  },
  status: {
    type: String,
    enum: ['WAITING', 'READY', 'PLAYING', 'FINISHED', 'CANCELLED'],
    default: 'WAITING'
  },
  typingText: {
    type: String,
    required: true
  },
  winner: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Expire ephemeral rooms after 24 hours
  },
  startedAt: {
    type: Date,
    default: null
  },
  finishedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('BattleRoom', BattleRoomSchema);
