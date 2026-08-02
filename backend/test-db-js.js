const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db');

console.log("Testing config/db.js connection...");
connectDB();
