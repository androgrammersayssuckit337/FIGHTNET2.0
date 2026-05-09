import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { Logo } from './components/Logo';
import { FeedPage } from './components/pages/FeedPage';
import { LandingPage } from './components/pages/LandingPage';
import { MessagesPage } from './components/pages/MessagesPage';
import { SponsorsPage } from './components/pages/SponsorsPage';
import { GymLocatorPage } from './components/pages/GymLocatorPage';
import { StorePage } from './components/pages/StorePage';
import { CareerPage } from './components/pages/CareerPage';
import { SchedulesPage } from './components/pages/SchedulesPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { APIProvider } from '@vis.gl/react-google-maps';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppLayout() {
  const { logout, userProfile } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Main Feed', path: '/app' },
    { label: 'Messenger', path: '/app/messages' },
    { label: 'Gym Locator', path: '/app/gyms' },
    { label: 'Schedules', path: '/app/schedules' },
    { label: 'FightNet Shop', path: '/app/store' },
    { label: 'Network Settings', path: '/app/settings' },
  ];
  
  const fighterTools = [
    { label: 'Career Path', path: '/app/career' },
    { label: 'Agent Portal', path: '/app/sponsors' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 flex flex-col border-b md:border-b-0 md:border-r border-[#222] bg-[#0a0a0a] z-40 order-2 md:order-1 shrink-0 pb-safe md:pb-0">
        <div className="hidden md:block p-6 border-b border-[#222]">
          <Logo size="lg" className="mb-2" />
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-600 font-bold font-display italic">The Combat Network</p>
        </div>
        
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto hidden md:block">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-6 py-2 transition-colors ${
                  isActive 
                    ? 'bg-zinc-900 border-l-4 border-[#E31837] text-white' 
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white border-l-4 border-transparent'
                }`}
              >
                <span className={`text-sm font-semibold ${!isActive && 'italic'}`}>{item.label}</span>
              </Link>
            );
          })}
          
          <div className="pt-4 pb-2 px-6 text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Fighter Tools</div>
          {fighterTools.map((item) => {
             const isActive = location.pathname === item.path;
             return (
               <Link
                 key={item.path}
                 to={item.path}
                 className={`flex items-center px-6 py-2 transition-colors ${
                   isActive 
                     ? 'bg-zinc-900 border-l-4 border-[#E31837] text-white' 
                     : 'text-zinc-400 hover:bg-zinc-900 hover:text-white border-l-4 border-transparent'
                 }`}
               >
                 <span className={`text-sm font-semibold ${!isActive && 'italic'}`}>{item.label}</span>
               </Link>
             );
          })}
        </nav>

        {/* Mobile Nav (simplified representation) */}
        <div className="md:hidden flex w-full justify-around items-center py-3 bg-zinc-900 border-t border-[#222]">
          {navItems.slice(0, 5).map((item) => (
             <Link key={item.path} to={item.path} className={`text-xs font-bold uppercase ${location.pathname === item.path ? 'text-[#E31837]' : 'text-zinc-500'}`}>
                {item.label.split(' ')[0]}
             </Link>
          ))}
        </div>

        <div className="hidden md:block">
          {userProfile?.role === 'fighter' && !userProfile.isPro && (
            <div className="p-4 bg-zinc-900 m-4 rounded border border-zinc-800">
              <p className="text-[11px] text-zinc-400 mb-2 uppercase tracking-wide">Pro Access</p>
              <p className="text-lg font-bold leading-none mb-1">$9.99/mo</p>
              <p className="text-[10px] text-zinc-500 mb-3">Unlock Agents & Scouting</p>
              <Link to="/app/settings" className="block w-full py-2 bg-[#E31837] text-white text-[11px] font-black underline-none text-center uppercase tracking-tighter rounded hover:bg-red-700 transition">Go Pro Now</Link>
            </div>
          )}
          
          <Link to="/app/career" className="p-4 border-t border-[#222] flex items-center justify-between hover:bg-zinc-900 transition-colors cursor-pointer group">
             <div className="flex items-center space-x-3">
               <img src={userProfile?.profileImageUrl || `https://ui-avatars.com/api/?name=${userProfile?.displayName}&background=0c0c0c&color=fff`} className="w-8 h-8 rounded-full border border-zinc-700 object-cover" alt="Avatar"/>
               <div className="overflow-hidden">
                 <p className="font-bold text-xs truncate max-w-[100px] group-hover:text-[#E31837] transition-colors">{userProfile?.displayName}</p>
                 <p className="text-[10px] text-zinc-500 uppercase">{userProfile?.role}</p>
               </div>
             </div>
             <button onClick={(e) => { e.preventDefault(); logout(); }} className="text-zinc-500 hover:text-white"><LogOut className="w-4 h-4"/></button>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col order-1 md:order-2 overflow-hidden">
        <header className="h-16 border-b border-[#222] flex items-center justify-between px-4 md:px-8 shrink-0 bg-[#0a0a0a]">
          <div className="flex items-center space-x-6">
            <div className="md:hidden">
              <Logo size="md" />
            </div>
            <div className="hidden md:block text-zinc-600 text-[10px] font-display uppercase tracking-[0.2em]">
              <span className="text-[#E31837] animate-pulse">●</span> Live Stream: <span className="text-white italic">amateur_circuit_04</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {!userProfile?.profileImageUrl && (
              <Link to="/app/career" className="hidden md:flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-[#E31837]/30 text-[#E31837] text-[9px] font-black uppercase rounded animate-pulse">
                Complete Profile
              </Link>
            )}
             <button onClick={logout} className="md:hidden text-zinc-500 hover:text-white"><LogOut className="w-5 h-5"/></button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/sponsors" element={<SponsorsPage />} />
            <Route path="/gyms" element={<GymLocatorPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/career" element={<CareerPage />} />
            <Route path="/profile/:userId" element={<CareerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/app" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-pulse flex flex-col items-center">
            <Logo size="lg" />
            <div className="h-0.5 w-48 bg-zinc-800 mt-6 rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 bg-[#E31837] w-1/3 animate-[slide_1.5s_ease-in-out_infinite] shadow-[0_0_15px_#E31837]"></div>
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.4em] text-zinc-600 font-display italic">Initializing Network</p>
            <style>{`@keyframes slide { 0% { left: -100%; } 100% { left: 200%; } }`}</style>
        </div>
      </div>
    );
  }

  const googleMapsKey = 
    process.env.GOOGLE_MAPS_PLATFORM_KEY || 
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || 
    '';

  return (
    <APIProvider apiKey={googleMapsKey} version="weekly">
      <Routes>
        <Route path="/" element={!currentUser ? <LandingPage /> : <Navigate to="/app" />} />
        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </APIProvider>
  );
}
