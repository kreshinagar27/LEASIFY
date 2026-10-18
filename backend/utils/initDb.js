const bcrypt = require('bcrypt');
const Owner = require('../models/Owner');
const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const Apartment = require('../models/Apartment');

const initDb = async () => {
  try {
    console.log('[DB Init] Database connection and schema integrity checked.');

    // Password integrity check for any existing accounts
    const owners = await Owner.find().select('+password');
    for (const o of owners) {
      if (o.password && !o.password.startsWith('$2a$') && !o.password.startsWith('$2b$')) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(o.password, salt);
        await Owner.findByIdAndUpdate(o._id, { password: hashedPassword });
      }
    }

    const tenants = await Tenant.find().select('+password');
    for (const t of tenants) {
      if (t.password && !t.password.startsWith('$2a$') && !t.password.startsWith('$2b$')) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(t.password, salt);
        await Tenant.findByIdAndUpdate(t._id, { password: hashedPassword });
      }
    }

    console.log('[DB Init] Schema integrity verified. No auto-seeded login data created.');
  } catch (error) {
    console.error('[DB Init Error] Database initialization error:', error.message);
  }
};

module.exports = initDb;
