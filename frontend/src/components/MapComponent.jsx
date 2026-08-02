import React, { useState, useEffect } from 'react';
import { MapPin, Search, Info } from 'lucide-react';

const MapComponent = ({
  latitude,
  longitude,
  onLocationSelect,
  readOnly = false,
  addressString = ''
}) => {
  const [lat, setLat] = useState(latitude || 12.9716); // Default Bengaluru
  const [lng, setLng] = useState(longitude || 77.5946);
  const [searchVal, setSearchVal] = useState(addressString);
  const [usingMock, setUsingMock] = useState(true);

  useEffect(() => {
    if (latitude) setLat(latitude);
    if (longitude) setLng(longitude);
  }, [latitude, longitude]);

  // Simulate Map click coordinate selection
  const handleMockMapClick = (e) => {
    if (readOnly) return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element.
    const y = e.clientY - rect.top;  // y position within the element.
    
    // Scale click points to simulated coordinates around Bengaluru
    const newLat = +(12.9000 + (y / rect.height) * 0.15).toFixed(6);
    const newLng = +(77.5000 + (x / rect.width) * 0.20).toFixed(6);
    
    setLat(newLat);
    setLng(newLng);
    if (onLocationSelect) {
      onLocationSelect(newLat, newLng);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (readOnly) return;
    // Simulate address lookup
    const hash = searchVal.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const mockLat = +(12.9000 + (hash % 150) / 1000).toFixed(6);
    const mockLng = +(77.5000 + (hash % 200) / 1000).toFixed(6);
    
    setLat(mockLat);
    setLng(mockLng);
    if (onLocationSelect) {
      onLocationSelect(mockLat, mockLng);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="text-brand-500 w-5 h-5" />
          <h4 className="font-semibold text-slate-800 dark:text-slate-200">
            Interactive Geolocation Map
          </h4>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
          <Info className="w-3.5 h-3.5" />
          Interactive Offline Mode Enabled
        </div>
      </div>

      {!readOnly && (
        <form onSubmit={handleSearchSubmit} className="relative mb-3 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search address or city..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl glass-input focus:ring-2 focus:ring-brand-500"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20 transition-all duration-200"
          >
            Locate
          </button>
        </form>
      )}

      {/* Simulated Interactive Map Grid */}
      <div 
        onClick={handleMockMapClick}
        className={`relative h-[250px] w-full rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden cursor-crosshair flex items-center justify-center select-none`}
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.05) 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }}
      >
        {/* Background Map Contours */}
        <div className="absolute inset-0 opacity-20 pointer-events-none flex flex-wrap justify-between p-12">
          <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-400"></div>
          <div className="w-32 h-16 rounded-full border-4 border-dashed border-slate-400"></div>
          <div className="w-16 h-32 rounded-full border-4 border-dashed border-slate-400"></div>
        </div>

        {/* Pin marker positioned in center representing current coordinates */}
        <div 
          className="absolute z-10 flex flex-col items-center pointer-events-none transform -translate-y-6 transition-all duration-300"
          style={{
            left: '50%',
            top: '50%'
          }}
        >
          <div className="animate-bounce">
            <MapPin className="w-9 h-9 text-brand-600 fill-brand-600/30" />
          </div>
          <div className="px-2 py-1 bg-slate-900 text-white text-[10px] rounded shadow-lg whitespace-nowrap mt-1">
            Pin Saved
          </div>
        </div>

        {/* HUD coordinates */}
        <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[10px] text-slate-300 rounded font-mono select-all">
          LAT: {lat} | LNG: {lng}
        </div>

        <div className="absolute top-2 right-2 text-[10px] text-slate-400 bg-slate-900/10 dark:bg-slate-900/50 px-2 py-1 rounded">
          {readOnly ? 'View Mode' : 'Click to Reposition Pin'}
        </div>
      </div>

      {!readOnly && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Latitude</label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setLat(val);
                if (onLocationSelect) onLocationSelect(val, lng);
              }}
              className="w-full mt-0.5 px-3 py-1.5 text-xs rounded-lg glass-input font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Longitude</label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setLng(val);
                if (onLocationSelect) onLocationSelect(lat, val);
              }}
              className="w-full mt-0.5 px-3 py-1.5 text-xs rounded-lg glass-input font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
