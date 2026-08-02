const bcrypt = require('bcrypt');
const Owner = require('../models/Owner');
const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const seedDB = require('../seeds/demoData');

const initDb = async () => {
  try {
    console.log('[DB Init] Checking database state & account integrity...');

    const ownerCount = await Owner.countDocuments();
    const propertyCount = await Property.countDocuments();
    const tenantCount = await Tenant.countDocuments();

    // STEP 3 & STEP 9: If no account exists or database is empty, seed demo data
    if (ownerCount === 0 || propertyCount === 0 || tenantCount === 0) {
      console.log('[DB Init] Database is empty or incomplete. Auto-generating demo dataset...');
      await seedDB();
      console.log('[DB Init] Auto-seeding completed.');
    } else {
      // Ensure Admin Owner exists (admin@leasify.com / Admin@123)
      const adminOwner = await Owner.findOne({ email: 'admin@leasify.com' });
      if (!adminOwner) {
        console.log('[DB Init] Admin Owner account missing. Creating demo owner admin@leasify.com...');
        await Owner.create({
          name: 'Admin Owner',
          email: 'admin@leasify.com',
          password: 'Admin@123',
          contactNumber: '+91 9876543210',
          address: 'Indiranagar, Bengaluru',
          role: 'owner',
          verified: true
        });
        console.log('[DB Init] Demo owner admin@leasify.com created successfully.');
      }
    }

    // STEP 4: Verify and migrate any plain-text passwords
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
    const demoPasswordHash = await bcrypt.hash('Password123', 10);
    for (const t of tenants) {
      const updates = {};
      if (!t.password || (!t.password.startsWith('$2a$') && !t.password.startsWith('$2b$'))) {
        console.log(`[DB Init] Setting standard bcrypt password for Tenant: ${t.email}`);
        updates.password = demoPasswordHash;
      }
      if (t.verified === undefined) {
        updates.verified = true;
      }
      if (t.isActive === undefined) {
        updates.isActive = true;
      }
      if (Object.keys(updates).length > 0) {
        await Tenant.findByIdAndUpdate(t._id, updates);
      }
    }

    console.log('[DB Init] Database initialization and integrity check completed successfully.');
  } catch (error) {
    console.error('[DB Init Error] Database initialization error:', error.message);
  }
};

module.exports = initDb;
