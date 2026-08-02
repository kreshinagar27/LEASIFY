import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import apiClient from '../services/api';
import { User, Lock, Upload, Key, Contact, Home, Award } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile, updatePhoto } = useAuth();
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const { register: regProfile, handleSubmit: handleProfileSubmit } = useForm({
    defaultValues: {
      name: user?.name,
      contactNumber: user?.contactNumber || user?.phone || '',
      address: user?.address || ''
    }
  });

  const { register: regPwd, handleSubmit: handlePwdSubmit, reset: resetPwd, formState: { errors: pwdErrors } } = useForm();

  const onProfileUpdate = async (data) => {
    setLoading(true);
    const res = await updateProfile(data);
    if (res.success) {
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
        toast.success('Password changed successfully.');
        resetPwd();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Password update failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    const formData = new FormData();
    formData.append('photo', photoFile);
    
    setLoading(true);
    const res = await updatePhoto(formData);
    if (res.success) {
      setPhotoFile(null);
      setPhotoPreview(null);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white Outfit">My Profile</h1>
        <p className="text-xs text-slate-500">Edit your credentials, adjust profile avatar and configure safety passwords.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card & Photo uploads */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <img
              src={photoPreview || user?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt="Avatar"
              className="w-28 h-28 rounded-full border-2 border-brand-500 object-cover shadow-lg"
            />
            <label className="absolute bottom-1 right-1 p-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-full cursor-pointer shadow-md">
              <Upload className="w-3.5 h-3.5" />
              <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
            </label>
          </div>

          {photoPreview && (
            <button
              onClick={handlePhotoUpload}
              className="px-4 py-1 bg-brand-500 hover:bg-brand-600 text-white font-bold text-[10px] rounded-lg shadow transition-all"
            >
              Upload Selected Avatar
            </button>
          )}

          <div>
            <h3 className="font-extrabold text-base text-slate-800 dark:text-white Outfit">{user?.name}</h3>
            <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 mt-1">
              {user?.role}
            </span>
          </div>

          <div className="w-full text-xs text-left space-y-2.5 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-400">
            <p className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> ID: {user?.id}</p>
            <p className="flex items-center gap-2"><Contact className="w-4 h-4 text-slate-400" /> Email: {user?.email}</p>
            <p className="flex items-center gap-2">
              <Award className="w-4 h-4 text-slate-400" /> Status:{' '}
              <span className="text-emerald-500 font-bold">Verified Account</span>
            </p>
          </div>
        </div>

        {/* Edit profile forms details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit form */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-4">Edit Personal Information</h4>

            <form onSubmit={handleProfileSubmit(onProfileUpdate)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-0.5">Full Name</label>
                  <input
                    type="text"
                    {...regProfile('name')}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-0.5">Contact Number</label>
                  <input
                    type="text"
                    {...regProfile('contactNumber')}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">Physical / Office Address</label>
                <input
                  type="text"
                  {...regProfile('address')}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change Password form */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-4">Update Account Security Password</h4>

            <form onSubmit={handlePwdSubmit(onPasswordUpdate)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...regPwd('currentPassword', { required: 'Current password is required' })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-0.5">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...regPwd('newPassword', {
                      required: 'New password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' }
                    })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  />
                  {pwdErrors.newPassword && <span className="text-[10px] text-red-500">{pwdErrors.newPassword.message}</span>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-0.5">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...regPwd('confirmPassword', {
                      required: 'Confirm password is required'
                    })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg transition-all"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
