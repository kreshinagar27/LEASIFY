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
  ExternalLink,
  Plus,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Layers,
  AlertCircle,
  FileText
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
        <div className="h-28 bg-[#E9DFD0]/60 dark:bg-[#2A1D18]/60 rounded-3xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-[#E9DFD0]/50 dark:bg-[#2A1D18]/50 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 lg:col-span-2 bg-[#E9DFD0]/50 dark:bg-[#2A1D18]/50 rounded-3xl"></div>
          <div className="h-80 bg-[#E9DFD0]/50 dark:bg-[#2A1D18]/50 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 1. PROPERTY OWNER DASHBOARD
  // =========================================================================
  if (user?.role === 'owner') {
    const stats = data?.stats || {};
    const recentPayments = data?.recentPayments || [];
    const recentActivities = data?.recentActivities || [];
    const charts = data?.charts || {};

    const formattedExpected = stats.expectedMonthlyIncome ? Number(stats.expectedMonthlyIncome).toLocaleString() : '0';
    const formattedReceived = stats.receivedRent ? Number(stats.receivedRent).toLocaleString() : '0';
    const totalPending = (Number(stats.pendingRent || 0) + Number(stats.overdueRent || 0)).toLocaleString();

    return (
      <div className="space-y-6">
        {/* Welcome Hero Banner */}
        <div className="glass-panel-elevated p-6 sm:p-8 rounded-[2rem] border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] relative overflow-hidden shadow-sm">
          <div className="absolute right-0 top-0 w-96 h-96 bg-[#D97706]/10 dark:bg-[#4A1715]/30 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6DACC] dark:bg-[#352920] text-[#4A1917] dark:text-[#D1C1B0] text-xs font-bold mb-3 border border-[#D9CABB] dark:border-[rgba(230,211,191,0.15)]">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>Executive Portfolio Overview</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#39251F] dark:text-[#F6EEE3] Outfit tracking-tight">
                Welcome back, {user?.name?.split(' ')[0] || 'Landlord'}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-[#77665A] dark:text-[#D1C1B0] mt-1 max-w-xl">
                Here is your live real estate performance snapshot. Occupancy is at{' '}
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{stats.occupancyRate || 0}%</span>{' '}
                with <span className="font-bold text-brand-600 dark:text-brand-300">{stats.occupiedProperties || 0} active units</span>.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/properties"
                className="inline-flex items-center gap-2 px-4 py-2.5 btn-primary-glow text-[#FAF7F1] text-xs font-bold rounded-full shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Property</span>
              </Link>
              <Link
                to="/bills"
                className="inline-flex items-center gap-2 px-4 py-2.5 glass-panel text-[#39251F] dark:text-[#F6EEE3] hover:text-[#4A1917] text-xs font-bold rounded-full border border-[#D9CABB]/80 dark:border-[rgba(230,211,191,0.15)] transition-all hover:bg-[#E6DACC]/60 cursor-pointer shadow-xs"
              >
                <FileText className="w-4 h-4" />
                <span>Generate Invoices</span>
              </Link>
              <Link
                to="/tenants"
                className="inline-flex items-center gap-2 px-4 py-2.5 glass-panel text-[#39251F] dark:text-[#F6EEE3] hover:text-[#4A1917] text-xs font-bold rounded-full border border-[#D9CABB]/80 dark:border-[rgba(230,211,191,0.15)] transition-all hover:bg-[#E6DACC]/60 cursor-pointer shadow-xs"
              >
                <Users className="w-4 h-4" />
                <span>Manage Tenants</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Primary Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Expected Rent */}
          <div className="glass-panel-elevated p-5 rounded-2xl border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex flex-col justify-between glass-card-hover relative group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#77665A] dark:text-[#D1C1B0] uppercase tracking-wider">
                Expected Rent
              </span>
              <div className="p-2.5 rounded-xl bg-[#E6DACC] dark:bg-[#352920] text-brand-600 dark:text-brand-300 group-hover:scale-110 transition-transform">
                <Building className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#39251F] dark:text-[#F6EEE3] Outfit">
                ₹{formattedExpected}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Current Month Yield</span>
              </div>
            </div>
          </div>

          {/* Rent Received */}
          <div className="glass-panel-elevated p-5 rounded-2xl border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex flex-col justify-between glass-card-hover relative group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#77665A] dark:text-[#D1C1B0] uppercase tracking-wider">
                Collected Rent
              </span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 Outfit">
                ₹{formattedReceived}
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px]">
                <span className="font-semibold text-[#77665A] dark:text-[#D1C1B0]">Collection Rate</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {stats.rentCollectionRate || 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Overdue / Pending */}
          <div className="glass-panel-elevated p-5 rounded-2xl border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex flex-col justify-between glass-card-hover relative group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#77665A] dark:text-[#D1C1B0] uppercase tracking-wider">
                Pending & Overdue
              </span>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-400 Outfit">
                ₹{totalPending}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-rose-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Requires follow-up</span>
              </div>
            </div>
          </div>

          {/* Occupancy Rate */}
          <div className="glass-panel-elevated p-5 rounded-2xl border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex flex-col justify-between glass-card-hover relative group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#77665A] dark:text-[#D1C1B0] uppercase tracking-wider">
                Occupancy Rate
              </span>
              <div className="p-2.5 rounded-xl bg-[#E6DACC] dark:bg-[#352920] text-[#4A1917] dark:text-[#D1C1B0] group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit">
                {stats.occupancyRate || 0}%
              </div>
              <div className="w-full bg-[#E9DFD0] dark:bg-[#2A1D18] h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.occupancyRate || 0)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#78685D] mt-1.5">
                <span>Units Occupied</span>
                <span className="font-bold text-[#38251F] dark:text-[#FAF7F1]">
                  {stats.occupiedProperties || 0}/{stats.totalProperties || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Status Indicators (3 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/tenants"
            className="glass-panel-elevated p-4 rounded-2xl border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex items-center justify-between glass-card-hover group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-[#77665A] dark:text-[#D1C1B0] uppercase tracking-wider">
                Total Tenants
              </span>
              <h3 className="text-xl font-black text-[#39251F] dark:text-[#F6EEE3] Outfit mt-1 group-hover:text-brand-600 transition-colors">
                {stats.totalTenants ?? stats.occupiedProperties ?? 0}
              </h3>
              <span className="text-[10px] text-[#77665A] dark:text-[#AA9886] mt-0.5 block">
                Active tenant profiles
              </span>
            </div>
            <div className="p-3 bg-[#E6DACC] text-brand-600 dark:bg-[#352920] dark:text-brand-300 rounded-xl group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </Link>

          <Link
            to="/tenants"
            className="glass-panel-elevated p-4 rounded-2xl border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex items-center justify-between glass-card-hover group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-[#77665A] dark:text-[#D1C1B0] uppercase tracking-wider">
                Active Leases
              </span>
              <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400 Outfit mt-1">
                {stats.activeTenants ?? stats.occupiedProperties ?? 0}
              </h3>
              <span className="text-[10px] text-[#77665A] dark:text-[#AA9886] mt-0.5 block">
                {stats.inactiveTenants || 0} expired/pending
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl group-hover:scale-105 transition-transform">
              <FileCheck className="w-5 h-5" />
            </div>
          </Link>

          <Link
            to="/apartments"
            className="glass-panel-elevated p-4 rounded-2xl border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex items-center justify-between glass-card-hover group cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-[#77665A] dark:text-[#D1C1B0] uppercase tracking-wider">
                Vacant Units
              </span>
              <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 Outfit mt-1">
                {stats.vacantApartments ?? stats.vacantProperties ?? 0}
              </h3>
              <span className="text-[10px] text-[#77665A] dark:text-[#AA9886] mt-0.5 block">
                Available for listing
              </span>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl group-hover:scale-105 transition-transform">
              <Building className="w-5 h-5" />
            </div>
          </Link>
        </div>

        {/* Graphical Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel-elevated rounded-3xl p-6 border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-extrabold text-base text-[#39251F] dark:text-[#F6EEE3] Outfit">
                  Revenue Collection Trend
                </h4>
                <p className="text-xs text-[#77665A] dark:text-[#D1C1B0]">
                  Monthly cash flow collections over the last 6 months
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E6DACC] text-[#4A1917] dark:bg-[#352920] dark:text-[#D1C1B0] border border-[#D9CABB] dark:border-[rgba(230,211,191,0.15)]">
                INR (₹)
              </span>
            </div>
            <CashFlowChart labels={charts.cashFlow?.labels} data={charts.cashFlow?.data} />
          </div>

          <div className="glass-panel-elevated rounded-3xl p-6 border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex flex-col justify-between">
            <div className="mb-4">
              <h4 className="font-extrabold text-base text-[#39251F] dark:text-[#F6EEE3] Outfit">
                Ticket Categories
              </h4>
              <p className="text-xs text-[#77665A] dark:text-[#D1C1B0]">
                Maintenance requests distribution
              </p>
            </div>
            <ComplaintsDistributionChart labels={charts.complaints?.labels} data={charts.complaints?.data} />
          </div>
        </div>

        {/* Secondary Charts & Activity Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Yielding Properties */}
          <div className="glass-panel-elevated rounded-3xl p-6 border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-extrabold text-base text-[#39251F] dark:text-[#F6EEE3] Outfit">
                  Top Yielding Properties
                </h4>
                <p className="text-xs text-[#77665A] dark:text-[#D1C1B0]">Revenue per asset</p>
              </div>
              <Link to="/properties" className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-0.5">
                All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <PropertyYieldChart labels={charts.propertyYield?.labels} data={charts.propertyYield?.data} />
          </div>

          {/* Recent Collections Feed */}
          <div className="glass-panel-elevated rounded-3xl p-6 border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="font-extrabold text-base text-[#39251F] dark:text-[#F6EEE3] Outfit">
                    Recent Collections
                  </h4>
                  <p className="text-xs text-[#77665A] dark:text-[#D1C1B0]">Latest settled invoices</p>
                </div>
                <Link to="/payments" className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline">
                  View Ledger
                </Link>
              </div>

              <div className="space-y-2.5">
                {recentPayments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#78685D]">
                    <CreditCard className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                    No collections logged yet.
                  </div>
                ) : (
                  recentPayments.slice(0, 5).map((pay, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs p-3 rounded-2xl bg-[#E9DFD0]/40 dark:bg-[#2A1D18]/40 border border-[#D9CBBB]/60 dark:border-[#38251F] hover:border-brand-500/40 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={pay.tenant?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60'}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-brand-500/30 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-[#38251F] dark:text-[#FAF7F1] truncate">
                            {pay.tenant?.name || 'Resident Tenant'}
                          </p>
                          <p className="text-[10px] text-[#78685D] truncate">
                            {pay.property?.name || 'Assigned Property'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="font-black text-emerald-700 dark:text-emerald-400 block text-xs">
                          +₹{Number(pay.amount || 0).toLocaleString()}
                        </span>
                        <span className="text-[9px] text-[#78685D] font-medium">
                          {new Date(pay.paymentDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Security Audits / Timeline */}
          <div className="glass-panel-elevated rounded-3xl p-6 border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="font-extrabold text-base text-[#39251F] dark:text-[#F6EEE3] Outfit flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-brand-600" /> Audit Log
                  </h4>
                  <p className="text-xs text-[#77665A] dark:text-[#D1C1B0]">Security & system events</p>
                </div>
                <Link to="/audit-logs" className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline">
                  View All
                </Link>
              </div>

              <div className="space-y-2.5">
                {recentActivities.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#77665A]">
                    <Shield className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                    No recent audit entries.
                  </div>
                ) : (
                  recentActivities.slice(0, 5).map((act, i) => (
                    <div
                      key={i}
                      className="flex gap-2.5 items-start text-xs p-3 rounded-2xl bg-[#E6DACC]/40 dark:bg-[#352920]/40 border border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.1)]"
                    >
                      <History className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-[#39251F] dark:text-[#F6EEE3] block text-xs leading-snug">
                          {act.action}
                        </span>
                        <p className="text-[11px] text-[#77665A] dark:text-[#D1C1B0] mt-0.5 line-clamp-2 leading-relaxed">
                          {act.description}
                        </p>
                        <span className="text-[9px] text-[#968577] font-mono mt-1 block">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
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
  }

  // =========================================================================
  // 2. RESIDENT TENANT DASHBOARD
  // =========================================================================
  const tenant = data?.tenantDetails || {};
  const property = data?.property || null;
  const pendingBill = data?.pendingBill || null;
  const daysRemaining = data?.daysRemaining || 0;
  const paymentHistory = data?.paymentHistory || [];
  const complaintsList = data?.complaintsList || [];

  return (
    <div className="space-y-6">
      {/* Resident Welcome Banner */}
      <div className="glass-panel-elevated p-6 sm:p-8 rounded-[2rem] border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] relative overflow-hidden shadow-sm">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#D97706]/10 dark:bg-[#4A1715]/30 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-3 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Resident Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#39251F] dark:text-[#F6EEE3] Outfit tracking-tight">
              Welcome home, {tenant.name || user?.name}! 🏠
            </h1>
            <p className="text-xs sm:text-sm text-[#77665A] dark:text-[#D1C1B0] mt-1 max-w-xl">
              {property ? (
                <span>
                  Resident at <strong className="text-[#39251F] dark:text-[#F6EEE3]">{property.name}</strong> •{' '}
                  {property.address?.city || 'Bengaluru'}
                </span>
              ) : (
                'Manage your rental billing, payment history, and maintenance requests in one place.'
              )}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {pendingBill ? (
              <Link
                to="/bills"
                className="inline-flex items-center gap-2 px-4 py-2.5 btn-primary-glow text-[#FAF7F1] text-xs font-bold rounded-full shadow-md transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Rent Bill</span>
              </Link>
            ) : (
              <Link
                to="/bills"
                className="inline-flex items-center gap-2 px-4 py-2.5 glass-panel text-[#39251F] dark:text-[#F6EEE3] text-xs font-bold rounded-full border border-[#D9CABB]/80 dark:border-[rgba(230,211,191,0.15)] hover:bg-[#E6DACC]/60 transition-all cursor-pointer shadow-xs"
              >
                <FileText className="w-4 h-4" />
                <span>View Receipts</span>
              </Link>
            )}

            <Link
              to="/maintenance"
              className="inline-flex items-center gap-2 px-4 py-2.5 glass-panel text-[#39251F] dark:text-[#F6EEE3] hover:text-[#4A1917] text-xs font-bold rounded-full border border-[#D9CABB]/80 dark:border-[rgba(230,211,191,0.15)] transition-all hover:bg-[#E6DACC]/60 cursor-pointer shadow-xs"
            >
              <Wrench className="w-4 h-4" />
              <span>Request Service</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top 3 High-Impact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Rent Payment Status */}
        <div className="glass-panel-elevated p-6 rounded-3xl border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#77665A] dark:text-[#D1C1B0] uppercase tracking-wider">
                Monthly Rent Status
              </span>
              <div className="p-2.5 rounded-xl bg-[#E6DACC] dark:bg-[#352920] text-brand-600 dark:text-brand-300">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>

            {pendingBill ? (
              <div className="space-y-2 mt-2">
                <div className="text-3xl font-black text-rose-700 dark:text-rose-400 Outfit">
                  ₹{Number(pendingBill.totalAmount || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#77665A] dark:text-[#D1C1B0]">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>
                    Due by: <strong className="text-[#39251F] dark:text-[#F6EEE3]">{new Date(pendingBill.dueDate).toLocaleDateString()}</strong>
                  </span>
                </div>
                {pendingBill.status === 'overdue' && (
                  <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 rounded-full uppercase tracking-wider">
                    Late Fee Charged
                  </span>
                )}
              </div>
            ) : (
              <div className="py-4 text-emerald-700 dark:text-emerald-400 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-[#39251F] dark:text-[#F6EEE3] Outfit">
                      Dues Cleared!
                    </h4>
                    <span className="text-xs text-[#77665A] dark:text-[#D1C1B0]">
                      Zero outstanding balance
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {pendingBill ? (
            <Link
              to="/bills"
              className="mt-6 w-full py-3 btn-primary-glow text-[#FAF7F1] rounded-full text-center text-xs font-bold shadow-md transition-all block"
            >
              Pay Online Now
            </Link>
          ) : (
            <Link
              to="/bills"
              className="mt-6 w-full py-2.5 border border-[#D9CABB] dark:border-[rgba(230,211,191,0.15)] hover:bg-[#E6DACC]/60 text-[#39251F] dark:text-[#F6EEE3] rounded-full text-center text-xs font-bold transition-all block"
            >
              Download Previous Receipts
            </Link>
          )}
        </div>

        {/* Card 2: Lease Duration Remaining */}
        <div className="glass-panel-elevated p-6 rounded-3xl border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#77665A] dark:text-[#D1C1B0] uppercase tracking-wider">
                Lease Agreement
              </span>
              <div className="p-2.5 rounded-xl bg-[#E6DACC] dark:bg-[#352920] text-[#4A1917] dark:text-[#D1C1B0]">
                <CalendarDays className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-2 mt-2">
              <div className="text-3xl font-black text-[#39251F] dark:text-[#F6EEE3] Outfit">
                {daysRemaining} Days Left
              </div>
              <p className="text-xs text-[#77665A] dark:text-[#D1C1B0]">
                Agreement valid until:{' '}
                <strong className="text-[#39251F] dark:text-[#F6EEE3]">
                  {tenant.leaseEndDate ? new Date(tenant.leaseEndDate).toLocaleDateString() : 'Active Term'}
                </strong>
              </p>

              {/* Progress bar */}
              <div className="w-full bg-[#E6DACC] dark:bg-[#352920] h-2.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((daysRemaining / 365) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {tenant.leaseAgreementUrl ? (
            <a
              href={tenant.leaseAgreementUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 w-full py-2.5 border border-[#D9CABB] dark:border-[rgba(230,211,191,0.15)] text-brand-600 dark:text-brand-400 hover:bg-[#E6DACC]/60 rounded-full text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <span>View Signed Agreement</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <div className="mt-6 py-2 text-center text-[11px] text-[#77665A] font-medium">
              Standard Digital Tenancy Active
            </div>
          )}
        </div>

        {/* Card 3: Landlord & Property Support */}
        <div className="glass-panel-elevated p-6 rounded-3xl border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#77665A] dark:text-[#D1C1B0] uppercase tracking-wider">
                Primary Contact
              </span>
              <div className="p-2.5 rounded-xl bg-[#E6DACC] dark:bg-[#352920] text-brand-600 dark:text-brand-300">
                <Building className="w-5 h-5" />
              </div>
            </div>

            {property?.owner ? (
              <div className="flex items-center gap-3.5 mt-2">
                <img
                  src={property.owner.profilePhoto || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100'}
                  alt="Owner"
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-brand-500/30 shadow-sm"
                />
                <div>
                  <h4 className="font-extrabold text-sm text-[#39251F] dark:text-[#F6EEE3] Outfit">
                    {property.owner.name}
                  </h4>
                  <span className="inline-block text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-[#E6DACC] dark:bg-[#352920] px-2 py-0.5 rounded-full mt-0.5">
                    Property Owner / Landlord
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#77665A] mt-2">Designated management team assigned.</p>
            )}
          </div>

          {property?.owner && (
            <div className="grid grid-cols-2 gap-2 mt-6">
              <a
                href={`tel:${property.owner.contactNumber}`}
                className="py-2.5 bg-[#E6DACC]/60 dark:bg-[#352920] text-[#39251F] dark:text-[#F6EEE3] rounded-xl text-center text-xs font-bold hover:bg-[#E6DACC] transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-brand-600" />
                <span>Call</span>
              </a>
              <a
                href={`mailto:${property.owner.email}`}
                className="py-2.5 bg-[#E6DACC]/60 dark:bg-[#352920] text-[#39251F] dark:text-[#F6EEE3] rounded-xl text-center text-xs font-bold hover:bg-[#E6DACC] transition-colors flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-brand-600" />
                <span>Email</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Property Details Snapshot */}
      {property && (
        <div className="glass-panel-elevated p-6 sm:p-8 rounded-[2rem] border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-extrabold text-base text-[#39251F] dark:text-[#F6EEE3] Outfit">
                Rental Apartment Details
              </h4>
              <p className="text-xs text-[#77665A] dark:text-[#D1C1B0]">
                Specifications, coordinates, and included amenities
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E6DACC] text-[#4A1917] dark:bg-[#352920] dark:text-[#D1C1B0] border border-[#D9CABB] dark:border-[rgba(230,211,191,0.15)] uppercase tracking-wider">
              {property.type || 'Apartment'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-2 text-xs text-[#77665A] dark:text-[#D1C1B0] p-4 rounded-2xl bg-[#E6DACC]/30 dark:bg-[#352920]/30 border border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.1)]">
              <span className="text-[10px] font-black uppercase text-[#77665A] tracking-wider block mb-2">Financials</span>
              <p className="flex justify-between">
                <span>Monthly Rent:</span>{' '}
                <strong className="text-[#39251F] dark:text-[#F6EEE3] font-black">₹{Number(property.monthlyRent || 0).toLocaleString()}</strong>
              </p>
              <p className="flex justify-between">
                <span>Security Deposit:</span>{' '}
                <strong className="text-[#39251F] dark:text-[#F6EEE3] font-black">₹{Number(property.securityDeposit || 0).toLocaleString()}</strong>
              </p>
              <p className="flex justify-between">
                <span>Billing Cycle:</span>{' '}
                <strong className="text-brand-600 dark:text-brand-400 font-bold">1st of Month</strong>
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-[#77665A] dark:text-[#D1C1B0] p-4 rounded-2xl bg-[#E6DACC]/30 dark:bg-[#352920]/30 border border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.1)]">
              <span className="text-[10px] font-black uppercase text-[#77665A] tracking-wider block mb-2">Location</span>
              <p className="font-bold text-[#39251F] dark:text-[#F6EEE3]">
                {property.address?.houseNumber}, {property.address?.street}
              </p>
              <p>{property.address?.area}</p>
              <p className="text-[#77665A]">{property.address?.city}, {property.address?.state} - {property.address?.pincode}</p>
            </div>

            <div className="space-y-2 text-xs text-[#77665A] dark:text-[#D1C1B0] p-4 rounded-2xl bg-[#E6DACC]/30 dark:bg-[#352920]/30 border border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.1)]">
              <span className="text-[10px] font-black uppercase text-[#77665A] tracking-wider block mb-2">Amenities Included</span>
              <div className="flex flex-wrap gap-1.5">
                {(property.amenities || []).map((amenity, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[rgba(251,247,240,0.85)] dark:bg-[rgba(53,41,32,0.85)] text-[#39251F] dark:text-[#F6EEE3] border border-[#D9CABB] dark:border-[rgba(230,211,191,0.15)]"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger & Maintenance Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment History */}
        <div className="glass-panel-elevated p-6 rounded-3xl border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-extrabold text-base text-[#39251F] dark:text-[#F6EEE3] Outfit">
                Payment History
              </h4>
              <p className="text-xs text-[#77665A] dark:text-[#D1C1B0]">Past transactions and receipts</p>
            </div>
            <Link to="/bills" className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline">
              All Bills
            </Link>
          </div>

          <div className="space-y-2.5">
            {paymentHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#77665A]">
                <CreditCard className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                No payment transactions recorded yet.
              </div>
            ) : (
              paymentHistory.slice(0, 5).map((pay, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-xs p-3 rounded-2xl bg-[#E6DACC]/40 dark:bg-[#352920]/40 border border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.1)]"
                >
                  <div>
                    <p className="font-bold text-[#39251F] dark:text-[#F6EEE3]">
                      Invoice: {pay.bill?.invoiceNumber || `REC-${1000 + i}`}
                    </p>
                    <span className="text-[10px] text-[#77665A] block font-medium mt-0.5">
                      {new Date(pay.paymentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 dark:text-emerald-400 block text-xs">
                      ₹{Number(pay.amount || 0).toLocaleString()}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-[rgba(251,247,240,0.85)] dark:bg-[rgba(53,41,32,0.85)] text-[#77665A] border border-[#D9CABB]/60 uppercase font-bold">
                      {pay.paymentMethod || 'Online'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Complaints & Repair Requests */}
        <div className="glass-panel-elevated p-6 rounded-3xl border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-extrabold text-base text-[#39251F] dark:text-[#F6EEE3] Outfit">
                Service Tickets
              </h4>
              <p className="text-xs text-[#77665A] dark:text-[#D1C1B0]">Recent maintenance requests</p>
            </div>
            <Link to="/maintenance" className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline">
              + New Request
            </Link>
          </div>

          <div className="space-y-2.5">
            {complaintsList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#77665A]">
                <Wrench className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                No active service tickets. Everything is running smoothly!
              </div>
            ) : (
              complaintsList.slice(0, 5).map((comp, i) => {
                let badgeColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
                if (comp.status === 'resolved') badgeColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
                if (comp.status === 'rejected') badgeColor = 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';

                return (
                  <div
                    key={i}
                    className="flex justify-between items-center text-xs p-3 rounded-2xl bg-[#E6DACC]/40 dark:bg-[#352920]/40 border border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.1)]"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-[#39251F] dark:text-[#F6EEE3] truncate">
                        {comp.category || 'General Repair'}
                      </p>
                      <p className="text-[11px] text-[#77665A] dark:text-[#D1C1B0] truncate max-w-xs mt-0.5">
                        {comp.description}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider shrink-0 ${badgeColor}`}>
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
};

export default Dashboard;
