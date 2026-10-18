import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import apiClient from '../services/api';
import { 
  Plus, Building, Edit, Trash2, Eye, Search, 
  Layers, CheckCircle2, AlertCircle, Home, Key,
  X, Check, DollarSign, Shield, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const Apartments = () => {
  const [apartments, setApartments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState(null);
  const [viewingApartment, setViewingApartment] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  
  const [activeTab, setActiveTab] = useState('basic');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProperty, setFilterProperty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      number: '',
      floor: 1,
      areaSqFt: 1000,
      monthlyRent: 15000,
      securityDeposit: 30000,
      status: 'Vacant',
      furnishedStatus: 'furnished',
      bedrooms: 2,
      bathrooms: 2,
      balcony: true,
      parkingAvailable: true,
      propertyId: ''
    }
  });

  const rentWatch = watch('monthlyRent');

  // Auto-calculate default security deposit when rent changes if user hasn't set one
  useEffect(() => {
    if (rentWatch && !editingApartment) {
      const numRent = Number(rentWatch);
      if (!isNaN(numRent) && numRent > 0) {
        setValue('securityDeposit', numRent * 2);
      }
    }
  }, [rentWatch, editingApartment, setValue]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aptRes, propRes] = await Promise.allSettled([
        apiClient.get('/apartments'),
        apiClient.get('/properties')
      ]);

      if (aptRes.status === 'fulfilled' && aptRes.value.data.success) {
        setApartments(aptRes.value.data.data || []);
      }
      if (propRes.status === 'fulfilled' && propRes.value.data.success) {
        setProperties(propRes.value.data.data || []);
      }
    } catch {
      toast.error('Failed to load apartment records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingApartment(null);
    reset({
      number: '',
      floor: 1,
      areaSqFt: 1000,
      monthlyRent: 15000,
      securityDeposit: 30000,
      status: 'Vacant',
      furnishedStatus: 'furnished',
      bedrooms: 2,
      bathrooms: 2,
      balcony: true,
      parkingAvailable: true,
      propertyId: properties.length > 0 ? properties[0]._id : ''
    });
    setActiveTab('basic');
    setModalOpen(true);
  };

  const openEditModal = (apt) => {
    setEditingApartment(apt);
    reset({
      number: apt.number || '',
      floor: apt.floor ?? 1,
      areaSqFt: apt.areaSqFt ?? 1000,
      monthlyRent: apt.monthlyRent ?? 15000,
      securityDeposit: apt.securityDeposit ?? (apt.monthlyRent ? apt.monthlyRent * 2 : 30000),
      status: apt.status || 'Vacant',
      furnishedStatus: apt.furnishedStatus || 'unfurnished',
      bedrooms: apt.bedrooms ?? 0,
      bathrooms: apt.bathrooms ?? 0,
      balcony: apt.balcony ?? false,
      parkingAvailable: apt.parkingAvailable ?? false,
      propertyId: apt.property?._id || apt.property || (properties.length > 0 ? properties[0]._id : '')
    });
    setActiveTab('basic');
    setModalOpen(true);
  };

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        number: formData.number,
        floor: Number(formData.floor),
        areaSqFt: Number(formData.areaSqFt),
        monthlyRent: Number(formData.monthlyRent),
        securityDeposit: Number(formData.securityDeposit) || Number(formData.monthlyRent) * 2,
        status: formData.status,
        furnishedStatus: formData.furnishedStatus,
        bedrooms: Number(formData.bedrooms) || 0,
        bathrooms: Number(formData.bathrooms) || 0,
        balcony: Boolean(formData.balcony),
        parkingAvailable: Boolean(formData.parkingAvailable),
        propertyId: formData.propertyId || (properties.length > 0 ? properties[0]._id : undefined)
      };

      if (editingApartment) {
        const res = await apiClient.put(`/apartments/${editingApartment._id}`, payload);
        if (res.data.success) {
          toast.success('Apartment updated successfully!');
          setModalOpen(false);
          setEditingApartment(null);
          fetchData();
        }
      } else {
        const res = await apiClient.post('/apartments', payload);
        if (res.data.success) {
          toast.success('Apartment added successfully!');
          setModalOpen(false);
          reset();
          fetchData();
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || (editingApartment ? 'Update failed' : 'Add failed');
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiClient.delete(`/apartments/${id}`);
      if (res.data.success) {
        toast.success('Apartment deleted successfully');
        setDeleteId(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // Filter apartments
  const filteredApartments = apartments.filter(apt => {
    const matchesSearch = searchQuery === '' || 
      (apt.number && apt.number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (apt.property?.name && apt.property.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesProp = filterProperty === 'all' || 
      (apt.property?._id === filterProperty || apt.property === filterProperty);
    
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;

    return matchesSearch && matchesProp && matchesStatus;
  });

  // Calculate metrics
  const totalApartments = apartments.length;
  const vacantCount = apartments.filter(a => a.status === 'Vacant').length;
  const occupiedCount = apartments.filter(a => a.status === 'Occupied').length;
  const totalPotentialRent = apartments.reduce((sum, a) => sum + (a.monthlyRent || 0), 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Vacant':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">Vacant</span>;
      case 'Occupied':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#E6DACC] text-[#4A1917] dark:bg-[#352920] dark:text-[#F6EEE3] border border-[#D9CABB] dark:border-[rgba(230,211,191,0.2)]">Occupied</span>;
      case 'Reserved':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">Reserved</span>;
      case 'Under Maintenance':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">Maintenance</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status || 'Vacant'}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-cream-100 via-cream-200 to-cream-300 dark:from-espresso-900 dark:via-espresso-950 dark:to-espresso-900 p-6 rounded-[2rem] border border-cream-300 dark:border-espresso-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-cream-200 border border-brand-500/20">
              <Building className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-espresso dark:text-cream-50 Outfit tracking-tight">Units & Apartments</h1>
          </div>
          <p className="text-xs text-cream-700 dark:text-cream-300 mt-1">
            Manage apartment units, rent structures, furnishing specs, and occupancy status.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-full flex items-center gap-2 shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add Apartment
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-cream-200 dark:border-espresso-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center font-black">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-cream-600 dark:text-cream-400 uppercase tracking-wider">Total Units</p>
            <p className="text-xl font-black text-espresso dark:text-cream-50 Outfit">{totalApartments}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-cream-200 dark:border-espresso-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-cream-600 dark:text-cream-400 uppercase tracking-wider">Vacant Units</p>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 Outfit">{vacantCount}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-cream-200 dark:border-espresso-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-cream-600 dark:text-cream-400 uppercase tracking-wider">Occupied</p>
            <p className="text-xl font-black text-amber-700 dark:text-amber-400 Outfit">{occupiedCount}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-cream-200 dark:border-espresso-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center font-black">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-cream-600 dark:text-cream-400 uppercase tracking-wider">Monthly Potential</p>
            <p className="text-xl font-black text-espresso dark:text-cream-50 Outfit">₹{totalPotentialRent.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-cream-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search unit # or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input placeholder-cream-500"
          />
        </div>

        <div className="flex flex-wrap w-full md:w-auto items-center gap-3">
          {properties.length > 0 && (
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl glass-input"
            >
              <option value="all">All Properties</option>
              {properties.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl glass-input"
          >
            <option value="all">All Statuses</option>
            <option value="Vacant">Vacant</option>
            <option value="Occupied">Occupied</option>
            <option value="Reserved">Reserved</option>
            <option value="Under Maintenance">Under Maintenance</option>
          </select>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 glass-panel rounded-3xl animate-pulse bg-cream-200/50 dark:bg-espresso-900/40 border border-cream-300 dark:border-espresso-800" />
          ))}
        </div>
      ) : filteredApartments.length === 0 ? (
        <div className="py-16 text-center glass-panel rounded-3xl border border-cream-300 dark:border-espresso-800 p-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-600 mx-auto flex items-center justify-center mb-4">
            <Building className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-espresso dark:text-cream-100 Outfit mb-1">No apartments found</h3>
          <p className="text-xs text-cream-600 dark:text-cream-400 max-w-md mx-auto mb-6">
            {apartments.length === 0 
              ? 'Get started by creating your first apartment unit. It will automatically be linked to your properties.' 
              : 'No apartments match your current filters. Try adjusting your search query.'}
          </p>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-full inline-flex items-center gap-2 shadow-lg shadow-brand-500/25"
          >
            <Plus className="w-4 h-4" /> Add Apartment Unit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApartments.map(ap => {
            const propName = ap.property?.name || 'Primary Property';
            return (
              <div
                key={ap._id}
                className="glass-card-hover rounded-3xl overflow-hidden border border-cream-300 dark:border-espresso-800 shadow-sm flex flex-col group bg-cream-50/80 dark:bg-espresso-950/70"
              >
                {/* Header card banner */}
                <div className="p-5 border-b border-cream-200 dark:border-espresso-800 flex justify-between items-start bg-cream-100/60 dark:bg-espresso-900/40">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-espresso dark:text-cream-100 Outfit tracking-tight">
                        Unit {ap.number}
                      </h3>
                      {getStatusBadge(ap.status)}
                    </div>
                    <p className="text-xs text-cream-600 dark:text-cream-400 flex items-center gap-1 mt-1 truncate">
                      <Building className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                      <span className="truncate">{propName}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-cream-500 font-medium">Monthly Rent</span>
                    <p className="text-base font-black text-brand-600 dark:text-cream-100 Outfit">
                      ₹{(ap.monthlyRent || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Specs Pill List */}
                <div className="p-5 flex-1 space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-cream-100/70 dark:bg-espresso-900/50 border border-cream-200 dark:border-espresso-800">
                      <span className="text-[10px] font-semibold text-cream-500 block uppercase">Floor</span>
                      <span className="text-xs font-bold text-espresso dark:text-cream-200 Outfit">{ap.floor ?? '—'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-cream-100/70 dark:bg-espresso-900/50 border border-cream-200 dark:border-espresso-800">
                      <span className="text-[10px] font-semibold text-cream-500 block uppercase">Area</span>
                      <span className="text-xs font-bold text-espresso dark:text-cream-200 Outfit">{ap.areaSqFt ? `${ap.areaSqFt} sq ft` : '—'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-cream-100/70 dark:bg-espresso-900/50 border border-cream-200 dark:border-espresso-800">
                      <span className="text-[10px] font-semibold text-cream-500 block uppercase">Deposit</span>
                      <span className="text-xs font-bold text-espresso dark:text-cream-200 Outfit">₹{(ap.securityDeposit || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ap.bedrooms !== undefined && ap.bedrooms > 0 && (
                      <span className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-cream-200/60 dark:bg-espresso-800/60 text-espresso dark:text-cream-200">
                        {ap.bedrooms} BHK
                      </span>
                    )}
                    {ap.bathrooms !== undefined && ap.bathrooms > 0 && (
                      <span className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-cream-200/60 dark:bg-espresso-800/60 text-espresso dark:text-cream-200">
                        {ap.bathrooms} Bath
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-cream-200/60 dark:bg-espresso-800/60 text-espresso dark:text-cream-200 capitalize">
                      {ap.furnishedStatus || 'Unfurnished'}
                    </span>
                    {ap.parkingAvailable && (
                      <span className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-cream-200/60 dark:bg-espresso-800/60 text-espresso dark:text-cream-200">
                        Parking
                      </span>
                    )}
                    {ap.balcony && (
                      <span className="px-2 py-0.5 text-[11px] font-medium rounded-lg bg-cream-200/60 dark:bg-espresso-800/60 text-espresso dark:text-cream-200">
                        Balcony
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="p-3 bg-cream-100/50 dark:bg-espresso-950/60 border-t border-cream-200 dark:border-espresso-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setViewingApartment(ap)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-cream-200/70 dark:bg-espresso-800 hover:bg-brand-500 hover:text-white text-espresso dark:text-cream-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Details
                  </button>
                  <button
                    onClick={() => openEditModal(ap)}
                    className="p-1.5 rounded-xl bg-cream-200/70 dark:bg-espresso-800 text-espresso dark:text-cream-200 hover:text-white hover:bg-brand-500 transition-colors"
                    title="Edit Unit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(ap._id)}
                    className="p-1.5 rounded-xl bg-cream-200/70 dark:bg-espresso-800 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                    title="Delete Unit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Apartment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl glass-panel-elevated bg-cream-50/95 dark:bg-espresso-950/95 border border-cream-300 dark:border-espresso-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[92vh] text-espresso dark:text-cream-50">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-cream-200 dark:border-espresso-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-cream-200">
                  <Building className="w-5 h-5" />
                </span>
                <h3 className="font-extrabold text-lg text-espresso dark:text-cream-50 Outfit">
                  {editingApartment ? `Edit Unit ${editingApartment.number}` : 'Add New Apartment Unit'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-cream-500 hover:text-espresso hover:bg-cream-200/60 dark:hover:bg-espresso-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Properties Notice if empty */}
            {properties.length === 0 && (
              <div className="mb-4 p-3 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>No property found. A primary property will be automatically created and linked to this unit.</span>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-cream-100 dark:bg-espresso-900 rounded-2xl mb-5 border border-cream-200 dark:border-espresso-800">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'basic' ? 'bg-brand-500 text-white shadow-md' : 'text-cream-600 dark:text-cream-400 hover:text-espresso'
                }`}
              >
                Basic Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('specs')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'specs' ? 'bg-brand-500 text-white shadow-md' : 'text-cream-600 dark:text-cream-400 hover:text-espresso'
                }`}
              >
                Specifications & Features
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {activeTab === 'basic' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {properties.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-espresso dark:text-cream-200 mb-1.5">
                        Property Building *
                      </label>
                      <select
                        {...register('propertyId')}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                      >
                        {properties.map(p => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.address?.city || 'India'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-espresso dark:text-cream-200 mb-1.5">
                        Apartment / Unit Number *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. A-101 or Unit 4"
                        {...register('number', { required: 'Unit number is required' })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                      />
                      {errors.number && <span className="text-[11px] text-red-500 mt-1 block">{errors.number.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-espresso dark:text-cream-200 mb-1.5">
                        Floor Number *
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 1"
                        {...register('floor', { required: 'Floor is required' })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                      />
                      {errors.floor && <span className="text-[11px] text-red-500 mt-1 block">{errors.floor.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-espresso dark:text-cream-200 mb-1.5">
                        Area (sq ft) *
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 1100"
                        {...register('areaSqFt', { required: 'Area is required', min: { value: 1, message: 'Must be greater than 0' } })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                      />
                      {errors.areaSqFt && <span className="text-[11px] text-red-500 mt-1 block">{errors.areaSqFt.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-espresso dark:text-cream-200 mb-1.5">
                        Status
                      </label>
                      <select
                        {...register('status')}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                      >
                        <option value="Vacant">Vacant</option>
                        <option value="Occupied">Occupied</option>
                        <option value="Reserved">Reserved</option>
                        <option value="Under Maintenance">Under Maintenance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-espresso dark:text-cream-200 mb-1.5">
                        Monthly Rent (₹) *
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 15000"
                        {...register('monthlyRent', { required: 'Rent is required', min: { value: 0, message: 'Invalid rent' } })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                      />
                      {errors.monthlyRent && <span className="text-[11px] text-red-500 mt-1 block">{errors.monthlyRent.message}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-espresso dark:text-cream-200 mb-1.5">
                        Security Deposit (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 30000"
                        {...register('securityDeposit')}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'specs' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-espresso dark:text-cream-200 mb-1.5">
                        Bedrooms (BHK)
                      </label>
                      <input
                        type="number"
                        placeholder="2"
                        {...register('bedrooms')}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-espresso dark:text-cream-200 mb-1.5">
                        Bathrooms
                      </label>
                      <input
                        type="number"
                        placeholder="2"
                        {...register('bathrooms')}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-espresso dark:text-cream-200 mb-1.5">
                        Furnishing Status
                      </label>
                      <select
                        {...register('furnishedStatus')}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input"
                      >
                        <option value="furnished">Furnished</option>
                        <option value="semi-furnished">Semi-Furnished</option>
                        <option value="unfurnished">Unfurnished</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-6 pt-2">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-espresso dark:text-cream-200">
                        <input
                          type="checkbox"
                          {...register('balcony')}
                          className="w-4 h-4 rounded border-cream-300 bg-cream-50 text-brand-500 focus:ring-brand-500"
                        />
                        Has Balcony
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-espresso dark:text-cream-200">
                        <input
                          type="checkbox"
                          {...register('parkingAvailable')}
                          className="w-4 h-4 rounded border-cream-300 bg-cream-50 text-brand-500 focus:ring-brand-500"
                        />
                        Parking Space Included
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end items-center gap-3 pt-4 border-t border-cream-200 dark:border-espresso-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-cream-600 dark:text-cream-300 hover:text-espresso rounded-xl border border-cream-300 dark:border-espresso-800 hover:bg-cream-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-full shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingApartment ? 'Update Apartment' : 'Create Apartment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {viewingApartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel-elevated bg-cream-50/95 dark:bg-espresso-950/95 border border-cream-300 dark:border-espresso-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-espresso dark:text-cream-50">
            <div className="flex justify-between items-center pb-4 border-b border-cream-200 dark:border-espresso-800 mb-5">
              <div>
                <h3 className="font-extrabold text-xl text-espresso dark:text-cream-50 Outfit">Unit {viewingApartment.number}</h3>
                <p className="text-xs text-cream-600 dark:text-cream-400">{viewingApartment.property?.name || 'Primary Property'}</p>
              </div>
              <button
                onClick={() => setViewingApartment(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-cream-500 hover:text-espresso hover:bg-cream-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center p-3 rounded-2xl bg-cream-100/70 dark:bg-espresso-900/50 border border-cream-200 dark:border-espresso-800">
                <span className="text-cream-600 dark:text-cream-400">Current Status</span>
                {getStatusBadge(viewingApartment.status)}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-cream-100/70 dark:bg-espresso-900/50 border border-cream-200 dark:border-espresso-800">
                  <span className="text-cream-600 dark:text-cream-400 block mb-1">Monthly Rent</span>
                  <span className="text-base font-black text-brand-600 dark:text-cream-100 Outfit">₹{(viewingApartment.monthlyRent || 0).toLocaleString()}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-cream-100/70 dark:bg-espresso-900/50 border border-cream-200 dark:border-espresso-800">
                  <span className="text-cream-600 dark:text-cream-400 block mb-1">Security Deposit</span>
                  <span className="text-base font-black text-espresso dark:text-cream-100 Outfit">₹{(viewingApartment.securityDeposit || 0).toLocaleString()}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-cream-100/70 dark:bg-espresso-900/50 border border-cream-200 dark:border-espresso-800">
                  <span className="text-cream-600 dark:text-cream-400 block mb-1">Floor Level</span>
                  <span className="text-sm font-bold text-espresso dark:text-cream-200 Outfit">{viewingApartment.floor ?? '—'}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-cream-100/70 dark:bg-espresso-900/50 border border-cream-200 dark:border-espresso-800">
                  <span className="text-cream-600 dark:text-cream-400 block mb-1">Area</span>
                  <span className="text-sm font-bold text-espresso dark:text-cream-200 Outfit">{viewingApartment.areaSqFt ? `${viewingApartment.areaSqFt} sq ft` : '—'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-cream-100/70 dark:bg-espresso-900/50 border border-cream-200 dark:border-espresso-800 space-y-2.5">
                <h4 className="font-bold text-espresso dark:text-cream-200 uppercase text-[11px] tracking-wider mb-2">Specifications</h4>
                <div className="flex justify-between text-cream-700 dark:text-cream-300">
                  <span>Bedrooms:</span>
                  <span className="font-semibold text-espresso dark:text-cream-100">{viewingApartment.bedrooms || 0} BHK</span>
                </div>
                <div className="flex justify-between text-cream-700 dark:text-cream-300">
                  <span>Bathrooms:</span>
                  <span className="font-semibold text-espresso dark:text-cream-100">{viewingApartment.bathrooms || 0}</span>
                </div>
                <div className="flex justify-between text-cream-700 dark:text-cream-300">
                  <span>Furnishing:</span>
                  <span className="font-semibold text-espresso dark:text-cream-100 capitalize">{viewingApartment.furnishedStatus || 'Unfurnished'}</span>
                </div>
                <div className="flex justify-between text-cream-700 dark:text-cream-300">
                  <span>Balcony:</span>
                  <span className="font-semibold text-espresso dark:text-cream-100">{viewingApartment.balcony ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-cream-700 dark:text-cream-300">
                  <span>Dedicated Parking:</span>
                  <span className="font-semibold text-espresso dark:text-cream-100">{viewingApartment.parkingAvailable ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  const toEdit = viewingApartment;
                  setViewingApartment(null);
                  openEditModal(toEdit);
                }}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-brand-500/20"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm glass-panel bg-slate-900/95 border border-white/10 rounded-3xl p-6 shadow-2xl text-center text-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-white Outfit mb-2">Delete Apartment Unit?</h3>
            <p className="text-xs text-slate-400 mb-6">
              This action cannot be undone. This apartment unit and its associated tenant links will be removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Apartments;
