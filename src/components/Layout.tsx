import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, LayoutDashboard, FilePlus, CheckSquare, BarChart3, User as UserIcon, Clock, Menu, X as CloseIcon, Moon, Sun, Monitor, Smartphone, ShieldCheck, Home } from 'lucide-react';
import NotificationBell from './NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { profile, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('isDarkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [viewMode, setViewMode] = useState<'auto' | 'desktop'>(() => {
    const saved = localStorage.getItem('viewMode');
    return (saved as 'auto' | 'desktop') || 'auto';
  });

  useEffect(() => {
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  const isSupervisor = profile?.role === 'marketing_supervisor';
  const isMember = profile?.role === 'marketing_member';

  let navItems = [];
  if (isSupervisor) {
    navItems = [
      { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
      { id: 'review', label: 'Review Panel', icon: FilePlus },
      { id: 'analytics', label: 'Team Stats', icon: BarChart3 },
      { id: 'admin', label: 'Admin Center', icon: ShieldCheck },
    ];
  } else if (isMember) {
    navItems = [
      { id: 'member-home', label: 'Home', icon: LayoutDashboard },
      { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare },
    ];
  } else {
    navItems = [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'submit', label: 'Submit Request', icon: FilePlus },
      { id: 'my-requests', label: 'My Requests', icon: LayoutDashboard },
      { id: 'tat-info', label: 'TAT Info', icon: Clock },
    ];
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const isDesktopView = viewMode === 'desktop';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0A0A0A] text-white' : 'bg-[#F5F5F4] text-black'} flex ${isDesktopView ? 'flex-row' : 'flex-col lg:flex-row'}`}>
      {/* Mobile Header */}
      {!isDesktopView && (
        <header className="lg:hidden h-16 bg-[#141414] dark:bg-black text-white flex items-center justify-between px-4 sticky top-0 z-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center overflow-hidden">
              <img 
                src="https://lh3.googleusercontent.com/d/1bckK9Z9QwspyR4R9ePf0pNUPUuZVdLwO" 
                alt="STLAF" 
                className="w-full h-full object-contain p-1"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-bold text-sm">Marketing Portal</span>
          </div>
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <button onClick={toggleMobileMenu} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              {isMobileMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>
      )}

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && !isDesktopView && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${isDesktopView ? 'relative translate-x-0 w-64' : 'fixed lg:relative lg:translate-x-0 w-64'}
        inset-y-0 left-0 bg-[#141414] dark:bg-black text-white flex flex-col z-50 transform transition-transform duration-300 ease-in-out
        ${!isDesktopView && (isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full')}
      `}>
        <div className={`p-6 border-b border-white/10 ${isDesktopView ? 'flex' : 'hidden lg:flex'} items-center space-x-3`}>
          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src="https://lh3.googleusercontent.com/d/1bckK9Z9QwspyR4R9ePf0pNUPUuZVdLwO" 
              alt="STLAF" 
              className="w-full h-full object-contain p-1"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-amber-500 font-bold text-xl">LAF</span>';
              }}
            />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-tight">Marketing Portal</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">{profile?.department}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-4 px-4 py-4 rounded-xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-white/10 text-white shadow-lg shadow-black/20' 
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.displayName}</p>
              <p className="text-xs text-white/40 truncate">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto w-full ${isDesktopView ? 'min-w-[1024px]' : ''}`}>
        <header className={`${isDesktopView ? 'flex' : 'hidden lg:flex'} h-16 ${isDarkMode ? 'bg-black border-white/5' : 'bg-white border-black/5'} border-b items-center justify-between px-8 sticky top-0 z-30`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-[#141414]'}`}>
            {navItems.find(i => i.id === activeTab)?.label || 'Portal'}
          </h2>
          <NotificationBell />
        </header>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-[60]">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-amber-400 text-black' : 'bg-[#141414] text-white'}`}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>

        {/* View Mode Toggle */}
        <button
          onClick={() => setViewMode(viewMode === 'auto' ? 'desktop' : 'auto')}
          className={`p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 ${isDesktopView ? 'bg-blue-500 text-white' : 'bg-white text-black border border-black/5'}`}
          title={isDesktopView ? "Switch to Mobile View" : "Switch to Desktop View"}
        >
          {isDesktopView ? <Smartphone size={24} /> : <Monitor size={24} />}
        </button>
      </div>
    </div>
  );
}
