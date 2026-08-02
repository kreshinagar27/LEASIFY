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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white Outfit">System Audit Trail</h1>
          <p className="text-xs text-slate-500">Track and review account logins, property edits, and lease modifications.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 bg-slate-100 dark:bg-slate-900 border hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400"
          title="Reload logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, keyword, client IP..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl glass-input"
          />
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* LOGS TABLE LIST */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-panel py-16 text-center text-slate-400 rounded-2xl">
          <Shield className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold">No audit logs available matching search.</p>
        </div>
      ) : (
        <div className="glass-panel border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Log Detail</th>
                  <th className="p-4">Client IP</th>
                  <th className="p-4">Browser / Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="p-4 font-mono font-medium text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                      {log.user?.name || 'Self / System'}
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-brand-500/10 text-brand-500 font-bold uppercase text-[9px] border border-brand-500/10">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                      {log.description}
                    </td>
                    <td className="p-4 font-mono text-[10px] text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="p-4 font-medium text-slate-400 truncate max-w-xs" title={log.userAgent}>
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
