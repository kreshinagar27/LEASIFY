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
  Trash2,
  Sparkles,
  ExternalLink
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
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const sidebarLinks = user?.role === 'owner' ? [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Properties', path: '/properties', icon: Building },
    { name: 'Apartments', path: '/apartments', icon: Building },
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
    <div className="min-h-screen flex w-full bg-[#F5EEE3] dark:bg-[#1B100E] m-0 p-0 text-[#39251F] dark:text-[#F6EEE3] transition-colors duration-300 font-sans selection:bg-[#4A1917] selection:text-[#FAF7F1] relative overflow-x-hidden">
      {/* Background Ambient Warm Glows for Frosted Glass Depth */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(213,187,151,0.45)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(117,64,57,0.22)_0%,transparent_70%)] pointer-events-none blur-3xl -z-10" />
      <div className="fixed bottom-10 right-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(161,117,91,0.30)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(140,85,60,0.18)_0%,transparent_70%)] pointer-events-none blur-3xl -z-10" />

      {/* MOBILE SIDEBAR WRAPPER */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#1F130E]/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 w-64 h-screen shrink-0 transition-transform -translate-x-full lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : ''
          } bg-[rgba(245,239,229,0.78)] dark:bg-[rgba(33,26,22,0.85)] backdrop-blur-2xl border-r border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.12)] flex flex-col justify-between shadow-[0_10px_30px_rgba(63,43,31,0.06)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.25)]`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Logo Brand */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.12)] shrink-0">
            <Link to="/" className="flex items-center gap-2 group" onClick={() => setSidebarOpen(false)}>
              <img
                src="/logo-dark.png"
                alt="Leasify"
                className="h-8 w-auto object-contain brightness-0 dark:brightness-100 transition-all group-hover:scale-105"
              />
            </Link>
            <button
              className="lg:hidden p-1.5 text-[#77665A] hover:text-[#39251F] dark:hover:text-[#F6EEE3] rounded-lg hover:bg-[#E6DACC] dark:hover:bg-[#352920]"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User profile capsule */}
          <div className="mx-4 my-3 p-3 rounded-2xl bg-[rgba(251,247,240,0.7)] dark:bg-[rgba(43,33,27,0.7)] backdrop-blur-md border border-[#D9CABB]/70 dark:border-[rgba(230,211,191,0.12)] flex items-center gap-3 shrink-0 group transition-all shadow-xs">
            <Link to="/profile" className="relative shrink-0">
              <img
                src={user?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-[#4A1917] dark:border-[#D1C1B0] object-cover shadow-sm group-hover:scale-105 transition-transform"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-600 border-2 border-[#FAF7F1] dark:border-[#271915] rounded-full" />
            </Link>
            <div className="overflow-hidden min-w-0">
              <Link
                to="/profile"
                className="block font-bold text-xs text-[#39251F] dark:text-[#F6EEE3] hover:text-[#4A1917] dark:hover:text-[#D1C1B0] truncate transition-colors"
              >
                {user?.name || 'User'}
              </Link>
              <span className="inline-block text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-[#E6DACC] dark:bg-[#352920] text-[#4A1917] dark:text-[#F6EEE3] border border-[#D9CABB] dark:border-[rgba(230,211,191,0.15)] mt-0.5">
                {user?.role}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-2 space-y-1.5 overflow-y-auto flex-1">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${isActive
                      ? 'bg-[#4B1715] dark:bg-[#5C211D] text-[#F7EFE5] shadow-[0_6px_18px_rgba(75,23,21,0.3)] scale-[1.01]'
                      : 'text-[#837166] dark:text-[#C1AD9D] hover:bg-[#EFE5D5]/70 dark:hover:bg-[#30201C]/80 hover:text-[#35231F] dark:hover:text-[#F7EFE5]'
                    }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#F7EFE5]' : 'text-[#837166] dark:text-[#9A8474]'}`} />
                  <span className="truncate">{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions: Landing link, theme switch, logout */}
        <div className="p-3 border-t border-[#D9CABB]/50 dark:border-[rgba(230,211,191,0.1)] space-y-1 shrink-0 mt-auto bg-[rgba(230,218,204,0.4)] dark:bg-[rgba(33,26,22,0.6)]">
          {/* Public Landing Link */}
          <Link
            to="/landing"
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold text-[#77665A] dark:text-[#D1C1B0] hover:bg-[#E6DACC] dark:hover:bg-[#352920] hover:text-[#39251F] dark:hover:text-[#F6EEE3] transition-all"
          >
            <span className="flex items-center gap-2.5">
              <ExternalLink className="w-4 h-4" />
              Public Website
            </span>
          </Link>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            id="sidebar-dark-mode-btn"
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold text-[#77665A] dark:text-[#D1C1B0] hover:bg-[#E6DACC] dark:hover:bg-[#352920] hover:text-[#39251F] dark:hover:text-[#F6EEE3] transition-all cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Dark Mode"
          >
            <span className="flex items-center gap-2.5">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#4A1917]" />}
              {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            id="sidebar-logout-btn"
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold text-[#8B2622] dark:text-[#E07A76] hover:bg-[#FCEBEA] dark:hover:bg-[#3A1816] transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* CONTENT AREA WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <header className="sticky top-0 z-30 h-16 bg-[rgba(251,247,240,0.85)] dark:bg-[rgba(33,23,20,0.88)] backdrop-blur-2xl border-b border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.12)] flex items-center justify-between px-6 shadow-xs transition-colors">
          <div className="flex items-center gap-4 flex-1">
            <button
              className="lg:hidden p-1.5 text-[#77665A] hover:bg-[#E6DACC] dark:hover:bg-[#352920] rounded-xl"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

          {/* Global Search Bar */}
          <form onSubmit={handleGlobalSearch} className="relative max-w-md w-full hidden md:block">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search properties, tenants, leases, invoices..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-full glass-input font-medium"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78685D]" />
          </form>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Center Trigger */}
        <div className="relative">
          <button
            onClick={() => setNotiOpen(!notiOpen)}
            className="p-2 text-[#78685D] hover:text-[#38251F] dark:hover:text-[#FAF7F1] hover:bg-[#E9DFD0] dark:hover:bg-[#2F1F1B] rounded-full relative transition-all cursor-pointer"
            title="Notifications"
            aria-label="Open notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 text-[9px] font-black text-[#FAF7F1] bg-[#4A1715] rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Drawer Dropdown */}
          {notiOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotiOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 z-50 glass-panel border border-[#D9CABB] dark:border-[rgba(230,211,191,0.15)] rounded-3xl p-5 shadow-2xl">
                <div className="flex justify-between items-center pb-3 border-b border-[#D9CABB]/50 dark:border-[rgba(230,211,191,0.1)] mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-xs text-[#39251F] dark:text-[#F6EEE3] Outfit">Activity Notifications</h4>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-[#4A1917]/10 dark:bg-[#754039]/25 text-[#4A1917] dark:text-[#D1C1B0] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-[#4A1917] dark:text-[#D1C1B0] hover:underline flex items-center gap-1 font-bold"
                    >
                      <Check className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#77665A] dark:text-[#AA9886]">
                      <Bell className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                      No notifications at this moment.
                    </div>
                  ) : (
                    notifications.map((noti) => (
                      <div
                        key={noti._id}
                        className={`p-3 rounded-2xl border transition-all text-left flex gap-2 justify-between items-start ${noti.read
                            ? 'bg-[rgba(230,218,204,0.4)] dark:bg-[rgba(43,33,27,0.4)] border-[#D9CABB]/50 dark:border-[rgba(230,211,191,0.08)]'
                            : 'bg-[rgba(251,247,240,0.85)] dark:bg-[rgba(53,41,32,0.8)] border-[#D9CABB] dark:border-[rgba(230,211,191,0.15)] shadow-xs'
                          }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className={`text-xs font-bold leading-snug ${noti.read ? 'text-[#39251F] dark:text-[#F6EEE3]' : 'text-[#4A1917] dark:text-[#FFF8F0]'}`}>
                            {noti.title}
                          </p>
                          <p className="text-[11px] text-[#77665A] dark:text-[#D1C1B0] mt-0.5 leading-relaxed">
                            {noti.message}
                          </p>
                          <span className="text-[9px] text-[#968577] dark:text-[#AA9886] mt-1 block font-medium">
                            {new Date(noti.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteNoti(noti._id, e)}
                          className="text-[#77665A] hover:text-[#8B2622] p-1 rounded transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Capsule in Navbar */}
        <div className="flex items-center gap-3 border-l border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.15)] pl-4">
          <Link to="/profile" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity group">
            <div className="relative">
              <img
                src={user?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50'}
                alt="Avatar"
                className="w-8 h-8 rounded-full border border-[#D9CABB] dark:border-[#5B3F2F] object-cover group-hover:ring-2 group-hover:ring-[#4A1917] transition-all"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-600 border-2 border-[#FAF7F1] dark:border-[#201512] rounded-full" />
            </div>
            <div className="hidden sm:block text-left">
              <span className="block text-xs font-bold text-[#39251F] dark:text-[#F6EEE3] group-hover:text-[#4A1917] transition-colors">
                {user?.name}
              </span>
              <span className="block text-[10px] text-[#77665A] dark:text-[#AA9886] capitalize">
                {user?.role}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </header>

        {/* PAGE BODY */}
        <main className="flex-1 px-4 sm:px-8 py-6 relative">
          {children}
        </main>
      </div>
    </div >
  );
};

export default Layout;
