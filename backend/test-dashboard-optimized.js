/**
 * Unit Test Suite for Optimized Dashboard Calculations (Mock-based, ZERO Database Writes)
 */
const reportController = require('./controllers/reportController');
const Property = require('./models/Property');
const Tenant = require('./models/Tenant');
const Apartment = require('./models/Apartment');
const Bill = require('./models/Bill');
const Payment = require('./models/Payment');
const Maintenance = require('./models/Maintenance');
const AuditLog = require('./models/AuditLog');
const mongoose = require('mongoose');

// Helper to mock res
function createMockRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = function(code) {
    res.statusCode = code;
    return res;
  };
  res.json = function(data) {
    res.body = data;
    return res;
  };
  return res;
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// Scoped Date mocking helper for testing 31st-of-month and year transitions
const RealDate = global.Date;
function setMockDate(year, monthIndex, day, hour = 12, min = 0, sec = 0, ms = 0) {
  const fixed = new RealDate(year, monthIndex, day, hour, min, sec, ms);
  class MockDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixed.getTime());
      } else {
        super(...args);
      }
    }
    static now() {
      return fixed.getTime();
    }
  }
  global.Date = MockDate;
  return () => {
    global.Date = RealDate;
  };
}

async function runUnitTests() {
  console.log('======================================================');
  console.log('=== TEST SUITE: OPTIMIZED OWNER DASHBOARD (MOCKS) ===');
  console.log('======================================================\n');

  const ownerA = new mongoose.Types.ObjectId();
  const ownerB = new mongoose.Types.ObjectId();

  const propA1 = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Villa A1',
    owner: ownerA,
    status: 'Occupied',
    monthlyRent: 25000
  };
  const propA2 = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Studio A2',
    owner: ownerA,
    status: 'Vacant',
    monthlyRent: 15000
  };
  const propB1 = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Tower B1',
    owner: ownerB,
    status: 'Occupied',
    monthlyRent: 50000
  };

  const tenantA1 = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Alice',
    owner: ownerA,
    isActive: true,
    securityDeposit: 50000,
    propertyAssigned: propA1._id
  };
  const tenantA2 = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Bob',
    owner: ownerA,
    isActive: false,
    securityDeposit: 30000,
    propertyAssigned: null
  };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Save original find methods
  const origPropFind = Property.find;
  const origTenantFind = Tenant.find;
  const origAptFind = Apartment.find;
  const origBillFind = Bill.find;
  const origPaymentFind = Payment.find;
  const origMaintFind = Maintenance.find;
  const origAuditFind = AuditLog.find;

  try {
    // -----------------------------------------------------------------
    // TEST 1: Empty Owner (Zero properties, Zero tenants)
    // -----------------------------------------------------------------
    console.log('--- TEST 1: Empty Owner (Zero Properties, Zero Tenants) ---');
    Property.find = async () => [];
    Tenant.find = async () => [];
    Apartment.find = async () => [];
    Bill.find = async () => [];
    Payment.find = () => ({
      populate: () => ({
        populate: () => ({
          sort: () => ({
            limit: async () => []
          })
        })
      })
    });
    Maintenance.find = async () => [];
    AuditLog.find = () => ({
      sort: () => ({
        limit: async () => []
      })
    });

    const res1 = createMockRes();
    await reportController.getOwnerDashboard({ user: { id: new mongoose.Types.ObjectId().toString() } }, res1, console.error);

    assert(res1.statusCode === 200, 'HTTP status is 200');
    assert(res1.body.success === true, 'Success flag is true');
    assert(res1.body.stats.totalProperties === 0, 'Total properties is 0');
    assert(res1.body.stats.totalTenants === 0, 'Total tenants is 0');
    assert(res1.body.stats.expectedMonthlyIncome === 0, 'Expected monthly income is 0');
    assert(res1.body.stats.occupancyRate === 0, 'Occupancy rate is 0');
    assert(res1.body.charts.cashFlow.data.every(v => v === 0), 'Cashflow data is all zeros');
    assert(res1.body.charts.cashFlow.labels.length === 6, 'Cashflow labels has 6 months');
    assert(res1.body.charts.propertyYield.labels.length === 0, 'Property yield labels is empty');

    // -----------------------------------------------------------------
    // TEST 2: Multi-Owner Isolation & Calculation Correctness
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: Multi-Owner Isolation & Calculation Correctness ---');

    Property.find = async (query) => {
      if (query.owner.toString() === ownerA.toString()) {
        return [propA1, propA2];
      }
      return [propB1];
    };

    Tenant.find = async (query) => {
      if (query.owner.toString() === ownerA.toString()) {
        return [tenantA1, tenantA2];
      }
      return [];
    };

    Apartment.find = async (query) => {
      const pIds = query.property.$in.map(id => id.toString());
      if (pIds.includes(propA1._id.toString())) {
        return [{ _id: new mongoose.Types.ObjectId(), status: 'Occupied' }, { _id: new mongoose.Types.ObjectId(), status: 'Vacant' }];
      }
      return [];
    };

    Bill.find = async (query) => {
      const pIds = query.property.$in.map(id => id.toString());
      if (pIds.includes(propA1._id.toString())) {
        return [
          { status: 'paid', totalAmount: 25000 },
          { status: 'overdue', totalAmount: 5000 }
        ];
      }
      return [];
    };

    // Payment mock supporting yearly, recent, and 6-month queries
    const paymentA_June = {
      _id: new mongoose.Types.ObjectId(),
      property: propA1._id,
      amount: 25000,
      status: 'success',
      paymentDate: new Date(currentYear, 5, 10) // June 10
    };
    const paymentB_June = {
      _id: new mongoose.Types.ObjectId(),
      property: propB1._id,
      amount: 999999, // Should never appear for Owner A
      status: 'success',
      paymentDate: new Date(currentYear, 5, 10)
    };

    Payment.find = (query) => {
      // Check if it's the chain for recent payments (.populate.populate.sort.limit)
      const isRecentChain = !query.paymentDate;
      if (isRecentChain) {
        return {
          populate: () => ({
            populate: () => ({
              sort: () => ({
                limit: async () => [{
                  _id: paymentA_June._id,
                  amount: paymentA_June.amount,
                  tenant: { name: 'Alice' },
                  property: { name: 'Villa A1' },
                  paymentDate: paymentA_June.paymentDate
                }]
              })
            })
          })
        };
      }

      // Range queries (yearly or 6-month)
      const pIds = query.property.$in.map(id => id.toString());
      const results = [];
      if (pIds.includes(propA1._id.toString())) {
        results.push(paymentA_June);
      }
      // Note: Payment B belongs to propB1, so if query.property.$in only has Owner A's properties, it is never included!
      if (pIds.includes(propB1._id.toString())) {
        results.push(paymentB_June);
      }
      return Promise.resolve(results);
    };

    Maintenance.find = async (query) => {
      const pIds = query.property.$in.map(id => id.toString());
      if (pIds.includes(propA1._id.toString())) {
        return [
          { status: 'pending', category: 'Plumbing' },
          { status: 'resolved', category: 'Electrical' }
        ];
      }
      return [];
    };

    AuditLog.find = () => ({
      sort: () => ({
        limit: async () => [
          { action: 'Login', description: 'Owner A logged in', createdAt: new Date() }
        ]
      })
    });

    const res2 = createMockRes();
    await reportController.getOwnerDashboard({ user: { id: ownerA.toString() } }, res2, console.error);

    assert(res2.statusCode === 200, 'HTTP status is 200');
    assert(res2.body.stats.totalProperties === 2, 'Total properties for Owner A is 2');
    assert(res2.body.stats.occupiedProperties === 1, 'Occupied properties is 1 (Villa A1)');
    assert(res2.body.stats.vacantProperties === 1, 'Vacant properties is 1 (Studio A2)');
    assert(res2.body.stats.occupancyRate === 50, 'Occupancy rate is 50%');
    assert(res2.body.stats.expectedMonthlyIncome === 25000, 'Expected rent is 25000 (Villa A1 only)');
    assert(res2.body.stats.receivedRent === 25000, 'Received rent is 25000');
    assert(res2.body.stats.overdueRent === 5000, 'Overdue rent is 5000');
    assert(res2.body.stats.rentCollectionRate === 100, 'Collection rate is 100%');
    assert(res2.body.stats.totalTenants === 2, 'Total tenants is 2');
    assert(res2.body.stats.activeTenants === 1, 'Active tenants is 1');
    assert(res2.body.stats.inactiveTenants === 1, 'Inactive tenants is 1');
    assert(res2.body.stats.totalSecurityDeposits === 50000, 'Total security deposit is 50000');
    assert(res2.body.stats.refundableDeposits === 50000, 'Refundable deposit is 50000');
    assert(res2.body.stats.totalApartments === 2, 'Total apartments is 2');
    assert(res2.body.stats.occupiedApartments === 1, 'Occupied apartments is 1');
    assert(res2.body.stats.vacantApartments === 1, 'Vacant apartments is 1');
    assert(res2.body.stats.yearlyRevenue === 25000, 'Yearly revenue is 25000 (Owner B revenue 999999 NOT leaked)');
    assert(res2.body.stats.pendingComplaints === 1, 'Pending complaints is 1');
    assert(res2.body.stats.resolvedComplaints === 1, 'Resolved complaints is 1');
    assert(res2.body.recentPayments.length === 1, 'Recent payments count is 1');
    assert(res2.body.recentActivities.length === 1, 'Recent activities count is 1');

    // Check cashflow chart values
    const juneIndex = res2.body.charts.cashFlow.labels.findIndex(l => l.startsWith('Jun'));
    assert(juneIndex !== -1, 'June month exists in 6-month cashflow labels');
    assert(res2.body.charts.cashFlow.data[juneIndex] === 25000, 'June cashflow contains exactly 25000');

    // Check complaints distribution
    const plumbingIndex = res2.body.charts.complaints.labels.indexOf('Plumbing');
    const electricalIndex = res2.body.charts.complaints.labels.indexOf('Electrical');
    assert(res2.body.charts.complaints.data[plumbingIndex] === 1, 'Plumbing complaints count is 1');
    assert(res2.body.charts.complaints.data[electricalIndex] === 1, 'Electrical complaints count is 1');

    // Check property yield
    assert(res2.body.charts.propertyYield.labels.includes('Villa A1'), 'Property yield includes Villa A1');
    assert(!res2.body.charts.propertyYield.labels.includes('Tower B1'), 'Owner B Tower B1 is NOT in property yield');

    // -----------------------------------------------------------------
    // TEST 3: Month Overflow & Consecutive 6-Month Labels on 31st Days
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Month Overflow & Consecutive 6-Month Labels on 31st Days ---');

    // Test March 31 (Critical check: must not skip February!)
    let restoreDate = setMockDate(2026, 2, 31); // March 31, 2026
    let res = createMockRes();
    await reportController.getOwnerDashboard({ user: { id: ownerA.toString() } }, res, console.error);
    restoreDate();
    let labels = res.body.charts.cashFlow.labels;
    assert(labels.length === 6, 'March 31 has 6 cashflow labels');
    assert(labels[0] === 'Oct 2025', 'Label 0 is Oct 2025');
    assert(labels[1] === 'Nov 2025', 'Label 1 is Nov 2025');
    assert(labels[2] === 'Dec 2025', 'Label 2 is Dec 2025');
    assert(labels[3] === 'Jan 2026', 'Label 3 is Jan 2026');
    assert(labels[4] === 'Feb 2026', 'Label 4 is Feb 2026 (February NOT skipped)');
    assert(labels[5] === 'Mar 2026', 'Label 5 is Mar 2026');

    // Test May 31
    restoreDate = setMockDate(2026, 4, 31); // May 31, 2026
    res = createMockRes();
    await reportController.getOwnerDashboard({ user: { id: ownerA.toString() } }, res, console.error);
    restoreDate();
    labels = res.body.charts.cashFlow.labels;
    assert(JSON.stringify(labels) === JSON.stringify(['Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026']),
      'May 31 produces consecutive Dec-Jan-Feb-Mar-Apr-May labels');

    // Test August 31
    restoreDate = setMockDate(2026, 7, 31); // Aug 31, 2026
    res = createMockRes();
    await reportController.getOwnerDashboard({ user: { id: ownerA.toString() } }, res, console.error);
    restoreDate();
    labels = res.body.charts.cashFlow.labels;
    assert(JSON.stringify(labels) === JSON.stringify(['Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026']),
      'Aug 31 produces consecutive Mar-Apr-May-Jun-Jul-Aug labels');

    const formatExpectedLabel = (y, m) => `${new RealDate(y, m, 1).toLocaleString('default', { month: 'short' })} ${y}`;

    // Test October 31
    restoreDate = setMockDate(2026, 9, 31); // Oct 31, 2026
    res = createMockRes();
    await reportController.getOwnerDashboard({ user: { id: ownerA.toString() } }, res, console.error);
    restoreDate();
    labels = res.body.charts.cashFlow.labels;
    const expectedOctLabels = [4, 5, 6, 7, 8, 9].map(m => formatExpectedLabel(2026, m));
    assert(JSON.stringify(labels) === JSON.stringify(expectedOctLabels),
      'Oct 31 produces consecutive 6-month labels');

    // Test December 31
    restoreDate = setMockDate(2026, 11, 31); // Dec 31, 2026
    res = createMockRes();
    await reportController.getOwnerDashboard({ user: { id: ownerA.toString() } }, res, console.error);
    restoreDate();
    labels = res.body.charts.cashFlow.labels;
    const expectedDecLabels = [6, 7, 8, 9, 10, 11].map(m => formatExpectedLabel(2026, m));
    assert(JSON.stringify(labels) === JSON.stringify(expectedDecLabels),
      'Dec 31 produces consecutive 6-month labels');

    // -----------------------------------------------------------------
    // TEST 4: January/December Year Transitions
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: January/December Year Transitions ---');
    restoreDate = setMockDate(2027, 0, 15); // Jan 15, 2027
    res = createMockRes();
    await reportController.getOwnerDashboard({ user: { id: ownerA.toString() } }, res, console.error);
    restoreDate();
    labels = res.body.charts.cashFlow.labels;
    assert(labels[4] === formatExpectedLabel(2026, 11), 'Month before current is Dec 2026');
    assert(labels[5] === formatExpectedLabel(2027, 0), 'Current month is Jan 2027');
    const expectedJanLabels = [
      formatExpectedLabel(2026, 7),
      formatExpectedLabel(2026, 8),
      formatExpectedLabel(2026, 9),
      formatExpectedLabel(2026, 10),
      formatExpectedLabel(2026, 11),
      formatExpectedLabel(2027, 0)
    ];
    assert(JSON.stringify(labels) === JSON.stringify(expectedJanLabels),
      'Jan 2027 correctly transitions year from 2026 to 2027');

    // -----------------------------------------------------------------
    // TEST 5: Month Boundaries & Complete Month-End Coverage
    // -----------------------------------------------------------------
    console.log('\n--- TEST 5: Month Boundaries & Complete Month-End Coverage ---');
    restoreDate = setMockDate(2026, 9, 20); // Current date in Oct 2026
    // Months are: May 2026 (0), Jun 2026 (1), Jul 2026 (2), Aug 2026 (3), Sep 2026 (4), Oct 2026 (5)
    let capturedQuery = null;

    Payment.find = (query) => {
      if (!query.paymentDate) {
        return {
          populate: () => ({ populate: () => ({ sort: () => ({ limit: async () => [] }) }) })
        };
      }
      if (query.paymentDate.$lt) {
        // This is the 6-month cashflow query
        capturedQuery = query;
        return Promise.resolve([
          // Boundary 1: First millisecond of earliest month (May 1 00:00:00.000)
          { amount: 1000, paymentDate: new RealDate(2026, 4, 1, 0, 0, 0, 0) },
          // Boundary 2: Final millisecond of May (May 31 23:59:59.999)
          { amount: 2000, paymentDate: new RealDate(2026, 4, 31, 23, 59, 59, 999) },
          // Boundary 3: First millisecond of June (Jun 1 00:00:00.000)
          { amount: 3000, paymentDate: new RealDate(2026, 5, 1, 0, 0, 0, 0) },
          // Boundary 4: Mid-month payment (Jun 15 14:30:00.000)
          { amount: 4000, paymentDate: new RealDate(2026, 5, 15, 14, 30, 0, 0) },
          // Boundary 5: Final millisecond of June (Jun 30 23:59:59.999)
          { amount: 5000, paymentDate: new RealDate(2026, 5, 30, 23, 59, 59, 999) },
          // Boundary 6: Final millisecond of current month Oct (Oct 31 23:59:59.999)
          { amount: 10000, paymentDate: new RealDate(2026, 9, 31, 23, 59, 59, 999) },
          // Out of bounds: should never be binned even if returned
          { amount: 99999, paymentDate: new RealDate(2026, 3, 30, 23, 59, 59, 999) }, // April (before earliest)
          { amount: 99999, paymentDate: new RealDate(2026, 10, 1, 0, 0, 0, 0) }        // Nov 1 (after latest)
        ]);
      }
      return Promise.resolve([]);
    };

    res = createMockRes();
    await reportController.getOwnerDashboard({ user: { id: ownerA.toString() } }, res, console.error);
    restoreDate();

    // Verify MongoDB query boundary parameters
    assert(capturedQuery !== null, '6-month payment query was executed');
    const expectedEarliest = new RealDate(2026, 4, 1, 0, 0, 0, 0).getTime();
    const expectedLatest = new RealDate(2026, 10, 1, 0, 0, 0, 0).getTime();
    assert(capturedQuery.paymentDate.$gte.getTime() === expectedEarliest, 'Query $gte is start of May 2026 (00:00:00.000)');
    assert(capturedQuery.paymentDate.$lt.getTime() === expectedLatest, 'Query $lt is start of Nov 2026 (end-exclusive 00:00:00.000)');

    // Verify binning calculations
    const cData = res.body.charts.cashFlow.data;
    assert(cData[0] === 3000, 'May cashflow includes both 00:00:00.000 and 23:59:59.999 (1000 + 2000 = 3000)');
    assert(cData[1] === 12000, 'Jun cashflow includes 1st day, mid month, and last day 23:59:59.999 (3000 + 4000 + 5000 = 12000)');
    assert(cData[2] === 0, 'Jul cashflow is 0 (empty month)');
    assert(cData[3] === 0, 'Aug cashflow is 0 (empty month)');
    assert(cData[4] === 0, 'Sep cashflow is 0 (empty month)');
    assert(cData[5] === 10000, 'Oct cashflow includes 23:59:59.999 on final day (10000)');
    assert(!cData.includes(99999), 'Out of bounds payments are not included in any bin');

    // -----------------------------------------------------------------
    // TEST 6: Defensive Payment Handling (Dates & Amounts)
    // -----------------------------------------------------------------
    console.log('\n--- TEST 6: Defensive Payment Handling (Dates & Amounts) ---');
    restoreDate = setMockDate(2026, 9, 20); // Oct 2026

    Payment.find = (query) => {
      if (!query.paymentDate) {
        return {
          populate: () => ({ populate: () => ({ sort: () => ({ limit: async () => [] }) }) })
        };
      }
      if (query.paymentDate.$lt) {
        return Promise.resolve([
          // Missing / invalid dates:
          { amount: 5000, paymentDate: null },
          { amount: 5000, paymentDate: undefined },
          { amount: 5000, paymentDate: 'invalid-date-string' },
          { amount: 5000, paymentDate: new RealDate('not-a-date') },
          // Missing / null / invalid amounts in valid Oct date:
          { amount: null, paymentDate: new RealDate(2026, 9, 5) },
          { amount: undefined, paymentDate: new RealDate(2026, 9, 5) },
          { amount: 'unpaid', paymentDate: new RealDate(2026, 9, 5) },
          { amount: NaN, paymentDate: new RealDate(2026, 9, 5) },
          { amount: {}, paymentDate: new RealDate(2026, 9, 5) },
          // Valid variations:
          { amount: '4500', paymentDate: new RealDate(2026, 9, 10) },     // numeric string
          { amount: 0, paymentDate: new RealDate(2026, 9, 12) },          // zero
          { amount: -500, paymentDate: new RealDate(2026, 9, 15) },       // negative adjustment
          { amount: 6000, paymentDate: new RealDate(2026, 9, 20) }        // standard number
        ]);
      }
      return Promise.resolve([]);
    };

    res = createMockRes();
    await reportController.getOwnerDashboard({ user: { id: ownerA.toString() } }, res, console.error);
    restoreDate();

    const defCashData = res.body.charts.cashFlow.data;
    assert(defCashData.every(v => typeof v === 'number' && !isNaN(v)), 'All cashflow values are valid numbers, none is NaN');
    assert(defCashData[5] === 10000, 'Oct sum handles numeric string, zero, negative, and ignores invalid amounts (4500 + 0 - 500 + 6000 = 10000)');

    // -----------------------------------------------------------------
    // TEST 7: Empty Months & Chart Ordering Preservation
    // -----------------------------------------------------------------
    console.log('\n--- TEST 7: Empty Months & Chart Ordering Preservation ---');
    restoreDate = setMockDate(2026, 9, 20); // Oct 2026

    Payment.find = (query) => {
      if (!query.paymentDate) {
        return {
          populate: () => ({ populate: () => ({ sort: () => ({ limit: async () => [] }) }) })
        };
      }
      if (query.paymentDate.$lt) {
        return Promise.resolve([
          // Only Jun (index 1) and Sep (index 4) have payments
          { amount: 7500, paymentDate: new RealDate(2026, 5, 10) },
          { amount: 15000, paymentDate: new RealDate(2026, 8, 15) }
        ]);
      }
      return Promise.resolve([]);
    };

    res = createMockRes();
    await reportController.getOwnerDashboard({ user: { id: ownerA.toString() } }, res, console.error);
    restoreDate();

    const orderedData = res.body.charts.cashFlow.data;
    assert(orderedData.length === 6, 'Cashflow data length is 6');
    assert(JSON.stringify(orderedData) === JSON.stringify([0, 7500, 0, 0, 15000, 0]),
      'Empty months maintain exact zero padding in correct order ([0, 7500, 0, 0, 15000, 0])');

    // -----------------------------------------------------------------
    // TEST 8: Yearly Payments Calendar-Year Range & Boundaries
    // -----------------------------------------------------------------
    console.log('\n--- TEST 8: Yearly Payments Calendar-Year Range & Boundaries ---');
    restoreDate = setMockDate(2026, 5, 15); // June 15, 2026
    let yearlyQueryCaptured = null;

    // Payments for Owner A's property (Villa A1)
    const p_jan1_start = {
      _id: new mongoose.Types.ObjectId(),
      property: propA1._id,
      amount: 10000,
      paymentDate: new RealDate(2026, 0, 1, 0, 0, 0, 0) // Jan 1 00:00:00.000
    };
    const p_dec31_midday = {
      _id: new mongoose.Types.ObjectId(),
      property: propA1._id,
      amount: 20000,
      paymentDate: new RealDate(2026, 11, 31, 12, 0, 0, 0) // Dec 31 12:00:00.000
    };
    const p_dec31_late = {
      _id: new mongoose.Types.ObjectId(),
      property: propA1._id,
      amount: 30000,
      paymentDate: new RealDate(2026, 11, 31, 23, 59, 59, 999) // Dec 31 23:59:59.999
    };
    const p_next_year_start = {
      _id: new mongoose.Types.ObjectId(),
      property: propA1._id,
      amount: 40000,
      paymentDate: new RealDate(2027, 0, 1, 0, 0, 0, 0) // Jan 1 2027 00:00:00.000 (following year)
    };
    const p_owner_b_yearly = {
      _id: new mongoose.Types.ObjectId(),
      property: propB1._id,
      amount: 999999, // Belongs to Owner B
      paymentDate: new RealDate(2026, 5, 15, 12, 0, 0, 0)
    };

    Payment.find = (query, projection) => {
      if (!query.paymentDate) {
        // Recent payments chain
        return {
          populate: () => ({ populate: () => ({ sort: () => ({ limit: async () => [] }) }) })
        };
      }
      if (projection === 'amount paymentDate') {
        // 6-month cashflow query
        return Promise.resolve([]);
      }
      // Yearly payments query
      yearlyQueryCaptured = query;
      const pIds = query.property.$in.map(id => id.toString());
      const allYearlyCandidates = [p_jan1_start, p_dec31_midday, p_dec31_late, p_next_year_start, p_owner_b_yearly];

      // Filter candidates based on actual MongoDB query criteria
      const results = allYearlyCandidates.filter(p => {
        // Multi-owner property isolation
        if (!pIds.includes(p.property.toString())) return false;
        // Date range filtering: $gte Jan 1 current year, $lt Jan 1 next year
        const pTime = p.paymentDate.getTime();
        const gteTime = query.paymentDate.$gte.getTime();
        const ltTime = query.paymentDate.$lt.getTime();
        return pTime >= gteTime && pTime < ltTime;
      });

      return Promise.resolve(results);
    };

    res = createMockRes();
    await reportController.getOwnerDashboard({ user: { id: ownerA.toString() } }, res, console.error);
    restoreDate();

    // 1. Verify query boundaries
    assert(yearlyQueryCaptured !== null, 'Yearly payment query was captured');
    const expectedJan1 = new RealDate(2026, 0, 1, 0, 0, 0, 0).getTime();
    const expectedNextJan1 = new RealDate(2027, 0, 1, 0, 0, 0, 0).getTime();
    assert(yearlyQueryCaptured.paymentDate.$gte.getTime() === expectedJan1, 'Yearly query $gte is Jan 1 00:00:00.000 of current year');
    assert(yearlyQueryCaptured.paymentDate.$lt.getTime() === expectedNextJan1, 'Yearly query $lt is Jan 1 00:00:00.000 of next year ($lt end-exclusive)');

    // 2. Verify financial totals
    assert(res.body.stats.yearlyRevenue === 60000,
      'Yearly revenue is 60000: includes Jan 1 start (10k), Dec 31 midday (20k), Dec 31 23:59:59.999 (30k); excludes next year (40k) and Owner B (999k)');

    // 3. Verify property yield totals and multi-owner isolation
    const villaIndex = res.body.charts.propertyYield.labels.indexOf('Villa A1');
    assert(villaIndex !== -1, 'Villa A1 is present in property yield');
    assert(res.body.charts.propertyYield.data[villaIndex] === 60000, 'Villa A1 property yield matches exactly 60000');
    assert(!res.body.charts.propertyYield.labels.includes('Tower B1'), 'Owner B property Tower B1 is NOT leaked into property yield');

  } finally {
    // Restore original methods
    Property.find = origPropFind;
    Tenant.find = origTenantFind;
    Apartment.find = origAptFind;
    Bill.find = origBillFind;
    Payment.find = origPaymentFind;
    Maintenance.find = origMaintFind;
    AuditLog.find = origAuditFind;
  }

  console.log(`\n======================================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================`);
  if (failed > 0) process.exit(1);
}

runUnitTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
