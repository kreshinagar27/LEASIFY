// scripts/createOwner.js
// Ensure the primary Owner account exists (or create it) with a known password.
// Adjust EMAIL, PASSWORD, NAME as needed.

const connectDB = require('../backend/config/db');
const Owner = require('../backend/models/Owner');

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'kreshinagar27@gmail.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'Admin@123';
const OWNER_NAME = process.env.OWNER_NAME || 'Kreshi Nagar';
const OWNER_CONTACT = process.env.OWNER_CONTACT || '0123456789';

(async () => {
  try {
    await connectDB();
    let owner = await Owner.findOne({ email: OWNER_EMAIL });
    if (owner) {
      console.log('Owner already exists:', owner.email);
    } else {
      owner = await Owner.create({
        name: OWNER_NAME,
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        contactNumber: OWNER_CONTACT,
        verified: true // auto-verify for dev
      });
      console.log('Created Owner account:', owner.email);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error creating Owner:', err);
    process.exit(1);
  }
})();
