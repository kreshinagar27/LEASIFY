const mongoose = require('mongoose');
const dns = require('dns');

// Ensure IPv4 first and set public DNS servers to resolve MongoDB Atlas SRV records reliably on Windows
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

dns.setServers(['8.8.8.8', '1.1.1.1']);

// Monitor Mongoose connection events
mongoose.connection.on('connecting', () => {
  console.log('MongoDB status: Connecting...');
});
mongoose.connection.on('connected', () => {
  console.log('MongoDB status: Connected!');
});
mongoose.connection.on('disconnecting', () => {
  console.log('MongoDB status: Disconnecting...');
});
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB status: Disconnected.');
});
mongoose.connection.on('error', (err) => {
  console.error('MongoDB status: Error:', err.message);
});

const connectDB = async () => {
  try {
    console.log('==================================');
    console.log('Starting DB Connection Initialization...');
    console.log('==================================');

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB Connection Failure:', error.message);

    // Development fallback to MongoMemoryServer if IP whitelist / Atlas network restricts connection
    if (process.env.NODE_ENV !== 'production') {
      console.warn('\n[Atlas Access Notice] MongoDB Atlas connection blocked or IP not whitelisted.');
      console.warn('[Atlas Access Notice] To connect to Atlas, whitelist IP 0.0.0.0/0 or your IP in Atlas Network Access.');
      console.warn('[DB Fallback] Bootstrapping In-Memory MongoServer for continuous development & testing...\n');

      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const memoryUri = mongod.getUri();

        const conn = await mongoose.connect(memoryUri);
        console.log(`MongoDB Connected: In-Memory Server (${conn.connection.host})`);
        return conn;
      } catch (fallbackErr) {
        console.error('Fallback DB initialization failed:', fallbackErr.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;