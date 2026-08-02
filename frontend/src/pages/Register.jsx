import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { Mail, User, Lock, Phone, MapPin, Building2 } from 'lucide-react';

const Register = () => {
  const { register: signup, loading } = useAuth();
  const navigate = useNavigate();
  const [registered, setRegistered] = useState(false);
  const [autoVerified, setAutoVerified] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    const res = await signup(data.name, data.email, data.password, data.contactNumber, data.address);
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

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
        <div className="bg-glow-purple top-10 left-10"></div>
        <div className="bg-glow-indigo bottom-20 right-20"></div>

        <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl text-center relative z-10">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white Outfit">Check Your Email</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            We have sent a verification link to your registered email. Please click the link to verify and activate your landlord dashboard account.
          </p>
          <Link
            to="/login"
            className="inline-block mt-6 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      <div className="bg-glow-purple top-10 left-10"></div>
      <div className="bg-glow-indigo bottom-20 right-20"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-lg shadow-brand-500/30 mb-3">
            L
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white Outfit">
            Register as Owner
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build your rental property portfolio with Leasify
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Full Name</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Rajesh Kumar"
                {...register('name', { required: 'Full name is required' })}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm"
              />
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            </div>
            {errors.name && <span className="text-[10px] text-red-500 mt-0.5 block">{errors.name.message}</span>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                placeholder="rajesh@example.com"
                {...register('email', {
                  required: 'Email address is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                })}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm"
              />
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            </div>
            {errors.email && <span className="text-[10px] text-red-500 mt-0.5 block">{errors.email.message}</span>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Contact Number</label>
            <div className="relative">
              <input
                type="text"
                placeholder="+91 9876543210"
                {...register('contactNumber', { required: 'Contact number is required' })}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm"
              />
              <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            </div>
            {errors.contactNumber && <span className="text-[10px] text-red-500 mt-0.5 block">{errors.contactNumber.message}</span>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Password</label>
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
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Office Address</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Suite 402, Koramangala, Bengaluru"
                {...register('address')}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-sm"
              />
              <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || autoVerified}
            className="w-full py-3 mt-2 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-2xl shadow-lg shadow-brand-500/25 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating Dashboard...' : autoVerified ? 'Account Created! Redirecting...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 font-bold hover:underline">
              Log In
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Register;
