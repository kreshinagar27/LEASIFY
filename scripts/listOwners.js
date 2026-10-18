// scripts/listOwners.js
const connectDB = require('../backend/config/db');
const Owner = require('../backend/models/Owner');

(async () => {
  try {
    await connectDB();
    const owners = await Owner.find({});
    console.log('Owners in DB:', owners.map(o => ({ email: o.email, verified: o.verified, role: o.role })));
    process.exit(0);
  } catch (err) {
    console.error('Error listing owners:', err);
    process.exit(1);
  }
})();
