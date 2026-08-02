import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Building,
  Users,
  FileText,
  CreditCard,
  Wrench,
  BarChart3,
  History,
  Calendar,
  LogOut,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  Search,
  Check,
  Trash2
} from 'lucide-react';
import apiClient from '../services/api';
import toast from 'react-hot-toast';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const { data } = await apiClient.get('/notifications');
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll notifications every 45s for simulated real-time updates
      const interval = setInterval(fetchNotifications, 45000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      const { data } = await apiClient.put('/notifications/read-all');
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        toast.success('All notifications marked as read');
      }
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const handleDeleteNoti = async (id, e) => {
    e.stopPropagation();
    try {
      const { data } = await apiClient.delete(`/notifications/${id}`);
      if (data.success) {
        setNotifications(prev => prev.filter(n => n._id !== id));
        toast.success('Notification cleared');
      }
    } catch (err) {
      toast.error('Failed to delete notification');
    }
  };

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Redirect to search results page or transfer query param
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const sidebarLinks = user?.role === 'owner' ? [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Properties', path: '/properties', icon: Building },
    { name: 'Tenants', path: '/tenants', icon: Users },
    { name: 'Invoices & Bills', path: '/bills', icon: FileText },
    { name: 'Payments Ledger', path: '/payments', icon: CreditCard },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Reports Center', path: '/reports', icon: BarChart3 },
    { name: 'Calendar Schedule', path: '/calendar', icon: Calendar },
    { name: 'Audit History', path: '/audit-logs', icon: History }
  ] : [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'My Rental Info', path: '/properties/my', icon: Building },
    { name: 'Bills & Payments', path: '/bills', icon: CreditCard },
    { name: 'Raise Complaint', path: '/maintenance', icon: Wrench },
    { name: 'Calendar View', path: '/calendar', icon: Calendar }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Background Ambient Glows */}
      <div className="bg-glow-purple top-10 left-10"></div>
      <div className="bg-glow-indigo bottom-20 right-20"></div>

      {/* MOBILE SIDEBAR WRAPPER */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : ''} glass-panel border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between`}>
        <div>
          {/* Logo Brand */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 dark:border-slate-800/50">
            <Link to="/" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/30">
                L
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-800 dark:text-white Outfit">
                Leasify
              </span>
            </Link>
            <button className="lg:hidden p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User profile capsule */}
          <div className="mx-4 my-4 p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/30 flex items-center gap-3">
            <Link to="/profile">
              <img
                src={user?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt="Profile"
                className="w-10 h-10 rounded-full border border-brand-500 object-cover"
              />
            </Link>
            <div className="overflow-hidden">
              <Link to="/profile" className="block font-semibold text-sm text-slate-800 dark:text-slate-200 hover:underline truncate">
                {user?.name || 'Guest User'}
              </Link>
              <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-brand-500/10 text-brand-500">
                {user?.role}
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="px-4 py-2 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)]">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-100'}`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 space-y-2">
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/50"
          >
            <span className="flex items-center gap-3">
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
            <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
              ALT+T
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* CONTENT AREA WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* HEADER */}
        <header className="sticky top-0 z-30 h-16 glass-panel border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1">
            <button className="lg:hidden p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar */}
            <form onSubmit={handleGlobalSearch} className="relative max-w-md w-full hidden md:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Global search across properties, tenants, bills..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl glass-input focus:ring-1 focus:ring-brand-500"
              />
              <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
            </form>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Center Trigger */}
            <div className="relative">
              <button
                onClick={() => setNotiOpen(!notiOpen)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl relative transition-all"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 text-[9px] font-bold text-white bg-brand-500 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer Dropdown */}
              {notiOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotiOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 z-50 glass-panel border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Notifications</h4>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-xs text-brand-500 hover:underline flex items-center gap-1 font-semibold">
                          <Check className="w-3.5 h-3.5" /> Read All
                        </button>
                      )}
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((noti) => (
                          <div
                            key={noti._id}
                            className={`p-2.5 rounded-xl border transition-all text-left flex gap-2 justify-between items-start ${noti.read ? 'bg-slate-50/50 dark:bg-slate-900/10 border-slate-200/50 dark:border-slate-800/50' : 'bg-brand-50/30 dark:bg-brand-950/10 border-brand-500/20'}`}
                          >
                            <div>
                              <p className={`text-xs font-semibold ${noti.read ? 'text-slate-700 dark:text-slate-300' : 'text-brand-700 dark:text-brand-300'}`}>
                                {noti.title}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                                {noti.message}
                              </p>
                              <span className="text-[9px] text-slate-400 mt-1 block">
                                {new Date(noti.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <button
                              onClick={(e) => handleDeleteNoti(noti._id, e)}
                              className="text-slate-400 hover:text-red-500 p-0.5 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Mini Avatar & Logout */}
            <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4">
              <Link to="/profile" className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline">
                  {user?.name}
                </span>
                <img
                  src={user?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50'}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 object-cover"
                />
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                title="Sign Out"
                id="header-logout-btn"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* PAGE BODY */}
        <main className="flex-1 overflow-y-auto px-6 py-6 relative">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
