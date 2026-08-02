const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

dotenv.config();

try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}
dns.setServers(['8.8.8.8', '1.1.1.1']);

console.log('Testing clean production-ready Mongoose connection...');
console.log('MONGO_URI:', process.env.MONGO_URI);

async function test() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000
    });
    console.log('====================================');
    console.log('SUCCESS! MongoDB Connected:', conn.connection.host);
    console.log('====================================');
    process.exit(0);
  } catch (err) {
    console.error('Connection Failed:', err.message);
    if (err.cause) console.error('Cause:', err.cause);
    process.exit(1);
  }
}

test();
