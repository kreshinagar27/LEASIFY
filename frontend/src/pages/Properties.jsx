import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import apiClient from '../services/api';
import MapComponent from '../components/MapComponent';
import { Plus, Search, Building, MapPin, Grid, SlidersHorizontal, Eye, Edit, Trash2, Shield, Wifi, Car, Zap, Droplets, Check, Compass, Calendar, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

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

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'specs', 'location', 'amenities'
  
  // Selected Amenities state
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  // Map values
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);

  // Search / filter states
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');

  const [deleteModalState, setDeleteModalState] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      category: 'Residential',
      type: 'apartment',
      furnishedStatus: 'furnished',
      parkingType: 'Four-Wheeler',
      facingDirection: 'East',
      floorNumber: 1,
      totalFloors: 5,
      bedrooms: 2,
      bathrooms: 2,
      balconies: 1,
      propertyAge: 2,
      country: 'India'
    }
  });

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (city) params.city = city;
      if (status) params.status = status;
      if (type) params.type = type;
      if (minRent) params.minRent = minRent;
      if (maxRent) params.maxRent = maxRent;

      const { data } = await apiClient.get('/properties', { params });
      if (data.success) {
        setProperties(data.data);
      }
    } catch (err) {
      toast.error('Failed to load properties.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [search, city, status, type, minRent, maxRent]);

  const handleLocationSelect = (newLat, newLng) => {
    setLat(newLat);
    setLng(newLng);
  };

  const toggleAmenity = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(prev => prev.filter(a => a !== amenity));
    } else {
      setSelectedAmenities(prev => [...prev, amenity]);
    }
  };

  const onSubmit = async (data) => {
    try {
      const formData = {
        ...data,
        amenities: selectedAmenities,
        latitude: lat,
        longitude: lng
      };

      const res = await apiClient.post('/properties', formData);
      if (res.data.success) {
        toast.success('Property created successfully!');
        setModalOpen(false);
        reset();
        setSelectedAmenities([]);
        fetchProperties();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add property.');
    }
  };

  const handleDelete = async (id, name, strategy = null, targetPropertyId = null) => {
    try {
      const config = {};
      if (strategy) {
        config.data = { strategy, targetPropertyId };
      }

      const res = await apiClient.delete(`/properties/${id}`, config);
      if (res.data.success) {
        toast.success(res.data.message || 'Property action completed.');
        setDeleteModalState(null);
        fetchProperties();
      }
    } catch (error) {
      if (error.response?.status === 409 && error.response?.data?.requiresStrategy) {
        const payload = error.response.data;
        setDeleteModalState({
          propertyId: id,
          propertyName: name,
          tenantCount: payload.tenantCount,
          assignedTenants: payload.assignedTenants || [],
          availableProperties: payload.availableProperties || [],
          selectedStrategy: 'archive',
          targetPropertyId: payload.availableProperties?.[0]?.id || payload.availableProperties?.[0]?._id || ''
        });
      } else {
        toast.error(error.response?.data?.message || 'Could not delete property.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white Outfit">Properties Portfolio</h1>
          <p className="text-xs text-slate-500">Add, track, and manage all your real estate rental assets.</p>
        </div>
        <button
          onClick={() => {
            setModalOpen(true);
            setActiveTab('basic');
          }}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/25 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add New Property
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search name, street..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl glass-input"
          />
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
        </div>

        <input
          type="text"
          placeholder="City (e.g. Bengaluru)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
        >
          <option value="">All Statuses</option>
          <option value="Vacant">Vacant</option>
          <option value="Occupied">Occupied</option>
          <option value="Reserved">Reserved</option>
          <option value="Under Maintenance">Under Maintenance</option>
        </select>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
        >
          <option value="">All Types</option>
          <option value="apartment">Apartment</option>
          <option value="villa">Villa</option>
          <option value="commercial">Commercial</option>
          <option value="room">Room</option>
        </select>

        <input
          type="number"
          placeholder="Min Rent (INR)"
          value={minRent}
          onChange={(e) => setMinRent(e.target.value)}
          className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
        />

        <input
          type="number"
          placeholder="Max Rent (INR)"
          value={maxRent}
          onChange={(e) => setMaxRent(e.target.value)}
          className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
        />
      </div>

      {/* PROPERTY CARDS GRID */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 glass-panel rounded-2xl animate-pulse bg-slate-200/50 dark:bg-slate-900/50" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="py-12 text-center text-slate-400 glass-panel rounded-2xl border border-slate-200 dark:border-slate-800">
          <Building className="w-12 h-12 mx-auto mb-2 text-slate-400 opacity-60" />
          <p className="text-sm font-semibold">No rental units found matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => {
            let statusColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            if (prop.status === 'Vacant') statusColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            if (prop.status === 'Under Maintenance') statusColor = 'bg-red-500/10 text-red-500 border-red-500/20';
            if (prop.status === 'Reserved') statusColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';

            return (
              <div
                key={prop._id}
                className="glass-panel rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg relative flex flex-col justify-between glass-card-hover"
              >
                {/* Image & Badges */}
                <div className="h-44 bg-slate-100 dark:bg-slate-900 relative">
                  <img
                    src={prop.images?.[0]?.url || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400'}
                    alt={prop.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex gap-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-slate-900/70 text-white rounded-full backdrop-blur-md">
                      {prop.category || 'Residential'}
                    </span>
                  </div>
                  <span className={`absolute top-3 right-3 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 border rounded-full ${statusColor} backdrop-blur-md`}>
                    {prop.status}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-white truncate Outfit">
                      {prop.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {prop.address?.city}, {prop.address?.state}
                    </p>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 text-[11px] text-slate-500 dark:text-slate-400">
                      <div>
                        <strong className="block text-[10px] text-slate-400 uppercase">Rent</strong>
                        <p className="text-slate-800 dark:text-slate-200 font-bold">₹{prop.monthlyRent?.toLocaleString()}</p>
                      </div>
                      <div>
                        <strong className="block text-[10px] text-slate-400 uppercase">Type</strong>
                        <p className="text-slate-800 dark:text-slate-200 font-bold uppercase">{prop.type}</p>
                      </div>
                      <div>
                        <strong className="block text-[10px] text-slate-400 uppercase">Specs</strong>
                        <p className="text-slate-800 dark:text-slate-200 font-bold">{prop.bedrooms} BHK | Fl {prop.floorNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                    <Link
                      to={`/properties/${prop._id}`}
                      className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </Link>
                    <button
                      onClick={() => handleDelete(prop._id, prop.name)}
                      className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/10"
                      title="Delete Property"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD PROPERTY MODAL WITH SECTION TABS */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col relative max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 Outfit">Add New Property Unit</h3>
                <p className="text-xs text-slate-500">Fill in detailed real-estate specs, pricing, address & amenities.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`px-3 py-1.5 rounded-xl transition-all ${activeTab === 'basic' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
              >
                1. Basic & Pricing
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('specs')}
                className={`px-3 py-1.5 rounded-xl transition-all ${activeTab === 'specs' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
              >
                2. Specifications
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('location')}
                className={`px-3 py-1.5 rounded-xl transition-all ${activeTab === 'location' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
              >
                3. Address & Map
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('amenities')}
                className={`px-3 py-1.5 rounded-xl transition-all ${activeTab === 'amenities' ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
              >
                4. Amenities & Media
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* TAB 1: BASIC & PRICING */}
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Property Name *</label>
                      <input
                        type="text"
                        placeholder="Greenwood Residency Apt 402"
                        {...register('name', { required: 'Property name is required' })}
                        className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                      />
                      {errors.name && <span className="text-[10px] text-red-500">{errors.name.message}</span>}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Property Category</label>
                      <select {...register('category')} className="w-full px-2 py-2 text-xs rounded-xl glass-input">
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Property Type</label>
                      <select {...register('type')} className="w-full px-2 py-2 text-xs rounded-xl glass-input">
                        <option value="apartment">Apartment</option>
                        <option value="villa">Villa</option>
                        <option value="commercial">Commercial</option>
                        <option value="room">Room</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Monthly Rent (₹) *</label>
                      <input
                        type="number"
                        placeholder="18000"
                        {...register('monthlyRent', { required: 'Rent is required' })}
                        className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Security Deposit (₹) *</label>
                      <input
                        type="number"
                        placeholder="36000"
                        {...register('securityDeposit', { required: 'Deposit is required' })}
                        className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Maintenance Fee (₹)</label>
                      <input
                        type="number"
                        placeholder="1500"
                        {...register('maintenanceCharges')}
                        className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Est. Electricity Charges (₹)</label>
                      <input
                        type="number"
                        placeholder="1200"
                        {...register('electricityCharges')}
                        className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Est. Water Charges (₹)</label>
                      <input
                        type="number"
                        placeholder="400"
                        {...register('waterCharges')}
                        className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Available From Date</label>
                      <input
                        type="date"
                        {...register('availableFromDate')}
                        className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SPECIFICATIONS */}
              {activeTab === 'specs' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Floor Number</label>
                      <input type="number" placeholder="4" {...register('floorNumber')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Total Floors</label>
                      <input type="number" placeholder="10" {...register('totalFloors')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Bedrooms (BHK)</label>
                      <input type="number" placeholder="2" {...register('bedrooms')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Bathrooms</label>
                      <input type="number" placeholder="2" {...register('bathrooms')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Balconies</label>
                      <input type="number" placeholder="1" {...register('balconies')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Super Area (Sq.Ft) *</label>
                      <input type="number" placeholder="1200" {...register('areaSqFt', { required: true })} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Carpet Area (Sq.Ft)</label>
                      <input type="number" placeholder="950" {...register('carpetAreaSqFt')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Built-Up Area (Sq.Ft)</label>
                      <input type="number" placeholder="1100" {...register('builtUpAreaSqFt')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Furnishing Status</label>
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
                        <option value="Both">Both (Car & Bike)</option>
                        <option value="None">None</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Facing Direction</label>
                      <select {...register('facingDirection')} className="w-full px-2 py-2 text-xs rounded-xl glass-input">
                        <option value="East">East</option>
                        <option value="North">North</option>
                        <option value="North-East">North-East</option>
                        <option value="West">West</option>
                        <option value="South">South</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Property Age (Years)</label>
                      <input type="number" placeholder="3" {...register('propertyAge')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LOCATION & MAP */}
              {activeTab === 'location' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">House / Unit Number</label>
                      <input type="text" placeholder="Flat 402, Block B" {...register('houseNumber', { required: true })} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Street Address</label>
                      <input type="text" placeholder="Greenwood Residency Lane" {...register('street', { required: true })} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Area / Locality</label>
                      <input type="text" placeholder="Koramangala 4th Block" {...register('area', { required: true })} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">City</label>
                      <input type="text" placeholder="Bengaluru" {...register('city', { required: true })} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">State</label>
                      <input type="text" placeholder="Karnataka" {...register('state', { required: true })} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Pincode</label>
                      <input type="text" placeholder="560034" {...register('pincode', { required: true })} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Country</label>
                      <input type="text" placeholder="India" {...register('country')} className="w-full px-3 py-2 text-xs rounded-xl glass-input" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Select Geolocation Coordinates on Map:</label>
                    <MapComponent latitude={lat} longitude={lng} onLocationSelect={handleLocationSelect} />
                  </div>
                </div>
              )}

              {/* TAB 4: AMENITIES & DESCRIPTION */}
              {activeTab === 'amenities' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Select Unit Amenities:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {AVAILABLE_AMENITIES.map((amenity) => {
                        const isSelected = selectedAmenities.includes(amenity);
                        return (
                          <button
                            type="button"
                            key={amenity}
                            onClick={() => toggleAmenity(amenity)}
                            className={`p-2 rounded-xl text-xs font-semibold text-left border flex items-center justify-between transition-all ${isSelected ? 'bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-300 font-bold' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                          >
                            <span>{amenity}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Description & Key Highlights</label>
                    <textarea
                      rows="3"
                      placeholder="Modular kitchen with chimney, teakwood wardrobes, serene pool view, 24/7 security guard..."
                      {...register('description')}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input resize-none"
                    />
                  </div>
                </div>
              )}

              {/* FORM FOOTER CONTROLS */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div className="flex gap-2">
                  {activeTab !== 'basic' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'amenities') setActiveTab('location');
                        else if (activeTab === 'location') setActiveTab('specs');
                        else if (activeTab === 'specs') setActiveTab('basic');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                    >
                      ← Previous Section
                    </button>
                  )}
                  {activeTab !== 'amenities' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'basic') setActiveTab('specs');
                        else if (activeTab === 'specs') setActiveTab('location');
                        else if (activeTab === 'location') setActiveTab('amenities');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300"
                    >
                      Next Section →
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
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
                    Save Property
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE STRATEGY MODAL */}
      {deleteModalState && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Deletion Strategy Required</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Property <span className="font-semibold text-brand-500">"{deleteModalState.propertyName}"</span> has {deleteModalState.tenantCount} active tenant(s).
                </p>
              </div>
              <button onClick={() => setDeleteModalState(null)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                Choose how you want to handle assigned tenants before removing this property:
              </p>

              <div className="space-y-2">
                <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${deleteModalState.selectedStrategy === 'archive' ? 'border-brand-500 bg-brand-500/10' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="strategy"
                      value="archive"
                      checked={deleteModalState.selectedStrategy === 'archive'}
                      onChange={() => setDeleteModalState(prev => ({ ...prev, selectedStrategy: 'archive' }))}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white block">Option C: Archive Property (Recommended)</span>
                      <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">
                        Soft-delete property by marking it Archived. Preserves all tenant lease agreements, invoice ledgers, and financial charts.
                      </span>
                    </div>
                  </div>
                </label>

                <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${deleteModalState.selectedStrategy === 'unassign' ? 'border-brand-500 bg-brand-500/10' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="strategy"
                      value="unassign"
                      checked={deleteModalState.selectedStrategy === 'unassign'}
                      onChange={() => setDeleteModalState(prev => ({ ...prev, selectedStrategy: 'unassign' }))}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white block">Option A: Unassign Tenants & Delete</span>
                      <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">
                        Remove property assignment from all {deleteModalState.tenantCount} tenant(s) and permanently delete property document.
                      </span>
                    </div>
                  </div>
                </label>

                <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${deleteModalState.selectedStrategy === 'transfer' ? 'border-brand-500 bg-brand-500/10' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="strategy"
                      value="transfer"
                      checked={deleteModalState.selectedStrategy === 'transfer'}
                      onChange={() => setDeleteModalState(prev => ({ ...prev, selectedStrategy: 'transfer' }))}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-800 dark:text-white block">Option B: Transfer Tenants to Another Property</span>
                      <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">
                        Reassign all tenants to an existing property owned by you, then delete this property.
                      </span>

                      {deleteModalState.selectedStrategy === 'transfer' && (
                        <div className="mt-3">
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Select Target Property:
                          </label>
                          {deleteModalState.availableProperties.length === 0 ? (
                            <p className="text-[11px] text-red-500 font-semibold">No alternative properties available for transfer.</p>
                          ) : (
                            <select
                              value={deleteModalState.targetPropertyId}
                              onChange={(e) => setDeleteModalState(prev => ({ ...prev, targetPropertyId: e.target.value }))}
                              className="w-full text-xs p-2 rounded-lg glass-input"
                            >
                              {deleteModalState.availableProperties.map(p => (
                                <option key={p.id || p._id} value={p.id || p._id}>
                                  {p.name} ({p.status})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalState(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(
                  deleteModalState.propertyId,
                  deleteModalState.propertyName,
                  deleteModalState.selectedStrategy,
                  deleteModalState.targetPropertyId
                )}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/25 transition-all"
              >
                Confirm Deletion Strategy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Properties;
