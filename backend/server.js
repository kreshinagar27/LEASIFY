const path = require('path');
const dotenv = require('dotenv');

// Load environment variables with explicit path
dotenv.config({ path: path.join(__dirname, '.env') });

const app = require('./app');
const connectDB = require('./config/db');
const initDb = require('./utils/initDb');

const PORT = process.env.PORT || 5001;
let server;

// Connect to Database, initialize demo data/migration, then start HTTP server
connectDB()
  .then(async () => {
    await initDb();
    server = app.listen(PORT, () => {
      console.log(`Leasify Backend listening in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server Error] Port ${PORT} is already in use by another process.`);
        process.exit(1);
      } else {
        console.error('[Server Error]', err.message);
      }
    });
  })
  .catch((err) => {
    console.error('[Backend Startup Aborted] Could not establish MongoDB Atlas connection.');
    console.error('Server execution halted cleanly. Please update Atlas Network Access / MONGO_URI to proceed.');
    process.exit(1);
  });

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
process.once('SIGUSR2', () => {
  if (server) {
    server.close(() => {
      process.kill(process.pid, 'SIGUSR2');
    });
  } else {
    process.kill(process.pid, 'SIGUSR2');
  }
});

// Handle unhandled promise rejections cleanly without confusing dumps
process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection] ${err.message || err}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
