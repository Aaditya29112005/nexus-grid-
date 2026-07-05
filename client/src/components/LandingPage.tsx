'use client';

import React, { useState, useEffect } from 'react';
import { useGridStore, generateGuestProfile, PlayerProfile } from '../store/useGridStore';
import { RotateCw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingPageProps {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  const { setUser } = useGridStore();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [customName, setCustomName] = useState('');
  
  const [liveStats, setLiveStats] = useState({
    activeUsers: 143,
    totalCaptures: 21984,
  });

  // Fetch initial stats and generate profile on mount
  useEffect(() => {
    setProfile(generateGuestProfile());

    const fetchLiveStats = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/stats');
        if (res.ok) {
          const data = await res.json();
          setLiveStats({
            activeUsers: data.activeUsers || 1,
            totalCaptures: data.totalCaptures || 0,
          });
        }
      } catch (err) {
        // Fallback default mockup values
      }
    };
    fetchLiveStats();
  }, []);

  const handleReroll = () => {
    const nextProfile = generateGuestProfile();
    setProfile(nextProfile);
    setCustomName('');
  };

  const handleEnterGrid = () => {
    if (!profile) return;
    
    // Update profile username if they edited it
    const finalUsername = customName.trim() ? customName.trim() : profile.username;
    const finalProfile = { ...profile, username: finalUsername };
    
    // Write session to Zustand and persist locally
    setUser(finalProfile);
    localStorage.setItem('nexus_grid_user', JSON.stringify(finalProfile));
    
    onEnter();
  };

  const handleGoogleLogin = () => {
    if (!profile) return;
    
    // Simulated Google login: uses Google email handle and google avatar style
    const googleProfile: PlayerProfile = {
      id: `google-${Math.random().toString(36).substring(2, 11)}`,
      username: 'Google_Dev@gmail.com',
      avatar: '👑',
      color: 'linear-gradient(135deg, #FF4B2B, #FF416C)', // Google colors gradient
      score: 0,
    };

    setUser(googleProfile);
    localStorage.setItem('nexus_grid_user', JSON.stringify(googleProfile));
    onEnter();
  };

  if (!profile) return null;

  return (
    <div className="relative w-screen h-screen bg-[#03000a] flex flex-col items-center justify-center bg-grid-cyber overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />

      {/* Floating Animated Sparks */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-pink-500/10 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* Title Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 mb-8"
      >
        <h1 className="text-6xl font-black tracking-[0.25em] bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-2xl">
          NEXUS GRID
        </h1>
        <p className="text-gray-400 text-sm tracking-[0.3em] uppercase mt-3 font-semibold">
          Capture. Control. Dominate.
        </p>
      </motion.div>

      {/* Login Dashboard Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="glass-panel w-96 p-8 rounded-2xl flex flex-col gap-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-10"
      >
        {/* Animated Avatar Visual Card */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.4)] animate-bounce"
            style={{ background: profile.color }}
          >
            {profile.avatar}
          </div>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            Your Pilot Profile
          </span>
        </div>

        {/* Input Details */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={profile.username}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-pink-500/50 focus:bg-white/10 transition-all font-semibold"
            />
            <button
              onClick={handleReroll}
              className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-pink-500/30 cursor-pointer transition-all"
              title="Re-roll username"
            >
              <RotateCw size={18} />
            </button>
          </div>

          {/* CTA: Enter Grid */}
          <button
            onClick={handleEnterGrid}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm tracking-widest uppercase cursor-pointer shadow-[0_4px_20px_rgba(236,72,153,0.3)] hover:shadow-[0_4px_25px_rgba(236,72,153,0.5)] transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={16} /> Enter Grid
          </button>

          {/* Google Login Trigger */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Or Connect</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 hover:border-pink-500/30 cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </motion.div>

      {/* Live Users / Blocks captured counter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex gap-12 mt-8 z-10"
      >
        <div className="text-center">
          <span className="block text-2xl font-black text-pink-400 font-mono tracking-wide">
            {liveStats.activeUsers}
          </span>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            Live Users
          </span>
        </div>
        <div className="text-center">
          <span className="block text-2xl font-black text-cyan-400 font-mono tracking-wide">
            {liveStats.totalCaptures.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            Blocks Captured
          </span>
        </div>
      </motion.div>
    </div>
  );
}
