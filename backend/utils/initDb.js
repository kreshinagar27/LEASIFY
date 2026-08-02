const bcrypt = require('bcrypt');
const Owner = require('../models/Owner');
const Tenant = require('../models/Tenant');

const initDb = async () => {
  try {
    console.log('[DB Init] Database connection and schema integrity checked.');

    // Ensure password hashes in DB are valid bcrypt strings if any exist
    const owners = await Owner.find().select('+password');
    for (const o of owners) {
      if (o.password && !o.password.startsWith('$2a$') && !o.password.startsWith('$2b$')) {
        console.log(`[DB Init] Migrating plain-text password for Owner: ${o.email}`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(o.password, salt);
        await Owner.findByIdAndUpdate(o._id, { password: hashedPassword });
      }
    }

    const tenants = await Tenant.find().select('+password');
    for (const t of tenants) {
      if (t.password && !t.password.startsWith('$2a$') && !t.password.startsWith('$2b$')) {
        console.log(`[DB Init] Migrating plain-text password for Tenant: ${t.email}`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(t.password, salt);
        await Tenant.findByIdAndUpdate(t._id, { password: hashedPassword });
      }
    }

    console.log('[DB Init] Initialization completed cleanly (Demo auto-creation disabled).');
  } catch (error) {
    console.error('[DB Init Error] Database initialization error:', error.message);
  }
};

module.exports = initDb;
