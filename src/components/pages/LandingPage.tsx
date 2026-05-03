import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../Logo';
import { Shield, Users, Crown, Mail, Lock, User as UserIcon, ArrowRight, Chrome, Video, TrendingUp, Handshake } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AuthMode = 'landing' | 'login' | 'signup';
type UserRole = 'fighter' | 'fan' | 'sponsor';

export function LandingPage() {
  const { loginWithGoogle, registerWithEmail, loginWithEmail } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('landing');
  const [selectedRole, setSelectedRole] = useState<UserRole>('fan');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async (role: UserRole = 'fan') => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle(role);
    } catch (error: any) {
      if (error.message === 'LOGIN_CANCELLED') {
        setErrorMsg('Login cancelled. Please try again.');
      } else {
        setErrorMsg('Authentication failed. Please check your connection.');
        console.error(error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      if (authMode === 'signup') {
        if (!displayName.trim()) throw new Error('Display name is required');
        await registerWithEmail(email, password, displayName, selectedRole);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Authentication failed');
      console.error(error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const renderAuthForm = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md relative z-20"
    >
      <div className="bg-zinc-950 border border-white/10 p-8 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-6 flex items-center justify-between">
          {authMode === 'signup' ? 'Join FightNet' : 'Welcome Back'}
          <span className="text-[10px] text-[#E31837] font-black tracking-widest">{authMode === 'signup' ? selectedRole : ''}</span>
        </h2>
        
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {authMode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input 
                  type="text"
                  required
                  placeholder="The Prodigy"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all"
                />
              </div>
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input 
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input 
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-[#E31837] text-white py-3 rounded-xl font-black uppercase italic tracking-tighter hover:bg-red-700 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 shadow-lg shadow-red-900/20"
          >
            {isLoggingIn ? 'Processing...' : (authMode === 'signup' ? 'Create Account' : 'Sign In')}
            {!isLoggingIn && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
            <span className="bg-zinc-950 px-3 text-zinc-600">Or continue with</span>
          </div>
        </div>

        <button 
          onClick={() => handleGoogleLogin(selectedRole)}
          disabled={isLoggingIn}
          className="w-full bg-black border border-white/5 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <Chrome className="w-4 h-4" />
          Google Account
        </button>

        <div className="mt-8 text-center child-transition">
          <button 
            onClick={() => {
              setAuthMode(authMode === 'signup' ? 'login' : 'signup');
              setErrorMsg(null);
            }}
            className="text-[10px] uppercase font-black tracking-widest text-[#E31837] hover:text-red-400 transition-colors"
          >
            {authMode === 'signup' ? 'Already have an account? Sign In' : "Don't have an account? Join Now"}
          </button>
        </div>
      </div>
      
      <button 
        onClick={() => {
          setAuthMode('landing');
          setErrorMsg(null);
        }}
        className="mt-6 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors block mx-auto"
      >
        ← Back to roles
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden flex flex-col font-sans">
      <motion.div 
        animate={{ scale: [1, 1.1, 1], rotate: [0, 1, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 z-0 opacity-20 bg-cover bg-center bg-no-repeat transition-transform"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000&auto=format&fit=crop)' }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/90 to-[#0a0a0a]"></div>

      <div className="relative z-10 flex-1 flex flex-col">
        <header className="p-6 md:px-12 md:py-8 flex justify-between items-center z-20">
          <Logo size="md" />
          <button 
            onClick={() => {
              setAuthMode('login');
              setErrorMsg(null);
            }}
            className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
          >
            Sign In
          </button>
        </header>

        <main className={`flex-1 flex flex-col justify-center items-center text-center px-4 max-w-5xl mx-auto w-full z-10 transition-all duration-700 ${authMode !== 'landing' ? 'py-8' : ''}`}>
          <AnimatePresence mode="wait">
            {authMode === 'landing' ? (
              <motion.div
                key="landing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="font-display text-6xl md:text-8xl lg:text-[10rem] leading-[0.8] tracking-tighter uppercase mb-2 drop-shadow-2xl">
                  <span className="block text-white">More Than a Platform.</span>
                  <span className="block text-[#E31837] italic" style={{ textShadow: '0 0 20px rgba(227,24,55,0.4)' }}>
                    It's Your Path.
                  </span>
                </h1>
                
                <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.4em] text-white mb-12">
                  The all-in-one media platform and career development bridge
                  <span className="block mt-2 text-[#E31837]">Built for Semi-Pro MMA Fighters.</span>
                </p>

                <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 px-4">
                  {[
                    { icon: Video, label: 'Media Platform', desc: 'Share your journey. Upload, stream, and get discovered.' },
                    { icon: TrendingUp, label: 'Career Development', desc: 'Access tools, resources, and opportunities to level up.' },
                    { icon: Handshake, label: 'Sponsorship Advocate', desc: 'We connect fighters with brands that believe in them.' },
                    { icon: Users, label: 'Social Generator', desc: 'Build your brand. Grow your following. Own your story.' }
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col items-center text-center group">
                      <div className="w-16 h-16 mb-4 flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-white/5 rounded-2xl rotate-45 group-hover:rotate-90 transition-transform duration-500 border border-white/5"></div>
                        <item.icon className="w-8 h-8 text-[#E31837] relative z-10" />
                      </div>
                      <h3 className="font-display text-xl uppercase tracking-tighter text-white mb-2">{item.label}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-relaxed px-4">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-center items-center pb-20">
                  <button 
                    onClick={() => {
                      setSelectedRole('fighter');
                      setAuthMode('signup');
                    }}
                    className="px-10 py-4 bg-[#E31837] text-white font-black uppercase italic tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-[0_10px_30px_rgba(227,24,55,0.3)] min-w-[240px]"
                  >
                    Join the Roster
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedRole('fan');
                      setAuthMode('signup');
                    }}
                    className="px-10 py-4 bg-zinc-950 border border-white/10 text-white font-black uppercase italic tracking-widest rounded-xl hover:bg-zinc-900 transition-all min-w-[240px]"
                  >
                    Explore Talent
                  </button>
                </div>
              </motion.div>
            ) : renderAuthForm()}
          </AnimatePresence>

          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 px-6 py-3 bg-red-950/40 border border-[#E31837]/50 text-[#E31837] text-[10px] uppercase font-black tracking-widest rounded-xl shadow-xl shadow-red-950/20"
            >
              {errorMsg}
            </motion.div>
          )}
        </main>
        
        <div className="hidden md:grid grid-cols-4 gap-px bg-white/5 border-t border-white/5 mt-12 text-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
           <div className="bg-[#0a0a0a] py-6 hover:text-white transition-colors">Media Platform</div>
           <div className="bg-[#0a0a0a] py-6 hover:text-white transition-colors">Career Bridge</div>
           <div className="bg-[#0a0a0a] py-6 hover:text-white transition-colors">Advocate Agents</div>
           <div className="bg-[#0a0a0a] py-6 hover:text-white transition-colors">Social Growth</div>
        </div>
      </div>
    </div>
  );
}
