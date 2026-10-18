import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/api';
import {
  Users, Plus, Search, Eye, Phone, Mail, Building, Key,
  Lock, Edit, Trash2, Power, CheckCircle, XCircle, Shield,
  Calendar, Home, Sparkles, LayoutList, LayoutGrid, Check, X,
  MapPin, UserCheck, UserX, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import InternationalPhoneInput from '../components/InternationalPhoneInput';

const Tenants = () => {
  const [searchParams] = useSearchParams();
  const onboardPropertyId = searchParams.get('onboardPropertyId');
  const navigate = useNavigate();

  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // View mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState('table');

  // Modals toggle states
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [selectedTenant, setSelectedTenant] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Dedicated property/apartment state for modals
  const [addSelectedProperty, setAddSelectedProperty] = useState(onboardPropertyId || '');
  const [editSelectedProperty, setEditSelectedProperty] = useState('');
  const [assignSelectedProperty, setAssignSelectedProperty] = useState('');
  const [assignSelectedApartment, setAssignSelectedApartment] = useState('');
  const [assignRent, setAssignRent] = useState('');
  const [assignDeposit, setAssignDeposit] = useState('');
  const [assignUnitNumber, setAssignUnitNumber] = useState('');

  // Password visibility & generator helper
  const [showPassword, setShowPassword] = useState(false);

  // Phone states for Add and Edit Tenant
  const [addPhone, setAddPhone] = useState('');
  const [addPhoneMeta, setAddPhoneMeta] = useState({ isValid: false, country: 'IN' });
  const [addPhoneError, setAddPhoneError] = useState('');

  const [editPhone, setEditPhone] = useState('');
  const [editPhoneMeta, setEditPhoneMeta] = useState({ isValid: true, country: 'IN' });
  const [editPhoneError, setEditPhoneError] = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, setValue: setEditValue, formState: { errors: editErrors } } = useForm();

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

  const fetchApartments = async () => {
    try {
      const { data } = await apiClient.get('/apartments');
      if (data.success) {
        setApartments(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch apartments');
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchProperties();
    fetchApartments();
  }, []);

  useEffect(() => {
    if (onboardPropertyId) {
      setAddSelectedProperty(onboardPropertyId);
      setValue('propertyAssigned', onboardPropertyId);
      setModalOpen(true);
    }
  }, [onboardPropertyId, setValue]);

  // Generate random secure temporary password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$';
    let pwd = 'Leasify@';
    for (let i = 0; i < 4; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setValue('password', pwd);
    toast.success('Generated temporary password');
  };

  // Handle Add Tenant (Move-In)
  const onAddSubmit = async (data) => {
    if (!addPhone) {
      setAddPhoneError('Phone number is required.');
      return;
    }
    if (!addPhoneMeta.isValid) {
      setAddPhoneError('Please enter a valid phone number.');
      return;
    }
    setAddPhoneError('');
    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: addPhone,
        password: data.password,
        dateOfBirth: data.dateOfBirth || null,
        address: data.address || '',
        gender: data.gender || 'Unspecified',
        occupation: data.occupation || '',
        unitNumber: data.unitNumber || '',
        propertyAssigned: data.propertyAssigned || null,
        apartmentAssigned: data.apartmentAssigned || null,
        monthlyRent: data.monthlyRent ? parseFloat(data.monthlyRent) : 0,
        securityDeposit: data.securityDeposit ? parseFloat(data.securityDeposit) : 0,
        leaseStartDate: data.leaseStartDate || new Date(),
        leaseEndDate: data.leaseEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: data.isActive !== undefined ? data.isActive : true,
        emergencyName: data.emergencyName || '',
        emergencyPhone: data.emergencyPhone || '',
        emergencyRelation: data.emergencyRelation || ''
      };

      const res = await apiClient.post('/tenants', payload);
      if (res.data.success) {
        toast.success(`Tenant '${res.data.data?.name || data.name}' registered successfully!`);

        setModalOpen(false);
        reset();
        setAddPhone('');
        setAddSelectedProperty('');
        fetchTenants();
        fetchProperties();
        fetchApartments();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create tenant.');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (tenant) => {
    setSelectedTenant(tenant);
    setEditPhone(tenant.phone || '');
    setEditPhoneError('');
    const propId = tenant.propertyAssigned?._id || tenant.propertyAssigned || '';
    const aptId = tenant.apartmentAssigned?._id || tenant.apartmentAssigned || '';

    setEditSelectedProperty(propId);
    resetEdit({
      name: tenant.name,
      email: tenant.email,
      dateOfBirth: tenant.dateOfBirth ? new Date(tenant.dateOfBirth).toISOString().split('T')[0] : '',
      address: tenant.address || '',
      gender: tenant.gender || 'Unspecified',
      unitNumber: tenant.unitNumber || '',
      occupation: tenant.occupation || '',
      aadhaarNumber: tenant.aadhaarNumber || '',
      panNumber: tenant.panNumber || '',
      propertyAssigned: propId,
      apartmentAssigned: aptId,
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
    if (!editPhone) {
      setEditPhoneError('Phone number is required.');
      return;
    }
    if (!editPhoneMeta.isValid) {
      setEditPhoneError('Please enter a valid phone number.');
      return;
    }
    if (data.password && data.password.trim().length > 0 && data.password.trim().length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    setEditPhoneError('');
    try {
      const res = await apiClient.put(`/tenants/${selectedTenant._id}`, {
        ...data,
        phone: editPhone
      });
      if (res.data.success) {
        toast.success('Tenant details updated successfully!');
        setEditModalOpen(false);
        fetchTenants();
        fetchProperties();
        fetchApartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tenant');
    }
  };

  // Open Assign Property Modal
  const handleOpenAssign = (tenant) => {
    setSelectedTenant(tenant);
    const propId = tenant.propertyAssigned?._id || tenant.propertyAssigned || '';
    const aptId = tenant.apartmentAssigned?._id || tenant.apartmentAssigned || '';
    setAssignSelectedProperty(propId);
    setAssignSelectedApartment(aptId);
    setAssignRent(tenant.monthlyRent || '');
    setAssignDeposit(tenant.securityDeposit || '');
    setAssignUnitNumber(tenant.unitNumber || '');
    setAssignModalOpen(true);
  };

  // Submit Assign Property / Apartment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.patch(`/tenants/${selectedTenant._id}/assign-property`, {
        propertyId: assignSelectedProperty || null,
        apartmentId: assignSelectedApartment || null,
        unitNumber: assignUnitNumber,
        monthlyRent: assignRent ? parseFloat(assignRent) : 0,
        securityDeposit: assignDeposit ? parseFloat(assignDeposit) : 0
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Property & unit assigned successfully!');
        setAssignModalOpen(false);
        fetchTenants();
        fetchProperties();
        fetchApartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign property');
    }
  };

  // Submit Reset Password (never shows old password)
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      const res = await apiClient.patch(`/tenants/${selectedTenant._id}/reset-password`, {
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
      const res = await apiClient.patch(`/tenants/${tenant._id}/status`);
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
        fetchApartments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process tenant deletion');
    }
  };

  // Filtered apartments available for a selected property
  const getAvailableApartmentsForProperty = (propId, currentAptId = null) => {
    if (!propId) return [];
    return apartments.filter(a => {
      const aptPropId = a.property?._id || a.property;
      const matchesProp = aptPropId?.toString() === propId.toString();
      const isAvailable = a.status === 'Vacant' || (currentAptId && a._id.toString() === currentAptId.toString());
      return matchesProp && isAvailable;
    });
  };

  // Filtered tenants
  const filteredTenants = tenants.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery) ||
      (t.unitNumber && t.unitNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.propertyAssigned && t.propertyAssigned.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterStatus === 'active') return matchesSearch && t.isActive;
    if (filterStatus === 'inactive') return matchesSearch && !t.isActive;
    return matchesSearch;
  });

  const totalCount = tenants.length;
  const activeCount = tenants.filter(t => t.isActive).length;
  const inactiveCount = totalCount - activeCount;
  const unassignedCount = tenants.filter(t => !t.propertyAssigned).length;

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit">Tenants Directory</h1>
          <p className="text-xs text-[#78685D] dark:text-[#C5B5A5]">
            Create, manage credentials, assign properties & apartments for resident tenants.
          </p>
        </div>
        <button
          onClick={() => {
            reset();
            setAddSelectedProperty('');
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-[#FAF7F1] btn-primary-glow rounded-full shadow-lg transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Tenant
        </button>
      </div>

      {/* TOP SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-[#D9CBBB] dark:border-[#38251F] flex items-center justify-between bg-[#FAF7F1] dark:bg-[#1E1715]">
          <div>
            <span className="text-[10px] font-bold text-[#78685D] uppercase tracking-wider block">Total Tenants</span>
            <h3 className="text-xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit mt-0.5">{totalCount}</h3>
          </div>
          <div className="p-2.5 bg-[#E9DFD0] text-[#4A1715] dark:bg-[#2A1D18] dark:text-[#E9DFD0] rounded-xl"><Users className="w-5 h-5" /></div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-[#D9CBBB] dark:border-[#38251F] flex items-center justify-between bg-[#FAF7F1] dark:bg-[#1E1715]">
          <div>
            <span className="text-[10px] font-bold text-[#78685D] uppercase tracking-wider block">Active</span>
            <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400 Outfit mt-0.5">{activeCount}</h3>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl"><UserCheck className="w-5 h-5" /></div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-[#D9CBBB] dark:border-[#38251F] flex items-center justify-between bg-[#FAF7F1] dark:bg-[#1E1715]">
          <div>
            <span className="text-[10px] font-bold text-[#78685D] uppercase tracking-wider block">Inactive / Locked</span>
            <h3 className="text-xl font-black text-rose-700 dark:text-rose-400 Outfit mt-0.5">{inactiveCount}</h3>
          </div>
          <div className="p-2.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-xl"><UserX className="w-5 h-5" /></div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-[#D9CBBB] dark:border-[#38251F] flex items-center justify-between bg-[#FAF7F1] dark:bg-[#1E1715]">
          <div>
            <span className="text-[10px] font-bold text-[#78685D] uppercase tracking-wider block">Unassigned Units</span>
            <h3 className="text-xl font-black text-amber-700 dark:text-amber-400 Outfit mt-0.5">{unassignedCount}</h3>
          </div>
          <div className="p-2.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl"><Home className="w-5 h-5" /></div>
        </div>
      </div>

      {/* SEARCH, FILTER & VIEW CONTROLS */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between glass-panel p-3.5 rounded-[1.75rem] border border-[#D9CBBB] dark:border-[#38251F] shadow-xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tenant name, email, phone, unit..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-full glass-input"
          />
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#78685D]" />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterStatus === 'all' ? 'bg-[#4A1715] text-[#FAF7F1] shadow-sm' : 'bg-[#E9DFD0]/60 text-[#38251F] dark:bg-[#2A1D18] dark:text-[#E9DFD0]'}`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterStatus === 'active' ? 'bg-emerald-700 text-[#FAF7F1] shadow-sm' : 'bg-[#E9DFD0]/60 text-[#38251F] dark:bg-[#2A1D18] dark:text-[#E9DFD0]'}`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${filterStatus === 'inactive' ? 'bg-rose-700 text-[#FAF7F1] shadow-sm' : 'bg-[#E9DFD0]/60 text-[#38251F] dark:bg-[#2A1D18] dark:text-[#E9DFD0]'}`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#E9DFD0] dark:bg-[#2A1D18] rounded-full border border-[#D9CBBB] dark:border-[#38251F]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-full transition-colors ${viewMode === 'table' ? 'bg-[#FAF7F1] dark:bg-[#1E1715] text-[#4A1715] dark:text-[#FAF7F1] shadow-sm' : 'text-[#78685D] hover:text-[#38251F]'}`}
              title="Table View"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-[#FAF7F1] dark:bg-[#1E1715] text-[#4A1715] dark:text-[#FAF7F1] shadow-sm' : 'text-[#78685D] hover:text-[#38251F]'}`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* TENANTS LIST VIEW */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-16 bg-[#E9DFD0]/40 dark:bg-[#2A1D18]/40 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="glass-panel py-16 text-center text-[#78685D] rounded-[2rem] border border-[#D9CBBB] dark:border-[#38251F]">
          <Users className="w-12 h-12 mx-auto mb-2 text-[#78685D] opacity-40" />
          <p className="text-sm font-semibold">No tenants found matching criteria.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-3 px-5 py-2 text-xs font-bold text-[#FAF7F1] btn-primary-glow rounded-full cursor-pointer"
          >
            Add New Tenant
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (Section 5 Requirement) */
        <div className="glass-panel rounded-[2rem] border border-[#D9CBBB] dark:border-[#38251F] overflow-hidden shadow-sm bg-[#FAF7F1] dark:bg-[#1E1715]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E9DFD0] dark:bg-[#261916] border-b border-[#D9CBBB] dark:border-[#38251F] text-[#38251F] dark:text-[#FAF7F1] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Tenant Name</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Assigned Property & Unit</th>
                  <th className="py-3.5 px-4">Monthly Rent</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Registration Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9CBBB]/40 dark:divide-[#38251F]/40">
                {filteredTenants.map((ten) => (
                  <tr key={ten._id} className="hover:bg-[#E9DFD0]/30 dark:hover:bg-[#2A1D18]/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={ten.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt=""
                          className="w-9 h-9 rounded-full border border-[#D9CBBB] object-cover"
                        />
                        <div>
                          <Link to={`/tenants/${ten._id}`} className="font-bold text-[#38251F] dark:text-[#FAF7F1] hover:text-brand-600 transition-colors">
                            {ten.name}
                          </Link>
                          <span className="text-[10px] text-[#78685D] dark:text-[#C5B5A5] block">{ten.occupation || 'Resident Tenant'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#78685D] dark:text-[#C5B5A5]">
                      <div className="space-y-0.5">
                        <p className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#78685D]" /> {ten.email}</p>
                        <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#78685D]" /> {ten.phone}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#38251F] dark:text-[#FAF7F1] font-semibold">
                      {ten.propertyAssigned ? (
                        <div>
                          <span>{ten.propertyAssigned.name}</span>
                          <span className="text-brand-600 dark:text-brand-400 font-mono text-[11px] block">
                            {ten.apartmentAssigned?.number ? `Apt ${ten.apartmentAssigned.number}` : (ten.unitNumber ? `Unit ${ten.unitNumber}` : 'General Unit')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#38251F] dark:text-[#FAF7F1]">
                      ₹{ten.monthlyRent?.toLocaleString() || 0}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${ten.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'}`}>
                        {ten.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {ten.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[11px] text-[#78685D]">
                      {ten.createdAt ? new Date(ten.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/tenants/${ten._id}`}
                          title="View Details File"
                          className="p-1.5 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(ten)}
                          title="Edit Tenant"
                          className="p-1.5 bg-[#E6DACC] text-[#4A1917] dark:bg-[#352920] dark:text-[#F6EEE3] hover:bg-[#D9CABB] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAssign(ten)}
                          title="Assign Property / Apartment"
                          className="p-1.5 bg-[#E6DACC] text-[#4A1917] dark:bg-[#352920] dark:text-[#F6EEE3] hover:bg-[#D9CABB] rounded-lg transition-colors cursor-pointer"
                        >
                          <Home className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedTenant(ten); setNewPasswordInput(''); setResetModalOpen(true); }}
                          title="Reset Password"
                          className="p-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-colors"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(ten)}
                          title={ten.isActive ? 'Deactivate Tenant' : 'Activate Tenant'}
                          className={`p-1.5 rounded-lg transition-colors ${ten.isActive ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedTenant(ten); setDeleteModalOpen(true); }}
                          title="Delete Options"
                          className="p-1.5 bg-slate-100 dark:bg-slate-900 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
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
                        {ten.propertyAssigned.name} {ten.apartmentAssigned?.number ? `(Apt ${ten.apartmentAssigned.number})` : (ten.unitNumber ? `(Unit ${ten.unitNumber})` : '')}
                      </span>
                    ) : (
                      <span className="text-amber-500 italic">Unassigned Property</span>
                    )}
                  </p>
                  <p className="flex justify-between items-center text-[11px] pt-1 font-mono">
                    <span className="text-slate-400">Rent: <strong className="text-slate-700 dark:text-slate-200">INR {ten.monthlyRent?.toLocaleString()}</strong></span>
                    <span className="text-slate-400">Deposit: <strong className="text-slate-700 dark:text-slate-200">INR {ten.securityDeposit?.toLocaleString()}</strong></span>
                  </p>
                </div>
              </div>

              {/* ACTION TOOLBAR ON CARD */}
              <div className="grid grid-cols-5 gap-1.5 mt-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to={`/tenants/${ten._id}`}
                  title="View Tenant File"
                  className="py-1.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  title="Edit Tenant Details"
                  onClick={() => handleOpenEdit(ten)}
                  className="py-1.5 bg-[#E6DACC] text-[#4A1917] dark:bg-[#352920] dark:text-[#F6EEE3] hover:bg-[#D9CABB] rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  title="Assign Property / Apartment"
                  onClick={() => handleOpenAssign(ten)}
                  className="py-1.5 bg-[#E6DACC] text-[#4A1917] dark:bg-[#352920] dark:text-[#F6EEE3] hover:bg-[#D9CABB] rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  title="Reset Password"
                  onClick={() => { setSelectedTenant(ten); setNewPasswordInput(''); setResetModalOpen(true); }}
                  className="py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  title="Delete Tenant Options"
                  onClick={() => { setSelectedTenant(ten); setDeleteModalOpen(true); }}
                  className="py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. ADD TENANT MODAL (Section 6 Requirement) */}
      {/* ======================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2 Outfit">
                <Users className="w-5 h-5 text-brand-500" /> Add Tenant
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Personal Info & Credentials */}
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Anjali Sharma"
                      {...register('name', { required: 'Full Name is required' })}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                    />
                    {errors.name && <span className="text-[10px] text-red-500 mt-0.5 block">{errors.name.message}</span>}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Email *</label>
                    <input
                      type="email"
                      placeholder="tenant@domain.com"
                      {...register('email', { required: 'Email is required' })}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                    />
                    {errors.email && <span className="text-[10px] text-red-500 mt-0.5 block">{errors.email.message}</span>}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Phone *</label>
                    <InternationalPhoneInput
                      value={addPhone}
                      onChange={(val, meta) => {
                        setAddPhone(val);
                        setAddPhoneMeta(meta);
                        if (addPhoneError) setAddPhoneError('');
                      }}
                      error={addPhoneError}
                    />
                    {addPhoneError && <span className="text-[10px] text-red-500 mt-0.5 block">{addPhoneError}</span>}
                  </div>

                  {/* Password with generator */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-semibold text-slate-600 dark:text-slate-400">Password *</label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[10px] text-brand-500 font-bold hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Generate Temp Password
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...register('password', {
                          required: 'Password is required',
                          minLength: { value: 6, message: 'Password must be at least 6 characters' }
                        })}
                        className="w-full pl-3 pr-10 py-2 text-xs rounded-xl glass-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 text-[10px] font-bold"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {errors.password && <span className="text-[10px] text-red-500 mt-0.5 block">{errors.password.message}</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Date of Birth</label>
                      <input
                        type="date"
                        {...register('dateOfBirth')}
                        className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Gender</label>
                      <select {...register('gender')} className="w-full px-2 py-2 text-xs rounded-xl glass-input">
                        <option value="Unspecified">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Permanent / Prior Address</label>
                    <input
                      type="text"
                      placeholder="Street, City, Pincode"
                      {...register('address')}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                    />
                  </div>
                </div>

                {/* Right Column: Property & Apartment Assignment */}
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Property *</label>
                    <select
                      {...register('propertyAssigned')}
                      value={addSelectedProperty}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddSelectedProperty(val);
                        setValue('propertyAssigned', val);
                        setValue('apartmentAssigned', '');
                        // Autofill rent from property if property selected
                        const prop = properties.find(p => p._id === val);
                        if (prop) {
                          setValue('monthlyRent', prop.monthlyRent);
                          setValue('securityDeposit', prop.securityDeposit);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                    >
                      <option value="">Select Property...</option>
                      {properties.map(p => (
                        <option key={p._id} value={p._id}>{p.name} ({p.status})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Apartment / Unit</label>
                    <select
                      {...register('apartmentAssigned')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setValue('apartmentAssigned', val);
                        const apt = apartments.find(a => a._id === val);
                        if (apt) {
                          setValue('unitNumber', apt.number);
                          if (apt.monthlyRent) setValue('monthlyRent', apt.monthlyRent);
                          if (apt.securityDeposit) setValue('securityDeposit', apt.securityDeposit);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                    >
                      <option value="">Select Apartment / Unit...</option>
                      {getAvailableApartmentsForProperty(addSelectedProperty).map(a => (
                        <option key={a._id} value={a._id}>
                          Apt {a.number} (Floor {a.floor} • INR {a.monthlyRent}/mo)
                        </option>
                      ))}
                    </select>
                    {addSelectedProperty && getAvailableApartmentsForProperty(addSelectedProperty).length === 0 && (
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        No vacant apartment records found for this property. You can enter a unit number manually below.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Unit Number (Custom)</label>
                    <input
                      type="text"
                      placeholder="e.g. 402 / Flat 3B"
                      {...register('unitNumber')}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Monthly Rent (INR)</label>
                      <input
                        type="number"
                        placeholder="25000"
                        {...register('monthlyRent')}
                        className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Security Deposit (INR)</label>
                      <input
                        type="number"
                        placeholder="50000"
                        {...register('securityDeposit')}
                        className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Lease Start Date</label>
                      <input
                        type="date"
                        {...register('leaseStartDate')}
                        className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Lease End Date</label>
                      <input
                        type="date"
                        {...register('leaseEndDate')}
                        className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                      />
                    </div>
                  </div>

                  {/* Status checkbox */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        {...register('isActive')}
                        className="rounded text-brand-500 w-4 h-4"
                      />
                      <span>Active Account (Tenant can immediately log in)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-xl space-y-2 mt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Emergency Contact (Optional)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" placeholder="Contact Name" {...register('emergencyName')} className="px-2.5 py-1.5 text-xs rounded-lg glass-input" />
                  <input type="text" placeholder="Contact Phone" {...register('emergencyPhone')} className="px-2.5 py-1.5 text-xs rounded-lg glass-input" />
                  <input type="text" placeholder="Relationship" {...register('emergencyRelation')} className="px-2.5 py-1.5 text-xs rounded-lg glass-input" />
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
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-500/25 transition-all"
                >
                  Create Tenant Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. EDIT TENANT MODAL */}
      {/* ======================================================== */}
      {editModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-xl glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2 Outfit">
                <Edit className="w-4 h-4 text-brand-600" /> Edit Tenant Details: {selectedTenant.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Full Name *</label>
                  <input type="text" {...regEdit('name', { required: 'Name is required' })} className="w-full px-3 py-2 rounded-xl glass-input" />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Email Address *</label>
                  <input type="email" {...regEdit('email', { required: 'Email is required' })} className="w-full px-3 py-2 rounded-xl glass-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Phone Number *</label>
                  <InternationalPhoneInput
                    value={editPhone}
                    onChange={(val, meta) => {
                      setEditPhone(val);
                      setEditPhoneMeta(meta);
                      if (editPhoneError) setEditPhoneError('');
                    }}
                    error={editPhoneError}
                  />
                  {editPhoneError && <span className="text-[10px] text-red-500 mt-0.5 block">{editPhoneError}</span>}
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Occupation</label>
                  <input type="text" {...regEdit('occupation')} className="w-full px-3 py-2 rounded-xl glass-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Property</label>
                  <select
                    {...regEdit('propertyAssigned')}
                    value={editSelectedProperty}
                    onChange={(e) => {
                      setEditSelectedProperty(e.target.value);
                      setEditValue('propertyAssigned', e.target.value);
                      setEditValue('apartmentAssigned', '');
                    }}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  >
                    <option value="">Unassigned Property</option>
                    {properties.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Apartment Unit</label>
                  <select
                    {...regEdit('apartmentAssigned')}
                    onChange={(e) => {
                      setEditValue('apartmentAssigned', e.target.value);
                      const apt = apartments.find(a => a._id === e.target.value);
                      if (apt) {
                        setEditValue('unitNumber', apt.number);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  >
                    <option value="">Select Apartment Unit...</option>
                    {getAvailableApartmentsForProperty(editSelectedProperty, selectedTenant.apartmentAssigned?._id).map(a => (
                      <option key={a._id} value={a._id}>
                        Apt {a.number} (Floor {a.floor} • INR {a.monthlyRent}/mo)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Unit Number</label>
                  <input type="text" {...regEdit('unitNumber')} className="w-full px-3 py-2 rounded-xl glass-input" />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Monthly Rent (INR)</label>
                  <input type="number" {...regEdit('monthlyRent')} className="w-full px-3 py-2 rounded-xl glass-input" />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-500 block mb-1">Security Deposit (INR)</label>
                <input type="number" {...regEdit('securityDeposit')} className="w-full px-3 py-2 rounded-xl glass-input" />
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="col-span-3 font-semibold text-slate-400 text-[10px] uppercase">Emergency Contact</div>
                <input type="text" placeholder="Name" {...regEdit('emergencyName')} className="px-2.5 py-1.5 rounded-lg glass-input text-xs" />
                <input type="text" placeholder="Phone" {...regEdit('emergencyPhone')} className="px-2.5 py-1.5 rounded-lg glass-input text-xs" />
                <input type="text" placeholder="Relation" {...regEdit('emergencyRelation')} className="px-2.5 py-1.5 rounded-lg glass-input text-xs" />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/25 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs text-[#38251F] dark:text-[#FAF7F1] flex items-center gap-1.5 Outfit">
                    <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Set New Tenant Password ({selectedTenant?.name})
                  </label>
                  <span className="text-[10px] text-[#78685D] dark:text-[#A8988A]">(Tenant login only • Owner login unaffected)</span>
                </div>
                <input
                  type="password"
                  placeholder="Enter new password (min. 6 characters)"
                  {...regEdit('password')}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
                  <input type="checkbox" {...regEdit('isActive')} className="rounded text-brand-500 w-4 h-4" />
                  <span>Account Active Status</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-primary-glow text-white rounded-xl font-bold shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ASSIGN PROPERTY & APARTMENT MODAL (Section 7) */}
      {/* ======================================================== */}
      {assignModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2 Outfit">
                <Home className="w-4 h-4 text-brand-600" /> Assign Apartment: {selectedTenant.name}
              </h3>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Select Property</label>
                <select
                  value={assignSelectedProperty}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssignSelectedProperty(val);
                    setAssignSelectedApartment('');
                    const prop = properties.find(p => p._id === val);
                    if (prop) {
                      setAssignRent(prop.monthlyRent || '');
                      setAssignDeposit(prop.securityDeposit || '');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl glass-input"
                >
                  <option value="">-- No Property (Unassigned) --</option>
                  {properties.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Select Apartment / Unit</label>
                <select
                  value={assignSelectedApartment}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssignSelectedApartment(val);
                    const apt = apartments.find(a => a._id === val);
                    if (apt) {
                      setAssignUnitNumber(apt.number);
                      if (apt.monthlyRent) setAssignRent(apt.monthlyRent);
                      if (apt.securityDeposit) setAssignDeposit(apt.securityDeposit);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl glass-input"
                >
                  <option value="">-- Select Apartment --</option>
                  {getAvailableApartmentsForProperty(assignSelectedProperty, selectedTenant.apartmentAssigned?._id).map(a => (
                    <option key={a._id} value={a._id}>
                      Apt {a.number} (Floor {a.floor} • Rent: INR {a.monthlyRent})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Unit / Room Label</label>
                <input
                  type="text"
                  value={assignUnitNumber}
                  onChange={(e) => setAssignUnitNumber(e.target.value)}
                  placeholder="e.g. 402"
                  className="w-full px-3 py-2 rounded-xl glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Monthly Rent (INR)</label>
                  <input
                    type="number"
                    value={assignRent}
                    onChange={(e) => setAssignRent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Security Deposit (INR)</label>
                  <input
                    type="number"
                    value={assignDeposit}
                    onChange={(e) => setAssignDeposit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-primary-glow text-white font-bold rounded-xl shadow-lg"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. RESET PASSWORD MODAL (Section 4 Requirement) */}
      {/* ======================================================== */}
      {resetModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2 Outfit">
                <Key className="w-4 h-4 text-amber-500" /> Reset Password
              </h3>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Enter a new secure password for tenant <strong>{selectedTenant.name}</strong> ({selectedTenant.email}).
              Existing password remains encrypted and cannot be viewed.
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  New Password (Minimum 6 characters) *
                </label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. DELETE / DEACTIVATE MODAL */}
      {/* ======================================================== */}
      {deleteModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Delete or Deactivate Tenant</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Select an action for tenant <strong>{selectedTenant.name}</strong> ({selectedTenant.email}).
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDeleteTenant(false)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" /> Deactivate Account & Vacate Unit
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTenant(true)}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Permanently Delete Tenant Record
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
