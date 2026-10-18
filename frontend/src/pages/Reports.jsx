import React, { useEffect, useState } from 'react';
import apiClient from '../services/api';
import { CashFlowChart, ComplaintsDistributionChart, PropertyYieldChart } from '../components/Charts';
import {
  BarChart3, FileSpreadsheet, Download,
  TrendingUp, CreditCard, Users, ShieldAlert,
  Coins, Wallet, BadgePercent, Wrench
} from 'lucide-react';
import toast from 'react-hot-toast';

const Reports = () => {
  const [stats, setStats] = useState({});
  const [charts, setCharts] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/reports/owner-dashboard');
      if (data.success) {
        setStats(data.stats);
        setCharts(data.charts);
      }
    } catch (err) {
      toast.error('Failed to load reporting analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  // Client-side CSV generator and trigger download
  const handleExportCSV = async (type) => {
    try {
      const { data } = await apiClient.get(`/reports/export/${type}`);
      if (!data.success || data.data.length === 0) {
        toast.error('No records available to export.');
        return;
      }

      const rows = data.data;
      const headers = Object.keys(rows[0]);
      
      const csvContent = [
        headers.join(','), // Header row
        ...rows.map(row => 
          headers.map(fieldName => {
            const val = row[fieldName] !== undefined ? row[fieldName] : '';
            // Escape double quotes and wrap in quotes
            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `leasify-report-${type}-${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${type.toUpperCase()} report exported successfully!`);
    } catch (err) {
      toast.error('Report compilation failed');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(n => (
            <div key={n} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-espresso dark:text-cream-50 Outfit">Reports & Analytics</h1>
        <p className="text-xs text-cream-600 dark:text-cream-400">Generate property reports, check financial yields and export spreadsheets.</p>
      </div>

      {/* EXPORT OPTIONS PANEL */}
      <div className="glass-panel p-6 rounded-3xl border border-cream-300 dark:border-espresso-800">
        <h3 className="font-extrabold text-sm text-espresso dark:text-cream-50 Outfit mb-3">Export Tabular Portfolios</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Financials CSV */}
          <button
            onClick={() => handleExportCSV('financial')}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-cream-300 dark:border-espresso-800 bg-cream-100/60 dark:bg-espresso-900/40 hover:border-brand-500/50 hover:bg-cream-200/60 transition-all text-left"
          >
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-espresso dark:text-cream-200">Financial Ledger</span>
              <span className="block text-[9px] text-cream-500">Collections, GST and invoices</span>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          </button>

          {/* Properties list */}
          <button
            onClick={() => handleExportCSV('properties')}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-cream-300 dark:border-espresso-800 bg-cream-100/60 dark:bg-espresso-900/40 hover:border-brand-500/50 hover:bg-cream-200/60 transition-all text-left"
          >
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-espresso dark:text-cream-200">Properties List</span>
              <span className="block text-[9px] text-cream-500">Yield addresses and statuses</span>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-brand-600" />
          </button>

          {/* Tenants registry */}
          <button
            onClick={() => handleExportCSV('tenants')}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-cream-300 dark:border-espresso-800 bg-cream-100/60 dark:bg-espresso-900/40 hover:border-brand-500/50 hover:bg-cream-200/60 transition-all text-left"
          >
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-espresso dark:text-cream-200">Tenants Registry</span>
              <span className="block text-[9px] text-cream-500">Contact list and agreement dates</span>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-amber-600" />
          </button>

          {/* Maintenance audits */}
          <button
            onClick={() => handleExportCSV('maintenance')}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-cream-300 dark:border-espresso-800 bg-cream-100/60 dark:bg-espresso-900/40 hover:border-brand-500/50 hover:bg-cream-200/60 transition-all text-left"
          >
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-espresso dark:text-cream-200">Maintenance Audits</span>
              <span className="block text-[9px] text-cream-500">Work costing and repair statuses</span>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-terracotta-500" />
          </button>
        </div>
      </div>

      {/* METRIC SUB-GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-cream-600 dark:text-cream-400 uppercase tracking-wider block">Deposits Held</span>
            <h4 className="text-base font-extrabold text-espresso dark:text-cream-100 Outfit mt-0.5">INR {stats.totalSecurityDeposits?.toLocaleString() || 0}</h4>
          </div>
          <Coins className="w-5 h-5 text-brand-500 opacity-80" />
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-cream-600 dark:text-cream-400 uppercase tracking-wider block">Refundable Deposits</span>
            <h4 className="text-base font-extrabold text-espresso dark:text-cream-100 Outfit mt-0.5">INR {stats.refundableDeposits?.toLocaleString() || 0}</h4>
          </div>
          <Wallet className="w-5 h-5 text-amber-600 opacity-80" />
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-cream-600 dark:text-cream-400 uppercase tracking-wider block">Rent Yield Year</span>
            <h4 className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 Outfit mt-0.5">INR {stats.yearlyRevenue?.toLocaleString() || 0}</h4>
          </div>
          <TrendingUp className="w-5 h-5 text-emerald-600 opacity-80" />
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-cream-600 dark:text-cream-400 uppercase tracking-wider block">Rent Collection Yield</span>
            <h4 className="text-base font-extrabold text-espresso dark:text-cream-100 Outfit mt-0.5">{stats.rentCollectionRate}%</h4>
          </div>
          <BadgePercent className="w-5 h-5 text-brand-600 opacity-80" />
        </div>
      </div>

      {/* GRAPH GRIDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel rounded-3xl p-5 border border-cream-300 dark:border-espresso-800">
          <h4 className="font-extrabold text-sm text-espresso dark:text-cream-100 Outfit mb-4">Rental Cash Flow Trend</h4>
          <CashFlowChart labels={charts.cashFlow?.labels} data={charts.cashFlow?.data} />
        </div>
        
        <div className="glass-panel rounded-3xl p-5 border border-cream-300 dark:border-espresso-800 flex flex-col justify-between">
          <h4 className="font-extrabold text-sm text-espresso dark:text-cream-100 Outfit mb-2">Complaint Categories Yield</h4>
          <ComplaintsDistributionChart labels={charts.complaints?.labels} data={charts.complaints?.data} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel rounded-3xl p-5 border border-cream-300 dark:border-espresso-800 lg:col-span-2">
          <h4 className="font-extrabold text-sm text-espresso dark:text-cream-100 Outfit mb-4">Property Financial Performance (Yearly INR)</h4>
          <PropertyYieldChart labels={charts.propertyYield?.labels} data={charts.propertyYield?.data} />
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-cream-300 dark:border-espresso-800 flex flex-col justify-center text-center p-6 space-y-4">
          <Wrench className="w-10 h-10 text-amber-600 mx-auto" />
          <div>
            <h5 className="font-extrabold text-sm text-espresso dark:text-cream-100 Outfit">Maintenance Load Details</h5>
            <div className="grid grid-cols-3 gap-2 mt-4 text-xs font-semibold">
              <div className="p-2 bg-cream-100 dark:bg-espresso-900 rounded-xl border border-cream-200 dark:border-espresso-800">
                <span className="text-[10px] text-cream-600 dark:text-cream-400 block uppercase">Pending</span>
                <span className="text-amber-700 dark:text-amber-400 font-extrabold text-sm Outfit">{stats.pendingComplaints}</span>
              </div>
              <div className="p-2 bg-cream-100 dark:bg-espresso-900 rounded-xl border border-cream-200 dark:border-espresso-800">
                <span className="text-[10px] text-cream-600 dark:text-cream-400 block uppercase">Active</span>
                <span className="text-brand-600 dark:text-cream-100 font-extrabold text-sm Outfit">{stats.activeComplaints}</span>
              </div>
              <div className="p-2 bg-cream-100 dark:bg-espresso-900 rounded-xl border border-cream-200 dark:border-espresso-800">
                <span className="text-[10px] text-cream-600 dark:text-cream-400 block uppercase">Resolved</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-sm Outfit">{stats.resolvedComplaints}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
