import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import MapComponent from '../components/MapComponent';
import {
  Building, MapPin, Grid, ShieldAlert,
  Calendar, Wrench, CheckCircle, ChevronLeft,
  ChevronRight, Sparkles, UserPlus, Info, Check, Eye, EyeOff, Edit, Zap, Droplets, Compass, Layers, Phone, Mail, UserCheck, X, Key
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import PropertyGallery from '../components/PropertyGallery';
import InternationalPhoneInput from '../components/InternationalPhoneInput';
import { getMediaUrl } from '../utils/mediaHelper';

const AVAILABLE_AMENITIES = [
  'Lift / Elevator',
  'Power Backup',
  '24/7 Water Supply',
  'Security Guard',
  'CCTV Surveillance',
  'High-Speed Wi-Fi',
  'Fitness Gym',
  'Swimming Pool',
  'Garden / Park',
  'Air Conditioning',
  'Club House',
  'Intercom Facility'
];

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState('basic');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);

  // Edit Tenant State for Owner
  const [editTenantModalOpen, setEditTenantModalOpen] = useState(false);
  const [editTenantData, setEditTenantData] = useState({});
  const [tenantPhoneMeta, setTenantPhoneMeta] = useState(null);
  const [tenantPhoneError, setTenantPhoneError] = useState('');
  const [tenantSaving, setTenantSaving] = useState(false);
  const [showTenantPassword, setShowTenantPassword] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm();

  const fetchProperty = async () => {
    setLoading(true);
    try {
      const endpoint = (id === 'my' || id === 'me' || !id) ? '/properties/my' : `/properties/${id}`;
      const { data } = await apiClient.get(endpoint);
      if (data.success) {
        setProperty(data.data);
        setSelectedAmenities(data.data.amenities || []);
      }
    } catch (err) {
      toast.error('Failed to load property details.');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const openEditModal = () => {
    if (!property) return;
    setValue('name', property.name);
    setValue('type', property.type);
    setValue('category', property.category || 'Residential');
    setValue('floorNumber', property.floorNumber);
    setValue('totalFloors', property.totalFloors || 1);
    setValue('areaSqFt', property.areaSqFt);
    setValue('carpetAreaSqFt', property.carpetAreaSqFt || property.areaSqFt);
    setValue('builtUpAreaSqFt', property.builtUpAreaSqFt || property.areaSqFt);
    setValue('bedrooms', property.bedrooms);
    setValue('bathrooms', property.bathrooms);
    setValue('balconies', property.balconies || (property.balcony ? 1 : 0));
    setValue('furnishedStatus', property.furnishedStatus);
    setValue('parkingType', property.parkingType || 'None');
    setValue('facingDirection', property.facingDirection || 'East');
    setValue('propertyAge', property.propertyAge || 0);
    setValue('monthlyRent', property.monthlyRent);
    setValue('securityDeposit', property.securityDeposit);
    setValue('maintenanceCharges', property.maintenanceCharges || 0);
    setValue('electricityCharges', property.electricityCharges || 0);
    setValue('waterCharges', property.waterCharges || 0);
    setValue('description', property.description);
    setValue('houseNumber', property.address?.houseNumber);
    setValue('street', property.address?.street);
    setValue('area', property.address?.area);
    setValue('city', property.address?.city);
    setValue('state', property.address?.state);
    setValue('country', property.address?.country || 'India');
    setValue('pincode', property.address?.pincode);
    if (property.availableFromDate) {
      setValue('availableFromDate', new Date(property.availableFromDate).toISOString().split('T')[0]);
    }
    const coords = property.location?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2 && !isNaN(coords[1]) && !isNaN(coords[0]) && (coords[0] !== 0 || coords[1] !== 0)) {
      setLat(Number(coords[1]));
      setLng(Number(coords[0]));
    } else {
      setLat(12.9716);
      setLng(77.5946);
    }
    setSelectedAmenities(property.amenities || []);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        amenities: selectedAmenities,
        latitude: lat,
        longitude: lng
      };
      const res = await apiClient.put(`/properties/${property._id}`, payload);
      if (res.data.success) {
        toast.success('Property updated successfully!');
        setEditModalOpen(false);
        fetchProperty();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update property');
    }
  };

  const updateStatus = async (status) => {
    try {
      const { data } = await apiClient.put(`/properties/${property._id}`, { status });
      if (data.success) {
        toast.success(`Property marked: ${status}`);
        fetchProperty();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const openEditTenantModal = () => {
    if (!property?.tenant) return;
    const t = property.tenant;
    setEditTenantData({
      name: t.name || '',
      email: t.email || '',
      phone: t.phone || '',
      gender: t.gender || 'Unspecified',
      occupation: t.occupation || '',
      unitNumber: t.unitNumber || '',
      aadhaarNumber: t.aadhaarNumber || '',
      panNumber: t.panNumber || '',
      monthlyRent: t.monthlyRent !== undefined ? t.monthlyRent : (property.monthlyRent || ''),
      securityDeposit: t.securityDeposit !== undefined ? t.securityDeposit : (property.securityDeposit || ''),
      leaseStartDate: t.leaseStartDate ? new Date(t.leaseStartDate).toISOString().split('T')[0] : '',
      leaseEndDate: t.leaseEndDate ? new Date(t.leaseEndDate).toISOString().split('T')[0] : '',
      emergencyName: t.emergencyContact?.name || '',
      emergencyPhone: t.emergencyContact?.phone || '',
      emergencyRelation: t.emergencyContact?.relationship || '',
      password: ''
    });
    setShowTenantPassword(false);
    setTenantPhoneError('');
    setEditTenantModalOpen(true);
  };

  const handleTenantEditSubmit = async (e) => {
    e.preventDefault();
    if (!property?.tenant?._id) return;
    if (tenantPhoneMeta && !tenantPhoneMeta.isValid) {
      setTenantPhoneError('Please enter a valid international phone number.');
      return;
    }
    if (editTenantData.password && editTenantData.password.trim().length > 0 && editTenantData.password.trim().length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    setTenantSaving(true);
    try {
      const res = await apiClient.put(`/tenants/${property.tenant._id}`, editTenantData);
      if (res.data.success) {
        toast.success('Tenant profile updated successfully!');
        setEditTenantModalOpen(false);
        fetchProperty();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tenant profile');
    } finally {
      setTenantSaving(false);
    }
  };

  const toggleAmenity = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(prev => prev.filter(a => a !== amenity));
    } else {
      setSelectedAmenities(prev => [...prev, amenity]);
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

  let statusColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
  if (property.status === 'Vacant') statusColor = 'bg-[#E6DACC] text-[#4A1917] dark:bg-[#352920] dark:text-[#F6EEE3] border border-[#D9CABB] dark:border-[rgba(230,211,191,0.2)]';
  if (property.status === 'Under Maintenance') statusColor = 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';
  if (property.status === 'Reserved') statusColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';

  return (
    <>
      <div className="space-y-6">
        {/* Top Header */}
      <div className="flex justify-between items-center">
        <Link to="/properties" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Properties
        </Link>
        {user?.role === 'owner' && (
          <button
            onClick={openEditModal}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/25 flex items-center gap-1.5 transition-all"
          >
            <Edit className="w-3.5 h-3.5" /> Edit Property Details
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Gallery & Specifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photos & Videos Gallery */}
          <PropertyGallery
            propertyId={property._id}
            media={property.media || []}
            coverPhoto={property.coverPhoto || (property.images?.[0]?.url || '')}
            propertyName={property.name}
            isOwner={user?.role === 'owner'}
            onMediaUpdated={fetchProperty}
          />

          {/* MAIN SPECIFICATIONS & PRICING BREAKDOWN */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-brand-500/10 text-brand-500 rounded-full border border-brand-500/20">
                    {property.category || 'Residential'}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                    {property.type}
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white Outfit">{property.name}</h1>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand-500" />
                  {property.address?.houseNumber}, {property.address?.street}, {property.address?.area}, {property.address?.city}, {property.address?.state} - {property.address?.pincode}
                </p>
              </div>
              <span className={`px-3 py-1 border text-xs font-bold uppercase tracking-wider rounded-full ${statusColor} backdrop-blur-md`}>
                {property.status}
              </span>
            </div>

            {/* PRICING BREAKDOWN METRICS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Monthly Rent</span>
                <p className="text-base font-black text-brand-500 mt-0.5 Outfit">₹{property.monthlyRent?.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Security Deposit</span>
                <p className="text-base font-black text-slate-800 dark:text-white mt-0.5 Outfit">₹{property.securityDeposit?.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Maintenance Fee</span>
                <p className="text-base font-black text-slate-800 dark:text-white mt-0.5 Outfit">₹{property.maintenanceCharges || 0}/mo</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Available From</span>
                <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">
                  {new Date(property.availableFromDate || Date.now()).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* FULL PHYSICAL SPECIFICATIONS GRID */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Unit Specifications & Layout</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Floors</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Floor {property.floorNumber} of {property.totalFloors || 1}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Configuration</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{property.bedrooms} BHK | {property.bathrooms} Bath</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Super Area</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{property.areaSqFt} Sq. Ft.</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Carpet Area</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{property.carpetAreaSqFt || property.areaSqFt} Sq. Ft.</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Balconies</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{property.balconies || (property.balcony ? 1 : 0)} Balcony</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Furnishing</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 uppercase mt-0.5">{property.furnishedStatus}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Parking</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{property.parkingType || (property.parkingAvailability ? 'Available' : 'None')}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Facing / Age</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{property.facingDirection || 'East'} | {property.propertyAge || 0} Yrs</p>
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            {property.description && (
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Description</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{property.description}</p>
              </div>
            )}
          </div>

          {/* AMENITIES */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3">Property Amenities & Features</h4>
            {property.amenities?.length === 0 ? (
              <p className="text-xs text-slate-400">No amenities listed.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {property.amenities.map(a => (
                  <div key={a} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <Check className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Tenancy & Location Map */}
        <div className="space-y-6">
          {/* OWNER CARD */}
          {property.owner && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Property Owner Information</h4>
              <div className="flex items-center gap-3">
                <img
                  src={property.owner.profilePhoto || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100'}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                />
                <div>
                  <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{property.owner.name}</h5>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" /> {property.owner.email}
                  </p>
                  {property.owner.contactNumber && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {property.owner.contactNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE TENANCY CARD */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">Active Tenancy</h4>
              {property.tenant && (
                <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider rounded-full ${property.tenant.isActive !== false ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  {property.tenant.isActive !== false ? 'Active' : 'Deactivated'}
                </span>
              )}
            </div>
            {property.tenant ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img
                    src={getMediaUrl(property.tenant.profilePhoto)}
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'; }}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-800 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{property.tenant.name}</h5>
                    <p className="text-[11px] text-slate-400 truncate">{property.tenant.occupation || 'Resident Tenant'} • {property.tenant.gender || 'Unspecified'}</p>
                    <span className="text-[10px] text-slate-400 font-mono block truncate">{property.tenant.email}</span>
                  </div>
                </div>

                <div className="text-xs space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-400">
                  <p><strong>Phone:</strong> {property.tenant.phone}</p>
                  {property.tenant.unitNumber && <p><strong>Unit / Flat:</strong> {property.tenant.unitNumber}</p>}
                  {property.tenant.aadhaarNumber && <p><strong>Aadhaar:</strong> {property.tenant.aadhaarNumber}</p>}
                  {property.tenant.panNumber && <p><strong>PAN:</strong> {property.tenant.panNumber}</p>}
                  {property.tenant.emergencyContact?.name && (
                    <p><strong>Emergency:</strong> {property.tenant.emergencyContact.name} ({property.tenant.emergencyContact.phone || 'N/A'})</p>
                  )}
                  <p><strong>Lease Start:</strong> {property.tenant.leaseStartDate ? new Date(property.tenant.leaseStartDate).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Lease End:</strong> {property.tenant.leaseEndDate ? new Date(property.tenant.leaseEndDate).toLocaleDateString() : 'N/A'}</p>
                </div>

                <div className="flex flex-col gap-2 mt-4 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                  {user?.role === 'owner' && (
                    <button
                      onClick={openEditTenantModal}
                      className="w-full py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md shadow-brand-500/20"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Profile & Password
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to={`/tenants/${property.tenant._id}`}
                      className="py-1.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Tenant File
                    </Link>
                    <button
                      onClick={() => navigate(`/tenants/${property.tenant._id}?triggerMoveOut=true`)}
                      className="py-1.5 bg-red-500/10 text-red-500 border border-red-500/10 hover:bg-red-500/25 rounded-lg text-xs font-bold transition-all"
                    >
                      Move-Out Unit
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 space-y-4">
                <p className="text-xs">No active resident occupies this unit.</p>
                <div className="flex gap-2 justify-center">
                  <Link
                    to={`/tenants?onboardPropertyId=${property._id}`}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Assign Tenant
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* MODIFY UNIT STATUS */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3">Modify Unit Status</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!!property.tenant}
                onClick={() => updateStatus('Vacant')}
                className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${property.status === 'Vacant' ? 'bg-[#4A1917] text-white border-[#4A1917] dark:bg-[#754039] dark:border-[#754039]' : 'bg-[#E6DACC]/50 dark:bg-[#352920]/50 text-[#77665A] dark:text-[#D1C1B0] border-[#D9CABB] dark:border-[rgba(230,211,191,0.15)] hover:bg-[#E6DACC]'} disabled:opacity-40 cursor-pointer`}
              >
                Mark Vacant
              </button>
              <button
                disabled={!!property.tenant}
                onClick={() => updateStatus('Under Maintenance')}
                className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${property.status === 'Under Maintenance' ? 'bg-red-500 text-white border-red-500' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'} disabled:opacity-40`}
              >
                Under Repair
              </button>
            </div>
          </div>

          {/* GEOLOCATION MAP */}
          <MapComponent
            latitude={property.location?.coordinates?.[1] || 12.9716}
            longitude={property.location?.coordinates?.[0] || 77.5946}
            readOnly={true}
            addressString={`${property.address?.houseNumber}, ${property.address?.street}, ${property.address?.area}`}
          />
        </div>
      </div>
    </div>

      {/* EDIT PROPERTY MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-3xl glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col relative max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 Outfit">Edit Property Details</h3>
                <p className="text-xs text-slate-500">Update property specifications, charges, and amenities.</p>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveEditTab('basic')}
                className={`px-3 py-1.5 rounded-xl transition-all ${activeEditTab === 'basic' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
              >
                1. Basic & Pricing
              </button>
              <button
                type="button"
                onClick={() => setActiveEditTab('specs')}
                className={`px-3 py-1.5 rounded-xl transition-all ${activeEditTab === 'specs' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
              >
                2. Specifications
              </button>
              <button
                type="button"
                onClick={() => setActiveEditTab('location')}
                className={`px-3 py-1.5 rounded-xl transition-all ${activeEditTab === 'location' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
              >
                3. Address & Map
              </button>
              <button
                type="button"
                onClick={() => setActiveEditTab('amenities')}
                className={`px-3 py-1.5 rounded-xl transition-all ${activeEditTab === 'amenities' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
              >
                4. Amenities & Media
              </button>
            </div>

            <form onSubmit={handleSubmit(handleEditSubmit)} className="space-y-4">
              {activeEditTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Property Name</label>
                      <input type="text" {...register('name')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Category</label>
                      <select {...register('category')} className="w-full px-2 py-2 text-xs rounded-xl glass-input">
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Type</label>
                      <select {...register('type')} className="w-full px-2 py-2 text-xs rounded-xl glass-input">
                        <option value="apartment">Apartment</option>
                        <option value="villa">Villa</option>
                        <option value="commercial">Commercial</option>
                        <option value="room">Room</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Monthly Rent (₹)</label>
                      <input type="number" {...register('monthlyRent')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Deposit (₹)</label>
                      <input type="number" {...register('securityDeposit')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Maintenance (₹)</label>
                      <input type="number" {...register('maintenanceCharges')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>
                </div>
              )}

              {activeEditTab === 'specs' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Floor Number</label>
                      <input type="number" {...register('floorNumber')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Total Floors</label>
                      <input type="number" {...register('totalFloors')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Bedrooms</label>
                      <input type="number" {...register('bedrooms')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Bathrooms</label>
                      <input type="number" {...register('bathrooms')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Balconies</label>
                      <input type="number" {...register('balconies')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Super Area (Sq.Ft)</label>
                      <input type="number" {...register('areaSqFt')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Carpet Area</label>
                      <input type="number" {...register('carpetAreaSqFt')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Built-Up Area</label>
                      <input type="number" {...register('builtUpAreaSqFt')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Furnishing</label>
                      <select {...register('furnishedStatus')} className="w-full px-2 py-2 text-xs rounded-xl glass-input">
                        <option value="furnished">Furnished</option>
                        <option value="semi-furnished">Semi-Furnished</option>
                        <option value="unfurnished">Unfurnished</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Parking Type</label>
                      <select {...register('parkingType')} className="w-full px-2 py-2 text-xs rounded-xl glass-input">
                        <option value="Four-Wheeler">Four-Wheeler</option>
                        <option value="Two-Wheeler">Two-Wheeler</option>
                        <option value="Both">Both</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Facing</label>
                      <select {...register('facingDirection')} className="w-full px-2 py-2 text-xs rounded-xl glass-input">
                        <option value="East">East</option>
                        <option value="North">North</option>
                        <option value="North-East">North-East</option>
                        <option value="West">West</option>
                        <option value="South">South</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Age (Yrs)</label>
                      <input type="number" {...register('propertyAge')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>
                </div>
              )}

              {activeEditTab === 'location' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">House / Unit #</label>
                      <input type="text" {...register('houseNumber')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Street</label>
                      <input type="text" {...register('street')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Area</label>
                      <input type="text" {...register('area')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">City</label>
                      <input type="text" {...register('city')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">State</label>
                      <input type="text" {...register('state')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Pincode</label>
                      <input type="text" {...register('pincode')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Country</label>
                      <input type="text" {...register('country')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Adjust Geolocation Coordinates on Map:</label>
                    <MapComponent
                      latitude={lat}
                      longitude={lng}
                      onLocationSelect={(newLat, newLng) => {
                        setLat(newLat);
                        setLng(newLng);
                      }}
                    />
                  </div>
                </div>
              )}

              {activeEditTab === 'amenities' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Select Amenities:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {AVAILABLE_AMENITIES.map((amenity) => {
                        const isSelected = selectedAmenities.includes(amenity);
                        return (
                          <button
                            type="button"
                            key={amenity}
                            onClick={() => toggleAmenity(amenity)}
                            className={`p-2 rounded-xl text-xs font-semibold text-left border flex items-center justify-between transition-all ${isSelected ? 'bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-300 font-bold' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}
                          >
                            <span>{amenity}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Description</label>
                    <textarea rows="3" {...register('description')} className="w-full px-3 py-2 text-xs rounded-xl glass-input resize-none" />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TENANT PROFILE MODAL */}
      {editTenantModalOpen && property?.tenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col relative max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 Outfit">Edit Tenant Profile</h3>
                <p className="text-xs text-slate-500">Update resident details for unit {property.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditTenantModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTenantEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editTenantData.name}
                    onChange={(e) => setEditTenantData({ ...editTenantData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editTenantData.email}
                    onChange={(e) => setEditTenantData({ ...editTenantData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Phone Number</label>
                  <InternationalPhoneInput
                    value={editTenantData.phone}
                    onChange={(val, meta) => {
                      setEditTenantData({ ...editTenantData, phone: val });
                      setTenantPhoneMeta(meta);
                      if (tenantPhoneError) setTenantPhoneError('');
                    }}
                    error={tenantPhoneError}
                  />
                  {tenantPhoneError && <span className="text-[10px] text-red-500 mt-1 block">{tenantPhoneError}</span>}
                </div>
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Gender</label>
                  <select
                    value={editTenantData.gender}
                    onChange={(e) => setEditTenantData({ ...editTenantData, gender: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl glass-input"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Unspecified">Unspecified</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Occupation</label>
                  <input
                    type="text"
                    value={editTenantData.occupation}
                    onChange={(e) => setEditTenantData({ ...editTenantData, occupation: e.target.value })}
                    placeholder="e.g. Software Engineer"
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Unit / Flat Number</label>
                  <input
                    type="text"
                    value={editTenantData.unitNumber}
                    onChange={(e) => setEditTenantData({ ...editTenantData, unitNumber: e.target.value })}
                    placeholder="e.g. Apt 301"
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Monthly Rent (₹)</label>
                  <input
                    type="number"
                    value={editTenantData.monthlyRent}
                    onChange={(e) => setEditTenantData({ ...editTenantData, monthlyRent: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={editTenantData.securityDeposit}
                    onChange={(e) => setEditTenantData({ ...editTenantData, securityDeposit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Lease Start Date</label>
                  <input
                    type="date"
                    value={editTenantData.leaseStartDate}
                    onChange={(e) => setEditTenantData({ ...editTenantData, leaseStartDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Lease End Date</label>
                  <input
                    type="date"
                    value={editTenantData.leaseEndDate}
                    onChange={(e) => setEditTenantData({ ...editTenantData, leaseEndDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs text-[#38251F] dark:text-[#FAF7F1] flex items-center gap-1.5 Outfit">
                    <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Set New Tenant Password ({editTenantData.name})
                  </label>
                  <span className="text-[10px] text-[#78685D] dark:text-[#A8988A]">(Tenant login only • Owner login unaffected)</span>
                </div>
                <div className="relative">
                  <input
                    type={showTenantPassword ? "text" : "password"}
                    value={editTenantData.password || ''}
                    onChange={(e) => setEditTenantData({ ...editTenantData, password: e.target.value })}
                    placeholder="Enter new password (min. 6 characters)"
                    className="w-full px-3 py-2 pr-10 rounded-xl glass-input text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTenantPassword(!showTenantPassword)}
                    className="absolute right-3 top-2.5 text-[#78685D] hover:text-[#38251F] dark:text-[#A8988A] dark:hover:text-[#FAF7F1]"
                  >
                    {showTenantPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider block">Emergency Contact</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={editTenantData.emergencyName}
                    onChange={(e) => setEditTenantData({ ...editTenantData, emergencyName: e.target.value })}
                    className="px-2.5 py-1.5 rounded-xl glass-input"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={editTenantData.emergencyPhone}
                    onChange={(e) => setEditTenantData({ ...editTenantData, emergencyPhone: e.target.value })}
                    className="px-2.5 py-1.5 rounded-xl glass-input"
                  />
                  <input
                    type="text"
                    placeholder="Relationship"
                    value={editTenantData.emergencyRelation}
                    onChange={(e) => setEditTenantData({ ...editTenantData, emergencyRelation: e.target.value })}
                    className="px-2.5 py-1.5 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTenantModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tenantSaving}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {tenantSaving ? 'Saving...' : 'Save Tenant Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PropertyDetail;
