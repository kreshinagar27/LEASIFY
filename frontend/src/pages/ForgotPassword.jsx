import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTheme } from '../context/ThemeContext';
import { Mail, ArrowLeft, Send, Building2, Sun, Moon, ShieldCheck, ArrowRight } from 'lucide-react';
import apiClient from '../services/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email: data.email });
      if (res.data.success) {
        setSent(true);
        toast.success('Password reset link sent to your email.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#EAE1D4] dark:bg-[#211A16] text-[#39251F] dark:text-[#F6EEE3] p-4 py-8 relative overflow-hidden transition-colors duration-200">
      {/* Background Ambient Warm Glows for Frosted Glass Depth */}
      <div className="fixed top-12 left-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(213,187,151,0.45)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(117,64,57,0.22)_0%,transparent_70%)] pointer-events-none blur-3xl -z-10" />
      <div className="fixed bottom-10 right-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(161,117,91,0.30)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(140,85,60,0.18)_0%,transparent_70%)] pointer-events-none blur-3xl -z-10" />

      {/* Top Header Navigation */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between mb-4 z-10">
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
          id="forgot-pwd-theme-toggle"
          aria-label="Toggle Theme"
          className="p-2 px-3 rounded-full bg-[#E6DACC] dark:bg-[#352920] border border-[#D9CABB] dark:border-[rgba(230,211,191,0.15)] text-[#39251F] dark:text-[#F6EEE3] hover:text-[#4A1917] hover:scale-105 transition-all shadow-sm flex items-center gap-2 text-xs font-semibold cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#4A1917]" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md mx-auto glass-panel-elevated rounded-[2rem] p-6 sm:p-8 border border-[#D9CBBB] dark:border-[#38251F] shadow-2xl relative z-10 my-auto">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#78685D] hover:text-[#4A1715] dark:hover:text-[#E9DFD0] mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <Send className="w-7 h-7 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit">
              Recovery Link Sent
            </h3>
            <p className="text-xs text-[#78685D] dark:text-[#C5B5A5] mt-2 leading-relaxed">
              If an account matches your entered email, we dispatched instructions to reset your password. It remains active for 10 minutes.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 btn-primary-glow text-[#FAF7F1] font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Return to Login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit">
                Recover Password
              </h2>
              <p className="text-xs text-[#78685D] dark:text-[#C5B5A5] mt-1">
                Enter your registered email address and we'll send a secure password reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#38251F] dark:text-[#E9DFD0] block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    {...register('email', {
                      required: 'Email address is required',
                      pattern: { value: /^\S+@\S+$/i, message: 'Please enter a valid email address' }
                    })}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-sm font-medium"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78685D]" />
                </div>
                {errors.email && (
                  <span className="text-[11px] text-red-500 font-medium mt-1 block">
                    {errors.email.message}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 text-sm font-bold text-[#FAF7F1] btn-primary-glow rounded-2xl shadow-lg flex items-center justify-center gap-2 group transition-all cursor-pointer"
              >
                {loading ? (
                  'Sending Instructions...'
                ) : (
                  <>
                    <span>Send Recovery Link</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="max-w-md w-full mx-auto text-center text-xs text-[#78685D] dark:text-[#78685D] pt-4 z-10">
        © {new Date().getFullYear()} Leasify Cloud Inc.
      </div>
    </div>
  );
};

export default ForgotPassword;
