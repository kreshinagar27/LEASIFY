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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white Outfit">Reports & Analytics</h1>
        <p className="text-xs text-slate-500">Generate property reports, check financial yields and export spreadsheets.</p>
      </div>

      {/* EXPORT OPTIONS PANEL */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-3">Export Tabular Portfolios</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Financials CSV */}
          <button
            onClick={() => handleExportCSV('financial')}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-left"
          >
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Financial Ledger</span>
              <span className="block text-[9px] text-slate-400">Collections, GST and invoices</span>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
          </button>

          {/* Properties list */}
          <button
            onClick={() => handleExportCSV('properties')}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-left"
          >
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Properties List</span>
              <span className="block text-[9px] text-slate-400">Yield addresses and statuses</span>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
          </button>

          {/* Tenants registry */}
          <button
            onClick={() => handleExportCSV('tenants')}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-left"
          >
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Tenants Registry</span>
              <span className="block text-[9px] text-slate-400">Contact list and agreement dates</span>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-purple-500" />
          </button>

          {/* Maintenance audits */}
          <button
            onClick={() => handleExportCSV('maintenance')}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-left"
          >
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Maintenance Audits</span>
              <span className="block text-[9px] text-slate-400">Work costing and repair statuses</span>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-amber-500" />
          </button>
        </div>
      </div>

      {/* METRIC SUB-GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Deposits Held</span>
            <h4 className="text-base font-bold text-slate-800 dark:text-white mt-0.5">INR {stats.totalSecurityDeposits?.toLocaleString() || 0}</h4>
          </div>
          <Coins className="w-5 h-5 text-brand-500 opacity-80" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Refundable Deposits</span>
            <h4 className="text-base font-bold text-slate-800 dark:text-white mt-0.5">INR {stats.refundableDeposits?.toLocaleString() || 0}</h4>
          </div>
          <Wallet className="w-5 h-5 text-indigo-500 opacity-80" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Rent Yield Year</span>
            <h4 className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">INR {stats.yearlyRevenue?.toLocaleString() || 0}</h4>
          </div>
          <TrendingUp className="w-5 h-5 text-emerald-500 opacity-80" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Rent Collection Yield</span>
            <h4 className="text-base font-bold text-slate-800 dark:text-white mt-0.5">{stats.rentCollectionRate}%</h4>
          </div>
          <BadgePercent className="w-5 h-5 text-purple-500 opacity-80" />
        </div>
      </div>

      {/* GRAPH GRIDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4">Rental Cash Flow Trend</h4>
          <CashFlowChart labels={charts.cashFlow?.labels} data={charts.cashFlow?.data} />
        </div>
        
        <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-2">Complaint Categories Yield</h4>
          <ComplaintsDistributionChart labels={charts.complaints?.labels} data={charts.complaints?.data} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 lg:col-span-2">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4">Property Financial Performance (Yearly INR)</h4>
          <PropertyYieldChart labels={charts.propertyYield?.labels} data={charts.propertyYield?.data} />
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-center text-center p-6 space-y-4">
          <Wrench className="w-10 h-10 text-amber-500 mx-auto" />
          <div>
            <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200">Maintenance Load Details</h5>
            <div className="grid grid-cols-3 gap-2 mt-4 text-xs font-semibold">
              <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                <span className="text-[10px] text-slate-400 block uppercase">Pending</span>
                <span className="text-slate-800 dark:text-white font-extrabold text-sm">{stats.pendingComplaints}</span>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                <span className="text-[10px] text-slate-400 block uppercase">Active</span>
                <span className="text-slate-800 dark:text-white font-extrabold text-sm">{stats.activeComplaints}</span>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                <span className="text-[10px] text-slate-400 block uppercase">Resolved</span>
                <span className="text-slate-800 dark:text-white font-extrabold text-sm">{stats.resolvedComplaints}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
