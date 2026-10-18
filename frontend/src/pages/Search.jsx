import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Building, Users, FileText, Wrench, Search as SearchIcon, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const Search = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({ properties: [], tenants: [], bills: [], complaints: [] });

  const executeGlobalSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      // Fetch datasets
      const [propRes, billRes, maintRes] = await Promise.all([
        apiClient.get('/properties'),
        apiClient.get('/bills'),
        apiClient.get('/maintenance')
      ]);

      const filterRegex = new RegExp(query, 'i');

      const matchingProperties = propRes.data.success
        ? propRes.data.data.filter(p => 
            filterRegex.test(p.name) || 
            filterRegex.test(p.address.city) || 
            filterRegex.test(p.address.area) || 
            filterRegex.test(p.address.street)
          )
        : [];

      const matchingBills = billRes.data.success
        ? billRes.data.data.filter(b => 
            filterRegex.test(b.invoiceNumber) || 
            (b.tenant && filterRegex.test(b.tenant.name)) ||
            (b.property && filterRegex.test(b.property.name))
          )
        : [];

      const matchingComplaints = maintRes.data.success
        ? maintRes.data.data.filter(c => 
            filterRegex.test(c.complaintId) || 
            filterRegex.test(c.category) || 
            filterRegex.test(c.description) ||
            (c.tenant && filterRegex.test(c.tenant.name))
          )
        : [];

      let matchingTenants = [];
      if (user.role === 'owner') {
        const tenantRes = await apiClient.get('/tenants');
        if (tenantRes.data.success) {
          matchingTenants = tenantRes.data.data.filter(t => 
            filterRegex.test(t.name) || 
            filterRegex.test(t.email) || 
            filterRegex.test(t.phone) ||
            (t.occupation && filterRegex.test(t.occupation))
          );
        }
      }

      setResults({
        properties: matchingProperties,
        tenants: matchingTenants,
        bills: matchingBills,
        complaints: matchingComplaints
      });
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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-espresso dark:text-cream-50 Outfit flex items-center gap-2">
          <SearchIcon className="w-6 h-6 text-brand-500" /> Global Search
        </h1>
        <p className="text-xs text-cream-600 dark:text-cream-400">
          Showing {totalResultsCount} results for "{query}"
        </p>
      </div>

      {totalResultsCount === 0 ? (
        <div className="glass-panel py-16 text-center text-cream-500 rounded-3xl border border-cream-300 dark:border-espresso-800">
          <SearchIcon className="w-12 h-12 mx-auto mb-2 text-cream-400" />
          <p className="text-sm font-semibold text-espresso dark:text-cream-100">No records found matching your keyword.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* PROPERTIES */}
          {results.properties.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-cream-600 dark:text-cream-400 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-brand-500" /> Properties ({results.properties.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.properties.map(p => (
                  <div key={p._id} className="glass-card-hover p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex justify-between items-center text-xs bg-cream-50/70 dark:bg-espresso-900/40">
                    <div>
                      <h4 className="font-bold text-espresso dark:text-cream-100">{p.name}</h4>
                      <p className="text-[10px] text-cream-600 dark:text-cream-400">{p.address.houseNumber}, {p.address.street}, {p.address.city}</p>
                    </div>
                    <Link to={`/properties/${p._id}`} className="p-2 bg-brand-500/10 text-brand-600 dark:text-cream-100 rounded-xl hover:bg-brand-500/20 transition-colors">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TENANTS */}
          {results.tenants.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-cream-600 dark:text-cream-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand-500" /> Tenants ({results.tenants.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.tenants.map(t => (
                  <div key={t._id} className="glass-card-hover p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex justify-between items-center text-xs bg-cream-50/70 dark:bg-espresso-900/40">
                    <div>
                      <h4 className="font-bold text-espresso dark:text-cream-100">{t.name}</h4>
                      <p className="text-[10px] text-cream-600 dark:text-cream-400">Email: {t.email} | Phone: {t.phone}</p>
                    </div>
                    <Link to={`/tenants/${t._id}`} className="p-2 bg-brand-500/10 text-brand-600 dark:text-cream-100 rounded-xl hover:bg-brand-500/20 transition-colors">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INVOICES */}
          {results.bills.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-cream-600 dark:text-cream-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-500" /> Bills & Invoices ({results.bills.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.bills.map(b => (
                  <div key={b._id} className="glass-card-hover p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex justify-between items-center text-xs bg-cream-50/70 dark:bg-espresso-900/40">
                    <div>
                      <h4 className="font-bold text-espresso dark:text-cream-100">{b.invoiceNumber}</h4>
                      <p className="text-[10px] text-cream-600 dark:text-cream-400">Month: {b.month}/{b.year} | Amount: INR {b.totalAmount.toLocaleString()} | Status: {b.status}</p>
                    </div>
                    <Link to={`/bills`} className="p-2 bg-brand-500/10 text-brand-600 dark:text-cream-100 rounded-xl hover:bg-brand-500/20 transition-colors">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COMPLAINTS */}
          {results.complaints.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-cream-600 dark:text-cream-400 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-brand-500" /> Maintenance Tickets ({results.complaints.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.complaints.map(c => (
                  <div key={c._id} className="glass-card-hover p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 flex justify-between items-center text-xs bg-cream-50/70 dark:bg-espresso-900/40">
                    <div>
                      <h4 className="font-bold text-espresso dark:text-cream-100">{c.complaintId} ({c.category})</h4>
                      <p className="text-[10px] text-cream-600 dark:text-cream-400 truncate max-w-xs">{c.description}</p>
                    </div>
                    <Link to={`/maintenance`} className="p-2 bg-brand-500/10 text-brand-600 dark:text-cream-100 rounded-xl hover:bg-brand-500/20 transition-colors">
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
