import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { Building, MapPin, ArrowUpRight, Bed, Bath, Layers, AlertCircle, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMediaUrl, DEFAULT_PROPERTY_IMAGE } from '../utils/mediaHelper';

// Fix default Leaflet asset icon paths in bundlers (Vite/Webpack)
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
});

/**
 * Extracts and validates [lat, lng] from property object.
 * GeoJSON stores [longitude, latitude], Leaflet expects [latitude, longitude].
 */
export const getPropertyCoordinates = (property) => {
  if (!property) return null;

  let lat = null;
  let lng = null;

  // 1. GeoJSON format: property.location.coordinates = [lng, lat]
  if (
    property.location &&
    Array.isArray(property.location.coordinates) &&
    property.location.coordinates.length >= 2
  ) {
    const rawLng = Number(property.location.coordinates[0]);
    const rawLat = Number(property.location.coordinates[1]);
    if (!Number.isNaN(rawLat) && !Number.isNaN(rawLng)) {
      lat = rawLat;
      lng = rawLng;
    }
  }

  // 2. Direct property fields fallback
  if (lat === null || lng === null) {
    if (property.latitude !== undefined && property.longitude !== undefined) {
      const rawLat = Number(property.latitude);
      const rawLng = Number(property.longitude);
      if (!Number.isNaN(rawLat) && !Number.isNaN(rawLng)) {
        lat = rawLat;
        lng = rawLng;
      }
    }
  }

  // Validation: lat [-90, 90], lng [-180, 180] and exclude uninitialized [0, 0]
  if (lat !== null && lng !== null) {
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      if (lat !== 0 || lng !== 0) {
        return { lat, lng };
      }
    }
  }

  return null;
};

