const path = require('path');
const dotenv = require('dotenv');
// Load environment variables with explicit path
dotenv.config({ path: path.join(__dirname, '.env') });

const app = require('./app');
const connectDB = require('./config/db');
const initDb = require('./utils/initDb');

const PORT = process.env.PORT || 5000;
let server;

// Connect to Database, initialize demo data/migration, then start HTTP server
connectDB().then(async () => {
  await initDb();
  server = app.listen(PORT, () => {
    console.log(`Leasify Backend listening in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database server:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
