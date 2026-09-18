const mongoose = require('mongoose');

let isConnected = false;
let memoryServer = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log('Connecting to MongoDB Atlas at URI...');
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000
      });
      isConnected = true;
      console.log('✅ MongoDB connected successfully to remote cluster.');
      return;
    } catch (err) {
      console.error('⚠️ Warning: Failed to connect to configured MONGODB_URI:', err.message);
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
    }
  }

  // Fallback in development: try MongoDB Memory Server or local fallback
  if (process.env.NODE_ENV !== 'production' && !isConnected) {
    try {
      console.log('Attempting to initialize in-memory MongoDB fallback for local development...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const memUri = memoryServer.getUri();
      await mongoose.connect(memUri);
      isConnected = true;
      console.log('✅ In-Memory MongoDB running and connected at:', memUri);
      return;
    } catch (memErr) {
      console.warn('⚠️ In-Memory MongoDB unavailable or failed:', memErr.message);
      console.warn('⚠️ Server will continue, but database operations will fail until MONGODB_URI is provided.');
    }
  }
}

mongoose.connection.on('connected', () => {
  isConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
});

function getDBStatus() {
  const state = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    connected: state === 1,
    state: states[state] || 'unknown',
    isMemoryServer: Boolean(memoryServer)
  };
}

module.exports = {
  connectDB,
  getDBStatus
};