// Create a custom luxury Leaflet divIcon matching Leasify brand identity
const createCustomMarkerIcon = (isSelected = false) => {
  const bg = isSelected ? '#B97843' : '#4A1917';
  return L.divIcon({
    className: 'leasify-map-pin',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: ${bg};
        border: 2px solid #FFFDFB;
        box-shadow: 0 4px 12px rgba(43,23,19,0.35);
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <svg style="transform: rotate(45deg); width: 17px; height: 17px; color: #FFFDFB;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

// Helper component that dynamically bounds map to markers
const MapBoundsHandler = ({ markers }) => {
  const map = useMap();

  useEffect(() => {
    if (!markers || markers.length === 0) return;

    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14, { animate: true });
    } else {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
    }
  }, [markers, map]);

  return null;
};

// Floating Locate Me button on property exploration map
const LocateControl = () => {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleLocate = (e) => {
    e.stopPropagation();
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    const toastId = toast.loading('Detecting your GPS position...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        toast.dismiss(toastId);
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 14, { duration: 1.2 });
        toast.success(`Centered map on your position (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      },
      (err) => {
        setLocating(false);
        toast.dismiss(toastId);
        toast.error('Could not detect location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto', margin: '12px' }}>
      <button
        type="button"
        onClick={handleLocate}
        disabled={locating}
        className="px-3 py-1.5 rounded-xl bg-white/95 dark:bg-[#1C1614]/95 text-[#38251F] dark:text-[#FAF7F1] border border-[#D9CABB] dark:border-espresso-700 shadow-lg text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 transition-all cursor-pointer"
        title="Locate my position on map"
      >
        <Navigation className={`w-3.5 h-3.5 text-emerald-600 ${locating ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{locating ? 'Locating...' : 'Locate Me'}</span>
      </button>
    </div>
  );
};

const PropertyMap = ({
  properties = [],
  height = '480px',
  className = '',
  selectedPropertyId = null,
  onSelectProperty = null,
  center = [12.9716, 77.5946], // Default Bengaluru center
  zoom = 12
}) => {
  // Extract all properties with valid coordinates
  const validProperties = useMemo(() => {
    return properties
      .map(p => {
        const coords = getPropertyCoordinates(p);
        return coords ? { ...p, lat: coords.lat, lng: coords.lng } : null;
      })
      .filter(Boolean);
  }, [properties]);

  const initialCenter = useMemo(() => {
    if (validProperties.length > 0) {
      return [validProperties[0].lat, validProperties[0].lng];
    }
    return center;
  }, [validProperties, center]);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.12)] shadow-md bg-[#FAF7F1] dark:bg-[#211A16] ${className}`}
      style={{ height }}
    >
      {validProperties.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-[#FAF7F1]/95 dark:bg-[#211A16]/95 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#38251F] dark:text-[#FAF7F1] mb-1">
            No Geocoded Properties Available
          </h4>
          <p className="text-xs text-[#78685D] dark:text-[#C5B5A5] max-w-sm">
            None of the current search results include saved GPS coordinates. You can view all property details directly in the list view.
          </p>
        </div>
      ) : null}

      <MapContainer
        center={initialCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsHandler markers={validProperties} />
        <LocateControl />

        {validProperties.map(property => {
          const isSelected = selectedPropertyId === property._id;
          const imageSrc = getMediaUrl(
            property.coverPhoto ||
            (property.images && property.images[0]?.url) ||
            (property.media && property.media[0]?.url)
          );

          const formattedAddress = property.address
            ? [property.address.street, property.address.area, property.address.city]
                .filter(Boolean)
                .join(', ')
            : 'Address on request';

          return (
            <Marker
              key={property._id}
              position={[property.lat, property.lng]}
              icon={createCustomMarkerIcon(isSelected)}
              eventHandlers={{
                click: () => {
                  if (onSelectProperty) onSelectProperty(property);
                }
              }}
            >
              <Popup className="leasify-popup" minWidth={240} maxWidth={280}>
                <div className="p-1 text-[#38251F]">
                  {/* Property Preview Image */}
                  <div className="relative w-full h-32 rounded-xl overflow-hidden mb-2.5 bg-slate-100 shadow-inner">
                    <img
                      src={imageSrc}
                      alt={property.name}
                      onError={(e) => { e.target.src = DEFAULT_PROPERTY_IMAGE; }}
                      className="w-full h-full object-cover"
                    />
                    {property.status && (
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                        property.status === 'Occupied'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {property.status}
                      </span>
                    )}
                    {property.type && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF7F1]/90 text-[#38251F] uppercase tracking-wider backdrop-blur-xs shadow-sm">
                        {property.type}
                      </span>
                    )}
                  </div>

                  {/* Property Details */}
                  <h4 className="font-bold text-sm text-[#1F110E] leading-snug line-clamp-1 mb-1">
                    {property.name}
                  </h4>

                  <p className="text-[11px] text-[#635147] flex items-center gap-1 mb-2 line-clamp-1">
                    <MapPin className="w-3 h-3 text-[#B97843] shrink-0" />
                    <span>{formattedAddress}</span>
                  </p>

                  {/* Rent & Specs */}
                  <div className="flex items-center justify-between py-1.5 border-t border-b border-[#E6DACC] mb-2.5 text-xs">
                    <span className="font-extrabold text-[#4A1917] text-sm">
                      ₹{Number(property.monthlyRent || 0).toLocaleString('en-IN')}
                      <span className="text-[10px] font-normal text-[#78685D]">/mo</span>
                    </span>

                    <div className="flex items-center gap-2 text-[11px] text-[#635147]">
                      {property.bedrooms ? (
                        <span className="flex items-center gap-0.5">
                          <Bed className="w-3 h-3" /> {property.bedrooms}B
                        </span>
                      ) : null}
                      {property.areaSqFt ? (
                        <span className="flex items-center gap-0.5">
                          <Layers className="w-3 h-3" /> {property.areaSqFt} sqft
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* View Details CTA */}
                  <Link
                    to={`/properties/${property._id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#4A1917] hover:bg-[#682723] text-white text-xs font-bold transition-all shadow-sm cursor-pointer no-underline"
                  >
                    <span>View Property</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default PropertyMap;
