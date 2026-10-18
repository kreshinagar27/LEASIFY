import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useForm } from 'react-hook-form';
import {
  Lock,
  Mail,
  Users,
  Key,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  ArrowRight
} from 'lucide-react';
import PasswordInput from '../components/PasswordInput';

import PropertyBackground from '../components/PropertyBackground';

const Login = () => {

  const { login, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryRole = searchParams.get('role');
  const stateRole = location.state?.role;
  const [role, setRole] = useState(queryRole || stateRole || 'owner'); // 'owner' or 'tenant'
  const [rememberMe, setRememberMe] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  useEffect(() => {
    if (queryRole === 'tenant' || stateRole === 'tenant') {
      setRole('tenant');
    } else if (queryRole === 'owner' || stateRole === 'owner') {
      setRole('owner');
    }

    if (location.state?.email) {
      setValue('email', location.state.email);
    }
  }, [queryRole, stateRole, location.state, setValue]);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setSearchParams({ role: newRole }, { replace: true });
  };

  const fillDemoAccount = (demoRole) => {
    handleRoleChange(demoRole);
    if (demoRole === 'owner') {
      setValue('email', 'dakshvashistha1369@gmail.com');
      setValue('password', 'Admin@123');
    } else {
      setValue('email', 'kreshinagar27@gmail.com');
      setValue('password', 'kd@101227');
    }
  };

  const onSubmit = async (data) => {
    if (loading || isSubmitting) return;
    const normalizedEmail = (data.email || '').trim().toLowerCase();
    const res = await login(normalizedEmail, data.password, role);
    if (res?.success) {
      if (res.user?.role === 'owner') {
        navigate('/dashboard/owner');
      } else {
        navigate('/dashboard/tenant');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between text-[#35231F] dark:text-[#F7EFE5] m-0 p-0 relative overflow-y-auto selection:bg-[#4B1715] selection:text-[#FAF7F0]">
      {/* Background House Video/Animation */}
      <PropertyBackground fixed={true} overlayOpacity="dense" />

      {/* Top Header Navigation - Full Width Edge-to-Edge */}
      <header className="w-full z-20 px-6 sm:px-10 lg:px-16 py-4 sm:py-5 flex items-center justify-between">
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
          id="login-theme-toggle"
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
      </header>

      {/* Main Login Card Section */}
      <main className="flex-1 flex items-center justify-center p-4 py-2 z-10 w-full">
        <div className="w-full max-w-xl glass-panel-elevated rounded-[2rem] p-6 sm:p-8 border border-[#D9CBBB] dark:border-[#38251F] shadow-2xl relative">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9DFD0] dark:bg-[#2A1D18] text-[#4A1715] dark:text-[#E9DFD0] text-[11px] font-bold mb-2 border border-[#D9CBBB] dark:border-[#4A1715]">
            <Sparkles className="w-3.5 h-3.5" /> Secure Portal Access
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#38251F] dark:text-[#FAF7F1] Outfit">
            Welcome back
          </h2>
          <p className="text-xs text-[#78685D] dark:text-[#C5B5A5] mt-1">
            Select your portal role below to access your tailored dashboard.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#E6DACC]/70 dark:bg-[#211A16] border border-[#D9CABB] dark:border-[rgba(230,211,191,0.1)] mb-4">
          <button
            type="button"
            id="role-owner-btn"
            onClick={() => handleRoleChange('owner')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === 'owner'
                ? 'bg-[#FAF7F1] dark:bg-[#352920] text-[#39251F] dark:text-[#FAF7F1] shadow-md border border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.15)]'
                : 'text-[#77665A] dark:text-[#AA9886] hover:text-[#39251F] dark:hover:text-[#FAF7F1]'
            }`}
          >
            <Users className="w-4 h-4 text-[#4A1917] dark:text-amber-400" />
            <span>Property Owner</span>
          </button>
          <button
            type="button"
            id="role-tenant-btn"
            onClick={() => handleRoleChange('tenant')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === 'tenant'
                ? 'bg-[#FAF7F1] dark:bg-[#352920] text-[#39251F] dark:text-[#FAF7F1] shadow-md border border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.15)]'
                : 'text-[#77665A] dark:text-[#AA9886] hover:text-[#39251F] dark:hover:text-[#FAF7F1]'
            }`}
          >
            <Key className="w-4 h-4 text-[#4A1917] dark:text-amber-400" />
            <span>Resident Tenant</span>
          </button>
        </div>

        {/* Quick Demo Fill Pill */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EFE7DC]/60 dark:bg-[#261E1A] border border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.08)] mb-4 text-xs">
          <span className="text-[11px] font-medium text-[#77665A] dark:text-[#AA9886] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#4A1917] dark:text-amber-400" />
            Quick preview?
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="quick-demo-owner"
              onClick={() => fillDemoAccount('owner')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FAF7F1] dark:bg-[#352920] text-[#39251F] dark:text-[#FAF7F1] hover:bg-[#4A1917] hover:text-white dark:hover:bg-[#754039] transition-all cursor-pointer border border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.1)]"
            >
              Owner
            </button>
            <button
              type="button"
              id="quick-demo-tenant"
              onClick={() => fillDemoAccount('tenant')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FAF7F1] dark:bg-[#352920] text-[#39251F] dark:text-[#FAF7F1] hover:bg-[#4A1917] hover:text-white dark:hover:bg-[#754039] transition-all cursor-pointer border border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.1)]"
            >
              Tenant
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#38251F] dark:text-[#E9DFD0] block mb-1">
              Email Address *
            </label>
            <div className="relative">
              <input
                type="email"
                id="login-email"
                placeholder={role === 'owner' ? 'owner@example.com' : 'tenant@example.com'}
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#38251F] dark:text-[#E9DFD0]">
                Password *
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-[#4A1917] dark:text-[#D1C1B0] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              register={register}
              name="password"
              rules={{ required: 'Password is required' }}
              error={errors.password}
              placeholder="••••••••••••"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-[#4A1917] dark:accent-[#754039]"
            />
            <label
              htmlFor="rememberMe"
              className="text-xs text-[#77665A] dark:text-[#AA9886] cursor-pointer select-none"
            >
              Keep me signed in for 30 days
            </label>
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            disabled={loading || isSubmitting}
            className="w-full py-3.5 mt-2 text-sm font-bold text-[#FAF7F1] btn-primary-glow rounded-2xl shadow-lg flex items-center justify-center gap-2 group transition-all cursor-pointer"
          >
            {loading || isSubmitting ? (
              'Authenticating...'
            ) : (
              <>
                <span>Sign In as {role === 'owner' ? 'Property Owner' : 'Resident Tenant'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-[#D9CBBB]/60 dark:border-[#38251F] space-y-1.5">
          <p className="text-xs text-[#78685D] dark:text-[#C5B5A5]">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-brand-600 dark:text-brand-300 font-bold hover:underline">
              Register as Owner
            </Link>
          </p>
          <p className="text-xs text-[#78685D] dark:text-[#C5B5A5]">
            Are you a resident tenant?{' '}
            <Link to="/register-tenant" className="text-brand-600 dark:text-brand-300 font-bold hover:underline">
              Register Tenant Account
            </Link>
          </p>
        </div>
      </div>
    </main>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-[#78685D] dark:text-[#C5B5A5] py-3 z-10">
        © {new Date().getFullYear()} Leasify Cloud Inc. All rights reserved.
      </footer>
    </div>
  );
};

export default Login;
