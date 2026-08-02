import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import apiClient from '../services/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing.');
        return;
      }
      try {
        const { data } = await apiClient.get(`/auth/verify-email?token=${token}`);
        if (data.success) {
          setStatus('success');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification token is invalid or expired.');
      }
    };
    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      <div className="bg-glow-purple top-10 left-10"></div>
      <div className="bg-glow-indigo bottom-20 right-20"></div>

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl text-center relative z-10">
        {status === 'verifying' && (
          <div className="py-6">
            <div className="w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white Outfit">Verifying Your Email</h3>
            <p className="text-xs text-slate-500 mt-2">Checking with our central databases...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white Outfit">Verification Complete</h3>
            <p className="text-xs text-slate-500 mt-2">
              Your email has been verified. Your owner account is fully active.
            </p>
            <Link
              to="/login"
              className="inline-block mt-6 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white Outfit">Verification Failed</h3>
            <p className="text-xs text-red-500 mt-2 font-medium">{message}</p>
            <Link
              to="/login"
              className="inline-block mt-6 px-6 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 font-bold text-xs rounded-xl transition-all"
            >
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
