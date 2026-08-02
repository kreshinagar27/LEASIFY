import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../services/api';
import MoveWorkflowModal from '../components/MoveWorkflowModal';
import {
  User, Building, Key, History, FileText,
  CreditCard, Wrench, Shield, CheckCircle,
  AlertCircle, ChevronLeft, Upload, Download, RefreshCw, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const triggerMoveOutParam = searchParams.get('triggerMoveOut');

  const [tenant, setTenant] = useState(null);
  const [history, setHistory] = useState({ bills: [], payments: [], complaints: [] });
  const [loading, setLoading] = useState(true);
  
  // Modals / forms toggle states
  const [moveOutOpen, setMoveOutOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  
  // Renew inputs
  const [renewStartDate, setRenewStartDate] = useState('');
  const [renewEndDate, setRenewEndDate] = useState('');
  const [renewRent, setRenewRent] = useState('');

  // Document upload state
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Other');
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchTenantDetails = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/tenants/${id}`);
      if (data.success) {
        setTenant(data.data);
        setHistory(data.history);
        // Pre-fill renewal fields
        setRenewRent(data.data.monthlyRent || '');
      }
    } catch (err) {
      toast.error('Failed to load tenant profile.');
      navigate('/tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantDetails();
  }, [id]);

  useEffect(() => {
    if (triggerMoveOutParam === 'true' && tenant) {
      setMoveOutOpen(true);
    }
  }, [triggerMoveOutParam, tenant]);

  // Handle Lease Renewal form
  const handleRenewLease = async (e) => {
    e.preventDefault();
    if (!renewStartDate || !renewEndDate) {
      toast.error('Please configure lease dates');
      return;
    }
    try {
      const res = await apiClient.put(`/tenants/${id}/renew`, {
        leaseStartDate: renewStartDate,
        leaseEndDate: renewEndDate,
        monthlyRent: renewRent
      });
      if (res.data.success) {
        toast.success('Lease renewed successfully!');
        setRenewOpen(false);
        fetchTenantDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not renew lease');
    }
  };

  // Handle Move Out Workflow
  const handleMoveOutSubmit = async (formData) => {
    try {
      const res = await apiClient.post(`/tenants/${id}/move-out`, formData);
      if (res.data.success) {
        toast.success('Tenant move-out settled. Property marked vacant.');
        setMoveOutOpen(false);
        fetchTenantDetails();
        navigate('/properties');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not settle move-out');
    }
  };

  // Handle Document upload
  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a document file');
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('documentName', docName || selectedFile.name);
    formData.append('fileType', docType);

    try {
      const { data } = await apiClient.post(`/tenants/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.success) {
        toast.success('Document uploaded.');
        setDocName('');
        setSelectedFile(null);
        fetchTenantDetails();
      }
    } catch (err) {
      toast.error('Failed to upload document');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 lg:col-span-2 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link to="/tenants" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Tenants
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Profile info, Lease Details, Documents */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Details */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-start gap-4 mb-4 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center gap-4">
                <img
                  src={tenant.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
                  alt=""
                  className="w-16 h-16 rounded-full border border-slate-200 dark:border-slate-800 object-cover"
                />
                <div>
                  <h1 className="text-xl font-extrabold text-slate-800 dark:text-white Outfit">{tenant.name}</h1>
                  <p className="text-xs text-slate-400 mt-0.5">{tenant.occupation}</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 border text-[10px] font-bold uppercase tracking-wider rounded-full ${tenant.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                {tenant.isActive ? 'Active Resident' : 'Moved Out / Deactivated'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
              <p><strong>Email:</strong> {tenant.email}</p>
              <p><strong>Phone:</strong> {tenant.phone}</p>
              <p><strong>Aadhaar Number:</strong> {tenant.aadhaarNumber}</p>
              <p><strong>PAN Number:</strong> {tenant.panNumber || 'N/A'}</p>
              <p><strong>Emergency Contact:</strong> {tenant.emergencyContact?.name || 'N/A'} ({tenant.emergencyContact?.relationship || ''})</p>
              <p><strong>Emergency Phone:</strong> {tenant.emergencyContact?.phone || 'N/A'}</p>
            </div>

            {/* Workflow controls */}
            {tenant.isActive && (
              <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                <button
                  onClick={() => setRenewOpen(true)}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Extend / Renew Lease
                </button>
                {tenant.propertyAssigned && (
                  <button
                    onClick={() => setMoveOutOpen(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" /> Move-Out Workflow
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Documents Vault */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Verification Documents Vault</h3>
            
            {/* Upload form */}
            {tenant.isActive && (
              <form onSubmit={handleDocUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50 rounded-xl">
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Doc label (e.g. Passport)..."
                  className="px-3 py-1.5 text-xs rounded-lg glass-input"
                />
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg glass-input"
                >
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Lease">Lease Contract</option>
                  <option value="Other">Other Document</option>
                </select>
                <div className="flex gap-2">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="text-[10px] flex-1 mt-1"
                  />
                  <button type="submit" className="p-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg">
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* List of uploaded documents */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {tenant.uploadedDocs?.length === 0 ? (
                <span className="text-xs text-slate-400">No documents uploaded yet.</span>
              ) : (
                tenant.uploadedDocs.map((doc, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-xl text-xs">
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{doc.name}</p>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{doc.fileType}</span>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 rounded-lg"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Property Details & Logs */}
        <div className="space-y-6">
          {/* Assigned Property summary */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3">Rental Unit Address</h4>
            {tenant.propertyAssigned ? (
              <div className="space-y-3 text-xs">
                <p className="font-bold text-slate-800 dark:text-white">{tenant.propertyAssigned.name}</p>
                <p className="text-slate-500 leading-snug">
                  {tenant.propertyAssigned.address?.houseNumber}, {tenant.propertyAssigned.address?.street}, {tenant.propertyAssigned.address?.area}
                </p>
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-[10px] text-slate-400">Rent amount</span>
                    <p className="font-bold text-slate-800 dark:text-white">INR {tenant.monthlyRent?.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Security Deposit</span>
                    <p className="font-bold text-slate-800 dark:text-white">INR {tenant.securityDeposit?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400 text-xs italic">
                Unassigned / Moved Out
              </div>
            )}
          </div>

          {/* Renewal History logs */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3">Lease Renewal History</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {tenant.leaseRenewals?.length === 0 ? (
                <span className="text-xs text-slate-400 italic block text-center py-2">No past renewals logged.</span>
              ) : (
                tenant.leaseRenewals.map((ren, idx) => (
                  <div key={idx} className="p-2 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50 rounded-lg text-[10px] leading-relaxed">
                    <p className="font-bold text-slate-700 dark:text-slate-300">Period: {new Date(ren.startDate).toLocaleDateString()} - {new Date(ren.endDate).toLocaleDateString()}</p>
                    <p className="text-slate-500 mt-0.5">Rent: INR {ren.rentAmount?.toLocaleString()} | Logged: {new Date(ren.renewedAt).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RENEW LEASE AGREEMENT MODAL */}
      {renewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Lease Renewal
            </h3>

            <form onSubmit={handleRenewLease} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">Lease Start Date</label>
                <input
                  type="date"
                  value={renewStartDate}
                  onChange={(e) => setRenewStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">Lease End Date</label>
                <input
                  type="date"
                  value={renewEndDate}
                  onChange={(e) => setRenewEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">New Monthly Rent (INR)</label>
                <input
                  type="number"
                  value={renewRent}
                  onChange={(e) => setRenewRent(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenewOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg"
                >
                  Confirm Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOVE OUT WORKFLOW MODAL */}
      <MoveWorkflowModal
        isOpen={moveOutOpen}
        onClose={() => {
          setMoveOutOpen(false);
          // Clear query param
          navigate(`/tenants/${id}`);
        }}
        type="out"
        onSubmit={handleMoveOutSubmit}
        tenantName={tenant.name}
        propertyName={tenant.propertyAssigned?.name}
        securityDeposit={tenant.securityDeposit}
      />
    </div>
  );
};

export default TenantDetail;
