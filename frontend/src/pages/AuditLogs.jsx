import React, { useEffect, useState } from 'react';
import apiClient from '../services/api';
import { Shield, Clock, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/audit-logs');
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      toast.error('Failed to load audit history logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.description.toLowerCase().includes(search.toLowerCase()) ||
    (log.ipAddress && log.ipAddress.includes(search))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-espresso dark:text-cream-50 Outfit">System Audit Trail</h1>
          <p className="text-xs text-cream-600 dark:text-cream-400">Track and review account logins, property edits, and lease modifications.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2.5 bg-cream-100 dark:bg-espresso-900 border border-cream-300 dark:border-espresso-800 hover:bg-cream-200 rounded-xl text-espresso dark:text-cream-200 transition-colors"
          title="Reload logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="glass-panel p-4 rounded-2xl border border-cream-300 dark:border-espresso-800 max-w-md">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, keyword, client IP..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl glass-input placeholder-cream-500"
          />
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-cream-500" />
        </div>
      </div>

      {/* LOGS TABLE LIST */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 bg-cream-200/50 dark:bg-espresso-900/40 rounded-2xl border border-cream-300 dark:border-espresso-800"></div>
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-panel py-16 text-center text-cream-500 rounded-3xl border border-cream-300 dark:border-espresso-800">
          <Shield className="w-12 h-12 mx-auto mb-2 text-cream-400" />
          <p className="text-sm font-semibold text-espresso dark:text-cream-100">No audit logs available matching search.</p>
        </div>
      ) : (
        <div className="glass-panel border border-cream-300 dark:border-espresso-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-cream-200 dark:border-espresso-800 bg-cream-100/60 dark:bg-espresso-900/50 text-cream-600 dark:text-cream-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Log Detail</th>
                  <th className="p-4">Client IP</th>
                  <th className="p-4">Browser / Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 dark:divide-espresso-900">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-cream-100/40 dark:hover:bg-espresso-900/20 transition-colors">
                    <td className="p-4 font-mono font-medium text-cream-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-espresso dark:text-cream-100">
                      {log.user?.name || 'Self / System'}
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-cream-100 font-extrabold uppercase text-[9px] border border-brand-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-cream-700 dark:text-cream-300 font-medium">
                      {log.description}
                    </td>
                    <td className="p-4 font-mono text-[10px] text-cream-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="p-4 font-medium text-cream-500 truncate max-w-xs" title={log.userAgent}>
                      {log.userAgent || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
