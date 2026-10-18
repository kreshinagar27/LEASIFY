const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const Owner = require('../models/Owner');
const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const Apartment = require('../models/Apartment');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Maintenance = require('../models/Maintenance');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const seedDB = async () => {
  try {
    console.log('Seeding Database... Initializing Data...');

    // Clear dependent collections
    await Tenant.deleteMany();
    await Property.deleteMany();
    await Apartment.deleteMany();
    await Bill.deleteMany();
    await Payment.deleteMany();
    await Maintenance.deleteMany();
    await Notification.deleteMany();
    await AuditLog.deleteMany();
    console.log('Cleaned old database records.');

    // 1. Create or Update Primary Demo Owner (kreshinagar27@gmail.com)
    const ownerPassword = 'Admin@123';
    let owner = await Owner.findOne({ email: 'kreshinagar27@gmail.com' });
    if (owner) {
      owner.name = 'Kreshi Nagar';
      owner.password = ownerPassword;
      owner.contactNumber = '+91 9876543210';
      owner.address = 'Suite 101, Residency Road, Indiranagar, Bengaluru, KA, India';
      owner.verified = true;
      await owner.save();
    } else {
      owner = await Owner.create({
        name: 'Kreshi Nagar',
        email: 'kreshinagar27@gmail.com',
        password: ownerPassword,
        contactNumber: '+91 9876543210',
        address: 'Suite 101, Residency Road, Indiranagar, Bengaluru, KA, India',
        profilePhoto: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
        role: 'owner',
        verified: true
      });
    }

    console.log(`Single Demo Owner Verified: ${owner.email} / ${ownerPassword}`);

    // 2. Create 5 Properties
    const propertyData = [
      {
        name: 'Greenwood Residency Apt 402',
        type: 'apartment',
        floorNumber: 4,
        areaSqFt: 1250,
        bedrooms: 2,
        bathrooms: 2,
        balcony: true,
        parkingAvailability: true,
        furnishedStatus: 'semi-furnished',
        amenities: ['24/7 Security', 'Gym', 'Swimming Pool', 'Power Backup'],
        description: 'Spacious 2 BHK apartment in Koramangala with modular kitchen and city view balconies.',
        monthlyRent: 25000,
        securityDeposit: 50000,
        address: { houseNumber: '402', street: 'Greenwood Lane', area: 'Koramangala 4th Block', city: 'Bengaluru', state: 'Karnataka', country: 'India', pincode: '560034' },
        location: { type: 'Point', coordinates: [77.6309, 12.9352] },
        nearbyFacilities: ['Forum Mall', 'St. Johns Hospital', 'Koramangala Metro'],
        status: 'Occupied',
        owner: owner._id
      },
      {
        name: 'Skyline Luxury Villa 12',
        type: 'villa',
        floorNumber: 0,
        areaSqFt: 3400,
        bedrooms: 4,
        bathrooms: 4,
        balcony: true,
        parkingAvailability: true,
        furnishedStatus: 'furnished',
        amenities: ['Private Garden', 'Home Theatre', 'Automated Gates', 'Clubhouse Access'],
        description: 'Premium 4 BHK duplex villa in Whitefield with private garden lawn and designer interiors.',
        monthlyRent: 65000,
        securityDeposit: 130000,
        address: { houseNumber: 'Villa 12', street: 'Skyline Boulevard', area: 'Whitefield', city: 'Bengaluru', state: 'Karnataka', country: 'India', pincode: '560066' },
        location: { type: 'Point', coordinates: [77.7501, 12.9698] },
        nearbyFacilities: ['ITPL Tech Park', 'Manipal Hospital', 'Phoenix Marketcity'],
        status: 'Occupied',
        owner: owner._id
      },
      {
        name: 'Oceanview Heights Suite 8B',
        type: 'apartment',
        floorNumber: 8,
        areaSqFt: 1800,
        bedrooms: 3,
        bathrooms: 3,
        balcony: true,
        parkingAvailability: true,
        furnishedStatus: 'furnished',
        amenities: ['Sea View', 'High-Speed Elevators', 'Concierge Service', 'Tennis Court'],
        description: 'Ultra-modern 3 BHK penthouse apartment overlooking sea breeze promenade.',
        monthlyRent: 45000,
        securityDeposit: 90000,
        address: { houseNumber: '8B', street: 'Marine Drive', area: 'Bandra West', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400050' },
        location: { type: 'Point', coordinates: [72.8258, 19.0596] },
        nearbyFacilities: ['Bandra Fort', 'Lilavati Hospital', 'Carter Road Promenade'],
        status: 'Occupied',
        owner: owner._id
      },
      {
        name: 'Sunrise Commercial Hub Office 304',
        type: 'commercial',
        floorNumber: 3,
        areaSqFt: 2200,
        bedrooms: 0,
        bathrooms: 2,
        balcony: false,
        parkingAvailability: true,
        furnishedStatus: 'semi-furnished',
        amenities: ['Central AC', 'Fibre Broadband', 'Conference Room', 'CCTV Monitoring'],
        description: 'Plug-and-play corporate office space in Cyber City tech precinct.',
        monthlyRent: 80000,
        securityDeposit: 160000,
        address: { houseNumber: '304', street: 'Cyber City Expressway', area: 'DLF Phase 2', city: 'Gurugram', state: 'Haryana', country: 'India', pincode: '122002' },
        location: { type: 'Point', coordinates: [77.0888, 28.495] },
        nearbyFacilities: ['Cyber Hub', 'Indira Gandhi Int Airport', 'Rapid Metro Station'],
        status: 'Occupied',
        owner: owner._id
      },
      {
        name: 'Urban Nest Studio 105',
        type: 'room',
        floorNumber: 1,
        areaSqFt: 650,
        bedrooms: 1,
        bathrooms: 1,
        balcony: true,
        parkingAvailability: false,
        furnishedStatus: 'furnished',
        amenities: ['Smart TV', 'Washing Machine', 'Housekeeping', 'High-Speed Wi-Fi'],
        description: 'Cozy modern studio room perfect for young tech professionals and working executives.',
        monthlyRent: 18000,
        securityDeposit: 36000,
        address: { houseNumber: '105', street: 'HSR 2nd Sector', area: 'HSR Layout', city: 'Bengaluru', state: 'Karnataka', country: 'India', pincode: '560102' },
        location: { type: 'Point', coordinates: [77.6412, 12.9121] },
        nearbyFacilities: ['HSR BDA Complex', 'Narayana Health', 'Silk Board Junction'],
        status: 'Occupied',
        owner: owner._id
      }
    ];

    const properties = await Property.create(propertyData);
    console.log(`Created ${properties.length} Properties.`);

    // 3. Create 15 Tenants (STEP 9 requirement)
    const tenantDetails = [
      { name: 'Anjali Sharma', email: 'tenant1@leasify.com', phone: '+91 9811122201', occupation: 'Senior Software Engineer at Google', aadhaar: '1234-5678-9001', propIdx: 0 },
      { name: 'Vikramaditya Roy', email: 'tenant2@leasify.com', phone: '+91 9811122202', occupation: 'Product Manager at Microsoft', aadhaar: '1234-5678-9002', propIdx: 0 },
      { name: 'Priya Nair', email: 'tenant3@leasify.com', phone: '+91 9811122203', occupation: 'Data Scientist at Flipkart', aadhaar: '1234-5678-9003', propIdx: 0 },
      { name: 'Rohan Mehta', email: 'tenant4@leasify.com', phone: '+91 9811122204', occupation: 'VP Operations at Amazon', aadhaar: '1234-5678-9004', propIdx: 1 },
      { name: 'Sneha Kulkarni', email: 'tenant5@leasify.com', phone: '+91 9811122205', occupation: 'Architect at Foster + Partners', aadhaar: '1234-5678-9005', propIdx: 1 },
      { name: 'Karan Malhotra', email: 'tenant6@leasify.com', phone: '+91 9811122206', occupation: 'Investment Banker at Goldman Sachs', aadhaar: '1234-5678-9006', propIdx: 1 },
      { name: 'Aishwarya Sen', email: 'tenant7@leasify.com', phone: '+91 9811122207', occupation: 'Creative Director at Ogilvy', aadhaar: '1234-5678-9007', propIdx: 2 },
      { name: 'Devendra Patel', email: 'tenant8@leasify.com', phone: '+91 9811122208', occupation: 'Management Consultant at McKinsey', aadhaar: '1234-5678-9008', propIdx: 2 },
      { name: 'Meera Deshmukh', email: 'tenant9@leasify.com', phone: '+91 9811122209', occupation: 'Chief Financial Officer at Tata Digital', aadhaar: '1234-5678-9009', propIdx: 2 },
      { name: 'Arjun Singhania', email: 'tenant10@leasify.com', phone: '+91 9811122210', occupation: 'Managing Director at Sequoia Capital', aadhaar: '1234-5678-9010', propIdx: 3 },
      { name: 'Tanya Banerjee', email: 'tenant11@leasify.com', phone: '+91 9811122211', occupation: 'Head of AI Research at Infosys', aadhaar: '1234-5678-9011', propIdx: 3 },
      { name: 'Kabir Kapoor', email: 'tenant12@leasify.com', phone: '+91 9811122212', occupation: 'Founding Engineer at Swiggy', aadhaar: '1234-5678-9012', propIdx: 3 },
      { name: 'Neha Chawla', email: 'tenant13@leasify.com', phone: '+91 9811122213', occupation: 'UI/UX Lead at CRED', aadhaar: '1234-5678-9013', propIdx: 4 },
      { name: 'Siddharth Varma', email: 'tenant14@leasify.com', phone: '+91 9811122214', occupation: 'Backend Engineer at Razorpay', aadhaar: '1234-5678-9014', propIdx: 4 },
      { name: 'Divya Iyer', email: 'tenant15@leasify.com', phone: '+91 9811122215', occupation: 'Marketing Lead at Zomato', aadhaar: '1234-5678-9015', propIdx: 4 }
    ];

    const tenants = [];
    const tenantPassword = 'Password123';

    for (let i = 0; i < tenantDetails.length; i++) {
      const tInfo = tenantDetails[i];
      const assignedProp = properties[tInfo.propIdx];

      const t = await Tenant.create({
        name: tInfo.name,
        email: tInfo.email,
        password: tenantPassword,
        phone: tInfo.phone,
        occupation: tInfo.occupation,
        aadhaarNumber: tInfo.aadhaar,
        panNumber: `ABCDE${1000 + i}F`,
        emergencyContact: {
          name: `Emergency Contact ${i + 1}`,
          phone: `+91 97000000${i < 10 ? '0' + i : i}`,
          relationship: 'Family'
        },
        profilePhoto: `https://images.unsplash.com/photo-${1500000000000 + (i * 1000)}?w=150`,
        role: 'tenant',
        isActive: true,
        verified: true,
        owner: owner._id,
        propertyAssigned: assignedProp._id,
        monthlyRent: assignedProp.monthlyRent,
        securityDeposit: assignedProp.securityDeposit,
        leaseStartDate: new Date('2026-01-01'),
        leaseEndDate: new Date('2027-01-01'),
        moveInDetails: {
          meterReadings: { electricity: 1200 + i * 50, water: 500 + i * 20 },
          depositCollected: true,
          keyHandoverConfirmed: true
        }
      });

      tenants.push(t);
      // Associate primary tenant with property
      if (i % 3 === 0) {
        assignedProp.tenant = t._id;
        await assignedProp.save();
      }
    }
    console.log(`Created ${tenants.length} Tenants.`);

    // 3.5 Create Apartments for Properties
    const apartments = [];
    const aptConfigs = [
      { number: 'Apt 402', floor: 4, areaSqFt: 1250, bedrooms: 2, bathrooms: 2, propIdx: 0, tenantIdx: 0, status: 'Occupied' },
      { number: 'Apt 403', floor: 4, areaSqFt: 1250, bedrooms: 2, bathrooms: 2, propIdx: 0, tenantIdx: null, status: 'Vacant' },
      { number: 'Apt 404', floor: 4, areaSqFt: 1100, bedrooms: 2, bathrooms: 1, propIdx: 0, tenantIdx: null, status: 'Reserved' },
      { number: 'Villa 12', floor: 0, areaSqFt: 3400, bedrooms: 4, bathrooms: 4, propIdx: 1, tenantIdx: 3, status: 'Occupied' },
      { number: 'Villa 14', floor: 0, areaSqFt: 3400, bedrooms: 4, bathrooms: 4, propIdx: 1, tenantIdx: null, status: 'Vacant' },
      { number: 'Suite 8B', floor: 8, areaSqFt: 1800, bedrooms: 3, bathrooms: 3, propIdx: 2, tenantIdx: 6, status: 'Occupied' },
      { number: 'Suite 8C', floor: 8, areaSqFt: 1800, bedrooms: 3, bathrooms: 3, propIdx: 2, tenantIdx: null, status: 'Vacant' },
      { number: 'Office 304', floor: 3, areaSqFt: 2200, bedrooms: 0, bathrooms: 2, propIdx: 3, tenantIdx: 9, status: 'Occupied' },
      { number: 'Office 305', floor: 3, areaSqFt: 1800, bedrooms: 0, bathrooms: 2, propIdx: 3, tenantIdx: null, status: 'Vacant' },
      { number: 'Studio 105', floor: 1, areaSqFt: 650, bedrooms: 1, bathrooms: 1, propIdx: 4, tenantIdx: 12, status: 'Occupied' },
      { number: 'Studio 106', floor: 1, areaSqFt: 650, bedrooms: 1, bathrooms: 1, propIdx: 4, tenantIdx: null, status: 'Vacant' }
    ];

    for (const cfg of aptConfigs) {
      const prop = properties[cfg.propIdx];
      const assignedTenant = cfg.tenantIdx !== null ? tenants[cfg.tenantIdx] : null;
      const apt = await Apartment.create({
        number: cfg.number,
        floor: cfg.floor,
        areaSqFt: cfg.areaSqFt,
        bedrooms: cfg.bedrooms,
        bathrooms: cfg.bathrooms,
        balcony: true,
        parkingAvailable: true,
        furnishedStatus: prop.furnishedStatus || 'furnished',
        monthlyRent: prop.monthlyRent,
        securityDeposit: prop.securityDeposit,
        status: cfg.status,
        property: prop._id,
        tenant: assignedTenant ? assignedTenant._id : null
      });
      apartments.push(apt);
    }
    console.log(`Created ${apartments.length} Apartments.`);

    // 4. Create Rent Bills & Payment Records (STEP 9 requirement)
    let billCount = 0;
    let paymentCount = 0;

    for (let i = 0; i < tenants.length; i++) {
      const t = tenants[i];
      const prop = properties[tenantDetails[i].propIdx];

      // June 2026 Bill (Paid)
      const juneInv = `INV-202606-${1000 + i}`;
      const juneElec = 800 + (i * 40);
      const juneWater = 300 + (i * 15);
      const juneMaint = 1200;
      const juneBase = prop.monthlyRent + juneElec + juneWater + juneMaint;
      const juneGst = Math.round(juneBase * 0.18);
      const juneTotal = juneBase + juneGst;

      const juneBill = await Bill.create({
        property: prop._id,
        tenant: t._id,
        month: 6,
        year: 2026,
        invoiceNumber: juneInv,
        rent: prop.monthlyRent,
        electricityCharges: juneElec,
        waterCharges: juneWater,
        maintenanceCharges: juneMaint,
        parkingCharges: 500,
        gst: juneGst,
        totalAmount: juneTotal,
        dueDate: new Date('2026-06-10'),
        status: 'paid',
        paidAt: new Date('2026-06-05')
      });
      billCount++;

      await Payment.create({
        bill: juneBill._id,
        property: prop._id,
        tenant: t._id,
        amount: juneTotal,
        paymentMethod: i % 2 === 0 ? 'UPI' : 'Razorpay',
        transactionId: `TXN-JUNE-${100000 + i}`,
        receiptUrl: `/uploads/receipts/receipt-${juneBill._id}.pdf`,
        status: 'success',
        paymentDate: new Date('2026-06-05')
      });
      paymentCount++;

      // July 2026 Bill (50% Paid, 50% Unpaid/Overdue)
      const julyInv = `INV-202607-${1000 + i}`;
      const julyElec = 950 + (i * 50);
      const julyWater = 350 + (i * 20);
      const julyMaint = 1200;
      const julyBase = prop.monthlyRent + julyElec + julyWater + julyMaint;
      const julyGst = Math.round(julyBase * 0.18);
      const julyTotal = julyBase + julyGst;
      const isPaidJuly = i % 2 === 0;

      const julyBill = await Bill.create({
        property: prop._id,
        tenant: t._id,
        month: 7,
        year: 2026,
        invoiceNumber: julyInv,
        rent: prop.monthlyRent,
        electricityCharges: julyElec,
        waterCharges: julyWater,
        maintenanceCharges: julyMaint,
        parkingCharges: 500,
        gst: julyGst,
        totalAmount: julyTotal,
        dueDate: new Date('2026-07-10'),
        status: isPaidJuly ? 'paid' : 'unpaid',
        paidAt: isPaidJuly ? new Date('2026-07-08') : undefined
      });
      billCount++;

      if (isPaidJuly) {
        await Payment.create({
          bill: julyBill._id,
          property: prop._id,
          tenant: t._id,
          amount: julyTotal,
          paymentMethod: 'Razorpay',
          transactionId: `TXN-JULY-${100000 + i}`,
          receiptUrl: `/uploads/receipts/receipt-${julyBill._id}.pdf`,
          status: 'success',
          paymentDate: new Date('2026-07-08')
        });
        paymentCount++;
      }
    }
    console.log(`Created ${billCount} Rent Bills and ${paymentCount} Payment Records.`);

    // 5. Create Maintenance History & Complaints (STEP 9 requirement)
    const categories = ['Plumbing', 'Electrical', 'Water', 'Cleaning', 'Internet', 'Furniture'];
    const priorities = ['low', 'medium', 'high'];
    const statuses = ['pending', 'accepted', 'resolved', 'rejected'];
    let complaintCount = 0;

    for (let i = 0; i < 15; i++) {
      const t = tenants[i];
      const prop = properties[tenantDetails[i].propIdx];

      await Maintenance.create({
        complaintId: `MNT-2026-${1000 + i}`,
        property: prop._id,
        tenant: t._id,
        category: categories[i % categories.length],
        priority: priorities[i % priorities.length],
        description: `Issue ticket ${i + 1}: ${categories[i % categories.length]} maintenance requested at ${prop.name}. Please inspect at earliest convenience.`,
        status: statuses[i % statuses.length],
        assignedWorker: i % 2 === 0 ? 'Ramesh Kumar (Chief Technician)' : 'Suresh Electricians',
        estimatedCost: 500 + (i * 200),
        resolutionNotes: i % 3 === 0 ? 'Work completed and verified by resident.' : '',
        beforeImages: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500']
      });
      complaintCount++;
    }
    console.log(`Created ${complaintCount} Maintenance & Complaint tickets.`);

    // 6. Create System Notifications & Audit Logs
    await Notification.create({
      user: owner._id,
      userModel: 'Owner',
      title: 'Portfolio Initialized',
      message: 'System loaded 5 properties, 11 apartments, and 15 tenant resident profiles successfully.',
      category: 'lease'
    });

    await Notification.create({
      user: owner._id,
      userModel: 'Owner',
      title: 'Rent Collected',
      message: '₹25,000 rent payment received from Anjali Sharma for Greenwood Residency Apt 402.',
      category: 'billing'
    });

    // Notifications for Tenant Anjali Sharma
    const tenant1 = tenants[0];
    await Notification.create({
      user: tenant1._id,
      userModel: 'Tenant',
      title: 'Rent Bill Generated',
      message: 'Your rent bill for July 2026 has been generated. Due date: July 10, 2026.',
      category: 'billing'
    });

    await Notification.create({
      user: tenant1._id,
      userModel: 'Tenant',
      title: 'Payment Confirmed',
      message: 'June 2026 rent payment of ₹29,500 has been verified. Receipt is available for download.',
      category: 'billing'
    });

    await AuditLog.create({
      user: owner._id,
      userModel: 'Owner',
      action: 'System Seed',
      description: 'Owner admin@leasify.com executed full demo environment initialization.',
      ipAddress: '127.0.0.1',
      userAgent: 'Leasify Seed Engine'
    });

    console.log('Database Seeding Complete Successfully!');
    return true;
  } catch (error) {
    console.error('Error during database seeding:', error);
    throw error;
  }
};

if (require.main === module) {
  const connectDB = require('../config/db');
  connectDB().then(async () => {
    await seedDB();
    mongoose.connection.close();
    process.exit(0);
  }).catch(err => {
    console.error('Seed script execution failed:', err);
    process.exit(1);
  });
}

module.exports = seedDB;
