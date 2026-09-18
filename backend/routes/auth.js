const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');
const { requireAuth, generateToken } = require('../middleware/authMiddleware');

// 1. REGISTER WITH EMAIL/PASSWORD
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (username.trim().length < 2 || username.trim().length > 25) {
      return res.status(400).json({ success: false, message: 'Username must be between 2 and 25 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    // Check duplicate email
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Check duplicate username
    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'This username is already taken. Please choose another.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default avatar
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;

    const newUser = new User({
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      profilePicture: defaultAvatar,
      authenticationProvider: 'local'
    });

    await newUser.save();

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: newUser.toProfileJSON()
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// 2. LOGIN WITH EMAIL/PASSWORD
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'This account was created with Google Sign-In. Please click "Continue with Google".'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: user.toProfileJSON()
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// 3. GOOGLE OAUTH INITIATE
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes('your_google_client_id')) {
    return res.status(503).json({
      success: false,
      message: 'Google Sign-In is not configured yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.'
    });
  }

  // Preserve redirect destination (e.g. /battle/A7K9X2) via state
  const state = req.query.redirect ? encodeURIComponent(req.query.redirect) : '';

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    state
  })(req, res, next);
});

// 4. GOOGLE OAUTH CALLBACK
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      const redirectPath = req.query.state ? decodeURIComponent(req.query.state) : '/';

      if (err || !user) {
        console.error('Google OAuth callback error:', err || info);
        return res.redirect(`/?auth_error=${encodeURIComponent('Google authentication failed. Please try again.')}`);
      }

      const token = generateToken(user);
      // Determine target redirect URL with token
      const separator = redirectPath.includes('?') ? '&' : '?';
      const destination = `${redirectPath}${separator}token=${token}&auth_success=true`;

      return res.redirect(destination);
    })(req, res, next);
  }
);

// 5. GET CURRENT USER PROFILE
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({
      success: true,
      user: user.toProfileJSON()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving profile.' });
  }
});

// 6. LOGOUT
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;
