import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import apiClient from '../services/api';
import { User, Lock, Upload, Key, Contact, Home, Award, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import InternationalPhoneInput from '../components/InternationalPhoneInput';
import PasswordInput from '../components/PasswordInput';

const Profile = () => {
  const { user, updateProfile, updatePhoto } = useAuth();
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState(user?.contactNumber || user?.phone || '');
  const [phoneMeta, setPhoneMeta] = useState({ isValid: true, country: 'IN' });
  const [phoneError, setPhoneError] = useState('');

  // Tenant Password Reset states for Owner
  const [tenantsList, setTenantsList] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantNewPassword, setTenantNewPassword] = useState('');
  const [tenantPasswordUpdating, setTenantPasswordUpdating] = useState(false);
  const [showTenantPwd, setShowTenantPwd] = useState(false);

  useEffect(() => {
    if (user?.contactNumber || user?.phone) {
      setPhone(user.contactNumber || user.phone);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'owner') {
      apiClient.get('/tenants').then(res => {
        if (res.data.success && Array.isArray(res.data.data)) {
          setTenantsList(res.data.data);
          if (res.data.data.length > 0 && !selectedTenantId) {
            setSelectedTenantId(res.data.data[0]._id);
          }
        }
      }).catch(err => {
        console.error('Failed to load tenants list for profile:', err);
      });
    }
  }, [user]);

  const { register: regProfile, handleSubmit: handleProfileSubmit } = useForm({
    defaultValues: {
      name: user?.name,
      address: user?.address || ''
    }
  });

  const { register: regPwd, handleSubmit: handlePwdSubmit, reset: resetPwd, formState: { errors: pwdErrors } } = useForm();

  const handlePhotoUpload = async (fileToUpload) => {
    const file = fileToUpload || photoFile;
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    
    setLoading(true);
    const res = await updatePhoto(formData);
    if (res?.success) {
      setPhotoFile(null);
      setPhotoPreview(null);
    }
    setLoading(false);
    return res;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));

      // Auto-upload and persist to backend and MongoDB immediately upon selection
      await handlePhotoUpload(file);
    }
  };

  const onProfileUpdate = async (data) => {
    if (phone && !phoneMeta.isValid) {
      setPhoneError('Please enter a valid phone number.');
      return;
    }
    setPhoneError('');
    setLoading(true);

    // If a photo was selected and not yet uploaded, upload it now
    if (photoFile) {
      await handlePhotoUpload(photoFile);
    }

    const res = await updateProfile({ ...data, contactNumber: phone });
    if (res?.success) {
      toast.success('Profile details saved.');
    }
    setLoading(false);
  };

  const onPasswordUpdate = async (data) => {
    setLoading(true);
    try {
      const res = await apiClient.put('/auth/update-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      if (res.data.success) {
        toast.success(`Password for ${user?.email} updated successfully!`);
        resetPwd();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Password update failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleTenantPasswordReset = async (e) => {
    e.preventDefault();
    if (!selectedTenantId) {
      toast.error('Please select a resident tenant.');
      return;
    }
    if (!tenantNewPassword || tenantNewPassword.trim().length < 6) {
      toast.error('Tenant password must be at least 6 characters long.');
      return;
    }
    setTenantPasswordUpdating(true);
    try {
      const res = await apiClient.patch(`/tenants/${selectedTenantId}/reset-password`, {
        newPassword: tenantNewPassword.trim()
      });
      if (res.data.success) {
        const targetTenant = tenantsList.find(t => t._id === selectedTenantId);
        toast.success(`Password for tenant "${targetTenant?.name || 'Resident'}" updated! Your Owner login is unaffected.`);
        setTenantNewPassword('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tenant password');
    } finally {
      setTenantPasswordUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit">My Profile</h1>
        <p className="text-xs text-[#78685D] dark:text-[#C5B5A5]">Edit your credentials, adjust profile avatar and configure safety passwords.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card & Photo uploads */}
        <div className="glass-panel p-6 rounded-[2rem] border border-[#D9CBBB] dark:border-[#38251F] flex flex-col items-center text-center space-y-4 bg-[#FAF7F1] dark:bg-[#1E1715] shadow-sm">
          <div className="relative group">
            <img
              src={photoPreview || user?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt="Avatar"
              className="w-28 h-28 rounded-full border-2 border-brand-600 object-cover shadow-lg"
            />
            <label className="absolute bottom-1 right-1 p-2 bg-brand-500 hover:bg-brand-600 text-[#FAF7F1] rounded-full cursor-pointer shadow-md transition-all">
              <Upload className="w-3.5 h-3.5" />
              <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
            </label>
          </div>

          {photoPreview && (
            <button
              onClick={handlePhotoUpload}
              className="px-4 py-1.5 btn-primary-glow text-[#FAF7F1] font-bold text-[10px] rounded-full shadow transition-all cursor-pointer"
            >
              Upload Selected Avatar
            </button>
          )}

          <div>
            <h3 className="font-extrabold text-base text-[#38251F] dark:text-[#FAF7F1] Outfit">{user?.name}</h3>
            <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-3 py-0.5 rounded-full bg-[#E9DFD0] text-[#4A1715] dark:bg-[#2A1D18] dark:text-[#E9DFD0] border border-[#D9CBBB] mt-1">
              {user?.role === 'owner' ? 'Property Owner' : 'Resident Tenant'}
            </span>
          </div>

          <div className="w-full text-xs text-left space-y-2.5 pt-4 border-t border-[#D9CBBB]/60 dark:border-[#38251F] text-[#78685D] dark:text-[#C5B5A5]">
            <p className="flex items-center gap-2"><User className="w-4 h-4 text-brand-600" /> ID: {user?.id}</p>
            <p className="flex items-center gap-2"><Contact className="w-4 h-4 text-brand-600" /> Email: {user?.email}</p>
            <p className="flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-600" /> Status:{' '}
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Verified Account</span>
            </p>
          </div>
        </div>

        {/* Edit profile forms details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit form */}
          <div className="glass-panel p-6 rounded-[2rem] border border-[#D9CBBB] dark:border-[#38251F] bg-[#FAF7F1] dark:bg-[#1E1715] shadow-sm">
            <h4 className="font-bold text-sm text-[#38251F] dark:text-[#FAF7F1] mb-4">Edit Personal Information</h4>

            <form onSubmit={handleProfileSubmit(onProfileUpdate)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#78685D] dark:text-[#C5B5A5] block mb-1">Full Name</label>
                  <input
                    type="text"
                    {...regProfile('name')}
                    className="w-full px-3.5 py-2 text-xs rounded-full glass-input font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#78685D] dark:text-[#C5B5A5] block mb-1">Contact Number</label>
                  <InternationalPhoneInput
                    value={phone}
                    onChange={(val, meta) => {
                      setPhone(val);
                      setPhoneMeta(meta);
                      if (phoneError) setPhoneError('');
                    }}
                    error={phoneError}
                  />
                  {phoneError && <span className="text-[10px] text-red-500 mt-1 block">{phoneError}</span>}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#78685D] dark:text-[#C5B5A5] block mb-1">Physical / Office Address</label>
                <input
                  type="text"
                  {...regProfile('address')}
                  className="w-full px-3.5 py-2 text-xs rounded-full glass-input font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 text-xs font-bold text-[#FAF7F1] btn-primary-glow rounded-full shadow-lg transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change Personal Account Password form */}
          <div className="glass-panel p-6 rounded-[2rem] border border-[#D9CBBB] dark:border-[#38251F] bg-[#FAF7F1] dark:bg-[#1E1715] shadow-sm">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <h4 className="font-bold text-sm text-[#38251F] dark:text-[#FAF7F1]">
                  {user?.role === 'owner' ? 'Owner Login Password' : 'My Resident Account Password'}
                </h4>
              </div>
              <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/25 text-[11px] text-[#78685D] dark:text-[#C5B5A5] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {user?.role === 'owner'
                    ? `⚠️ THIS FORM ONLY CHANGES YOUR OWNER ACCOUNT (${user?.email}). It will NEVER modify any tenant's password. To change a tenant's password, use the "Manage Resident Tenant Passwords" section below.`
                    : `Update your personal resident login password for ${user?.email}.`}
                </span>
              </div>
            </div>

            <form onSubmit={handlePwdSubmit(onPasswordUpdate)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#78685D] dark:text-[#C5B5A5] block mb-1">Current Password</label>
                <PasswordInput
                  id="profile-current-password"
                  placeholder="••••••••"
                  className="!px-3.5 !py-2 !text-xs !rounded-full"
                  showLeftIcon={false}
                  {...regPwd('currentPassword', { required: 'Current password is required' })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#78685D] dark:text-[#C5B5A5] block mb-1">New Password</label>
                  <PasswordInput
                    id="profile-new-password"
                    placeholder="••••••••"
                    className="!px-3.5 !py-2 !text-xs !rounded-full"
                    showLeftIcon={false}
                    {...regPwd('newPassword', {
                      required: 'New password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' }
                    })}
                  />
                  {pwdErrors.newPassword && <span className="text-[10px] text-red-500">{pwdErrors.newPassword.message}</span>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#78685D] dark:text-[#C5B5A5] block mb-1">Confirm New Password</label>
                  <PasswordInput
                    id="profile-confirm-password"
                    placeholder="••••••••"
                    className="!px-3.5 !py-2 !text-xs !rounded-full"
                    showLeftIcon={false}
                    {...regPwd('confirmPassword', {
                      required: 'Confirm password is required'
                    })}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 text-xs font-bold text-[#FAF7F1] btn-primary-glow rounded-full shadow-lg transition-all cursor-pointer"
                >
                  {user?.role === 'owner' ? 'Update Owner Password' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {/* OWNER ONLY: Dedicated Tenant Login Password Management Card */}
          {user?.role === 'owner' && (
            <div className="glass-panel p-6 rounded-[2rem] border border-amber-300/70 dark:border-amber-800/50 bg-[#FAF7F1] dark:bg-[#1E1715] shadow-sm">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h4 className="font-bold text-sm text-[#38251F] dark:text-[#FAF7F1]">
                    Manage Resident Tenant Passwords
                  </h4>
                  <span className="ml-auto text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/20">
                    Tenant Login Only
                  </span>
                </div>
                <p className="text-[11px] text-[#78685D] dark:text-[#A8988A] mt-1">
                  Select a tenant to change their login password. This updates <strong>only the tenant's login</strong>. Your Owner account login ({user?.email}) remains completely unchanged and secure.
                </p>
              </div>

              {tenantsList.length === 0 ? (
                <p className="text-xs text-[#78685D] dark:text-[#A8988A] italic py-2">
                  No resident tenants found. You can add tenants from the Tenants section.
                </p>
              ) : (
                <form onSubmit={handleTenantPasswordReset} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[#78685D] dark:text-[#C5B5A5] block mb-1">
                      Select Resident Tenant
                    </label>
                    <select
                      id="profile-select-tenant"
                      value={selectedTenantId}
                      onChange={(e) => setSelectedTenantId(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-full glass-input font-medium bg-transparent"
                    >
                      {tenantsList.map((t) => (
                        <option key={t._id} value={t._id} className="text-[#38251F] bg-[#FAF7F1] dark:bg-[#1E1715] dark:text-[#FAF7F1]">
                          {t.name} ({t.email}) {t.unitNumber ? `• Unit ${t.unitNumber}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#78685D] dark:text-[#C5B5A5] block mb-1">
                      New Password for Selected Tenant (Min 6 characters)
                    </label>
                    <div className="relative">
                      <input
                        id="profile-tenant-new-password"
                        type={showTenantPwd ? 'text' : 'password'}
                        value={tenantNewPassword}
                        onChange={(e) => setTenantNewPassword(e.target.value)}
                        placeholder="Enter new tenant password (e.g. kd@101227)"
                        className="w-full px-3.5 py-2 pr-10 text-xs rounded-full glass-input font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTenantPwd(!showTenantPwd)}
                        className="absolute right-3.5 top-2.5 text-[#78685D] hover:text-[#38251F] dark:text-[#A8988A] dark:hover:text-[#FAF7F1] cursor-pointer"
                      >
                        {showTenantPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-[#78685D] dark:text-[#A8988A]">
                      Owner credentials will NOT be touched.
                    </span>
                    <button
                      type="submit"
                      id="profile-update-tenant-pwd-btn"
                      disabled={tenantPasswordUpdating}
                      className="px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-full shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Key className="w-3.5 h-3.5" />
                      {tenantPasswordUpdating ? 'Updating Tenant Password...' : 'Update Tenant Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
