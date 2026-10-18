import React, { useEffect, useState } from 'react';
import CalendarWidget from '../components/CalendarWidget';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const CalendarView = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const compileEvents = async () => {
    setLoading(true);
    try {
      const compiledList = [];

      // 1. Fetch Bills (Billing Due Dates)
      const billsRes = await apiClient.get('/bills');
      if (billsRes.data.success) {
        billsRes.data.data.forEach(bill => {
          if (bill.status !== 'paid') {
            compiledList.push({
              date: bill.dueDate,
              type: 'billing',
              title: `Rent Due [${bill.invoiceNumber}]`,
              description: `Unit: ${bill.property?.name || 'Assigned Property'}. Total INR ${bill.totalAmount.toLocaleString()}`
            });
          }
        });
      }

      // 2. Fetch Maintenance Tickets (Repair schedule dates)
      const maintenanceRes = await apiClient.get('/maintenance');
      if (maintenanceRes.data.success) {
        maintenanceRes.data.data.forEach(ticket => {
          if (ticket.status !== 'resolved' && ticket.status !== 'rejected') {
            compiledList.push({
              date: ticket.createdAt,
              type: 'maintenance',
              title: `Repair Request [${ticket.complaintId}]`,
              description: `Category: ${ticket.category}. Priority: ${ticket.priority.toUpperCase()}. Desc: ${ticket.description}`
            });
          }
        });
      }

      // 3. Fetch Lease Expirations (For Owners)
      if (user.role === 'owner') {
        const tenantsRes = await apiClient.get('/tenants');
        if (tenantsRes.data.success) {
          tenantsRes.data.data.forEach(tenant => {
            if (tenant.isActive && tenant.leaseEndDate) {
              compiledList.push({
                date: tenant.leaseEndDate,
                type: 'lease',
                title: `Lease Expiry: ${tenant.name}`,
                description: `Lease agreement for Greenwood Residency unit ends today.`
              });
            }
          });
        }
      } else {
        // For Tenant (own lease expiry)
        const profileRes = await apiClient.get('/reports/tenant-dashboard');
        if (profileRes.data.success && profileRes.data.tenantDetails?.leaseEndDate) {
          const tenant = profileRes.data.tenantDetails;
          compiledList.push({
            date: tenant.leaseEndDate,
            type: 'lease',
            title: 'Your Lease Expiry Date',
            description: 'Your rental lease agreement contract is set to expire today.'
          });
        }
      }

      setEvents(compiledList);
    } catch (err) {
      toast.error('Failed to compile calendar schedule events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    compileEvents();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 lg:col-span-2 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-espresso dark:text-cream-50 Outfit">Rental Calendar</h1>
        <p className="text-xs text-cream-600 dark:text-cream-400">Monitor scheduled maintenance visits, lease expiry deadlines and invoice collections.</p>
      </div>

      <CalendarWidget events={events} />

      <div className="glass-panel p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex items-center gap-3">
        <Info className="w-5 h-5 text-brand-500 flex-shrink-0" />
        <p className="text-xs text-cream-600 dark:text-cream-400 leading-relaxed">
          The calendar consolidates lease termination dates, pending billing invoices, and active maintenance tickets.
          Hover/check dates marked with color circles to see detailed work orders.
        </p>
      </div>
    </div>
  );
};

export default CalendarView;
