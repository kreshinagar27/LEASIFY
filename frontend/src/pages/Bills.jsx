import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { QRCodeSVG } from 'qrcode.react';
import apiClient, { API_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Plus, Search, Calendar, CreditCard,
  Download, Eye, AlertTriangle, CheckCircle, Clock, X, QrCode, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const Bills = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  
  // Selected bill for checkout payment
  const [selectedBill, setSelectedBill] = useState(null);
  const [upiRef, setUpiRef] = useState('');

  // Demo Payment Simulation states
  const [demoSimulating, setDemoSimulating] = useState(false);
  const [demoFailReason, setDemoFailReason] = useState('Card Declined (Simulated)');

  // Dropdown options
  const [activeTenants, setActiveTenants] = useState([]);

  // Search/Filters states
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState('');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();

  // Watch property select to auto-load tenant details in the generator form
  const selectedTenantId = watch('tenantId');

  useEffect(() => {
    if (selectedTenantId && activeTenants.length > 0) {
      const ten = activeTenants.find(t => t._id === selectedTenantId);
      if (ten && ten.propertyAssigned) {
        setValue('propertyId', ten.propertyAssigned._id);
        setValue('rent', ten.monthlyRent);
      }
    }
  }, [selectedTenantId, activeTenants]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params = {};
      if (month) params.month = month;
      if (year) params.year = year;
      if (status) params.status = status;

      const { data } = await apiClient.get('/bills', { params });
      if (data.success) {
        setBills(data.data);
      }
    } catch (err) {
      toast.error('Failed to load bills.');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveTenants = async () => {
    try {
      const { data } = await apiClient.get('/tenants');
      if (data.success) {
        // Only load tenants with active property assigned
        setActiveTenants(data.data.filter(t => t.propertyAssigned && t.isActive));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBills();
    if (user.role === 'owner') {
      fetchActiveTenants();
    }
  }, [month, year, status]);

  // Invoice generator submit
  const onGenerateSubmit = async (data) => {
    try {
      const res = await apiClient.post('/bills', data);
      if (res.data.success) {
        toast.success('Rent bill generated successfully.');
        setModalOpen(false);
        reset();
        fetchBills();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invoice generation failed');
    }
  };

  // Trigger Razorpay Checkout payment
  const handleRazorpayCheckout = async (bill) => {
    try {
      const orderRes = await apiClient.post('/payments/order', { billId: bill._id });
      if (!orderRes.data.success) throw new Error('Order creation failed');

      const { order, mode, keyId } = orderRes.data;

      if (mode === 'mock') {
        // Direct mock signature submit
        toast.success('[SANDBOX] Triggering mock payment validation');
        const verifyRes = await apiClient.post('/payments/verify', {
          billId: bill._id,
          razorpay_order_id: order.id,
          razorpay_payment_id: 'pay_mock_' + Date.now(),
          razorpay_signature: 'mock_signature_hash_123',
          paymentMethod: 'Razorpay'
        });
        if (verifyRes.data.success) {
          toast.success('Rent paid successfully!');
          setPayModalOpen(false);
          fetchBills();
        }
      } else {
        // Live Razorpay payment integration using checkout SDK
        const options = {
          key: keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'Leasify Rental',
          description: `Rent Invoice: ${order.receipt}`,
          order_id: order.id,
          handler: async function (response) {
            const verifyRes = await apiClient.post('/payments/verify', {
              billId: bill._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentMethod: 'Razorpay'
            });
            if (verifyRes.data.success) {
              toast.success('Rent Paid successfully!');
              setPayModalOpen(false);
              fetchBills();
            }
          },
          prefill: {
            name: user.name,
            email: user.email
          },
          theme: { color: '#4B1715' }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      toast.error(err.message || 'Payment execution failed');
    }
  };

  // Demo Payment Simulation handler
  const handleDemoPayment = async (outcome) => {
    if (!selectedBill || demoSimulating) return;
    setDemoSimulating(true);
    try {
      const payload = {
        billId: selectedBill._id,
        simulateOutcome: outcome,
        failureReason: outcome === 'failure' ? demoFailReason : undefined
      };
      const res = await apiClient.post('/payments/demo-simulate', payload);
      if (res.data.success) {
        toast.success(res.data.message || 'Demo payment simulated successfully! Rent marked as paid.');
        setPayModalOpen(false);
        fetchBills();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment simulation failed.';
      if (outcome === 'failure') {
        toast.error(msg, { icon: '⚠️' });
        setPayModalOpen(false);
        fetchBills();
      } else {
        toast.error(msg);
      }
    } finally {
      setDemoSimulating(false);
    }
  };

  // Manual UPI checkout submit
  const handleUpiSubmit = async (e) => {
    e.preventDefault();
    if (!upiRef.trim()) {
      toast.error('Please enter the UPI Reference ID');
      return;
    }

    try {
      const res = await apiClient.post('/payments/manual', {
        billId: selectedBill._id,
        upiReferenceNumber: upiRef
      });
      if (res.data.success) {
        toast.success('UPI Reference submitted. Bill cleared.');
        setPayModalOpen(false);
        setUpiRef('');
        fetchBills();
      }
    } catch (err) {
      toast.error('Failed to submit manual payment.');
    }
  };

  // Generate Receipt PDF download
  const handlePDFDownload = async (billId, invoiceNumber) => {
    try {
      const { data } = await apiClient.get(`/bills/${billId}/pdf`);
      if (data.success && data.pdfUrl) {
        const serverBase = API_URL.replace(/\/api\/v1\/?$/, '');
        const link = document.createElement('a');
        link.href = `${serverBase}${data.pdfUrl}`;
        link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      toast.error('Could not compile receipt PDF.');
    }
  };

  // Generate UPI deep link schema for QR Code
  // upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR&tn=INVOICE
  const generateUpiString = (bill) => {
    const defaultUpi = 'leasify@upi';
    const amount = bill.totalAmount;
    const name = encodeURIComponent('Leasify Rental');
    const invoice = bill.invoiceNumber;
    return `upi://pay?pa=${defaultUpi}&pn=${name}&am=${amount}&cu=INR&tn=${invoice}`;
  };

  return (
    <>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit">Invoices & Billings</h1>
          <p className="text-xs text-[#78685D] dark:text-[#C5B5A5]">Track monthly rental statements and process payments.</p>
        </div>
        {user.role === 'owner' && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-[#FAF7F1] btn-primary-glow rounded-full shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Generate Invoice
          </button>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="glass-panel p-4 rounded-[1.75rem] border border-[#D9CBBB] dark:border-[#38251F] grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-xs">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-full glass-input"
        >
          <option value="">All Months</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
            <option key={m} value={m}>{new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
          ))}
        </select>

        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="Year (e.g. 2026)"
          className="w-full px-3 py-2 text-xs rounded-full glass-input"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-full glass-input"
        >
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* BILLS TABLE LIST */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 bg-[#E9DFD0]/40 dark:bg-[#2A1D18]/40 rounded-2xl"></div>
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="glass-panel py-16 text-center text-[#78685D] rounded-[2rem] border border-[#D9CBBB] dark:border-[#38251F]">
          <FileText className="w-12 h-12 mx-auto mb-2 text-[#78685D] opacity-40" />
          <p className="text-sm font-semibold">No invoices generated for this selection.</p>
        </div>
      ) : (
        <div className="glass-panel border border-[#D9CBBB] dark:border-[#38251F] rounded-[2rem] overflow-hidden shadow-sm bg-[#FAF7F1] dark:bg-[#1E1715]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D9CBBB] dark:border-[#38251F] bg-[#E9DFD0] dark:bg-[#261916] text-[#38251F] dark:text-[#FAF7F1] font-bold uppercase tracking-wider">
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Unit / Resident</th>
                  <th className="p-4">Billing Month</th>
                  <th className="p-4">Amount (INR)</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9CBBB]/40 dark:divide-[#38251F]/40">
                {bills.map((bill) => {
                  let badge = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
                  let Icon = CheckCircle;
                  
                  if (bill.status === 'unpaid') {
                    badge = 'bg-[#E9DFD0] text-[#4A1715] dark:bg-[#2A1D18] dark:text-[#E9DFD0] border-[#D9CBBB]';
                    Icon = Clock;
                  }
                  if (bill.status === 'overdue') {
                    badge = 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';
                    Icon = AlertTriangle;
                  }

                  return (
                    <tr key={bill._id} className="hover:bg-[#E9DFD0]/30 dark:hover:bg-[#2A1D18]/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#38251F] dark:text-[#FAF7F1]">
                        {bill.invoiceNumber}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-[#38251F] dark:text-[#FAF7F1]">{bill.property?.name}</p>
                          <span className="text-[10px] text-[#78685D] dark:text-[#C5B5A5]">Resident: {bill.tenant?.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-[#78685D] dark:text-[#C5B5A5]">
                        {new Date(2026, bill.month - 1, 1).toLocaleString('default', { month: 'short' })} {bill.year}
                      </td>
                      <td className="p-4 font-bold text-[#38251F] dark:text-[#FAF7F1]">
                        ₹{bill.totalAmount.toLocaleString()}
                        {bill.lateFee > 0 && (
                          <span className="block text-[9px] text-rose-600 font-medium">Includes Late Fee: ₹{bill.lateFee}</span>
                        )}
                      </td>
                      <td className="p-4 font-medium text-[#78685D] font-mono">
                        {new Date(bill.dueDate).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${badge}`}>
                          <Icon className="w-3 h-3" />
                          {bill.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center">
                          {/* Invoice PDF download */}
                          <button
                            onClick={() => handlePDFDownload(bill._id, bill.invoiceNumber)}
                            className="p-1.5 text-[#78685D] hover:text-brand-600 hover:bg-[#E9DFD0]/60 rounded-lg transition-colors border border-[#D9CBBB] dark:border-[#38251F] cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Pay bill (for tenants) */}
                          {user.role === 'tenant' && bill.status !== 'paid' && (
                            <button
                              onClick={() => {
                                setSelectedBill(bill);
                                setPayModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 btn-primary-glow text-[#FAF7F1] rounded-full font-bold text-[10px] flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Pay Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

      {/* GENERATE BILL MODAL (OWNER) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop-warm p-4">
          <div className="w-full max-w-md glass-panel-elevated rounded-[2rem] border border-[#D9CBBB] dark:border-[#38251F] p-6 flex flex-col relative bg-[#FAF7F1] dark:bg-[#1C1614] shadow-2xl">
            <h3 className="font-bold text-lg text-[#38251F] dark:text-[#FAF7F1] mb-4 pb-2 border-b border-[#D9CBBB]/70 dark:border-[#38251F]">
              Generate Rent Invoice
            </h3>

            <form onSubmit={handleSubmit(onGenerateSubmit)} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">Select Resident Tenant</label>
                <select
                  {...register('tenantId', { required: 'Tenant selection is required' })}
                  className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
                >
                  <option value="">Choose resident...</option>
                  {activeTenants.map(t => (
                    <option key={t._id} value={t._id}>{t.name} (Unit: {t.propertyAssigned?.name})</option>
                  ))}
                </select>
                {errors.tenantId && <span className="text-[10px] text-red-500">{errors.tenantId.message}</span>}
              </div>

              {/* Hidden values populated by watch */}
              <input type="hidden" {...register('propertyId')} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-0.5">Invoice Month</label>
                  <select
                    {...register('month', { required: true })}
                    className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
                    defaultValue={new Date().getMonth() + 1}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>{new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-0.5">Year</label>
                  <input
                    type="number"
                    {...register('year', { required: true })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                    defaultValue={new Date().getFullYear()}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Base Agreement Rent (INR)</label>
                  <input
                    type="number"
                    {...register('rent')}
                    className="w-full px-3 py-1.5 text-xs rounded-xl glass-input bg-slate-100/50 dark:bg-slate-900/50"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-0.5">Electricity Fees</label>
                  <input
                    type="number"
                    placeholder="0"
                    {...register('electricityCharges')}
                    className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Water</label>
                  <input
                    type="number"
                    placeholder="0"
                    {...register('waterCharges')}
                    className="w-full px-2.5 py-1 text-[11px] rounded-lg glass-input"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Maintenance</label>
                  <input
                    type="number"
                    placeholder="0"
                    {...register('maintenanceCharges')}
                    className="w-full px-2.5 py-1 text-[11px] rounded-lg glass-input"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Parking</label>
                  <input
                    type="number"
                    placeholder="0"
                    {...register('parkingCharges')}
                    className="w-full px-2.5 py-1 text-[11px] rounded-lg glass-input"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">Payment Due Date</label>
                <input
                  type="date"
                  {...register('dueDate', { required: 'Due date is required' })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                />
                {errors.dueDate && <span className="text-[10px] text-red-500">{errors.dueDate.message}</span>}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECKOUT PAYMENT DIALOG MODAL (TENANT) */}
      {payModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col relative">
            <button onClick={() => setPayModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-500" /> Settle Rent Invoice
            </h3>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl mb-4 text-xs space-y-1">
              <p><strong>Invoice Number:</strong> {selectedBill.invoiceNumber}</p>
              <p><strong>Rent Period:</strong> {selectedBill.month}/{selectedBill.year}</p>
              <p className="pt-2 text-sm">
                <strong>Total Due: </strong> 
                <span className="font-bold text-brand-500">INR {selectedBill.totalAmount.toLocaleString()}</span>
              </p>
            </div>

            {/* Notice: Demo Mode requirement 14 */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4 text-xs">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Demo Payment Mode Active</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                Demo Mode: No real money will be transferred.
              </p>
            </div>

            {/* DEMO SIMULATION OPTIONS */}
            <div className="p-3.5 bg-[#FAF7F1] dark:bg-[#1E1715] border border-[#D9CBBB] dark:border-[#38251F] rounded-2xl mb-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#38251F] dark:text-[#FAF7F1] uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-brand-600" />
                  Simulate Rent Payment
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 uppercase">
                  Simulation
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-demo-simulate-success"
                  disabled={demoSimulating}
                  onClick={() => handleDemoPayment('success')}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Simulate successful payment"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{demoSimulating ? 'Processing...' : 'Simulate Success'}</span>
                </button>

                <button
                  type="button"
                  id="btn-demo-simulate-failure"
                  disabled={demoSimulating}
                  onClick={() => handleDemoPayment('failure')}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Simulate failed payment"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{demoSimulating ? 'Processing...' : 'Simulate Failure'}</span>
                </button>
              </div>

              <div className="pt-1">
                <label className="text-[10px] text-[#78685D] dark:text-[#C5B5A5] font-semibold block mb-1">
                  Simulated Failure Reason (For Failure Test):
                </label>
                <select
                  value={demoFailReason}
                  onChange={(e) => setDemoFailReason(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl glass-input text-[#38251F] dark:text-[#FAF7F1] border border-[#D9CBBB] dark:border-[#38251F]"
                >
                  <option value="Card Declined (Simulated)">Simulated Card Declined</option>
                  <option value="Insufficient Demo Funds">Insufficient Demo Funds</option>
                  <option value="Bank Gateway Timeout (Simulated)">Bank Gateway Timeout</option>
                  <option value="Daily Transaction Limit Exceeded (Simulated)">Daily Transaction Limit Exceeded</option>
                </select>
              </div>
            </div>

            {/* Payment methods divider */}
            <div className="relative flex py-1 items-center mb-4">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase">Other Payment Options</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            {/* Payment methods */}
            <div className="space-y-4">
              {/* Option 1: Card / Razorpay Gateway */}
              <button
                onClick={() => handleRazorpayCheckout(selectedBill)}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-center text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Pay via Card / Netbanking (Razorpay)
              </button>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase">Or Scan & Pay via UPI</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              {/* Option 2: Scan QR code */}
              <div className="flex flex-col items-center p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50">
                <QRCodeSVG
                  value={generateUpiString(selectedBill)}
                  size={120}
                  level="M"
                  includeMargin={true}
                  className="rounded-lg border border-slate-200 dark:border-slate-800"
                />
                <span className="text-[10px] text-slate-400 mt-2 block flex items-center gap-1"><QrCode className="w-3.5 h-3.5" /> Scan QR with Google Pay, PhonePe, Paytm</span>
              </div>

              {/* Reference ID form */}
              <form onSubmit={handleUpiSubmit} className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 block uppercase">Submit UPI Transaction Reference ID (UTR)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={upiRef}
                    onChange={(e) => setUpiRef(e.target.value)}
                    placeholder="e.g. 304829104812"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl glass-input font-mono"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-800"
                  >
                    Confirm Ref
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Bills;
