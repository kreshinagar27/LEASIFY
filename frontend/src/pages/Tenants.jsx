import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/api';
import {
  Users, Plus, Search, Eye, Phone, Mail, Building, Key,
  Lock, Edit, Trash2, Power, CheckCircle, XCircle, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

const Tenants = () => {
  const [searchParams] = useSearchParams();
  const onboardPropertyId = searchParams.get('onboardPropertyId');
  const navigate = useNavigate();

  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors } } = useForm();

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/tenants');
      if (data.success) {
        setTenants(data.data);
      }
    } catch (err) {
      toast.error('Failed to load tenants list.');
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
      console.error('Failed to fetch properties');
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchProperties();
  }, []);

  useEffect(() => {
    if (onboardPropertyId) {
      setModalOpen(true);
    }
  }, [onboardPropertyId]);

  // Handle Add Tenant (Move-In)
  const onAddSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const payload = {
        ...data,
        propertyAssigned: data.propertyAssigned || onboardPropertyId
      };
      
      const res = await apiClient.post('/tenants', payload);
      if (res.data.success) {
        toast.success(`Tenant account created successfully!`);
        
        const tempPwd = res.data.tempPassword;
        if (tempPwd) {
          toast.success(`Password set: ${tempPwd}`, { duration: 6000 });
        }

        setModalOpen(false);
        reset();
        fetchTenants();
        fetchProperties();
        navigate('/tenants');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to onboard tenant.');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (tenant) => {
    setSelectedTenant(tenant);
    resetEdit({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      gender: tenant.gender || 'Unspecified',
      unitNumber: tenant.unitNumber || '',
      occupation: tenant.occupation || '',
      aadhaarNumber: tenant.aadhaarNumber || '',
      panNumber: tenant.panNumber || '',
      propertyAssigned: tenant.propertyAssigned ? tenant.propertyAssigned._id : '',
      monthlyRent: tenant.monthlyRent,
      securityDeposit: tenant.securityDeposit,
      emergencyName: tenant.emergencyContact?.name || '',
      emergencyPhone: tenant.emergencyContact?.phone || '',
      emergencyRelation: tenant.emergencyContact?.relationship || '',
      isActive: tenant.isActive
    });
    setEditModalOpen(true);
  };

  // Submit Edit Tenant
  const onEditSubmit = async (data) => {
    try {
      const res = await apiClient.put(`/tenants/${selectedTenant._id}`, data);
      if (res.data.success) {
        toast.success('Tenant details updated!');
        setEditModalOpen(false);
        fetchTenants();
        fetchProperties();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tenant');
    }
  };

  // Submit Reset Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      const res = await apiClient.put(`/tenants/${selectedTenant._id}/reset-password`, {
        newPassword: newPasswordInput
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Password reset successfully!');
        setResetModalOpen(false);
        setNewPasswordInput('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed');
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (tenant) => {
    try {
      const res = await apiClient.put(`/tenants/${tenant._id}/toggle-status`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchTenants();
      }
    } catch (err) {
      toast.error('Failed to update tenant status');
    }
  };

  // Delete Tenant (Permanent vs Soft Deactivate)
  const handleDeleteTenant = async (force) => {
    try {
      const url = force ? `/tenants/${selectedTenant._id}?force=true` : `/tenants/${selectedTenant._id}`;
      const res = await apiClient.delete(url);
      if (res.data.success) {
        toast.success(res.data.message);
        setDeleteModalOpen(false);
        fetchTenants();
        fetchProperties();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process tenant deletion');
    }
  };

  // Filtered tenants
  const filteredTenants = tenants.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery) ||
      (t.propertyAssigned && t.propertyAssigned.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterStatus === 'active') return matchesSearch && t.isActive;
    if (filterStatus === 'inactive') return matchesSearch && !t.isActive;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white Outfit">Tenants Directory</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Add, manage, edit and configure resident tenant accounts.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-500/20 transition-all duration-200"
        >
          <Plus className="w-4 h-4" /> Add Tenant Account
        </button>
      </div>

      {/* SEARCH AND FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between glass-panel p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tenant name, email, phone, property..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl glass-input"
          />
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold">Status:</span>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'all' ? 'bg-brand-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
          >
            All ({tenants.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'active' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
          >
            Active ({tenants.filter(t => t.isActive).length})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'inactive' ? 'bg-red-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}
          >
            Inactive ({tenants.filter(t => !t.isActive).length})
          </button>
        </div>
      </div>

      {/* TENANT CARDS GRID */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="glass-panel py-16 text-center text-slate-400 rounded-2xl">
          <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold">No tenants found matching criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((ten) => (
            <div
              key={ten._id}
              className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between glass-card-hover relative"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={ten.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt=""
                      className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-800 object-cover"
                    />
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800 dark:text-white Outfit">{ten.name}</h3>
                      <span className="text-[10px] text-slate-400 truncate block max-w-[150px]">{ten.occupation || 'Resident Tenant'}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider rounded-full ${ten.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                    {ten.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs border-t border-b border-slate-200/50 dark:border-slate-800/50 py-3 text-slate-500 dark:text-slate-400">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {ten.phone}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {ten.email}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {ten.propertyAssigned ? (
                      <span className="text-slate-700 dark:text-slate-300 font-semibold truncate">
                        {ten.propertyAssigned.name} {ten.unitNumber ? `(Unit ${ten.unitNumber})` : ''}
                      </span>
                    ) : (
                      <span className="text-amber-500 italic">Unassigned</span>
                    )}
                  </p>
                  <p className="flex justify-between items-center text-[11px] pt-1">
                    <span className="text-slate-400">Rent: <strong className="text-slate-700 dark:text-slate-200">INR {ten.monthlyRent?.toLocaleString()}</strong></span>
                    <span className="text-slate-400">Deposit: <strong className="text-slate-700 dark:text-slate-200">INR {ten.securityDeposit?.toLocaleString()}</strong></span>
                  </p>
                </div>
              </div>

              {/* ACTION TOOLBAR ON CARD */}
              <div className="grid grid-cols-4 gap-1.5 mt-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to={`/tenants/${ten._id}`}
                  title="View Tenant File"
                  className="py-1.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> File
                </Link>

                <button
                  type="button"
                  title="Edit Tenant Details"
                  onClick={() => handleOpenEdit(ten)}
                  className="py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>

                <button
                  type="button"
                  title="Reset Password"
                  onClick={() => { setSelectedTenant(ten); setResetModalOpen(true); }}
                  className="py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Key className="w-3.5 h-3.5" /> Reset
                </button>

                <button
                  type="button"
                  title="Delete Tenant Options"
                  onClick={() => { setSelectedTenant(ten); setDeleteModalOpen(true); }}
                  className="py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD TENANT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col relative max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 Outfit">
              <Users className="w-5 h-5 text-brand-500" /> Add New Tenant Account
            </h3>

            <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Personal Info & Credentials */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-0.5">Full Name *</label>
                    <input
                      type="text"
                      placeholder="Anjali Sharma"
                      {...register('name', { required: 'Name is required' })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                    />
                    {errors.name && <span className="text-[10px] text-red-500">{errors.name.message}</span>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-0.5">Email Address (Login ID) *</label>
                    <input
                      type="email"
                      placeholder="tenant@domain.com"
                      {...register('email', { required: 'Email is required' })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                    />
                    {errors.email && <span className="text-[10px] text-red-500">{errors.email.message}</span>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-0.5">Phone Number *</label>
                    <input
                      type="text"
                      placeholder="+91 9999999999"
                      {...register('phone', { required: 'Phone is required' })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                    />
                    {errors.phone && <span className="text-[10px] text-red-500">{errors.phone.message}</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Temporary Password *</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 chars' } })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                      {errors.password && <span className="text-[10px] text-red-500">{errors.password.message}</span>}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Confirm Password *</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        {...register('confirmPassword', { required: 'Confirm password is required' })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                      {errors.confirmPassword && <span className="text-[10px] text-red-500">{errors.confirmPassword.message}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Gender (Optional)</label>
                      <select {...register('gender')} className="w-full px-2 py-1.5 text-xs rounded-xl glass-input">
                        <option value="Unspecified">Select Gender...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Occupation (Optional)</label>
                      <input
                        type="text"
                        placeholder="Software Engineer"
                        {...register('occupation')}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="p-2.5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Emergency Contact (Optional)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" placeholder="Name" {...register('emergencyName')} className="px-2 py-1 text-xs rounded-lg glass-input" />
                      <input type="text" placeholder="Phone" {...register('emergencyPhone')} className="px-2 py-1 text-xs rounded-lg glass-input" />
                      <input type="text" placeholder="Relation" {...register('emergencyRelation')} className="px-2 py-1 text-xs rounded-lg glass-input" />
                    </div>
                  </div>
                </div>

                {/* Right Column: Property & Lease Assignment */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-0.5">Select Property</label>
                    <select
                      {...register('propertyAssigned')}
                      className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
                    >
                      <option value="">Select Property...</option>
                      {properties.map(p => (
                        <option key={p._id} value={p._id}>{p.name} ({p.status})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-0.5">Apartment / Unit Number</label>
                    <input
                      type="text"
                      placeholder="Apt 402 / Flat 3B"
                      {...register('unitNumber')}
                      className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Monthly Rent (INR)</label>
                      <input
                        type="number"
                        placeholder="25000"
                        {...register('monthlyRent')}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Security Deposit (INR)</label>
                      <input
                        type="number"
                        placeholder="50000"
                        {...register('securityDeposit')}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Move-In Date</label>
                      <input
                        type="date"
                        {...register('leaseStartDate')}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Lease End Date</label>
                      <input
                        type="date"
                        {...register('leaseEndDate')}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                  </div>
                </div>
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-500/25 transition-all"
                >
                  Save & Create Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TENANT MODAL */}
      {editModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-xl glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col relative max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 Outfit">
              <Edit className="w-4 h-4 text-blue-500" /> Edit Tenant Details ({selectedTenant.name})
            </h3>

            <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Full Name</label>
                  <input type="text" {...regEdit('name', { required: 'Name is required' })} className="w-full px-3 py-1.5 rounded-xl glass-input" />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Email Address</label>
                  <input type="email" {...regEdit('email', { required: 'Email is required' })} className="w-full px-3 py-1.5 rounded-xl glass-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Phone Number</label>
                  <input type="text" {...regEdit('phone')} className="w-full px-3 py-1.5 rounded-xl glass-input" />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Occupation</label>
                  <input type="text" {...regEdit('occupation')} className="w-full px-3 py-1.5 rounded-xl glass-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Property Assigned</label>
                  <select {...regEdit('propertyAssigned')} className="w-full px-2 py-1.5 rounded-xl glass-input">
                    <option value="">Unassigned</option>
                    {properties.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Unit / Apartment Number</label>
                  <input type="text" {...regEdit('unitNumber')} className="w-full px-3 py-1.5 rounded-xl glass-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Monthly Rent (INR)</label>
                  <input type="number" {...regEdit('monthlyRent')} className="w-full px-3 py-1.5 rounded-xl glass-input" />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-0.5">Security Deposit (INR)</label>
                  <input type="number" {...regEdit('securityDeposit')} className="w-full px-3 py-1.5 rounded-xl glass-input" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3 font-semibold text-slate-400">Emergency Contact</div>
                <input type="text" placeholder="Name" {...regEdit('emergencyName')} className="px-2.5 py-1.5 rounded-xl glass-input" />
                <input type="text" placeholder="Phone" {...regEdit('emergencyPhone')} className="px-2.5 py-1.5 rounded-xl glass-input" />
                <input type="text" placeholder="Relation" {...regEdit('emergencyRelation')} className="px-2.5 py-1.5 rounded-xl glass-input" />
              </div>

              <div>
                <label className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300 mt-2">
                  <input type="checkbox" {...regEdit('isActive')} className="rounded text-brand-500" />
                  Account Active Status
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-500 text-white rounded-xl font-bold shadow-lg">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" /> Reset Password for {selectedTenant.name}
            </h3>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-500 block mb-1">Enter New Password (Min 6 chars)</label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setResetModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-amber-500 text-white font-bold rounded-xl shadow-lg">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / DEACTIVATE MODAL */}
      {deleteModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Delete or Deactivate Tenant</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Choose an action for tenant <strong>{selectedTenant.name}</strong> (`{selectedTenant.email}`).
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDeleteTenant(true)}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Permanent Delete (Wipe Document from DB)
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTenant(false)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" /> Soft Deactivate & Unassign Property
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tenants;
