'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGridStore, generateGuestProfile, PlayerProfile } from '../store/useGridStore';
import { RotateCw, Sparkles, Terminal, Globe, Shield } from 'lucide-react';
import { motion, useMotionValue } from 'framer-motion';

interface LandingPageProps {
  onEnter: () => void;
}

// Decode JWT token helper to extract user picture & details without packages
const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export default function LandingPage({ onEnter }: LandingPageProps) {
  const { setUser } = useGridStore();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [customName, setCustomName] = useState('');
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [liveStats, setLiveStats] = useState({
    activeUsers: 143,
    totalCaptures: 21984,
  });

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const dist = Math.sqrt(x*x + y*y);
    if (dist < 80) {
      mouseX.set(x * 0.45);
      mouseY.set(y * 0.45);
    } else {
      mouseX.set(0);
      mouseY.set(0);
    }
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Google credential receiver callback
  useEffect(() => {
    (window as any).handleGoogleCredential = (response: any) => {
      try {
        const token = response.credential;
        const decoded = decodeJwt(token);
        if (decoded) {
          const googleProfile: PlayerProfile = {
            id: `google-${decoded.sub}`,
            username: decoded.name || decoded.email.split('@')[0],
            avatar: '👤',
            color: 'linear-gradient(135deg, #00f0ff, #8b5cf6)',
            score: 0,
            picture: decoded.picture, // Actual Google profile photo!
          };
          setUser(googleProfile);
          localStorage.setItem('nexus_grid_user', JSON.stringify(googleProfile));
          onEnter();
        }
      } catch (err) {
        console.error('Google ID JWT decode failed:', err);
      }
    };
  }, [onEnter, setUser]);

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Initialize and Render the Google Button
  useEffect(() => {
    const timer = setTimeout(() => {
      const google = (window as any).google;
      if (google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
          callback: (window as any).handleGoogleCredential,
        });
        google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { theme: 'outline', size: 'large', width: 320, text: 'signin_with' }
        );
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [googleLoaded, profile]);

  // Fetch stats and profile on mount
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

  // Background particles animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationId: number;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }

    const particles: Particle[] = Array.from({ length: 65 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(139, 92, 246, 0.4)',
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        ctx.fillStyle = p1.color;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 110) {
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 * (1 - dist / 110)})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleReroll = () => {
    const nextProfile = generateGuestProfile();
    setProfile(nextProfile);
    setCustomName('');
  };

  const handleEnterGrid = () => {
    if (!profile) return;
    const finalUsername = customName.trim() ? customName.trim() : profile.username;
    const finalProfile = { ...profile, username: finalUsername };
    setUser(finalProfile);
    localStorage.setItem('nexus_grid_user', JSON.stringify(finalProfile));
    onEnter();
  };

  const handleGoogleLogin = () => {
    if (!profile) return;
    const googleProfile: PlayerProfile = {
      id: `google-${Math.random().toString(36).substring(2, 11)}`,
      username: 'Google_Dev@gmail.com',
      avatar: '👑',
      color: 'linear-gradient(135deg, #FF4B2B, #FF416C)',
      score: 0,
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80', // mockup premium avatar URL
    };
    setUser(googleProfile);
    localStorage.setItem('nexus_grid_user', JSON.stringify(googleProfile));
    onEnter();
  };

  if (!profile) return null;

  return (
    <div className="relative w-screen h-screen bg-[#020008] flex flex-col items-center justify-center bg-grid-cyber overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 block pointer-events-none" />
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />

      {/* GridVerse OS Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 mb-8"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#00f0ff]/20 bg-[#00f0ff]/5 mb-4 text-[9px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
          <Terminal size={10} className="animate-pulse" /> GridVerse OS v4.1.0
        </div>
        <h1 className="text-6xl font-black tracking-[0.25em] bg-gradient-to-r from-cyan-400 via-white to-violet-500 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,240,255,0.2)]">
          NEXUS GRID
        </h1>
        <p className="text-gray-400 text-xs tracking-[0.4em] uppercase mt-3 font-semibold font-mono">
          MULTIPLAYER STATE ENGINE
        </p>
      </motion.div>

      {/* Holographic Launcher Console */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="glass-panel w-96 p-8 rounded-2xl flex flex-col gap-6 shadow-[0_12px_45px_rgba(0,0,0,0.85)] z-10 relative overflow-hidden border border-cyan-500/10"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

        {/* Animated Avatar Visual Card */}
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotateY: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.5)] cursor-pointer"
            style={{ background: profile.color }}
            onClick={handleReroll}
          >
            {profile.avatar}
          </motion.div>
          <span className="text-[9px] text-cyan-400/80 uppercase tracking-widest font-bold font-mono flex items-center gap-1">
            <Globe size={10} /> Active Profile Slot
          </span>
        </div>

        {/* Input Details */}
        <div className="flex flex-col gap-4 text-center">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={profile.username}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all font-semibold font-mono"
            />
            <button
              onClick={handleReroll}
              className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-cyan-400 hover:text-white hover:bg-white/10 hover:border-cyan-500/30 cursor-pointer transition-all"
              title="Re-roll username"
            >
              <RotateCw size={16} />
            </button>
          </div>

          {/* Magnetic CTA Enter Grid */}
          <motion.button
            ref={buttonRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ x: mouseX, y: mouseY }}
            onClick={handleEnterGrid}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs tracking-widest uppercase cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:shadow-[0_0_30px_rgba(0,240,255,0.45)] transition-all flex items-center justify-center gap-2 font-mono"
          >
            <Sparkles size={14} /> Initialize Pilot
          </motion.button>

          {/* Google Login Trigger */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-[8px] text-gray-500 uppercase tracking-wider font-semibold font-mono">Google Credentials</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          {/* Standard Google login button wrapper */}
          <div className="flex justify-center overflow-hidden rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all p-0.5">
            <div id="google-signin-button" className="w-full flex justify-center text-xs" />
          </div>

          {/* Fallback check in case google client script fails/blocked */}
          {!googleLoaded && (
            <button
              onClick={handleGoogleLogin}
              className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] font-bold hover:bg-white/10 hover:border-cyan-500/30 cursor-pointer transition-all flex items-center justify-center gap-2 font-mono"
            >
              <Shield size={12} className="text-cyan-400" />
              Simulate Google Credentials
            </button>
          )}
        </div>
      </motion.div>

      {/* Live Users / Blocks captured counter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex gap-16 mt-10 z-10 font-mono"
      >
        <div className="text-center">
          <span className="block text-2xl font-black text-cyan-400 tracking-wider">
            {liveStats.activeUsers}
          </span>
          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">
            Live Connections
          </span>
        </div>
        <div className="text-center">
          <span className="block text-2xl font-black text-violet-400 tracking-wider">
            {liveStats.totalCaptures.toLocaleString()}
          </span>
          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">
            Sovereign Claims
          </span>
        </div>
      </motion.div>
    </div>
  );
}
