import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Lock, Mail, Users, Key } from 'lucide-react';

const Login = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('owner'); // 'owner' or 'tenant'
  
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    const res = await login(data.email, data.password, role);
    if (res.success) {
      if (res.user?.role === 'owner') {
        navigate('/dashboard/owner');
      } else {
        navigate('/dashboard/tenant');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="bg-glow-purple top-10 left-10"></div>
      <div className="bg-glow-indigo bottom-20 right-20"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl relative z-10">
        {/* Header Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-lg shadow-brand-500/30 mb-3">
            L
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white Outfit">
            Welcome to Leasify
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            SaaS Property & Rental Management Portal
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/55 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setRole('owner')}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${role === 'owner' ? 'bg-white dark:bg-slate-800 text-brand-500 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <Users className="w-4 h-4" />
            Property Owner
          </button>
          <button
            type="button"
            onClick={() => setRole('tenant')}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${role === 'tenant' ? 'bg-white dark:bg-slate-800 text-brand-500 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <Key className="w-4 h-4" />
            Resident Tenant
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="yourname@example.com"
                {...register('email', {
                  required: 'Email address is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                })}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm"
              />
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            </div>
            {errors.email && (
              <span className="text-[10px] text-red-500 mt-0.5 block">{errors.email.message}</span>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-brand-500 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm"
              />
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            </div>
            {errors.password && (
              <span className="text-[10px] text-red-500 mt-0.5 block">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-2xl shadow-lg shadow-brand-500/25 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? 'Checking Account...' : `Log In as ${role === 'owner' ? 'Owner' : 'Tenant'}`}
          </button>
        </form>

        {/* Footer */}
        {role === 'owner' && (
          <div className="text-center mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              New property owner?{' '}
              <Link to="/register" className="text-brand-500 font-bold hover:underline">
                Create Account
              </Link>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
