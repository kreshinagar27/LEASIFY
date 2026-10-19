import React, { useEffect, useState } from 'react';
import apiClient, { API_URL } from '../services/api';
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
        const serverBase = API_URL.replace(/\/api\/v1\/?$/, '');
        const link = document.createElement('a');
        link.href = `${serverBase}${data.pdfUrl}`;
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit">Payments Ledger</h1>
          <p className="text-xs text-[#78685D] dark:text-[#C5B5A5]">Review all rent transactions and download payment receipts.</p>
        </div>
      </div>

      {/* DEMO MODE NOTICE BANNER */}
      <div className="glass-panel p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 flex items-center gap-2.5 text-xs font-semibold">
        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-300 font-black uppercase text-[10px] tracking-wider border border-amber-500/30">
          Demo Mode
        </span>
        <span>Demo Mode: No real money will be transferred. Simulated payment records are clearly tagged.</span>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="glass-panel p-4 rounded-[1.75rem] border border-[#D9CBBB] dark:border-[#38251F] max-w-md shadow-xs">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by transaction ID, tenant name, unit..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-full glass-input"
          />
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#78685D]" />
        </div>
      </div>

      {/* TRANSACTION LIST */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 bg-[#E9DFD0]/40 dark:bg-[#2A1D18]/40 rounded-2xl"></div>
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="glass-panel py-16 text-center text-[#78685D] rounded-[2rem] border border-[#D9CBBB] dark:border-[#38251F]">
          <CreditCard className="w-12 h-12 mx-auto mb-2 text-[#78685D] opacity-40" />
          <p className="text-sm font-semibold">No payment transactions logged.</p>
        </div>
      ) : (
        <div className="glass-panel border border-[#D9CBBB] dark:border-[#38251F] rounded-[2rem] overflow-hidden shadow-sm bg-[#FAF7F1] dark:bg-[#1E1715]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D9CBBB] dark:border-[#38251F] bg-[#E9DFD0] dark:bg-[#261916] text-[#38251F] dark:text-[#FAF7F1] font-bold uppercase tracking-wider">
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
              <tbody className="divide-y divide-[#D9CBBB]/40 dark:divide-[#38251F]/40">
                {filteredPayments.map((pay) => {
                  const isDemoTx = pay.isDemo || pay.paymentMethod === 'Demo';
                  const isFailed = pay.status === 'failed';

                  return (
                    <tr key={pay._id} className="hover:bg-[#E9DFD0]/30 dark:hover:bg-[#2A1D18]/30 transition-colors">
                      <td className="p-4 font-mono font-medium text-[#78685D] whitespace-nowrap">
                        {new Date(pay.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-mono font-bold text-[#38251F] dark:text-[#FAF7F1]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{pay.transactionId}</span>
                          {isDemoTx && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                              DEMO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-[#38251F] dark:text-[#FAF7F1]">{pay.property?.name}</p>
                          <span className="text-[10px] text-[#78685D] dark:text-[#C5B5A5]">Resident: {pay.tenant?.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-[#78685D]">
                        {pay.bill?.invoiceNumber || 'N/A'}
                      </td>
                      <td className="p-4 font-bold">
                        {isFailed ? (
                          <div className="text-rose-600 dark:text-rose-400">
                            <span className="line-through">₹{pay.amount.toLocaleString()}</span>
                            <span className="text-[10px] block font-normal text-rose-500">Not Charged</span>
                          </div>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            ₹{pay.amount.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-[#78685D] uppercase">
                        {pay.paymentMethod}
                      </td>
                      <td className="p-4">
                        {isFailed ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20">
                              Failed
                            </span>
                            {pay.failureReason && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 max-w-[140px] truncate" title={pay.failureReason}>
                                {pay.failureReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Success
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {pay.bill && !isFailed && (
                          <button
                            onClick={() => handleDownloadReceipt(pay.bill._id, pay.bill.invoiceNumber)}
                            className="p-1.5 text-[#78685D] hover:text-brand-600 hover:bg-[#E9DFD0]/60 rounded-lg transition-colors border border-[#D9CBBB] dark:border-[#38251F] cursor-pointer"
                            title="Download Receipt PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
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
  );
};

export default Payments;
