import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useForm } from 'react-hook-form';
import apiClient from '../services/api';
import {
  Mail, User, Lock, Key, Sun, Moon, ArrowRight, ShieldCheck,
  CheckCircle2, AlertTriangle, Building, Home, Clock, AlertCircle, RefreshCw
} from 'lucide-react';
import InternationalPhoneInput from '../components/InternationalPhoneInput';
import PasswordInput from '../components/PasswordInput';
import PropertyBackground from '../components/PropertyBackground';
import toast from 'react-hot-toast';

const RegisterTenant = () => {
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token') || '';

  const { registerTenant, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [activeToken, setActiveToken] = useState(urlToken);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenStatus, setTokenStatus] = useState({
    checked: false,
    valid: false,
    data: null,
    error: null,
    reason: null
  });

  const [autoVerified, setAutoVerified] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneMeta, setPhoneMeta] = useState({ isValid: false, country: 'IN' });
  const [phoneError, setPhoneError] = useState('');

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm();
  const password = watch('password');

  // Validate Token on mount or when activeToken changes
  const validateToken = async (tokenToVerify) => {
    if (!tokenToVerify || !tokenToVerify.trim()) {
      setTokenStatus({
        checked: true,
        valid: false,
        data: null,
        error: null,
        reason: 'no_token'
      });
      return;
    }

    setIsValidatingToken(true);
    try {
      const { data } = await apiClient.get(`/invitations/validate?token=${encodeURIComponent(tokenToVerify.trim())}`);
      if (data?.success && data?.valid) {
        setTokenStatus({
          checked: true,
          valid: true,
          data: data.data,
          error: null,
          reason: null
        });
        // Prefill email and set form value
        if (data.data?.email) {
          setValue('email', data.data.email);
        }
      } else {
        setTokenStatus({
          checked: true,
          valid: false,
          data: null,
          error: data?.message || 'Invalid invitation link.',
          reason: data?.reason || 'invalid'
        });
      }
    } catch (err) {
      const errRes = err.response?.data;
      setTokenStatus({
        checked: true,
        valid: false,
        data: null,
        error: errRes?.message || 'Unable to validate invitation. Please check your link or network.',
        reason: errRes?.reason || 'error'
      });
    } finally {
      setIsValidatingToken(false);
    }
  };

  useEffect(() => {
    if (urlToken) {
      setActiveToken(urlToken);
      validateToken(urlToken);
    } else {
      setTokenStatus({
        checked: true,
        valid: false,
        data: null,
        error: null,
        reason: 'no_token'
      });
    }
  }, [urlToken]);

  const handleManualTokenSubmit = (e) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) {
      toast.error('Please enter an invitation token.');
      return;
    }
    setActiveToken(manualTokenInput.trim());
    validateToken(manualTokenInput.trim());
  };

  const onSubmit = async (data) => {
    if (loading || isSubmitting) return;

    if (!activeToken) {
      toast.error('An invitation token is required to register as a tenant.');
      return;
    }

    if (!phone) {
      setPhoneError('Phone number is required.');
      return;
    }

    if (!phoneMeta.isValid) {
      setPhoneError('Please enter a valid phone number.');
      return;
    }
    setPhoneError('');

    // Ensure email used is the verified invited email
    const submissionEmail = tokenStatus.data?.email || data.email;

    const res = await registerTenant(
      data.name,
      submissionEmail,
      data.password,
      phone,
      activeToken
    );

    if (res?.success) {
      setAutoVerified(true);
      setTimeout(() => {
        navigate('/login?role=tenant', { state: { role: 'tenant', email: submissionEmail } });
      }, 1500);
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
      </header>

      {/* Main Container Section */}
      <main className="flex-1 flex items-center justify-center p-4 py-2 z-10 w-full">
        <div className="w-full max-w-xl glass-panel-elevated rounded-[2rem] p-6 sm:p-8 md:p-10 border border-[#D9CBBB] dark:border-[#38251F] shadow-2xl relative">
          
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9DFD0] dark:bg-[#2A1D18] text-[#4A1715] dark:text-[#E9DFD0] text-[11px] font-bold mb-2 border border-[#D9CBBB] dark:border-[#4A1715]">
              <Key className="w-3.5 h-3.5" /> Resident Tenant Portal Setup
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#38251F] dark:text-[#FAF7F1] Outfit">
              Join Your Resident Portal
            </h2>
            <p className="text-xs text-[#78685D] dark:text-[#C5B5A5] mt-1">
              Access your lease, pay rent securely, and communicate directly with your property manager.
            </p>
          </div>

          {/* STATE 1: Token Validation In Progress */}
          {isValidatingToken && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
              <p className="text-sm font-semibold text-[#38251F] dark:text-[#E9DFD0]">
                Verifying your invitation token...
              </p>
            </div>
          )}

          {/* STATE 2: Missing Token Prompt */}
          {!isValidatingToken && tokenStatus.checked && !tokenStatus.valid && tokenStatus.reason === 'no_token' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#E9DFD0]/40 dark:bg-[#2A1D18]/40 border border-[#D9CBBB] dark:border-[#4A1715]">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-brand-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-[#38251F] dark:text-[#FAF7F1]">
                      Owner Invitation Required
                    </h3>
                    <p className="text-xs text-[#78685D] dark:text-[#C5B5A5] mt-1 leading-relaxed">
                      Tenant accounts are strictly private and require an invitation from your property owner.
                      If you received an email invitation, please click the registration link in that email.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleManualTokenSubmit} className="space-y-3 pt-2">
                <label className="text-xs font-bold text-[#38251F] dark:text-[#E9DFD0] block">
                  Have an Invitation Token? Paste It Below:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    placeholder="e.g. 9f4e2b810a..."
                    className="flex-1 px-4 py-2.5 rounded-2xl glass-input text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Verify
                  </button>
                </div>
              </form>

              <div className="text-center pt-4 border-t border-[#D9CBBB]/60 dark:border-[#38251F]">
                <span className="text-xs text-[#78685D] dark:text-[#C5B5A5]">
                  Already have a registered account?{' '}
                  <Link
                    to="/login?role=tenant"
                    state={{ role: 'tenant' }}
                    className="text-brand-600 dark:text-brand-300 font-bold hover:underline"
                  >
                    Sign In
                  </Link>
                </span>
              </div>
            </div>
          )}

          {/* STATE 3: Invalid / Expired / Revoked / Used Token Banner */}
          {!isValidatingToken && tokenStatus.checked && !tokenStatus.valid && tokenStatus.reason !== 'no_token' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
                      Invitation Unavailable
                    </h3>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-1 leading-relaxed">
                      {tokenStatus.error || 'This invitation link is invalid or has expired.'}
                    </p>
                    {tokenStatus.reason === 'already_used' && (
                      <p className="text-xs text-red-700 dark:text-red-400 mt-2 font-medium">
                        If you already registered, please proceed to sign in with your email and password.
                      </p>
                    )}
                    {tokenStatus.reason === 'expired' && (
                      <p className="text-xs text-red-700 dark:text-red-400 mt-2 font-medium">
                        Please contact your property owner to send you a fresh invitation link.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveToken('');
                    setTokenStatus({ checked: true, valid: false, data: null, error: null, reason: 'no_token' });
                    navigate('/register-tenant');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border border-[#D9CBBB] dark:border-[#38251F] text-[#38251F] dark:text-[#E9DFD0] hover:bg-[#E9DFD0]/30 transition-all text-center cursor-pointer"
                >
                  Enter Another Token
                </button>
                <Link
                  to="/login?role=tenant"
                  state={{ role: 'tenant' }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white transition-all text-center shadow-sm"
                >
                  Go to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* STATE 4: Valid Invitation - Display Details & Registration Form */}
          {!isValidatingToken && tokenStatus.checked && tokenStatus.valid && tokenStatus.data && (
            <div className="space-y-4">
              {/* Verified Invitation Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Verified Owner Invitation
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#38251F] dark:text-[#E9DFD0] mt-2">
                  <div>
                    <span className="text-[#78685D] dark:text-[#C5B5A5]">Invited by: </span>
                    <strong>{tokenStatus.data.ownerName || 'Property Owner'}</strong>
                  </div>
                  {tokenStatus.data.propertyName && (
                    <div>
                      <span className="text-[#78685D] dark:text-[#C5B5A5]">Property: </span>
                      <strong>{tokenStatus.data.propertyName}</strong>
                    </div>
                  )}
                  {tokenStatus.data.unitNumber && (
                    <div>
                      <span className="text-[#78685D] dark:text-[#C5B5A5]">Unit: </span>
                      <strong>{tokenStatus.data.unitNumber}</strong>
                    </div>
                  )}
                  <div>
                    <span className="text-[#78685D] dark:text-[#C5B5A5]">Invited Email: </span>
                    <strong className="text-brand-600 dark:text-brand-300">{tokenStatus.data.email}</strong>
                  </div>
                </div>
              </div>

              {/* Form */}
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
                      Email Address (Locked to Invitation) *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={tokenStatus.data.email}
                        readOnly
                        disabled
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm font-medium opacity-80 cursor-not-allowed bg-black/5 dark:bg-white/5"
                      />
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#78685D]" />
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      Bound to verified invitation token
                    </span>
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
                    'Account Created! Redirecting to Sign In...'
                  ) : (
                    <>
                      <span>Complete Registration</span>
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

export default RegisterTenant;
