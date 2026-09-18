require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const { Server } = require('socket.io');

const { connectDB, getDBStatus } = require('./config/db');
const { configurePassport } = require('./config/passport');
const { initBattleSockets } = require('./sockets/battleSocket');

// Route imports
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Security Middleware (Helmet with relaxed CSP for fonts, avatars, websockets)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.socket.io", "https://accounts.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "ws:", "wss:", "https:", "http:"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport initialization
app.use(passport.initialize());
configurePassport();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { success: false, message: 'Too many authentication attempts from this IP, please try again later.' }
});
app.use('/api/auth', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health Check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.json({
    status: 'OK',
    database: dbStatus.connected ? 'connected' : 'connecting_or_offline',
    dbState: dbStatus.state,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// Route invite URLs like /battle/:roomId directly to the frontend SPA
app.get('/battle/:roomId', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Catch-all for single-page client routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Initialize Socket.IO battle handlers
initBattleSockets(io);

// Server port handling (supports Render dynamic PORT and local default 5000)
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`🚀 TYPE CLASH Server running on port ${PORT}`);
      console.log(`🌐 Application URL: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Fatal: Server startup error:', err);
    process.exit(1);
  }
}

startServer();
