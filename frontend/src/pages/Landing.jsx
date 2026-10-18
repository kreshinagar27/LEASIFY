import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PropertyBackground from '../components/PropertyBackground';

const Landing = () => {
  const navigate = useNavigate();

  const handleSearchClick = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden text-white font-sans selection:bg-[#B97843] selection:text-white">
      {/* 1. CINEMATIC MOVING HOUSE BACKGROUND */}
      <PropertyBackground fixed={true} overlayOpacity="cinematic" />

      {/* 2. TOP NAVBAR */}
      <header className="w-full z-30 pt-6 sm:pt-8 px-6 sm:px-10 lg:px-16">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* LEFT: Existing Leasify Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src="/logo-dark.png"
              alt="Leasify"
              className="h-7 sm:h-8 md:h-9 w-auto object-contain brightness-0 invert transition-transform group-hover:scale-105 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
            />
          </Link>

          {/* RIGHT: Login & Register */}
          <div className="flex items-center gap-5 sm:gap-7">
            <Link
              to="/login"
              className="text-white hover:text-white/80 font-medium text-sm sm:text-base tracking-wide transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] cursor-pointer"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.40)] backdrop-blur-[12px] border border-[rgba(255,255,255,0.6)] text-[#33221D] font-semibold text-sm sm:text-base transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 cursor-pointer"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* 3. CENTER HERO */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center z-20 my-auto pb-12 sm:pb-16">
        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl leading-[1.12] [text-shadow:_0_3px_24px_rgba(0,0,0,0.7),_0_1px_4px_rgba(0,0,0,0.9)] Outfit">
          Find your future home
        </h1>

        {/* Primary CTA Button */}
        <button
          type="button"
          onClick={handleSearchClick}
          className="mt-7 sm:mt-9 inline-flex items-center gap-2.5 px-7 sm:px-8 py-3.5 sm:py-4 rounded-full bg-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.40)] backdrop-blur-[12px] border border-[rgba(255,255,255,0.6)] text-[#33221D] font-semibold text-base sm:text-lg shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.24)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer group"
        >
          <span>Search Apartment</span>
          <ArrowRight className="w-5 h-5 text-[#33221D] transition-transform group-hover:translate-x-1" />
        </button>
      </main>

      {/* 4. BALANCED BOTTOM SPACER FOR PERFECT VERTICAL EQUILIBRIUM */}
      <div className="h-10 sm:h-14 pointer-events-none" />
    </div>
  );
};

export default Landing;
