import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Building,
  Users,
  FileText,
  Wrench,
  Search as SearchIcon,
  Eye,
  Map as MapIcon,
  List as ListIcon,
  Columns as SplitIcon,
  MapPin,
  Bed,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import PropertyMap, { getPropertyCoordinates } from '../components/PropertyMap';
import { getMediaUrl, DEFAULT_PROPERTY_IMAGE } from '../utils/mediaHelper';

const Search = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({ properties: [], tenants: [], bills: [], complaints: [] });
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'map' | 'list'
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  const executeGlobalSearch = async () => {
    setLoading(true);
    try {
      // Fetch datasets
      const [propRes, billRes, maintRes] = await Promise.all([
        apiClient.get('/properties').catch(() => ({ data: { success: false, data: [] } })),
        apiClient.get('/bills').catch(() => ({ data: { success: false, data: [] } })),
        apiClient.get('/maintenance').catch(() => ({ data: { success: false, data: [] } }))
      ]);

      const allProperties = propRes.data.success ? propRes.data.data : [];

      if (!query.trim()) {
        // Empty query: load all properties to explore on interactive map & list
        setResults({
          properties: allProperties,
          tenants: [],
          bills: [],
          complaints: []
        });
        if (allProperties.length > 0) {
          setSelectedPropertyId(allProperties[0]._id);
        }
        setLoading(false);
        return;
      }

      const filterRegex = new RegExp(query, 'i');

      const matchingProperties = allProperties.filter(p =>
        filterRegex.test(p.name || '') ||
        filterRegex.test(p.type || '') ||
        filterRegex.test(p.category || '') ||
        filterRegex.test(p.address?.city || '') ||
        filterRegex.test(p.address?.area || '') ||
        filterRegex.test(p.address?.street || '') ||
        (Array.isArray(p.amenities) && p.amenities.some(a => filterRegex.test(a)))
      );

      const matchingBills = billRes.data?.success
        ? billRes.data.data.filter(b =>
            filterRegex.test(b.invoiceNumber || '') ||
            (b.tenant && filterRegex.test(b.tenant.name || '')) ||
            (b.property && filterRegex.test(b.property.name || ''))
          )
        : [];

      const matchingComplaints = maintRes.data?.success
        ? maintRes.data.data.filter(c =>
            filterRegex.test(c.complaintId || '') ||
            filterRegex.test(c.category || '') ||
            filterRegex.test(c.description || '') ||
            (c.tenant && filterRegex.test(c.tenant.name || ''))
          )
        : [];

      let matchingTenants = [];
      if (user?.role === 'owner') {
        try {
          const tenantRes = await apiClient.get('/tenants');
          if (tenantRes.data?.success) {
            matchingTenants = tenantRes.data.data.filter(t =>
              filterRegex.test(t.name || '') ||
              filterRegex.test(t.email || '') ||
              filterRegex.test(t.phone || '') ||
              (t.occupation && filterRegex.test(t.occupation))
            );
          }
        } catch (e) {
          // ignore tenant fetch errors for non-owners
        }
      }

      setResults({
        properties: matchingProperties,
        tenants: matchingTenants,
        bills: matchingBills,
        complaints: matchingComplaints
      });

      if (matchingProperties.length > 0) {
        setSelectedPropertyId(matchingProperties[0]._id);
      }
    } catch (err) {
      toast.error('Search query execution encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeGlobalSearch();
  }, [query]);

  const totalResultsCount =
    results.properties.length +
    results.tenants.length +
    results.bills.length +
    results.complaints.length;

  const mappedPropertiesCount = results.properties.filter(p => Boolean(getPropertyCoordinates(p))).length;

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 w-56 bg-[#D9CABB]/40 dark:bg-espresso-800 rounded-xl"></div>
        <div className="h-[480px] bg-[#D9CABB]/30 dark:bg-espresso-900/40 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Search Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-espresso dark:text-cream-50 Outfit flex items-center gap-2">
            <SearchIcon className="w-6 h-6 text-brand-500" />
            {query ? 'Global Search Results' : 'Explore Properties & Unified Search'}
          </h1>
          <p className="text-xs text-cream-600 dark:text-cream-400 mt-0.5">
            {query ? (
              <>Showing {totalResultsCount} results for "{query}"</>
            ) : (
              <>Browsing {results.properties.length} available properties across the portfolio</>
            )}
            {results.properties.length > 0 && (
              <span className="ml-2 font-semibold text-brand-600 dark:text-brand-400">
                ({mappedPropertiesCount} with GPS map pins)
              </span>
            )}
          </p>
        </div>

        {/* View Mode Toggle for Properties: Split | Map | List */}
        {results.properties.length > 0 && (
          <div className="inline-flex items-center p-1 rounded-2xl bg-[#E6DACC]/70 dark:bg-espresso-900/60 border border-[#D9CABB]/60 dark:border-espresso-700/60 text-xs shadow-sm self-start sm:self-auto">
            <button
              type="button"
              id="view-split-btn"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-espresso-700 text-espresso dark:text-cream-50 shadow-sm'
                  : 'text-cream-600 dark:text-cream-400 hover:text-espresso dark:hover:text-cream-100'
              }`}
              title="Split View: Map and List"
            >
              <SplitIcon className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              type="button"
              id="view-map-btn"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-espresso-700 text-espresso dark:text-cream-50 shadow-sm'
                  : 'text-cream-600 dark:text-cream-400 hover:text-espresso dark:hover:text-cream-100'
              }`}
              title="Full Map View"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
            <button
              type="button"
              id="view-list-btn"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-espresso-700 text-espresso dark:text-cream-50 shadow-sm'
                  : 'text-cream-600 dark:text-cream-400 hover:text-espresso dark:hover:text-cream-100'
              }`}
              title="Standard List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        )}
      </div>

      {totalResultsCount === 0 ? (
        <div className="glass-panel py-16 text-center text-cream-500 rounded-3xl border border-cream-300 dark:border-espresso-800">
          <SearchIcon className="w-12 h-12 mx-auto mb-2 text-cream-400" />
          <p className="text-sm font-semibold text-espresso dark:text-cream-100">
            No records found matching your keyword.
          </p>
          <p className="text-xs text-cream-500 dark:text-cream-400 mt-1">
            Try adjusting your search terms or browse all properties.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. PROPERTIES SECTION WITH INTERACTIVE MAP */}
          {results.properties.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-cream-600 dark:text-cream-400 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-brand-500" /> Properties ({results.properties.length})
                </h3>
                <span className="text-[11px] text-[#78685D] dark:text-[#C5B5A5]">
                  Click marker to view property card
                </span>
              </div>

              {/* VIEW MODE: FULL MAP */}
              {viewMode === 'map' && (
                <PropertyMap
                  properties={results.properties}
                  height="540px"
                  selectedPropertyId={selectedPropertyId}
                  onSelectProperty={(p) => setSelectedPropertyId(p._id)}
                />
              )}

              {/* VIEW MODE: SPLIT VIEW (MAP + LIST) */}
              {viewMode === 'split' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Left Column: Interactive Leaflet Map */}
                  <div className="lg:col-span-7">
                    <PropertyMap
                      properties={results.properties}
                      height="490px"
                      selectedPropertyId={selectedPropertyId}
                      onSelectProperty={(p) => setSelectedPropertyId(p._id)}
                    />
                  </div>

                  {/* Right Column: Scrollable Property Cards */}
                  <div className="lg:col-span-5 space-y-3 max-h-[490px] overflow-y-auto pr-1">
                    {results.properties.map(p => {
                      const isSelected = selectedPropertyId === p._id;
                      const hasCoords = Boolean(getPropertyCoordinates(p));
                      const imageSrc = getMediaUrl(p.coverPhoto || p.images?.[0]?.url);

                      return (
                        <div
                          key={p._id}
                          onClick={() => setSelectedPropertyId(p._id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 shadow-md ring-1 ring-brand-500/30'
                              : 'border-cream-300 dark:border-espresso-800 bg-cream-50/70 dark:bg-espresso-900/40 hover:bg-white/80 dark:hover:bg-espresso-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={imageSrc}
                              alt={p.name}
                              onError={(e) => { e.target.src = DEFAULT_PROPERTY_IMAGE; }}
                              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-cream-200 dark:border-espresso-700 bg-slate-100"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <h4 className="font-bold text-xs sm:text-sm text-espresso dark:text-cream-100 truncate">
                                  {p.name}
                                </h4>
                                {hasCoords ? (
                                  <span className="shrink-0 p-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" title="Has GPS Pin">
                                    <MapPin className="w-2.5 h-2.5" />
                                  </span>
                                ) : null}
                              </div>

                              <p className="text-[11px] text-cream-600 dark:text-cream-400 truncate">
                                {p.address?.street ? `${p.address.street}, ` : ''}{p.address?.city || 'India'}
                              </p>

                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-black text-[#4A1917] dark:text-amber-400">
                                  ₹{Number(p.monthlyRent || 0).toLocaleString('en-IN')}/mo
                                </span>
                                {p.bedrooms ? (
                                  <span className="text-[10px] text-[#78685D] dark:text-[#C5B5A5]">
                                    • {p.bedrooms} BHK
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <Link
                            to={`/properties/${p._id}`}
                            className="p-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-cream-100 rounded-xl transition-colors shrink-0"
                            title="View Property Details"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW MODE: STANDARD LIST ONLY */}
              {viewMode === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.properties.map(p => {
                    const imageSrc = getMediaUrl(p.coverPhoto || p.images?.[0]?.url);
                    const hasCoords = Boolean(getPropertyCoordinates(p));

                    return (
                      <div
                        key={p._id}
                        className="glass-card-hover p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex justify-between items-center text-xs bg-cream-50/70 dark:bg-espresso-900/40"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={imageSrc}
                            alt={p.name}
                            onError={(e) => { e.target.src = DEFAULT_PROPERTY_IMAGE; }}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-cream-200 dark:border-espresso-700 bg-slate-100"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-espresso dark:text-cream-100 truncate">{p.name}</h4>
                              {hasCoords && (
                                <span className="p-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" title="Has GPS Pin">
                                  <MapPin className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-cream-600 dark:text-cream-400 truncate">
                              {p.address?.houseNumber ? `${p.address.houseNumber}, ` : ''}
                              {p.address?.street ? `${p.address.street}, ` : ''}
                              {p.address?.city || ''}
                            </p>
                            <p className="text-[11px] font-black text-[#4A1917] dark:text-amber-400 mt-0.5">
                              ₹{Number(p.monthlyRent || 0).toLocaleString('en-IN')}/mo
                            </p>
                          </div>
                        </div>

                        <Link
                          to={`/properties/${p._id}`}
                          className="p-2.5 bg-brand-500/10 text-brand-600 dark:text-cream-100 rounded-xl hover:bg-brand-500/20 transition-colors shrink-0"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. TENANTS SECTION */}
          {results.tenants.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-cream-600 dark:text-cream-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand-500" /> Tenants ({results.tenants.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.tenants.map(t => (
                  <div
                    key={t._id}
                    className="glass-card-hover p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex justify-between items-center text-xs bg-cream-50/70 dark:bg-espresso-900/40"
                  >
                    <div>
                      <h4 className="font-bold text-espresso dark:text-cream-100">{t.name}</h4>
                      <p className="text-[10px] text-cream-600 dark:text-cream-400">Email: {t.email} | Phone: {t.phone}</p>
                    </div>
                    <Link
                      to={`/tenants/${t._id}`}
                      className="p-2 bg-brand-500/10 text-brand-600 dark:text-cream-100 rounded-xl hover:bg-brand-500/20 transition-colors"
                      title="View Tenant"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. INVOICES & BILLS SECTION */}
          {results.bills.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-cream-600 dark:text-cream-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-500" /> Bills & Invoices ({results.bills.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.bills.map(b => (
                  <div
                    key={b._id}
                    className="glass-card-hover p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex justify-between items-center text-xs bg-cream-50/70 dark:bg-espresso-900/40"
                  >
                    <div>
                      <h4 className="font-bold text-espresso dark:text-cream-100">{b.invoiceNumber}</h4>
                      <p className="text-[10px] text-cream-600 dark:text-cream-400">
                        Month: {b.month}/{b.year} | Amount: ₹{b.totalAmount?.toLocaleString()} | Status: {b.status}
                      </p>
                    </div>
                    <Link
                      to={`/bills`}
                      className="p-2 bg-brand-500/10 text-brand-600 dark:text-cream-100 rounded-xl hover:bg-brand-500/20 transition-colors"
                      title="View Bills"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. COMPLAINTS SECTION */}
          {results.complaints.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-cream-600 dark:text-cream-400 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-brand-500" /> Maintenance Tickets ({results.complaints.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.complaints.map(c => (
                  <div
                    key={c._id}
                    className="glass-card-hover p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex justify-between items-center text-xs bg-cream-50/70 dark:bg-espresso-900/40"
                  >
                    <div>
                      <h4 className="font-bold text-espresso dark:text-cream-100">
                        {c.complaintId} ({c.category})
                      </h4>
                      <p className="text-[10px] text-cream-600 dark:text-cream-400 truncate max-w-xs">{c.description}</p>
                    </div>
                    <Link
                      to={`/maintenance`}
                      className="p-2 bg-brand-500/10 text-brand-600 dark:text-cream-100 rounded-xl hover:bg-brand-500/20 transition-colors"
                      title="View Tickets"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
