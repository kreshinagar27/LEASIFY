import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { QRCodeSVG } from 'qrcode.react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Plus, Search, Calendar, CreditCard,
  Download, Eye, AlertTriangle, CheckCircle, Clock, X, QrCode
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
          theme: { color: '#6366f1' }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      toast.error(err.message || 'Payment execution failed');
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
        // Download trigger
        const link = document.createElement('a');
        link.href = `http://localhost:5000${data.pdfUrl}`;
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white Outfit">Invoices & Billings</h1>
          <p className="text-xs text-slate-500">Track monthly rental statements and process payments.</p>
        </div>
        {user.role === 'owner' && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-500/20 transition-all duration-200"
          >
            <Plus className="w-4 h-4" /> Generate Invoice
          </button>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
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
          className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
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
            <div key={n} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="glass-panel py-16 text-center text-slate-400 rounded-2xl">
          <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold">No invoices generated for this selection.</p>
        </div>
      ) : (
        <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Unit / Resident</th>
                  <th className="p-4">Billing Month</th>
                  <th className="p-4">Amount (INR)</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {bills.map((bill) => {
                  let badge = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                  let Icon = CheckCircle;
                  
                  if (bill.status === 'unpaid') {
                    badge = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                    Icon = Clock;
                  }
                  if (bill.status === 'overdue') {
                    badge = 'bg-red-500/10 text-red-500 border-red-500/20';
                    Icon = AlertTriangle;
                  }

                  return (
                    <tr key={bill._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {bill.invoiceNumber}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{bill.property?.name}</p>
                          <span className="text-[10px] text-slate-400">Resident: {bill.tenant?.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-600 dark:text-slate-400">
                        {new Date(2026, bill.month - 1, 1).toLocaleString('default', { month: 'short' })} {bill.year}
                      </td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                        INR {bill.totalAmount.toLocaleString()}
                        {bill.lateFee > 0 && (
                          <span className="block text-[9px] text-red-500 font-medium">Includes Late Fee: INR {bill.lateFee}</span>
                        )}
                      </td>
                      <td className="p-4 font-medium text-slate-500 font-mono">
                        {new Date(bill.dueDate).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${badge}`}>
                          <Icon className="w-3 h-3" />
                          {bill.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center">
                          {/* Invoice PDF download */}
                          <button
                            onClick={() => handlePDFDownload(bill._id, bill.invoiceNumber)}
                            className="p-1.5 text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors border border-slate-200 dark:border-slate-800"
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
                              className="px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-md shadow-brand-500/15"
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

      {/* GENERATE BILL MODAL (OWNER) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col relative">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
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

            {/* Payment methods */}
            <div className="space-y-4">
              {/* Option 1: Card / Razorpay Gateway */}
              <button
                onClick={() => handleRazorpayCheckout(selectedBill)}
                className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-center text-xs font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-1.5"
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
    </div>
  );
};

export default Bills;
