import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useForm } from 'react-hook-form';
import { Mail, User, Lock, MapPin, Building2, Sun, Moon, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import InternationalPhoneInput from '../components/InternationalPhoneInput';
import PasswordInput from '../components/PasswordInput';
import PropertyBackground from '../components/PropertyBackground';

const Register = () => {
  const { register: signup, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [registered, setRegistered] = useState(false);
  const [autoVerified, setAutoVerified] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [phoneMeta, setPhoneMeta] = useState({ isValid: false, country: 'IN' });
  const [phoneError, setPhoneError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    if (loading || isSubmitting) return;

    if (!contactNumber) {
      setPhoneError('Contact number is required.');
      return;
    }

    if (!phoneMeta.isValid) {
      setPhoneError('Please enter a valid phone number.');
      return;
    }
    setPhoneError('');

    const res = await signup(data.name, data.email, data.password, contactNumber, data.address);
    if (res?.success) {
      if (res.autoVerified) {
        setAutoVerified(true);
        setTimeout(() => {
          navigate('/login', { state: { email: data.email } });
        }, 1500);
      } else {
        setRegistered(true);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between text-[#35231F] dark:text-[#F7EFE5] m-0 p-0 relative overflow-x-hidden overflow-y-auto selection:bg-[#4B1715] selection:text-[#FAF7F0]">
      {/* Background House Animation */}
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
          id="register-theme-toggle"
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

      {/* Main Container Section */}
      <main className="flex-1 flex items-center justify-center p-4 py-2 z-10 w-full">
        <div className="w-full max-w-xl glass-panel-elevated rounded-[2rem] p-6 sm:p-8 md:p-10 border border-[#D9CBBB] dark:border-[#38251F] shadow-2xl relative">
        {registered ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <Mail className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit">
              Check Your Inbox
            </h2>
            <p className="text-xs sm:text-sm text-[#78685D] dark:text-[#C5B5A5] mt-2 max-w-sm mx-auto leading-relaxed">
              We dispatched a secure verification link to activate your owner dashboard account.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 btn-primary-glow text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Back to Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9DFD0] dark:bg-[#2A1D18] text-[#4A1715] dark:text-[#E9DFD0] text-[11px] font-bold mb-2 border border-[#D9CBBB] dark:border-[#4A1715]">
                <ShieldCheck className="w-3.5 h-3.5" /> Property Owner Onboarding
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#38251F] dark:text-[#FAF7F1] Outfit">
                Start Managing Your Portfolio
              </h2>
              <p className="text-xs text-[#78685D] dark:text-[#C5B5A5] mt-1">
                Automate units, leases, invoicing, and tenant onboarding in one unified hub.
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
                      placeholder="Rajesh Kumar"
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
                    Work Email *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="rajesh@company.com"
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
                  Contact Number *
                </label>
                <InternationalPhoneInput
                  id="owner-contact-phone"
                  name="contactNumber"
                  value={contactNumber}
                  onChange={(e164, meta) => {
                    setContactNumber(e164);
                    setPhoneMeta(meta);
                    if (phoneError && meta.isValid) setPhoneError('');
                  }}
                  error={phoneError}
                  defaultCountry="IN"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#38251F] dark:text-[#E9DFD0] block mb-1">
                  Password *
                </label>
                <PasswordInput
                  id="owner-password"
                  placeholder="••••••••••••"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                />
                {errors.password && (
                  <span className="text-[10px] text-red-500 mt-0.5 block">{errors.password.message}</span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#38251F] dark:text-[#E9DFD0] block mb-1">
                  Office / Management Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Suite 402, Koramangala, Bengaluru"
                    {...register('address')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm font-medium"
                  />
                  <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-[#78685D]" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || autoVerified}
                className="w-full py-3.5 mt-2 text-sm font-bold text-[#FAF7F1] btn-primary-glow rounded-2xl shadow-lg flex items-center justify-center gap-2 group transition-all cursor-pointer"
              >
                {loading ? (
                  'Creating Dashboard...'
                ) : autoVerified ? (
                  'Account Created! Redirecting...'
                ) : (
                  <>
                    <span>Create Owner Account</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-6 pt-4 border-t border-[#D9CBBB]/60 dark:border-[#38251F]">
              <span className="text-xs text-[#78685D] dark:text-[#C5B5A5]">
                Already registered?{' '}
                <Link to="/login" className="text-brand-600 dark:text-brand-300 font-bold hover:underline">
                  Sign In
                </Link>
              </span>
            </div>
          </>
        )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-[#78685D] dark:text-[#C5B5A5] py-3 z-10">
        © {new Date().getFullYear()} Leasify Cloud Inc. All rights reserved.
      </footer>
    </div>
  );
};

export default Register;
