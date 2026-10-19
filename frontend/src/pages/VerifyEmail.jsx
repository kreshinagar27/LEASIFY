import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Mail, CheckCircle2, AlertCircle, Building2, Sun, Moon, ArrowRight } from 'lucide-react';
import apiClient from '../services/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const { theme, toggleTheme } = useTheme();

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
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#EAE1D4] dark:bg-[#211A16] text-[#39251F] dark:text-[#F6EEE3] m-0 p-0 relative overflow-x-hidden overflow-y-auto transition-colors duration-200">
      {/* Background Ambient Warm Glows for Frosted Glass Depth */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(213,187,151,0.45)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(117,64,57,0.22)_0%,transparent_70%)] pointer-events-none blur-3xl -z-10" />
      <div className="fixed bottom-10 right-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(161,117,91,0.30)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(140,85,60,0.18)_0%,transparent_70%)] pointer-events-none blur-3xl -z-10" />

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
          id="verify-email-theme-toggle"
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
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-2 z-10 w-full">
        <div className="w-full max-w-md glass-panel-elevated rounded-[2rem] p-6 sm:p-8 border border-[#D9CBBB] dark:border-[#38251F] shadow-2xl text-center relative">
        {status === 'verifying' && (
          <div className="py-8">
            <div className="w-14 h-14 rounded-full border-4 border-[#4A1715] border-t-transparent animate-spin mx-auto mb-5" />
            <h3 className="text-xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit">Verifying Your Account</h3>
            <p className="text-xs text-[#78685D] dark:text-[#C5B5A5] mt-2">Checking token authenticity with our central registry...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit">Email Verified</h3>
            <p className="text-xs text-[#78685D] dark:text-[#C5B5A5] mt-2 leading-relaxed">
              Your email address has been authenticated. Your account is fully active and ready to use.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 btn-primary-glow text-[#FAF7F1] font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Sign In to Your Account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/10">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-[#38251F] dark:text-[#FAF7F1] Outfit">Verification Failed</h3>
            <p className="text-xs text-red-600 mt-2 font-medium">{message}</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 border border-[#D9CBBB] dark:border-[#38251F] text-[#38251F] dark:text-[#E9DFD0] hover:bg-[#E9DFD0]/60 font-bold text-xs rounded-xl transition-all"
            >
              Back to Login
            </Link>
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

export default VerifyEmail;
