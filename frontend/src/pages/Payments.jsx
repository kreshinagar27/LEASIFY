import React, { useEffect, useState } from 'react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Download, Search, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/payments');
      if (data.success) {
        setPayments(data.data);
      }
    } catch (err) {
      toast.error('Failed to load transaction ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleDownloadReceipt = async (billId, invoiceNumber) => {
    try {
      const { data } = await apiClient.get(`/bills/${billId}/pdf`);
      if (data.success && data.pdfUrl) {
        const link = document.createElement('a');
        link.href = `http://localhost:5000${data.pdfUrl}`;
        link.setAttribute('download', `receipt-${invoiceNumber}.pdf`);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      toast.error('Failed to download receipt');
    }
  };

  const filteredPayments = payments.filter(pay =>
    (pay.transactionId && pay.transactionId.toLowerCase().includes(search.toLowerCase())) ||
    (pay.tenant && pay.tenant.name.toLowerCase().includes(search.toLowerCase())) ||
    (pay.property && pay.property.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white Outfit">Payments Ledger</h1>
          <p className="text-xs text-slate-500">Review all rent transactions and download payment receipts.</p>
        </div>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by transaction ID, tenant name, unit..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl glass-input"
          />
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* TRANSACTION LIST */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="glass-panel py-16 text-center text-slate-400 rounded-2xl">
          <CreditCard className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold">No payment transactions logged.</p>
        </div>
      ) : (
        <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Date</th>
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">Property / Resident</th>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Paid Amount (INR)</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {filteredPayments.map((pay) => (
                  <tr key={pay._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="p-4 font-mono font-medium text-slate-500 whitespace-nowrap">
                      {new Date(pay.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {pay.transactionId}
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{pay.property?.name}</p>
                        <span className="text-[10px] text-slate-400">Resident: {pay.tenant?.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-500">
                      {pay.bill?.invoiceNumber || 'N/A'}
                    </td>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                      INR {pay.amount.toLocaleString()}
                    </td>
                    <td className="p-4 font-semibold text-slate-500 uppercase">
                      {pay.paymentMethod}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border-emerald-500/10">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Success
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {pay.bill && (
                        <button
                          onClick={() => handleDownloadReceipt(pay.bill._id, pay.bill.invoiceNumber)}
                          className="p-1.5 text-slate-500 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors border border-slate-200 dark:border-slate-800"
                          title="Download Receipt PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
