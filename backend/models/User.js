const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    minlength: 2,
    maxlength: 25
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  passwordHash: {
    type: String,
    default: null
  },
  googleId: {
    type: String,
    default: null,
    sparse: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  authenticationProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  totalGames: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  bestWPM: {
    type: Number,
    default: 0
  },
  bestAccuracy: {
    type: Number,
    default: 0
  },
  totalScore: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Helper to return clean profile JSON
UserSchema.methods.toProfileJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    profilePicture: this.profilePicture,
    authenticationProvider: this.authenticationProvider,
    totalGames: this.totalGames,
    wins: this.wins,
    losses: this.losses,
    bestWPM: this.bestWPM,
    bestAccuracy: this.bestAccuracy,
    totalScore: this.totalScore,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', UserSchema);
