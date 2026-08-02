import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { Users, Plus, Search, Eye, Phone, Mail, Building, Key, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const Tenants = () => {
  const [searchParams] = useSearchParams();
  const onboardPropertyId = searchParams.get('onboardPropertyId');
  const navigate = useNavigate();

  const [tenants, setTenants] = useState([]);
  const [vacantProperties, setVacantProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

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

  const fetchVacantProperties = async () => {
    try {
      const { data } = await apiClient.get('/properties', { params: { status: 'Vacant' } });
      if (data.success) {
        setVacantProperties(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch properties');
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchVacantProperties();
  }, []);

  useEffect(() => {
    if (onboardPropertyId) {
      setModalOpen(true);
    }
  }, [onboardPropertyId]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        propertyAssigned: data.propertyAssigned || onboardPropertyId
      };
      
      const res = await apiClient.post('/tenants', payload);
      if (res.data.success) {
        toast.success(`Tenant onboarded! Welcome Email sent.`);
        
        // Show temporary password
        const tempPwd = res.data.tempPassword;
        if (tempPwd) {
          toast.success(`Temporary Password: ${tempPwd}`, { duration: 6000 });
        }

        setModalOpen(false);
        reset();
        fetchTenants();
        fetchVacantProperties();
        
        // Clear search params
        navigate('/tenants');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to onboard tenant.');
    }
  };

  // Filtered tenants by name
  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.propertyAssigned && t.propertyAssigned.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white Outfit">Tenants Directory</h1>
          <p className="text-xs text-slate-500">Register, lease and manage all active resident agreements.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-500/20 transition-all duration-200"
        >
          <Plus className="w-4 h-4" /> Add Tenant (Move-In)
        </button>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tenant name, email, property..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl glass-input"
          />
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* TENANT TABLE OR CARDS */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="glass-panel py-16 text-center text-slate-400 rounded-2xl">
          <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold">No tenants currently registered.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((ten) => (
            <div
              key={ten._id}
              className="glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between glass-card-hover"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={ten.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt=""
                    className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-800 object-cover"
                  />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-white Outfit">{ten.name}</h3>
                    <span className="text-[10px] text-slate-400 truncate block max-w-[150px]">{ten.occupation}</span>
                  </div>
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
                      <span className="text-slate-700 dark:text-slate-300 font-semibold truncate">{ten.propertyAssigned.name}</span>
                    ) : (
                      <span className="text-amber-500 italic">Unassigned (Moved Out)</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-1">
                <Link
                  to={`/tenants/${ten._id}`}
                  className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-center text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Tenant File
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MOVE-IN ONBOARDING MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col relative max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Tenant Onboarding & Move-In Form
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left column info */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-0.5">Tenant Full Name</label>
                    <input
                      type="text"
                      placeholder="Anjali Sharma"
                      {...register('name', { required: 'Name is required' })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                    />
                    {errors.name && <span className="text-[10px] text-red-500">{errors.name.message}</span>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-0.5">Email Address</label>
                    <input
                      type="email"
                      placeholder="tenant@domain.com"
                      {...register('email', { required: 'Email is required' })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                    />
                    {errors.email && <span className="text-[10px] text-red-500">{errors.email.message}</span>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-0.5">Phone Number</label>
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
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Occupation</label>
                      <input
                        type="text"
                        placeholder="Software Engineer"
                        {...register('occupation')}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Aadhaar Number</label>
                      <input
                        type="text"
                        placeholder="1234-5678-9012"
                        {...register('aadhaarNumber', { required: 'Aadhaar is required' })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                      {errors.aadhaarNumber && <span className="text-[10px] text-red-500">{errors.aadhaarNumber.message}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3 text-xs font-bold text-slate-400">Emergency Contact</div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Name</label>
                      <input
                        type="text"
                        placeholder="Father"
                        {...register('emergencyName')}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Phone</label>
                      <input
                        type="text"
                        placeholder="Phone"
                        {...register('emergencyPhone')}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Relation</label>
                      <input
                        type="text"
                        placeholder="Relation"
                        {...register('emergencyRelation')}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Right column: Move-In readings & Lease */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-0.5">Property Unit Assigned</label>
                    {onboardPropertyId ? (
                      <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-semibold flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-brand-500" /> (Assigned Unit)
                      </div>
                    ) : (
                      <select
                        {...register('propertyAssigned', { required: 'Property assignment is required' })}
                        className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
                      >
                        <option value="">Select vacant unit...</option>
                        {vacantProperties.map(p => (
                          <option key={p._id} value={p._id}>{p.name} (Rent: INR {p.monthlyRent})</option>
                        ))}
                      </select>
                    )}
                    {errors.propertyAssigned && <span className="text-[10px] text-red-500">{errors.propertyAssigned.message}</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Agreement Rent (INR)</label>
                      <input
                        type="number"
                        placeholder="15000"
                        {...register('monthlyRent', { required: 'Rent is required' })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Security Deposit (INR)</label>
                      <input
                        type="number"
                        placeholder="30000"
                        {...register('securityDeposit', { required: 'Deposit is required' })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Lease Start Date</label>
                      <input
                        type="date"
                        {...register('leaseStartDate', { required: true })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-0.5">Lease End Date</label>
                      <input
                        type="date"
                        {...register('leaseEndDate', { required: true })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                      />
                    </div>
                  </div>

                  {/* Move-In Workflow readings */}
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50 rounded-xl space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-500 block flex items-center gap-0.5">
                      <Key className="w-3.5 h-3.5" /> Move-In Inspection Readings
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-400 block">Electricity Meter</label>
                        <input
                          type="number"
                          placeholder="100"
                          {...register('electricityReading')}
                          className="w-full px-2.5 py-1 text-[11px] rounded-lg glass-input"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block">Water Meter</label>
                        <input
                          type="number"
                          placeholder="200"
                          {...register('waterReading')}
                          className="w-full px-2.5 py-1 text-[11px] rounded-lg glass-input"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('depositCollected')}
                          className="rounded text-brand-500"
                        />
                        Deposit Received
                      </label>
                      <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('keyHandoverConfirmed')}
                          className="rounded text-brand-500"
                        />
                        Keys Transferred
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    navigate('/tenants');
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-500/25 transition-all"
                >
                  Onboard & Move-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tenants;
