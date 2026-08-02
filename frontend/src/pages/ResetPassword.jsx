import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, Check } from 'lucide-react';
import apiClient from '../services/api';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Token is missing or invalid');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.put(`/auth/reset-password?token=${token}`, { password: data.password });
      if (res.data.success) {
        setComplete(true);
        toast.success('Password reset successfully!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      <div className="bg-glow-purple top-10 left-10"></div>
      <div className="bg-glow-indigo bottom-20 right-20"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl relative z-10">
        {complete ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white Outfit">Reset Completed</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Your password has been changed successfully. You can now log back in using your new credentials.
            </p>
            <Link
              to="/login"
              className="inline-block mt-6 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white Outfit">
              Configure New Password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
              Please enter your new password details below.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' }
                    })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm"
                  />
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                </div>
                {errors.password && <span className="text-[10px] text-red-500 mt-0.5 block">{errors.password.message}</span>}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...register('confirmPassword', {
                      required: 'Confirm password is required',
                      validate: (val) => val === watch('password') || 'Passwords do not match'
                    })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm"
                  />
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                </div>
                {errors.confirmPassword && <span className="text-[10px] text-red-500 mt-0.5 block">{errors.confirmPassword.message}</span>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-2xl shadow-lg transition-all"
              >
                {loading ? 'Updating Password...' : 'Save Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
