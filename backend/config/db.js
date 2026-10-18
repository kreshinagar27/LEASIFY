const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Ensure IPv4 result order and set reliable public DNS servers for Atlas SRV queries
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

// Monitor Mongoose connection events
mongoose.connection.on('connecting', () => {
  console.log('MongoDB status: Connecting...');
});
mongoose.connection.on('connected', () => {
  const host = mongoose.connection.host || 'Atlas Cluster';
  console.log('MongoDB status: Connected!');
  console.log(`MongoDB Connected: ${host}`);
});
mongoose.connection.on('disconnecting', () => {
  console.log('MongoDB status: Disconnecting...');
});
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB status: Disconnected.');
});
mongoose.connection.on('error', (err) => {
  console.error('MongoDB status Error:', err.message);
});

// Detailed Error Diagnoser for Task 3
function diagnoseMongoError(error) {
  const msg = error.message || '';
  const causeMsg = error.cause ? error.cause.message || '' : '';
  const fullString = `${msg} ${causeMsg} ${JSON.stringify(error)}`;

  console.error('\n====================================================');
  console.error('       MONGODB ATLAS CONNECTION FAILURE DIAGNOSIS   ');
  console.error('====================================================');

  if (msg.includes('Invalid scheme') || msg.includes('MongoParseError') || !process.env.MONGO_URI) {
    console.error('❌ ERROR CATEGORY: Invalid URI');
    console.error('• Description: The provided MONGO_URI is missing or has an invalid connection format.');
    console.error('• Action: Check MONGO_URI in backend/.env. Must start with mongodb+srv:// or mongodb://');
  } else if (fullString.includes('querySrv') || fullString.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
    console.error('❌ ERROR CATEGORY: DNS / SRV Resolution Failure');
    console.error('• Description: System DNS failed to resolve MongoDB Atlas SRV host.');
    console.error('• Action: Ensure network/DNS server can resolve _mongodb._tcp SRV records.');
  } else if (
    fullString.includes('SSL alert number 80') ||
    fullString.includes('tlsv1 alert internal error') ||
    fullString.includes('ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR') ||
    fullString.includes('IP that isn\'t whitelisted')
  ) {
    console.error('❌ ERROR CATEGORY: IP Whitelist / Network Access Restriction');
    console.error('• Description: MongoDB Atlas firewall rejected TLS handshake from your current IP address.');
    console.error('• Root Cause: Your IP address is not whitelisted in Atlas Network Access settings.');
    console.error('• Action Required: Go to MongoDB Atlas Dashboard -> Network Access -> Add IP Address.');
    console.error('• Add 0.0.0.0/0 (Allow Access from Anywhere) or whitelist your current public IP.');
  } else if (fullString.includes('bad auth') || fullString.includes('Authentication failed') || error.code === 18) {
    console.error('❌ ERROR CATEGORY: Authentication Failure');
    console.error('• Description: Invalid MongoDB Atlas user credentials.');
    console.error('• Action: Verify database username and password in MONGO_URI.');
  } else if (msg.includes('timed out') || msg.includes('selection timed out') || msg.includes('MongoServerSelectionError')) {
    console.error('❌ ERROR CATEGORY: Connection Timeout / Server Selection Failure');
    console.error('• Description: Timed out waiting for MongoDB Atlas cluster response.');
    console.error('• Action: Verify internet connection, Atlas cluster state (Active vs Paused), and port 27017 outbound access.');
  } else {
    console.error('❌ ERROR CATEGORY: General Network / Connection Failure');
    console.error(`• Details: ${msg}`);
  }

  console.error('====================================================\n');
}

const connectDB = async () => {
  console.log('==================================');
  console.log('Starting DB Connection Initialization...');
  console.log('==================================');

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    diagnoseMongoError(new Error('MONGO_URI is missing in backend/.env'));
    throw new Error('MONGO_URI missing');
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      family: 4,
      serverSelectionTimeoutMS: 8000
    });
    return conn;
  } catch (error) {
    diagnoseMongoError(error);
    throw error;
  }
};

module.exports = connectDB;