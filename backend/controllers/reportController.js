const Property = require('../models/Property');
const Apartment = require('../models/Apartment');
const Tenant = require('../models/Tenant');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Maintenance = require('../models/Maintenance');
const AuditLog = require('../models/AuditLog');

// @desc    Get Owner Dashboard Statistics & Chart Data
// @route   GET /api/v1/reports/owner-dashboard
// @access  Private (Owner Only)
exports.getOwnerDashboard = async (req, res, next) => {
  try {
    const ownerId = req.user.id;

    // Fetch Owner's properties & active tenants
    const properties = await Property.find({ owner: ownerId });
    const propertyIds = properties.map(p => p._id);
    
    const allTenants = await Tenant.find({ owner: ownerId });
    const totalTenants = allTenants.length;
    const activeTenants = allTenants.filter(t => t.isActive).length;
    const inactiveTenants = totalTenants - activeTenants;

    const apartments = await Apartment.find({ property: { $in: propertyIds } });
    const totalApartments = apartments.length;
    const vacantApartments = apartments.filter(a => a.status === 'Vacant').length;
    const occupiedApartments = apartments.filter(a => a.status === 'Occupied').length;

    const tenants = allTenants.filter(t => t.isActive);
    const tenantIds = tenants.map(t => t._id);

    // Property stats
    const totalProperties = properties.length;
    const occupiedProperties = properties.filter(p => p.status === 'Occupied').length;
    const vacantProperties = properties.filter(p => p.status === 'Vacant').length;
    const maintenanceProperties = properties.filter(p => p.status === 'Under Maintenance').length;
    const reservedProperties = properties.filter(p => p.status === 'Reserved').length;
    const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

    // Monthly Rent analytics
    // Expected income = Sum of monthlyRent of all Occupied properties
    let expectedMonthlyIncome = 0;
    properties.forEach(p => {
      if (p.status === 'Occupied') {
        expectedMonthlyIncome += p.monthlyRent;
      }
    });

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const currentYear = now.getFullYear();

    // Fetch bills for current month & year
    const monthlyBills = await Bill.find({
      property: { $in: propertyIds },
      month: currentMonth,
      year: currentYear
    });

    let receivedRent = 0;
    let pendingRent = 0;
    let overdueRent = 0;

    monthlyBills.forEach(b => {
      if (b.status === 'paid') {
        receivedRent += b.totalAmount;
      } else if (b.status === 'overdue') {
        overdueRent += b.totalAmount;
      } else {
        pendingRent += b.totalAmount;
      }
    });

    // Also calculate total security deposits held
    let totalSecurityDeposits = 0;
    let refundableDeposits = 0;
    tenants.forEach(t => {
      totalSecurityDeposits += t.securityDeposit;
      if (t.propertyAssigned) {
        refundableDeposits += t.securityDeposit;
      }
    });

    // Yearly Revenue
    const yearlyPayments = await Payment.find({
      property: { $in: propertyIds },
      status: 'success',
      paymentDate: {
        $gte: new Date(currentYear, 0, 1),
        $lte: new Date(currentYear, 11, 31)
      }
    });
    
    let yearlyRevenue = 0;
    yearlyPayments.forEach(p => {
      yearlyRevenue += p.amount;
    });

    // Rent collection rate
    const rentCollectionRate = expectedMonthlyIncome > 0 ? Math.round((receivedRent / expectedMonthlyIncome) * 100) : 0;

    // Maintenance ticket stats
    const maintenanceTickets = await Maintenance.find({ property: { $in: propertyIds } });
    const pendingComplaints = maintenanceTickets.filter(t => t.status === 'pending').length;
    const activeComplaints = maintenanceTickets.filter(t => t.status === 'accepted').length;
    const resolvedComplaints = maintenanceTickets.filter(t => t.status === 'resolved').length;

    // Recent Payments
    const recentPayments = await Payment.find({ property: { $in: propertyIds }, status: 'success' })
      .populate('tenant', 'name profilePhoto')
      .populate('property', 'name')
      .sort({ paymentDate: -1 })
      .limit(5);

    // Recent Audit Logs
    const recentActivities = await AuditLog.find({ user: ownerId })
      .sort({ createdAt: -1 })
      .limit(6);

    // Chart Data calculations:
    // 1. Monthly cashflow (last 6 months)
    const cashFlowData = [];
    const cashFlowLabels = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const monthName = d.toLocaleString('default', { month: 'short' });
      
      const monthlySum = await Payment.find({
        property: { $in: propertyIds },
        status: 'success',
        paymentDate: {
          $gte: new Date(y, m - 1, 1),
          $lte: new Date(y, m, 0)
        }
      });
      
      let sum = 0;
      monthlySum.forEach(p => sum += p.amount);
      cashFlowData.push(sum);
      cashFlowLabels.push(`${monthName} ${y}`);
    }

    // 2. Complaint Categories Distribution
    const complaintCategories = ['Electrical', 'Water', 'Plumbing', 'Cleaning', 'Internet', 'Security', 'Furniture', 'Others'];
    const complaintData = complaintCategories.map(cat => {
      return maintenanceTickets.filter(t => t.category === cat).length;
    });

    // 3. Property Yields (Top properties by revenue)
    const propertyRevenueMap = {};
    properties.forEach(p => {
      propertyRevenueMap[p.name] = 0;
    });
    yearlyPayments.forEach(pay => {
      // Find property name
      const prop = properties.find(p => p._id.toString() === pay.property.toString());
      if (prop) {
        propertyRevenueMap[prop.name] = (propertyRevenueMap[prop.name] || 0) + pay.amount;
      }
    });
    const propertyLabels = Object.keys(propertyRevenueMap).slice(0, 5);
    const propertyData = Object.values(propertyRevenueMap).slice(0, 5);

    res.status(200).json({
      success: true,
      stats: {
        totalProperties,
        occupiedProperties,
        vacantProperties,
        maintenanceProperties,
        reservedProperties,
        occupancyRate,
        totalTenants,
        activeTenants,
        inactiveTenants,
        totalApartments,
        vacantApartments,
        occupiedApartments,
        expectedMonthlyIncome,
        receivedRent,
        pendingRent,
        overdueRent,
        yearlyRevenue,
        totalSecurityDeposits,
        refundableDeposits,
        rentCollectionRate,
        pendingComplaints,
        activeComplaints,
        resolvedComplaints
      },
      recentPayments,
      recentActivities,
      charts: {
        cashFlow: { labels: cashFlowLabels, data: cashFlowData },
        complaints: { labels: complaintCategories, data: complaintData },
        propertyYield: { labels: propertyLabels, data: propertyData }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Tenant Dashboard Statistics
// @route   GET /api/v1/reports/tenant-dashboard
// @access  Private (Tenant Only)
exports.getTenantDashboard = async (req, res, next) => {
  try {
    const tenantId = req.user.id;
    const tenant = await Tenant.findById(tenantId).populate({
      path: 'propertyAssigned',
      populate: { path: 'owner', select: 'name email contactNumber profilePhoto' }
    });

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Bills
    const bills = await Bill.find({ tenant: tenantId }).sort({ createdAt: -1 });
    const pendingBill = bills.find(b => b.status === 'unpaid' || b.status === 'overdue');
    const paymentHistory = await Payment.find({ tenant: tenantId, status: 'success' })
      .populate('bill', 'invoiceNumber month year')
      .sort({ paymentDate: -1 })
      .limit(5);

    // Maintenance requests
    const complaints = await Maintenance.find({ tenant: tenantId }).sort({ createdAt: -1 });
    const activeComplaintsCount = complaints.filter(c => c.status === 'pending' || c.status === 'accepted').length;

    // Days remaining in lease
    let daysRemaining = 0;
    if (tenant.leaseEndDate) {
      const today = new Date();
      const end = new Date(tenant.leaseEndDate);
      const diffTime = end - today;
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    res.status(200).json({
      success: true,
      tenantDetails: tenant,
      property: tenant.propertyAssigned || null,
      pendingBill: pendingBill || null,
      daysRemaining,
      stats: {
        totalBills: bills.length,
        pendingBills: bills.filter(b => b.status === 'unpaid' || b.status === 'overdue').length,
        activeComplaints: activeComplaintsCount,
        totalPaid: bills.filter(b => b.status === 'paid').length
      },
      paymentHistory,
      complaintsList: complaints.slice(0, 5)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Reports Data (Returns raw rows for CSV / Excel conversion)
// @route   GET /api/v1/reports/export/:type
// @access  Private (Owner Only)
exports.exportReportData = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const reportType = req.params.type; // 'financial' | 'properties' | 'tenants' | 'maintenance'

    const properties = await Property.find({ owner: ownerId });
    const propertyIds = properties.map(p => p._id);

    let exportData = [];

    switch (reportType) {
      case 'financial':
        const payments = await Payment.find({ property: { $in: propertyIds }, status: 'success' })
          .populate('property', 'name')
          .populate('tenant', 'name email')
          .populate('bill', 'invoiceNumber month year rent totalAmount');
          
        exportData = payments.map(p => ({
          'Date': new Date(p.paymentDate).toLocaleDateString(),
          'Transaction ID': p.transactionId,
          'Property': p.property ? p.property.name : 'Unknown',
          'Tenant Name': p.tenant ? p.tenant.name : 'Unknown',
          'Billing Period': p.bill ? `${p.bill.month}/${p.bill.year}` : 'N/A',
          'Invoice Number': p.bill ? p.bill.invoiceNumber : 'N/A',
          'Rent Amount': p.bill ? p.bill.rent : 0,
          'Total Paid (INR)': p.amount,
          'Payment Mode': (p.isDemo || p.paymentMethod === 'Demo') ? 'Demo Simulation' : p.paymentMethod
        }));
        break;

      case 'properties':
        exportData = properties.map(p => ({
          'Property Name': p.name,
          'Type': p.type,
          'Rent (INR)': p.monthlyRent,
          'Deposit (INR)': p.securityDeposit,
          'Status': p.status,
          'Address': `${p.address.houseNumber}, ${p.address.street}, ${p.address.area}, ${p.address.city}, ${p.address.pincode}`,
          'Furnished Status': p.furnishedStatus,
          'Rooms': `${p.bedrooms} BHK`
        }));
        break;

      case 'tenants':
        const tenants = await Tenant.find({ owner: ownerId })
          .populate('propertyAssigned', 'name');
          
        exportData = tenants.map(t => ({
          'Tenant Name': t.name,
          'Email': t.email,
          'Phone': t.phone,
          'Occupation': t.occupation,
          'Assigned Property': t.propertyAssigned ? t.propertyAssigned.name : 'Unassigned',
          'Rent (INR)': t.monthlyRent,
          'Lease Start': new Date(t.leaseStartDate).toLocaleDateString(),
          'Lease End': new Date(t.leaseEndDate).toLocaleDateString(),
          'Status': t.isActive ? 'Active' : 'Moved Out / Deactivated'
        }));
        break;

      case 'maintenance':
        const complaints = await Maintenance.find({ property: { $in: propertyIds } })
          .populate('property', 'name')
          .populate('tenant', 'name');
          
        exportData = complaints.map(c => ({
          'ID': c.complaintId,
          'Property': c.property ? c.property.name : 'Unknown',
          'Tenant Name': c.tenant ? c.tenant.name : 'Unknown',
          'Category': c.category,
          'Priority': c.priority,
          'Description': c.description,
          'Status': c.status,
          'Assigned Worker': c.assignedWorker || 'Unassigned',
          'Estimated Cost': c.estimatedCost,
          'Completion Date': c.completionDate ? new Date(c.completionDate).toLocaleDateString() : 'Pending'
        }));
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid report export type' });
    }

    res.status(200).json({
      success: true,
      data: exportData
    });
  } catch (error) {
    next(error);
  }
};
