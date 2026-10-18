import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Info, Crosshair, Navigation, Loader2, X, Check, Compass } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../services/api';

// Fix Leaflet marker icons in bundlers
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
});

// Custom interactive picker pin icon
const pickerPinIcon = L.divIcon({
  className: 'leasify-picker-pin',
  html: `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: #4A1917;
      border: 2px solid #FFFDFB;
      box-shadow: 0 4px 14px rgba(43,23,19,0.4);
      cursor: grab;
      transition: transform 0.15s ease;
    ">
      <svg style="transform: rotate(45deg); width: 18px; height: 18px; color: #FFFDFB;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v20M2 12h20M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"></path>
      </svg>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38]
});

// Component to handle map click events
const LocationPickerEvents = ({ onSelect, readOnly }) => {
  useMapEvents({
    click(e) {
      if (readOnly) return;
      const newLat = parseFloat(e.latlng.lat.toFixed(6));
      const newLng = parseFloat(e.latlng.lng.toFixed(6));
      onSelect(newLat, newLng);
    }
  });
  return null;
};

// Component to smoothly fly/pan map when coordinates change programmatically
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1] && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, Math.max(map.getZoom(), 14), { duration: 0.8 });
    }
  }, [center, map]);
  return null;
};

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
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const markerRef = useRef(null);

  useEffect(() => {
    if (latitude !== undefined && latitude !== null && !isNaN(latitude) && Number(latitude) !== 0) {
      setLat(Number(latitude));
    }
    if (longitude !== undefined && longitude !== null && !isNaN(longitude) && Number(longitude) !== 0) {
      setLng(Number(longitude));
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (addressString && !searchVal) {
      setSearchVal(addressString);
    }
  }, [addressString]);

  const handleCoordinateChange = (newLat, newLng, placeName = null) => {
    setLat(newLat);
    setLng(newLng);
    if (onLocationSelect) {
      onLocationSelect(newLat, newLng, placeName);
    }
  };

  // Robust Search implementation with multi-tier fallback (Backend Proxy -> Photon API)
  const handleSearchSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (readOnly || !searchVal.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      // Tier 1: Backend geocoding proxy
      try {
        const res = await apiClient.get('/properties/geocode', {
          params: { q: searchVal.trim() }
        });
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const list = res.data.data;
          if (list.length === 1) {
            handleSelectSearchResult(list[0]);
          } else {
            setSearchResults(list);
          }
          setIsSearching(false);
          return;
        }
      } catch (backendErr) {
        console.warn('Backend geocode unavailable, using Photon fallback:', backendErr.message);
      }

      // Tier 2: Photon OpenStreetMap direct API
      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(searchVal.trim())}&limit=5`
      );
      if (photonRes.ok) {
        const data = await photonRes.json();
        if (data.features && data.features.length > 0) {
          const list = data.features.map(f => {
            const p = f.properties || {};
            const coords = f.geometry?.coordinates || [];
            const label = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean).join(', ');
            return {
              lat: parseFloat(parseFloat(coords[1]).toFixed(6)),
              lng: parseFloat(parseFloat(coords[0]).toFixed(6)),
              displayName: label || p.name || 'Location'
            };
          });

          if (list.length === 1) {
            handleSelectSearchResult(list[0]);
          } else {
            setSearchResults(list);
          }
          setIsSearching(false);
          return;
        }
      }

      toast.error('Location not found. Please try a different area name or click on the map.');
    } catch (err) {
      toast.error('Could not complete search. Click directly on the map to set pin.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    const foundLat = parseFloat(Number(result.lat).toFixed(6));
    const foundLng = parseFloat(Number(result.lng).toFixed(6));
    handleCoordinateChange(foundLat, foundLng, result.displayName);
    setSearchVal(result.displayName);
    setSearchResults([]);
    toast.success(`📍 Located: ${result.displayName.split(',')[0]}`);
  };

  // Dedicated "Locate Me" GPS geolocation handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    const toastId = toast.loading('Detecting your GPS position...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = parseFloat(position.coords.latitude.toFixed(6));
        const userLng = parseFloat(position.coords.longitude.toFixed(6));

        handleCoordinateChange(userLat, userLng);
        toast.dismiss(toastId);
        toast.success(`🎯 Detected position: ${userLat}, ${userLng}`);

        // Try to reverse geocode to get human-readable address
        try {
          const res = await apiClient.get('/properties/reverse-geocode', {
            params: { lat: userLat, lng: userLng }
          });
          if (res.data?.success && res.data.data?.displayName) {
            setSearchVal(res.data.data.displayName);
          }
        } catch {
          // Fallback to Photon reverse
          try {
            const photonRes = await fetch(`https://photon.komoot.io/reverse?lon=${userLng}&lat=${userLat}`);
            if (photonRes.ok) {
              const pData = await photonRes.json();
              if (pData.features?.[0]?.properties) {
                const p = pData.features[0].properties;
                const name = [p.name, p.street, p.city || p.district].filter(Boolean).join(', ');
                if (name) setSearchVal(name);
              }
            }
          } catch {
            // Ignore reverse geocode error
          }
        }
        setIsLocating(false);
      },
      (error) => {
        toast.dismiss(toastId);
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location permission was denied. Please allow location access or pick manually.');
        } else if (error.code === error.TIMEOUT) {
          toast.error('Location request timed out. Please click on the map to set pin.');
        } else {
          toast.error('Could not detect location. Please search an area or click on map.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  };

  return (
    <div className="relative overflow-visible rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="text-brand-500 w-5 h-5" />
          <h4 className="font-semibold text-slate-800 dark:text-slate-200">
            Interactive Property Location Picker
          </h4>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
          <Crosshair className="w-3.5 h-3.5" />
          {readOnly ? 'View Mode' : 'Click Map to Move Pin'}
        </div>
      </div>

      {!readOnly && (
        <div className="relative mb-3 space-y-2 z-10">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchVal}
                onChange={(e) => {
                  setSearchVal(e.target.value);
                  if (searchResults.length > 0) setSearchResults([]);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                placeholder="Search area, landmark, locality, or city..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl glass-input focus:ring-2 focus:ring-brand-500"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchVal('');
                    setSearchResults([]);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSearchSubmit}
                disabled={isSearching || !searchVal.trim()}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Search this address on map"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>{isSearching ? 'Searching...' : 'Search'}</span>
              </button>

              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Use current GPS device location"
              >
                {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
              </button>
            </div>
          </div>

          {/* Autocomplete / Multiple Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-[1000] mt-1 bg-white dark:bg-[#1E1714] border border-[#D9CABB] dark:border-espresso-700 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
              <div className="p-2 border-b border-slate-100 dark:border-espresso-800 text-[10px] font-bold uppercase text-slate-400 flex justify-between items-center bg-slate-50 dark:bg-espresso-900/50">
                <span>Select Matched Location ({searchResults.length})</span>
                <button
                  type="button"
                  onClick={() => setSearchResults([])}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {searchResults.map((item, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-300 border-b last:border-b-0 border-slate-100 dark:border-espresso-850 flex items-start gap-2 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-brand-500 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{item.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interactive Leaflet Map for Location Selection */}
      <div className="relative h-[260px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner z-0">
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter center={[lat, lng]} />

          <LocationPickerEvents onSelect={handleCoordinateChange} readOnly={readOnly} />

          <Marker
            position={[lat, lng]}
            icon={pickerPinIcon}
            draggable={!readOnly}
            ref={markerRef}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                const newLat = parseFloat(position.lat.toFixed(6));
                const newLng = parseFloat(position.lng.toFixed(6));
                handleCoordinateChange(newLat, newLng);
              }
            }}
          />
        </MapContainer>

        {/* Floating Quick Action Overlay Buttons inside Map */}
        {!readOnly && (
          <div className="absolute top-2 right-2 z-[400] flex gap-1.5">
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="p-2 bg-white/95 dark:bg-[#1C1614]/95 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Locate my position on map"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] hidden sm:inline">GPS</span>
            </button>
          </div>
        )}

        {/* HUD coordinates */}
        <div className="absolute bottom-2 left-2 z-[400] px-2.5 py-1 bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[10px] text-slate-300 rounded-lg font-mono select-all">
          LAT: {lat} | LNG: {lng}
        </div>
      </div>

      {!readOnly && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Latitude</label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                handleCoordinateChange(val, lng);
              }}
              className="w-full mt-0.5 px-3 py-1.5 text-xs rounded-lg glass-input font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Longitude</label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                handleCoordinateChange(lat, val);
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
