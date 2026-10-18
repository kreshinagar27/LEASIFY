const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// 1. Load environment variables cleanly
dotenv.config({ path: path.join(__dirname, '.env') });

const app = require('./app');
const connectDB = require('./config/db');
const initDb = require('./utils/initDb');

const PORT = process.env.PORT || 5001;
let server;

// Start sequence: Connect DB first -> initialize -> start Express listener
async function startServer() {
  try {
    // 2. Validate required configuration
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in backend/.env');
    }

    // 3. Connect to MongoDB Atlas
    await connectDB();

    // 4. Verify database connection state
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Mongoose connection failed to achieve ready state 1.');
    }
    console.log('[backend] MongoDB connected successfully');

    // 5. Initialize application dependencies/schema
    await initDb();
    console.log('[backend] Database initialized');

    // 6. Start exactly ONE Express HTTP Server
    server = app.listen(PORT, () => {
      console.log(`[backend] Leasify Backend listening on port ${PORT}`);
      console.log(`[backend] API base URL: http://localhost:${PORT}/api/v1`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[backend] [Server Error] Port ${PORT} is already in use by another process.`);
        console.error(`[backend] To fix this, terminate the process holding port ${PORT}:`);
        console.error(`[backend]   In PowerShell: Get-NetTCPConnection -LocalPort ${PORT} | Select-Object OwningProcess`);
        console.error(`[backend]   In CMD: netstat -ano | findstr :${PORT}`);
        console.error(`[backend]   Kill: Stop-Process -Id <PID> -Force`);
        process.exit(1);
      } else {
        console.error('[backend] [Server Error]', err.message);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('\n[backend] [Backend Startup Aborted] MongoDB Atlas connection failed.');
    console.error(`[backend] Reason: ${error.message}`);
    process.exit(1);
  }
}

startServer();

// Handle graceful termination signals
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Gracefully shutting down backend server...`);
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection] ${err ? err.message || err : 'Unknown error'}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
