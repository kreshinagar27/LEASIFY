import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import apiClient from '../services/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      <div className="bg-glow-purple top-10 left-10"></div>
      <div className="bg-glow-indigo bottom-20 right-20"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl relative z-10">
        <Link to="/login" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Log In
        </Link>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <Send className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white Outfit">Reset Link Emailed</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              If an account exists with that email, we have dispatched a password reset connection. It remains valid for 10 minutes.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white Outfit">
              Recover Password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
              Enter your email address and we'll dispatch a link to reset your password.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    {...register('email', {
                      required: 'Email address is required',
                      pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                    })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm"
                  />
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                </div>
                {errors.email && <span className="text-[10px] text-red-500 mt-0.5 block">{errors.email.message}</span>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-2xl shadow-lg transition-all"
              >
                {loading ? 'Dispatched Request...' : 'Send Recovery Link'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
