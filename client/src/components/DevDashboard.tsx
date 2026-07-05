'use client';

import React, { useState, useEffect } from 'react';
import { useGridStore } from '../store/useGridStore';
import { useSocket } from '../hooks/useSocket';
import { Cpu, Wifi, Activity, Play, Square, Layers } from 'lucide-react';

export default function DevDashboard() {
  const {
    latency,
    latencySimulatedDelay,
    setLatencySimulatedDelay,
    presenceList,
    history,
    connected,
  } = useGridStore();

  const { emitCapture } = useSocket();

  const [stats, setStats] = useState({
    uptime: 0,
    totalUsers: 0,
    totalCaptures: 0,
    activeUsers: 0,
    activeCapturesTenSecs: 0,
  });

  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressInterval, setStressInterval] = useState<NodeJS.Timeout | null>(null);
  const [packetsSent, setPacketsSent] = useState(0);

  // Poll server stats every 3 seconds
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch server statistics:', err);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handle stress-test interval clicking
  const startStressTest = () => {
    if (isStressTesting) return;
    setIsStressTesting(true);
    setPacketsSent(0);

    const interval = setInterval(() => {
      // Pick a random grid coordinate 0-99
      const rx = Math.floor(Math.random() * 100);
      const ry = Math.floor(Math.random() * 100);
      const tileId = `${rx},${ry}`;
      
      // Fire capture request
      emitCapture(tileId);
      setPacketsSent((p) => p + 1);
    }, 80); // Fire capture every 80ms

    setStressInterval(interval);
  };

  const stopStressTest = () => {
    if (!isStressTesting || !stressInterval) return;
    clearInterval(stressInterval);
    setStressInterval(null);
    setIsStressTesting(false);
  };

  // Cleanup stress test on unmount
  useEffect(() => {
    return () => {
      if (stressInterval) clearInterval(stressInterval);
    };
  }, [stressInterval]);

  return (
    <div className="w-80 glass-panel border border-white/5 rounded-xl p-4 flex flex-col gap-4 shadow-xl z-20">
      <div className="flex items-center gap-2">
        <Cpu size={16} className="text-pink-400" />
        <h3 className="font-bold text-sm tracking-widest text-pink-400 uppercase">
          Dev Analytics Panel
        </h3>
      </div>

      {/* Network Stats Indicators */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase font-semibold">Latency</span>
          <span className="font-bold font-mono text-pink-400 flex items-center gap-1 mt-0.5">
            <Wifi size={12} /> {connected ? `${latency} ms` : 'Offline'}
          </span>
        </div>
        <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase font-semibold">Conn Sockets</span>
          <span className="font-bold font-mono text-cyan-400 flex items-center gap-1 mt-0.5">
            <Activity size={12} /> {stats.activeUsers || presenceList.length}
          </span>
        </div>
        <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Captures</span>
          <span className="font-bold font-mono text-violet-400 flex items-center gap-1 mt-0.5">
            <Layers size={12} /> {stats.totalCaptures || history.length}
          </span>
        </div>
        <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase font-semibold">Uptime</span>
          <span className="font-bold font-mono text-yellow-500 mt-0.5">
            {stats.uptime} s
          </span>
        </div>
      </div>

      {/* Simulated Lag Controls */}
      <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400 font-medium">Ping Simulator Delay</span>
          <span className="font-mono text-pink-400 font-bold">
            {latencySimulatedDelay} ms
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={600}
          step={50}
          value={latencySimulatedDelay}
          onChange={(e) => setLatencySimulatedDelay(parseInt(e.target.value, 10))}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500"
        />
        <p className="text-[9px] text-gray-500 leading-normal">
          Artificially delays socket payload emissions to test optimistic UI locking and rollbacks under high-ping connections.
        </p>
      </div>

      {/* Stress Testing Generator */}
      <div className="flex flex-col gap-2.5 border-t border-white/5 pt-3">
        <span className="text-xs text-gray-400 font-medium">Concurrent User Stress Test</span>
        
        {isStressTesting ? (
          <button
            onClick={stopStressTest}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-1.5 rounded text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Square size={12} /> Stop Stress Test
          </button>
        ) : (
          <button
            onClick={startStressTest}
            className="w-full bg-pink-600 hover:bg-pink-500 text-white py-1.5 rounded text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(219,39,119,0.2)]"
          >
            <Play size={12} /> Start Stress Test (80ms clicks)
          </button>
        )}

        {isStressTesting && (
          <div className="text-[10px] text-center font-mono text-pink-400 animate-pulse">
            Sent {packetsSent} captures. Simulating high load...
          </div>
        )}
        <p className="text-[9px] text-gray-500 leading-normal">
          Launches concurrent thread captures at random cells, verifying conflict locking and race handling on the server.
        </p>
      </div>
    </div>
  );
}
