import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useForm } from 'react-hook-form';
import { Mail, User, Lock, Key, Sun, Moon, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import InternationalPhoneInput from '../components/InternationalPhoneInput';
import PasswordInput from '../components/PasswordInput';
import PropertyBackground from '../components/PropertyBackground';

const RegisterTenant = () => {
  const { registerTenant, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [autoVerified, setAutoVerified] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneMeta, setPhoneMeta] = useState({ isValid: false, country: 'IN' });
  const [phoneError, setPhoneError] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const password = watch('password');

  const onSubmit = async (data) => {
    if (loading || isSubmitting) return;

    if (!phone) {
      setPhoneError('Phone number is required.');
      return;
    }

    if (!phoneMeta.isValid) {
      setPhoneError('Please enter a valid phone number.');
      return;
    }
    setPhoneError('');

    const res = await registerTenant(data.name, data.email, data.password, phone);
    if (res?.success) {
      setAutoVerified(true);
      setTimeout(() => {
        navigate('/login?role=tenant', { state: { role: 'tenant', email: data.email } });
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between text-[#35231F] dark:text-[#F7EFE5] p-4 py-8 relative overflow-hidden selection:bg-[#4B1715] selection:text-[#FAF7F0]">
      {/* Background House Animation */}
      <PropertyBackground fixed={true} overlayOpacity="dense" />

      {/* Top Header Navigation */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between mb-4 z-10">
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="/logo-dark.png"
            alt="Leasify"
            className="h-8 w-auto object-contain brightness-0 dark:brightness-100 transition-all group-hover:scale-105"
          />
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          id="tenant-reg-theme-toggle"
          aria-label="Toggle Theme"
          className="p-2 px-3 rounded-full glass-surface text-[#35231F] dark:text-[#F7EFE5] hover:text-[#4B1715] hover:scale-105 transition-all shadow-sm flex items-center gap-2 text-xs font-semibold cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-[#4A1917]" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-xl mx-auto glass-panel-elevated rounded-[2rem] p-6 sm:p-8 md:p-10 border border-[#D9CBBB] dark:border-[#38251F] shadow-2xl relative z-10 my-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9DFD0] dark:bg-[#2A1D18] text-[#4A1715] dark:text-[#E9DFD0] text-[11px] font-bold mb-2 border border-[#D9CBBB] dark:border-[#4A1715]">
            <Key className="w-3.5 h-3.5" /> Resident Tenant Portal Setup
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#38251F] dark:text-[#FAF7F1] Outfit">
            Join Your Resident Portal
          </h2>
          <p className="text-xs text-[#78685D] dark:text-[#C5B5A5] mt-1">
            Access your active lease, pay monthly rent digitally, and submit maintenance tickets.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#38251F] dark:text-[#E9DFD0] block mb-1">
                Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Aarav Sharma"
                  {...register('name', { required: 'Full name is required' })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm font-medium"
                />
                <User className="absolute left-3.5 top-3 w-4 h-4 text-[#78685D]" />
              </div>
              {errors.name && (
                <span className="text-[10px] text-red-500 mt-0.5 block">{errors.name.message}</span>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-[#38251F] dark:text-[#E9DFD0] block mb-1">
                Email Address *
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="aarav@example.com"
                  {...register('email', {
                    required: 'Email address is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                  })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm font-medium"
                />
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#78685D]" />
              </div>
              {errors.email && (
                <span className="text-[10px] text-red-500 mt-0.5 block">{errors.email.message}</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#38251F] dark:text-[#E9DFD0] block mb-1">
              Phone Number *
            </label>
            <InternationalPhoneInput
              id="tenant-register-phone"
              name="phone"
              value={phone}
              onChange={(e164, meta) => {
                setPhone(e164);
                setPhoneMeta(meta);
                if (phoneError && meta.isValid) setPhoneError('');
              }}
              error={phoneError}
              defaultCountry="IN"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#38251F] dark:text-[#E9DFD0] block mb-1">
                Password *
              </label>
              <PasswordInput
                id="tenant-password"
                placeholder="••••••••••••"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters' }
                })}
              />
              {errors.password && (
                <span className="text-[10px] text-red-500 mt-0.5 block">{errors.password.message}</span>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-[#38251F] dark:text-[#E9DFD0] block mb-1">
                Confirm Password *
              </label>
              <PasswordInput
                id="tenant-confirm-password"
                placeholder="••••••••••••"
                {...register('confirmPassword', {
                  required: 'Please confirm password',
                  validate: (val) => val === password || 'Passwords do not match'
                })}
              />
              {errors.confirmPassword && (
                <span className="text-[10px] text-red-500 mt-0.5 block">{errors.confirmPassword.message}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || autoVerified}
            className="w-full py-3.5 mt-2 text-sm font-bold text-[#FAF7F1] btn-primary-glow rounded-2xl shadow-lg flex items-center justify-center gap-2 group transition-all cursor-pointer"
          >
            {loading ? (
              'Creating Tenant Account...'
            ) : autoVerified ? (
              'Account Created! Redirecting...'
            ) : (
              <>
                <span>Create Resident Account</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-[#D9CBBB]/60 dark:border-[#38251F]">
          <span className="text-xs text-[#78685D] dark:text-[#C5B5A5]">
            Already have an account?{' '}
            <Link
              to="/login?role=tenant"
              state={{ role: 'tenant' }}
              className="text-brand-600 dark:text-brand-300 font-bold hover:underline"
            >
              Sign In as Tenant
            </Link>
          </span>
        </div>
      </div>

      <div className="max-w-xl w-full mx-auto text-center text-xs text-[#78685D] dark:text-[#78685D] pt-4 z-10">
        © {new Date().getFullYear()} Leasify Cloud Inc. All rights reserved.
      </div>
    </div>
  );
};

export default RegisterTenant;
