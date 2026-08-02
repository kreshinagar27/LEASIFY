import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { CashFlowChart, ComplaintsDistributionChart, PropertyYieldChart } from '../components/Charts';
import {
  Building,
  Users,
  CreditCard,
  Wrench,
  TrendingUp,
  AlertTriangle,
  History,
  Shield,
  FileCheck,
  MapPin,
  Mail,
  Phone,
  CalendarDays,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const endpoint = user.role === 'owner' ? '/reports/owner-dashboard' : '/reports/tenant-dashboard';
      const { data } = await apiClient.get(endpoint);
      if (data.success) {
        setData(data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 lg:col-span-2 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (user.role === 'owner') {
    // ==========================================
    // OWNER DASHBOARD RENDER
    // ==========================================
    const stats = data?.stats || {};
    const recentPayments = data?.recentPayments || [];
    const recentActivities = data?.recentActivities || [];
    const charts = data?.charts || {};

    return (
      <div className="space-y-6">
        {/* Title greeting */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white Outfit">Owner Dashboard</h1>
            <p className="text-xs text-slate-500">Welcome, Rajesh. Here is a summary of your portfolio yield.</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Current Period: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expected monthly Rent</span>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">INR {stats.expectedMonthlyIncome?.toLocaleString() || 0}</h3>
              <span className="text-[9px] text-brand-500 mt-1 block flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />Occupancy Yield</span>
            </div>
            <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl"><Building className="w-6 h-6" /></div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rent Received</span>
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">INR {stats.receivedRent?.toLocaleString() || 0}</h3>
              <span className="text-[9px] text-slate-400 mt-1 block">Collection Rate: {stats.rentCollectionRate}%</span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><CreditCard className="w-6 h-6" /></div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending / Overdue</span>
              <h3 className="text-xl font-bold text-red-500 mt-1">INR {(stats.pendingRent + stats.overdueRent)?.toLocaleString() || 0}</h3>
              <span className="text-[9px] text-slate-400 mt-1 block">Late Fee applied</span>
            </div>
            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Occupancy Rate</span>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{stats.occupancyRate}%</h3>
              <span className="text-[9px] text-slate-400 mt-1 block">Units: {stats.occupiedProperties}/{stats.totalProperties}</span>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><Users className="w-6 h-6" /></div>
          </div>
        </div>

        {/* Graphical Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4">Cash Flow History (Last 6 Months)</h4>
            <CashFlowChart labels={charts.cashFlow?.labels} data={charts.cashFlow?.data} />
          </div>
          
          <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-2">Complaint Categories</h4>
            <ComplaintsDistributionChart labels={charts.complaints?.labels} data={charts.complaints?.data} />
          </div>
        </div>

        {/* Secondary Charts / Top properties revenue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4">Top Yield Properties (INR)</h4>
            <PropertyYieldChart labels={charts.propertyYield?.labels} data={charts.propertyYield?.data} />
          </div>

          {/* Recent Payments Ledger */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Recent Collections</h4>
                <Link to="/payments" className="text-xs text-brand-500 hover:underline">View All</Link>
              </div>
              <div className="space-y-3">
                {recentPayments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No collections logged.</p>
                ) : (
                  recentPayments.map((pay, i) => (
                    <div key={i} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50">
                      <div className="flex items-center gap-2">
                        <img src={pay.tenant?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50'} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-300">{pay.tenant?.name || 'Moved Tenant'}</p>
                          <p className="text-[10px] text-slate-400">{pay.property?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">+INR {pay.amount}</span>
                        <span className="block text-[9px] text-slate-400">{new Date(pay.paymentDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Activity Logs timelines */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-brand-500" /> Security Audits
                </h4>
                <Link to="/audit-logs" className="text-xs text-brand-500 hover:underline">Audits</Link>
              </div>
              <div className="space-y-3">
                {recentActivities.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No logs generated.</p>
                ) : (
                  recentActivities.map((act, i) => (
                    <div key={i} className="flex gap-2 items-start text-[11px] p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50">
                      <History className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{act.action}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{act.description}</p>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{new Date(act.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    // ==========================================
    // TENANT DASHBOARD RENDER
    // ==========================================
    const tenant = data?.tenantDetails || {};
    const property = data?.property || null;
    const pendingBill = data?.pendingBill || null;
    const daysRemaining = data?.daysRemaining || 0;
    const tStats = data?.stats || {};
    const paymentHistory = data?.paymentHistory || [];
    const complaintsList = data?.complaintsList || [];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white Outfit">Welcome back, {tenant.name}</h1>
            <p className="text-xs text-slate-500">Your portal for billing, payments, and property maintenance.</p>
          </div>
          {property && (
            <span className="text-xs bg-brand-500/10 text-brand-500 px-3 py-1 rounded-full font-semibold border border-brand-500/20">
              Resident: {property.name}
            </span>
          )}
        </div>

        {/* Top summary row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Rent Due Widget */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Outstanding Bill</span>
              {pendingBill ? (
                <div className="mt-2">
                  <h3 className="text-2xl font-bold text-red-500">INR {pendingBill.totalAmount.toLocaleString()}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Due: {new Date(pendingBill.dueDate).toLocaleDateString()}
                  </p>
                  {pendingBill.status === 'overdue' && (
                    <span className="inline-block mt-2 text-[9px] font-bold px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full uppercase">
                      Overdue (Late Fee Charged)
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-3 py-2 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <FileCheck className="w-5 h-5" />
                  <span className="text-sm font-semibold">Rent Account fully settled!</span>
                </div>
              )}
            </div>
            {pendingBill && (
              <Link
                to={`/bills`}
                className="mt-4 w-full py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-center text-xs font-bold shadow-lg shadow-brand-500/20 transition-all block"
              >
                Pay Bill Online
              </Link>
            )}
          </div>

          {/* Lease Progress widget */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lease Duration Left</span>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{daysRemaining} Days</h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  Agreement ends: {tenant.leaseEndDate ? new Date(tenant.leaseEndDate).toLocaleDateString() : 'N/A'}
                </p>
                {/* Visual Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-brand-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round((daysRemaining / 365) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
            {tenant.leaseAgreementUrl && (
              <a
                href={tenant.leaseAgreementUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 w-full py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                View Lease Agreement <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Landlord Contact Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Owner Contact Info</span>
              {property?.owner ? (
                <div className="flex items-center gap-3 mt-3">
                  <img
                    src={property.owner.profilePhoto || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100'}
                    alt="Owner"
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{property.owner.name}</h4>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Landlord</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-2">Unassigned Landlord</p>
              )}
            </div>
            {property?.owner && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                <a
                  href={`tel:${property.owner.contactNumber}`}
                  className="py-2 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-center text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Owner
                </a>
                <a
                  href={`mailto:${property.owner.email}`}
                  className="py-2 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-center text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Property specs & coordinates */}
        {property && (
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4">Assigned Rental Unit Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <p><strong className="text-slate-800 dark:text-slate-200">Unit Type:</strong> {property.type.toUpperCase()}</p>
                <p><strong className="text-slate-800 dark:text-slate-200">Monthly Base Rent:</strong> INR {property.monthlyRent?.toLocaleString()}</p>
                <p><strong className="text-slate-800 dark:text-slate-200">Security Deposit:</strong> INR {property.securityDeposit?.toLocaleString()}</p>
              </div>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <p><strong className="text-slate-800 dark:text-slate-200">Address:</strong></p>
                <p>{property.address.houseNumber}, {property.address.street}, {property.address.area}</p>
                <p>{property.address.city}, {property.address.state} - {property.address.pincode}</p>
              </div>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <p><strong className="text-slate-800 dark:text-slate-200">Amenities:</strong></p>
                <div className="flex flex-wrap gap-1.5">
                  {property.amenities.map(a => (
                    <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ledger logs & complaints lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bills list */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Payment Ledger History</h4>
              <Link to="/bills" className="text-xs text-brand-500 hover:underline">Ledger</Link>
            </div>
            <div className="space-y-2">
              {paymentHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No payment logs available.</p>
              ) : (
                paymentHistory.map((pay, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Invoice: {pay.bill?.invoiceNumber || 'Manual Receipt'}</p>
                      <span className="text-[9px] text-slate-400 block font-mono">{new Date(pay.paymentDate).toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">INR {pay.amount?.toLocaleString()}</span>
                      <span className="block text-[9px] text-slate-400 uppercase font-semibold">{pay.paymentMethod}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Maintenance list */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Recent Complaints & Repairs</h4>
              <Link to="/maintenance" className="text-xs text-brand-500 hover:underline">New Ticket</Link>
            </div>
            <div className="space-y-2">
              {complaintsList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No support tickets raised.</p>
              ) : (
                complaintsList.map((comp, i) => {
                  let badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                  if (comp.status === 'resolved') badgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                  if (comp.status === 'rejected') badgeColor = 'bg-red-500/10 text-red-500 border-red-500/20';

                  return (
                    <div key={i} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{comp.category}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">{comp.description}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        {comp.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default Dashboard;
