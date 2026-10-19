import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../services/api';
import MoveWorkflowModal from '../components/MoveWorkflowModal';
import {
  User, Building, Key, History, FileText,
  CreditCard, Wrench, Shield, CheckCircle,
  AlertCircle, ChevronLeft, Upload, Download, RefreshCw, Trash2, Edit, Power, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import InternationalPhoneInput from '../components/InternationalPhoneInput';

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const triggerMoveOutParam = searchParams.get('triggerMoveOut');

  const [tenant, setTenant] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / forms toggle states
  const [moveOutOpen, setMoveOutOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  
  // Reset password input
  const [newPassword, setNewPassword] = useState('');

  // Phone validation states for Edit Tenant modal
  const [phoneMeta, setPhoneMeta] = useState({ isValid: true, country: 'IN' });
  const [phoneError, setPhoneError] = useState('');

  // Edit form state
  const [editData, setEditData] = useState({});

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
        setRenewRent(data.data.monthlyRent || '');
        setEditData({
          name: data.data.name || '',
          email: data.data.email || '',
          phone: data.data.phone || '',
          gender: data.data.gender || 'Unspecified',
          unitNumber: data.data.unitNumber || '',
          occupation: data.data.occupation || '',
          monthlyRent: data.data.monthlyRent || '',
          securityDeposit: data.data.securityDeposit || '',
          propertyAssigned: data.data.propertyAssigned ? data.data.propertyAssigned._id : '',
          emergencyName: data.data.emergencyContact?.name || '',
          emergencyPhone: data.data.emergencyContact?.phone || '',
          emergencyRelation: data.data.emergencyContact?.relationship || '',
          password: '',
          isActive: data.data.isActive
        });
      }
    } catch (err) {
      toast.error('Failed to load tenant profile.');
      navigate('/tenants');
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const { data } = await apiClient.get('/properties');
      if (data.success) {
        setProperties(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch properties list');
    }
  };

  useEffect(() => {
    fetchTenantDetails();
    fetchProperties();
  }, [id]);

  useEffect(() => {
    if (triggerMoveOutParam === 'true' && tenant) {
      setMoveOutOpen(true);
    }
  }, [triggerMoveOutParam, tenant]);

  // Handle Edit Tenant Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editData.phone) {
      setPhoneError('Phone number is required.');
      return;
    }
    if (phoneMeta && !phoneMeta.isValid) {
      setPhoneError('Please enter a valid phone number.');
      return;
    }
    if (editData.password && editData.password.trim().length > 0 && editData.password.trim().length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    setPhoneError('');
    try {
      const res = await apiClient.put(`/tenants/${id}`, editData);
      if (res.data.success) {
        toast.success('Tenant profile updated!');
        setEditOpen(false);
        fetchTenantDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      const res = await apiClient.put(`/tenants/${id}/reset-password`, { newPassword });
      if (res.data.success) {
        toast.success(res.data.message || 'Password updated successfully!');
        setResetOpen(false);
        setNewPassword('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset password failed');
    }
  };

  // Toggle Tenant Active Status
  const handleToggleStatus = async () => {
    try {
      const res = await apiClient.put(`/tenants/${id}/toggle-status`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchTenantDetails();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Delete Tenant (Permanent vs Soft)
  const handleDeleteTenant = async (force) => {
    try {
      const url = force ? `/tenants/${id}?force=true` : `/tenants/${id}`;
      const res = await apiClient.delete(url);
      if (res.data.success) {
        toast.success(res.data.message);
        setDeleteOpen(false);
        navigate('/tenants');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

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
    <>
      <div className="space-y-6">
      {/* Top navigation */}
      <div className="flex justify-between items-center">
        <Link to="/tenants" className="inline-flex items-center gap-1 text-xs font-bold text-cream-600 hover:text-espresso dark:text-cream-400 dark:hover:text-cream-200">
          <ChevronLeft className="w-4 h-4" /> Back to Tenants Directory
        </Link>

        {/* Action quick links */}
        <div className="flex gap-2">
          <Link to={`/bills?tenantId=${tenant._id}`} className="px-3.5 py-1.5 bg-cream-100 dark:bg-espresso-900 text-espresso dark:text-cream-200 border border-cream-300 dark:border-espresso-800 rounded-full text-xs font-bold hover:bg-cream-200 flex items-center gap-1 transition-colors">
            <FileText className="w-3.5 h-3.5 text-brand-500" /> View Bills
          </Link>
          <Link to={`/payments?tenantId=${tenant._id}`} className="px-3.5 py-1.5 bg-cream-100 dark:bg-espresso-900 text-espresso dark:text-cream-200 border border-cream-300 dark:border-espresso-800 rounded-full text-xs font-bold hover:bg-cream-200 flex items-center gap-1 transition-colors">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> View Payments
          </Link>
          <Link to={`/maintenance?tenantId=${tenant._id}`} className="px-3.5 py-1.5 bg-cream-100 dark:bg-espresso-900 text-espresso dark:text-cream-200 border border-cream-300 dark:border-espresso-800 rounded-full text-xs font-bold hover:bg-cream-200 flex items-center gap-1 transition-colors">
            <Wrench className="w-3.5 h-3.5 text-amber-600" /> View Maintenance
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Profile info, Owner Actions, Documents */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Details Card */}
          <div className="glass-panel p-6 rounded-3xl border border-cream-300 dark:border-espresso-800">
            <div className="flex justify-between items-start gap-4 mb-4 pb-4 border-b border-cream-200 dark:border-espresso-800">
              <div className="flex items-center gap-4">
                <img
                  src={tenant.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
                  alt=""
                  className="w-16 h-16 rounded-full border border-cream-300 dark:border-espresso-800 object-cover"
                />
                <div>
                  <h1 className="text-xl font-extrabold text-espresso dark:text-cream-50 Outfit">{tenant.name}</h1>
                  <p className="text-xs text-cream-600 dark:text-cream-400 mt-0.5">{tenant.occupation || 'Resident Tenant'} • Gender: {tenant.gender || 'Unspecified'}</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 border text-[10px] font-bold uppercase tracking-wider rounded-full ${tenant.isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                {tenant.isActive ? 'Active Account' : 'Deactivated'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-cream-700 dark:text-cream-300">
              <p><strong>Email:</strong> {tenant.email}</p>
              <p><strong>Phone:</strong> {tenant.phone}</p>
              <p><strong>Unit / Flat:</strong> {tenant.unitNumber || 'N/A'}</p>
              <p><strong>Aadhaar Number:</strong> {tenant.aadhaarNumber || 'N/A'}</p>
              <p><strong>PAN Number:</strong> {tenant.panNumber || 'N/A'}</p>
              <p><strong>Emergency Contact:</strong> {tenant.emergencyContact?.name || 'N/A'} ({tenant.emergencyContact?.relationship || ''})</p>
              <p><strong>Emergency Phone:</strong> {tenant.emergencyContact?.phone || 'N/A'}</p>
              <p><strong>Lease Start:</strong> {tenant.leaseStartDate ? new Date(tenant.leaseStartDate).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Lease End:</strong> {tenant.leaseEndDate ? new Date(tenant.leaseEndDate).toLocaleDateString() : 'N/A'}</p>
            </div>

            {/* OWNER MANAGEMENT ACTION TOOLBAR */}
            <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-cream-200 dark:border-espresso-800">
              <button
                onClick={() => setEditOpen(true)}
                className="px-3.5 py-2 bg-cream-100 hover:bg-cream-200 dark:bg-espresso-900 border border-cream-300 dark:border-espresso-800 text-espresso dark:text-cream-100 font-bold text-xs rounded-full transition-all flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Profile
              </button>

              <button
                onClick={() => setResetOpen(true)}
                className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-bold text-xs rounded-full transition-all flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" /> Reset Password
              </button>

              <button
                onClick={handleToggleStatus}
                className={`px-3.5 py-2 font-bold text-xs rounded-full transition-all flex items-center gap-1.5 ${tenant.isActive ? 'bg-cream-200 hover:bg-cream-300 dark:bg-espresso-800 text-espresso dark:text-cream-100 border border-cream-300 dark:border-espresso-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
              >
                <Power className="w-3.5 h-3.5" /> {tenant.isActive ? 'Deactivate Account' : 'Activate Account'}
              </button>

              <button
                onClick={() => setRenewOpen(true)}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-full shadow-lg shadow-brand-500/25 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Renew Lease
              </button>

              {tenant.propertyAssigned && (
                <button
                  onClick={() => setMoveOutOpen(true)}
                  className="px-3.5 py-2 bg-terracotta-500/10 hover:bg-terracotta-500/20 text-terracotta-700 dark:text-terracotta-300 border border-terracotta-500/20 font-bold text-xs rounded-full transition-all flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" /> Move-Out Workflow
                </button>
              )}

              <button
                onClick={() => setDeleteOpen(true)}
                className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 font-bold text-xs rounded-full transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Tenant
              </button>
            </div>
          </div>

          {/* Documents Vault */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Verification Documents Vault</h3>
            
            <form onSubmit={handleDocUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50 rounded-xl">
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Doc label..."
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
                <p className="font-bold text-slate-800 dark:text-white">{tenant.propertyAssigned.name} {tenant.unitNumber ? `(Unit ${tenant.unitNumber})` : ''}</p>
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
    </div>

      {/* EDIT TENANT PROFILE MODAL */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-xl glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 Outfit">
              <Edit className="w-4 h-4 text-brand-600" /> Edit Profile - {tenant.name}
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Full Name</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl glass-input"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Email Address</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl glass-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Phone Number</label>
                  <InternationalPhoneInput
                    value={editData.phone}
                    onChange={(val, meta) => {
                      setEditData({ ...editData, phone: val });
                      setPhoneMeta(meta);
                      if (phoneError) setPhoneError('');
                    }}
                    error={phoneError}
                  />
                  {phoneError && <span className="text-[10px] text-red-500 mt-1 block">{phoneError}</span>}
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Gender</label>
                  <select
                    value={editData.gender}
                    onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-xl glass-input"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Unspecified">Unspecified</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Property Assigned</label>
                  <select
                    value={editData.propertyAssigned}
                    onChange={(e) => setEditData({ ...editData, propertyAssigned: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-xl glass-input"
                  >
                    <option value="">Unassigned</option>
                    {properties.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Unit / Apartment Number</label>
                  <input
                    type="text"
                    value={editData.unitNumber}
                    onChange={(e) => setEditData({ ...editData, unitNumber: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Monthly Rent (INR)</label>
                  <input
                    type="number"
                    value={editData.monthlyRent}
                    onChange={(e) => setEditData({ ...editData, monthlyRent: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Security Deposit (INR)</label>
                  <input
                    type="number"
                    value={editData.securityDeposit}
                    onChange={(e) => setEditData({ ...editData, securityDeposit: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3 font-semibold text-slate-400">Emergency Contact</div>
                <input
                  type="text"
                  placeholder="Name"
                  value={editData.emergencyName}
                  onChange={(e) => setEditData({ ...editData, emergencyName: e.target.value })}
                  className="px-2.5 py-1.5 rounded-xl glass-input"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={editData.emergencyPhone}
                  onChange={(e) => setEditData({ ...editData, emergencyPhone: e.target.value })}
                  className="px-2.5 py-1.5 rounded-xl glass-input"
                />
                <input
                  type="text"
                  placeholder="Relation"
                  value={editData.emergencyRelation}
                  onChange={(e) => setEditData({ ...editData, emergencyRelation: e.target.value })}
                  className="px-2.5 py-1.5 rounded-xl glass-input"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/25 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs text-[#38251F] dark:text-[#FAF7F1] flex items-center gap-1.5 Outfit">
                    <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Set New Tenant Password ({tenant?.name})
                  </label>
                  <span className="text-[10px] text-[#78685D] dark:text-[#A8988A]">(Tenant login only • Owner login unaffected)</span>
                </div>
                <input
                  type="password"
                  placeholder="Enter new password (leave blank to keep unchanged)"
                  value={editData.password || ''}
                  onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 btn-primary-glow text-white font-bold rounded-xl shadow-lg">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-xs">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" /> Reset Password for {tenant.name}
            </h3>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-500 block mb-1">New Password (Min 6 characters)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl glass-input"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setResetOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-amber-500 text-white font-bold rounded-xl shadow-lg">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / DEACTIVATE MODAL */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Delete or Deactivate Tenant</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Choose an action for tenant <strong>{tenant.name}</strong> (`{tenant.email}`).
            </p>

            <div className="flex flex-col gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => handleDeleteTenant(true)}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Permanent Delete (Wipe Document from DB)
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTenant(false)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" /> Soft Deactivate & Unassign Property
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENEW LEASE AGREEMENT MODAL */}
      {renewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 relative text-xs">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Lease Renewal
            </h3>

            <form onSubmit={handleRenewLease} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-500 block mb-0.5">Lease Start Date</label>
                <input
                  type="date"
                  value={renewStartDate}
                  onChange={(e) => setRenewStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl glass-input"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-500 block mb-0.5">Lease End Date</label>
                <input
                  type="date"
                  value={renewEndDate}
                  onChange={(e) => setRenewEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl glass-input"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-500 block mb-0.5">New Monthly Rent (INR)</label>
                <input
                  type="number"
                  value={renewRent}
                  onChange={(e) => setRenewRent(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl glass-input"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenewOpen(false)}
                  className="px-4 py-2 font-semibold rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg"
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
          navigate(`/tenants/${id}`);
        }}
        type="out"
        onSubmit={handleMoveOutSubmit}
        tenantName={tenant.name}
        propertyName={tenant.propertyAssigned?.name}
        securityDeposit={tenant.securityDeposit}
      />
    </>
  );
};

export default TenantDetail;
