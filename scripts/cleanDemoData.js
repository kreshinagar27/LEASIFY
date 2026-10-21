// scripts/cleanDemoData.js
// This script removes all demo data while preserving the main Owner account
// identified by EMAIL env variable or a hard‑coded fallback.

const connectDB = require('../backend/config/db');
const Owner = require('../backend/models/Owner');
const Tenant = require('../backend/models/Tenant');
const Property = require('../backend/models/Property');
const Apartment = require('../backend/models/Apartment');
const Bill = require('../backend/models/Bill');
const Payment = require('../backend/models/Payment');
const Maintenance = require('../backend/models/Maintenance');
const Notification = require('../backend/models/Notification');
const AuditLog = require('../backend/models/AuditLog');

const PRESERVE_OWNER_EMAIL = (process.env.PRESERVE_OWNER_EMAIL || process.env.OWNER_EMAIL || 'dakshvashistha1369@gmail.com').trim().toLowerCase();

const clean = async () => {
  // Fail-safe protection: Prevent execution in production or without explicit confirmation
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_WIPE !== 'true') {
    console.error('❌ SAFETY ABORT: Demo data cleanup is disabled by default to protect database integrity.');
    console.error('To run in a local/test environment, set ALLOW_DEMO_WIPE=true and ensure NODE_ENV is not production.');
    process.exit(1);
  }

  try {
    await connectDB();
    console.log('🗑️  Starting demo data cleanup...');
    // Preserve the owner with the given email, delete any other owners
    const extraOwners = await Owner.find({ email: { $ne: PRESERVE_OWNER_EMAIL } });
    for (const o of extraOwners) {
      await Owner.findByIdAndDelete(o._id);
    }
    console.log(`Deleted ${extraOwners.length} extra owner(s).`);

    // Delete all tenants
    const tenantResult = await Tenant.deleteMany({});
    console.log(`Deleted ${tenantResult.deletedCount} tenant(s).`);
    // Delete all properties
    const propResult = await Property.deleteMany({});
    console.log(`Deleted ${propResult.deletedCount} property(ies).`);
    // Delete all apartments
    const aptResult = await Apartment.deleteMany({});
    console.log(`Deleted ${aptResult.deletedCount} apartment(s).`);
    // Delete other collections if they exist
    const billResult = await Bill.deleteMany({});
    console.log(`Deleted ${billResult.deletedCount} bill(s).`);
    const paymentResult = await Payment.deleteMany({});
    console.log(`Deleted ${paymentResult.deletedCount} payment(s).`);
    const maintResult = await Maintenance.deleteMany({});
    console.log(`Deleted ${maintResult.deletedCount} maintenance record(s).`);
    const notifResult = await Notification.deleteMany({});
    console.log(`Deleted ${notifResult.deletedCount} notification(s).`);
    const auditResult = await AuditLog.deleteMany({});
    console.log(`Deleted ${auditResult.deletedCount} audit log(s).`);
    console.log('✅ Demo data cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
  }
};

clean();
