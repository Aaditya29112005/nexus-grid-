'use client';

import React, { useState, useEffect } from 'react';
import { useGridStore } from '../store/useGridStore';
import LandingPage from '../components/LandingPage';
import TopBar from '../components/TopBar';
import { LeftSidebar, RightSidebar } from '../components/Sidebars';
import GridViewport from '../components/GridViewport';
import MiniMap from '../components/MiniMap';
import HistoryReplay from '../components/HistoryReplay';
import DevDashboard from '../components/DevDashboard';
import Toaster from '../components/Toaster';
import TileDnaDrawer from '../components/TileDnaDrawer';
import NewsTicker from '../components/NewsTicker';
import CinematicIntro from '../components/CinematicIntro';
import RecruiterPanel from '../components/RecruiterPanel';
import { Settings, RefreshCw } from 'lucide-react';

export default function Home() {
  const {
    user,
    setUser,
    setTiles,
    setHistory,
    setPresenceList,
    setLoading,
    isIntroActive,
    isInterviewModeActive,
    setInterviewModeActive,
  } = useGridStore();
  const [inGrid, setInGrid] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);

  // Hotkey listener for Ctrl+Shift+G toggling Dev panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowDevPanel((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Try parsing user session from localStorage on load
  useEffect(() => {
    const savedSession = localStorage.getItem('nexus_grid_user');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setUser(parsed);
        setInGrid(true);
      } catch (err) {
        localStorage.removeItem('nexus_grid_user');
      }
    }
  }, [setUser]);

  // Fetch initial REST data when user enters the grid
  useEffect(() => {
    if (!inGrid || !user) return;

    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch Grid state
        const gridRes = await fetch('http://localhost:5001/api/grid');
        if (gridRes.ok) {
          const gridData = await gridRes.json();
          setTiles(gridData);
        }

        // Fetch History
        const historyRes = await fetch('http://localhost:5001/api/history');
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setHistory(historyData);
        }

        // Fetch Leaderboard
        const leaderboardRes = await fetch('http://localhost:5001/api/leaderboard');
        if (leaderboardRes.ok) {
          const leaderboardData = await leaderboardRes.json();
          setPresenceList(leaderboardData);
        }
      } catch (err) {
        console.error('Failed to load initial REST payload:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [inGrid, user, setTiles, setHistory, setPresenceList, setLoading]);

  // Log out session
  const handleLogout = () => {
    localStorage.removeItem('nexus_grid_user');
    window.location.reload();
  };

  if (!inGrid || !user) {
    return <LandingPage onEnter={() => setInGrid(true)} />;
  }

  return (
    <div className="relative w-screen h-screen bg-[#03000a] flex flex-col overflow-hidden select-none">
      {/* WebGL/Canvas Starfield Globe Intro */}
      {isIntroActive && <CinematicIntro />}

      {/* Recruiter system architecture walkthrough */}
      <AnimatePresence>
        {isInterviewModeActive && <RecruiterPanel />}
      </AnimatePresence>

      {/* Dynamic particles toaster */}
      <Toaster />

      {/* Header TopBar */}
      <TopBar />

      {/* AI News Channel Horizontal Marquee Ticker */}
      <NewsTicker />

      <main className="flex-1 flex relative overflow-hidden">
        {/* Leaderboard left sidebar */}
        <LeftSidebar />

        {/* Core Zoom/Pan virtualized canvas workspace */}
        <div className="flex-1 h-full relative overflow-hidden flex flex-col">
          <GridViewport />

          {/* Minimap floating panel - Bottom Right */}
          <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-3 items-end pointer-events-none">
            <div className="pointer-events-auto">
              <MiniMap />
            </div>
          </div>

          {/* Replay controller - Floating center bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
            <HistoryReplay />
          </div>

          {/* Dev dashboard toggle floating buttons - Bottom Left */}
          <div className="absolute bottom-4 left-32 z-30 flex items-center gap-2">
            <button
              onClick={() => setShowDevPanel(!showDevPanel)}
              className={`p-2 rounded-lg glass-panel hover:border-pink-500/50 cursor-pointer transition-all ${
                showDevPanel ? 'text-pink-400 border-pink-500/50' : 'text-gray-400'
              }`}
              title="Dev Settings Panel (Ctrl+Shift+G)"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={() => setInterviewModeActive(true)}
              className={`p-2 rounded-lg glass-panel hover:border-cyan-500/50 cursor-pointer text-gray-400 hover:text-cyan-400 transition-all text-xs font-bold ${
                isInterviewModeActive ? 'text-cyan-400 border-cyan-500/50' : ''
              }`}
              title="Recruiter Interview Walkthrough Mode"
            >
              💼 Recruiter Mode
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg glass-panel hover:border-red-500/50 cursor-pointer text-gray-400 hover:text-red-400 transition-all text-xs font-bold"
              title="Log Out Session"
            >
              Disconnect
            </button>
          </div>

          {/* Slide-in Dev Dashboard overlay */}
          {showDevPanel && (
            <div className="absolute bottom-16 left-4 z-30">
              <DevDashboard />
            </div>
          )}
        </div>

        {/* History Logger right sidebar */}
        <RightSidebar />

        {/* Tile DNA details slide drawer */}
        <TileDnaDrawer />
      </main>
    </div>
  );
}
