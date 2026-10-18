const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Ensure IPv4 result order
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

// Safe Host Sanitizer (strips credentials, keeps only host type/domain)
function getSafeHostInfo(mongoUri) {
  try {
    if (!mongoUri) return 'Unknown';
    if (mongoUri.includes('mongodb.net')) {
      const match = mongoUri.match(/@([^/?#]+)/);
      return match ? `Atlas (${match[1]})` : 'Atlas';
    }
    if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
      return 'Local MongoDB (127.0.0.1:27017)';
    }
    const match = mongoUri.match(/@?([^/?#:]+(?::\d+)?)/);
    return match ? match[1] : 'Direct Connection';
  } catch {
    return 'Atlas';
  }
}

function getSafeDbName(conn, mongoUri) {
  if (conn?.name) return conn.name;
  try {
    const url = new URL(mongoUri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
    const pathname = url.pathname.replace(/^\//, '').split('?')[0];
    return pathname || 'leasify';
  } catch {
    return 'leasify';
  }
}

// Accurate Error Diagnoser without exposing credentials
function diagnoseMongoError(error, mongoUri) {
  const msg = error.message || '';
  const causeMsg = error.cause ? error.cause.message || '' : '';
  const fullString = `${msg} ${causeMsg} ${error.name || ''}`;
  const safeHost = getSafeHostInfo(mongoUri);

  console.error('\n====================================================');
  console.error('       MONGODB PERSISTENT CONNECTION FAILURE        ');
  console.error('====================================================');
  console.error(`Target Host: ${safeHost}`);

  if (msg.includes('Invalid scheme') || msg.includes('MongoParseError') || !mongoUri) {
    console.error('❌ ERROR CATEGORY: Invalid URI');
    console.error('• Description: The provided MONGO_URI is missing or has an invalid connection format.');
    console.error('• Action: Verify MONGO_URI in backend/.env.');
  } else if (fullString.includes('ECONNREFUSED')) {
    console.error('❌ ERROR CATEGORY: Connection Refused (ECONNREFUSED)');
    console.error(`• Description: The database server at ${safeHost} refused the connection.`);
    console.error('• Root Causes & Action Items:');
    if (mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost')) {
      console.error('  1. LOCAL MONGODB PROCESS IS NOT RUNNING:');
      console.error('     Run "npm run mongo" in a separate terminal or run "npm run dev" from the project root.');
      console.error('  2. PORT MISMATCH:');
      console.error('     Ensure your local MongoDB instance is listening on port 27017.');
    } else {
      console.error('  1. Host is offline or not accepting connections on specified port.');
      console.error('  2. Firewall / security group blocking access.');
    }
  } else if (fullString.includes('querySrv') || fullString.includes('ENOTFOUND')) {
    console.error('❌ ERROR CATEGORY: DNS / SRV Resolution Failure (NXDOMAIN / ENOTFOUND)');
    console.error('• Description: The system DNS could not resolve the address for this MongoDB Atlas cluster.');
    console.error('• Root Causes & Action Items:');
    console.error('  1. ATLAS CLUSTER IS PAUSED (Most Common for free M0 clusters):');
    console.error('     MongoDB Atlas automatically pauses free tier clusters after a period of inactivity.');
    console.error('     When paused, Atlas removes the DNS SRV records from Route53.');
    console.error('     -> FIX: Log in to https://cloud.mongodb.com and click "Resume" on your cluster.');
    console.error('  2. HOSTNAME TYPO OR RECREATED CLUSTER:');
    console.error('     If the cluster was recreated or renamed, the old cluster hostname ceases to exist.');
    console.error('     -> FIX: In Atlas, click "Connect" -> "Drivers" and copy the exact URI into backend/.env.');
    console.error('  3. LOCAL NETWORK / ROUTER / ISP DROPS SRV QUERIES:');
    console.error('     Some Wi-Fi routers drop UDP SRV responses. Switch DNS to 8.8.8.8 / 1.1.1.1,');
    console.error('     or use the standard (non-SRV) replica-set connection string from MongoDB Atlas.');
  } else if (fullString.includes('bad auth') || fullString.includes('Authentication failed') || error.code === 18) {
    console.error('❌ ERROR CATEGORY: Authentication Failure');
    console.error('• Description: Invalid MongoDB database credentials.');
    console.error('• Action: Verify the username and password configured in backend/.env.');
  } else if (msg.includes('timed out') || msg.includes('selection timed out') || msg.includes('MongoServerSelectionError')) {
    console.error('❌ ERROR CATEGORY: Connection Timeout / IP Whitelist Restriction');
    console.error('• Description: Timed out waiting for MongoDB cluster response.');
    console.error('• Action: Check network connectivity or ensure your IP is whitelisted.');
  } else {
    console.error('❌ ERROR CATEGORY: General Network / Connection Failure');
    console.error(`• Details: ${msg}`);
  }

  console.error('\n⚠️ PERSISTENCE SAFETY GUARANTEE:');
  console.error('Leasify refuses to silently fall back to an ephemeral in-memory database');
  console.error('because registered user accounts and property data would be permanently');
  console.error('lost whenever the server restarts.');
  console.error('====================================================\n');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    diagnoseMongoError(new Error('MONGO_URI is missing in backend/.env'), '');
    throw new Error('MONGO_URI missing in backend/.env');
  }

  const safeHost = getSafeHostInfo(mongoUri);
  const isLocal = mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost');
  const maxAttempts = isLocal ? 4 : 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1 && isLocal) {
        console.log(`[backend] Retrying connection to ${safeHost} (attempt ${attempt}/${maxAttempts})...`);
      }

      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000
      });

      const dbName = getSafeDbName(conn.connection, mongoUri);
      console.log('====================================================');
      console.log('MongoDB connected');
      console.log(`Database name: ${dbName}`);
      console.log(`Host: ${safeHost}`);
      console.log('====================================================');

      return conn;
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts;
      const isConnRefused = (err.message || '').includes('ECONNREFUSED');

      // If local MongoDB is booting up concurrently, wait and retry
      if (isLocal && isConnRefused && !isLastAttempt) {
        await sleep(1500);
        continue;
      }

      // If standard SRV lookup fails on Atlas, retry once with public DNS
      if (mongoUri.startsWith('mongodb+srv://') && !isLastAttempt && ((err.message || '').includes('querySrv') || (err.message || '').includes('ENOTFOUND'))) {
        try {
          console.log('[backend] Retrying SRV lookup with public DNS servers (8.8.8.8, 1.1.1.1)...');
          dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
          const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000
          });

          const dbName = getSafeDbName(conn.connection, mongoUri);
          console.log('====================================================');
          console.log('MongoDB connected');
          console.log(`Database name: ${dbName}`);
          console.log(`Host: ${safeHost}`);
          console.log('====================================================');

          return conn;
        } catch (publicDnsError) {
          diagnoseMongoError(publicDnsError, mongoUri);
          throw publicDnsError;
        }
      }

      diagnoseMongoError(err, mongoUri);
      throw err;
    }
  }
};

module.exports = connectDB;