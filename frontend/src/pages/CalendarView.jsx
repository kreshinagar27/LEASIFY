import React, { useEffect, useState, useCallback } from 'react';
import CalendarWidget from '../components/CalendarWidget';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Info, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CalendarView = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const compileEvents = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const compiledList = [];

      // 1. Fetch Bills (Billing Due Dates)
      try {
        const billsRes = await apiClient.get('/bills');
        if (billsRes.data.success && Array.isArray(billsRes.data.data)) {
          billsRes.data.data.forEach(bill => {
            if (bill.status !== 'paid' && bill.dueDate) {
              const d = new Date(bill.dueDate);
              if (!isNaN(d.getTime())) {
                compiledList.push({
                  date: bill.dueDate,
                  type: 'billing',
                  title: `Rent Due [${bill.invoiceNumber || 'INV'}]`,
                  description: `Property: ${bill.property?.name || 'Assigned Property'}. Amount due: INR ${Number(bill.totalAmount || 0).toLocaleString()}`
                });
              }
            }
          });
        }
      } catch (billErr) {
        console.warn('Bills schedule load warning:', billErr.message);
      }

      // 2. Fetch Maintenance Tickets (Repair schedule dates)
      try {
        const maintenanceRes = await apiClient.get('/maintenance');
        if (maintenanceRes.data.success && Array.isArray(maintenanceRes.data.data)) {
          maintenanceRes.data.data.forEach(ticket => {
            if (ticket.status !== 'resolved' && ticket.status !== 'rejected' && ticket.createdAt) {
              const d = new Date(ticket.createdAt);
              if (!isNaN(d.getTime())) {
                compiledList.push({
                  date: ticket.createdAt,
                  type: 'maintenance',
                  title: `Repair [${ticket.complaintId || 'Ticket'}]: ${ticket.category || 'Maintenance'}`,
                  description: `Priority: ${(ticket.priority || 'Medium').toUpperCase()}. Details: ${ticket.description || 'Pending service visit.'}`
                });
              }
            }
          });
        }
      } catch (maintErr) {
        console.warn('Maintenance schedule load warning:', maintErr.message);
      }

      // 3. Fetch Lease Expirations
      if (user?.role === 'owner') {
        try {
          const tenantsRes = await apiClient.get('/tenants');
          if (tenantsRes.data.success && Array.isArray(tenantsRes.data.data)) {
            tenantsRes.data.data.forEach(tenant => {
              if (tenant.isActive && tenant.leaseEndDate) {
                const d = new Date(tenant.leaseEndDate);
                if (!isNaN(d.getTime())) {
                  compiledList.push({
                    date: tenant.leaseEndDate,
                    type: 'lease',
                    title: `Lease Expiration: ${tenant.name}`,
                    description: `Tenancy agreement ends for unit: ${tenant.propertyAssigned?.name || 'Assigned property'}.`
                  });
                }
              }
            });
          }
        } catch (tenantErr) {
          console.warn('Tenants schedule load warning:', tenantErr.message);
        }
      } else if (user?.role === 'tenant') {
        try {
          const profileRes = await apiClient.get('/reports/tenant-dashboard');
          if (profileRes.data.success && profileRes.data.tenantDetails?.leaseEndDate) {
            const tenant = profileRes.data.tenantDetails;
            const d = new Date(tenant.leaseEndDate);
            if (!isNaN(d.getTime())) {
              compiledList.push({
                date: tenant.leaseEndDate,
                type: 'lease',
                title: 'Your Lease Expiry Date',
                description: `Your rental lease agreement contract is scheduled to conclude on ${d.toLocaleDateString()}.`
              });
            }
          }
        } catch (dashErr) {
          console.warn('Tenant lease schedule warning:', dashErr.message);
        }
      }

      setEvents(compiledList);
    } catch (err) {
      console.error('Failed to compile calendar schedule:', err);
      toast.error('Failed to compile calendar schedule events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      compileEvents();
    }
  }, [user, compileEvents]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-56 bg-[#E9DFD0]/60 dark:bg-[#2A1D18]/60 rounded-2xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 lg:col-span-2 bg-[#E9DFD0]/50 dark:bg-[#2A1D18]/50 rounded-3xl"></div>
          <div className="h-96 bg-[#E9DFD0]/50 dark:bg-[#2A1D18]/50 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit tracking-tight">
            Calendar Schedule
          </h1>
          <p className="text-xs text-[#78685D] dark:text-[#C5B5A5] mt-0.5">
            Real-time timeline of billing invoice deadlines, maintenance schedules, and lease expirations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => compileEvents(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full bg-[#E9DFD0] dark:bg-[#2A1D18] text-[#38251F] dark:text-[#FAF7F1] hover:bg-brand-500/20 border border-[#D9CBBB] dark:border-[#38251F] transition-all cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Schedule'}</span>
        </button>
      </div>

      {/* Main Calendar & Details Widget */}
      <CalendarWidget events={events} />

      {/* Helper Footer Notice */}
      <div className="glass-panel p-4 rounded-2xl border border-[#D9CBBB] dark:border-[#38251F] flex items-start gap-3 shadow-xs">
        <Info className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
        <div className="text-xs text-[#78685D] dark:text-[#C5B5A5] leading-relaxed">
          <strong className="text-[#38251F] dark:text-[#FAF7F1] block mb-0.5">How this schedule works:</strong>
          The calendar schedule automatically aggregates pending rental bills with upcoming due dates, open service tickets awaiting maintenance resolution, and lease expiration dates. Click any calendar date to focus on its specific tasks.
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
