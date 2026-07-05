'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGridStore } from '../store/useGridStore';
import { useSocket } from '../hooks/useSocket';
import { Cpu, Wifi, Activity, Play, Square, Layers, Network, Terminal, ShieldAlert, Code2, Globe } from 'lucide-react';

type DevTab = 'stats' | 'logs' | 'visual' | 'api' | 'events';

export default function DevDashboard() {
  const {
    latency,
    latencySimulatedDelay,
    setLatencySimulatedDelay,
    presenceList,
    history,
    connected,
    socketLogs,
    serverEvent,
    setServerEvent,
    lastSuccessTimestamp,
  } = useGridStore();

  const { emitCapture } = useSocket();

  const [activeTab, setActiveTab] = useState<DevTab>('stats');
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

  // Flowchart animation pulses when capture succeeds
  const [visualPulse, setVisualPulse] = useState(false);

  useEffect(() => {
    if (lastSuccessTimestamp > 0) {
      setVisualPulse(true);
      const timeout = setTimeout(() => setVisualPulse(false), 800);
      return () => clearTimeout(timeout);
    }
  }, [lastSuccessTimestamp]);

  // Poll server stats
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

  const startStressTest = () => {
    if (isStressTesting) return;
    setIsStressTesting(true);
    setPacketsSent(0);

    const interval = setInterval(() => {
      const rx = Math.floor(Math.random() * 100);
      const ry = Math.floor(Math.random() * 100);
      emitCapture(`${rx},${ry}`);
      setPacketsSent((p) => p + 1);
    }, 80);

    setStressInterval(interval);
  };

  const stopStressTest = () => {
    if (!isStressTesting || !stressInterval) return;
    clearInterval(stressInterval);
    setStressInterval(null);
    setIsStressTesting(false);
  };

  useEffect(() => {
    return () => {
      if (stressInterval) clearInterval(stressInterval);
    };
  }, [stressInterval]);

  return (
    <div className="w-[360px] h-[480px] glass-panel border border-white/5 rounded-xl p-4 flex flex-col gap-3.5 shadow-2xl z-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-pink-400" />
          <h3 className="font-bold text-xs tracking-widest text-pink-400 uppercase">
            Dev Observatory Panel
          </h3>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 text-pink-400 font-mono font-bold uppercase animate-pulse">
          v1.2.0
        </span>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5 text-[10px] font-bold">
        {(['stats', 'logs', 'visual', 'api', 'events'] as DevTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1 rounded text-center uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-pink-500 text-white shadow-[0_0_8px_rgba(236,72,153,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto pr-0.5 text-xs text-gray-300">
        
        {/* 1. STATS TAB */}
        {activeTab === 'stats' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white/5 border border-white/5 p-2 rounded">
                <span className="text-[9px] text-gray-500 uppercase font-semibold block">Latency</span>
                <span className="font-bold font-mono text-pink-400 flex items-center gap-1 mt-0.5">
                  <Wifi size={11} /> {connected ? `${latency} ms` : 'Offline'}
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 p-2 rounded">
                <span className="text-[9px] text-gray-500 uppercase font-semibold block">Active Sockets</span>
                <span className="font-bold font-mono text-cyan-400 flex items-center gap-1 mt-0.5">
                  <Activity size={11} /> {stats.activeUsers || presenceList.length}
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 p-2 rounded">
                <span className="text-[9px] text-gray-500 uppercase font-semibold block">Total Captures</span>
                <span className="font-bold font-mono text-violet-400 flex items-center gap-1 mt-0.5">
                  <Layers size={11} /> {stats.totalCaptures || history.length}
                </span>
              </div>
              <div className="bg-white/5 border border-white/5 p-2 rounded">
                <span className="text-[9px] text-gray-500 uppercase font-semibold block">Server Uptime</span>
                <span className="font-bold font-mono text-yellow-500 block mt-0.5">
                  {stats.uptime} s
                </span>
              </div>
            </div>

            {/* Delay Slider */}
            <div className="flex flex-col gap-1 border-t border-white/5 pt-2.5">
              <div className="flex justify-between">
                <span className="text-gray-400 font-semibold">Simulated Lag Delay</span>
                <span className="font-mono text-pink-400 font-bold">{latencySimulatedDelay} ms</span>
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
              <p className="text-[9px] text-gray-500 leading-relaxed">
                Simulates remote network speeds to verify optimistic client update rollbacks.
              </p>
            </div>

            {/* Stress Test */}
            <div className="flex flex-col gap-2 border-t border-white/5 pt-2.5">
              <span className="text-gray-400 font-semibold">Stress Test Capture Bot</span>
              {isStressTesting ? (
                <button
                  onClick={stopStressTest}
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-1.5 rounded font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Square size={11} /> Stop Stress Test
                </button>
              ) : (
                <button
                  onClick={startStressTest}
                  className="w-full bg-pink-600 hover:bg-pink-500 text-white py-1.5 rounded font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(219,39,119,0.2)]"
                >
                  <Play size={11} /> Start Clicks Spammer (80ms)
                </button>
              )}
              {isStressTesting && (
                <div className="text-[10px] text-center font-mono text-pink-400 animate-pulse">
                  Sent {packetsSent} packets. Testing locking concurrency...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="flex flex-col gap-2 h-full">
            <div className="flex items-center gap-1.5 text-pink-400 mb-1">
              <Terminal size={12} />
              <span className="font-semibold text-[10px] uppercase">WebSocket Packet Telemetry</span>
            </div>
            <div className="bg-black/50 border border-white/5 rounded-lg p-2.5 font-mono text-[9px] h-72 overflow-y-auto space-y-1.5 flex flex-col">
              {socketLogs.map((log) => (
                <div key={log.id} className="flex flex-col border-b border-white/5 pb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1 rounded font-bold text-[8px] ${
                        log.type === 'in' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {log.type === 'in' ? 'IN' : 'OUT'}
                    </span>
                    <span className="text-gray-300 font-bold font-mono">{log.event}</span>
                    <span className="text-gray-600 ml-auto font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {log.payload && (
                    <span className="text-gray-500 truncate mt-0.5 max-w-full">
                      {JSON.stringify(log.payload)}
                    </span>
                  )}
                </div>
              ))}
              {socketLogs.length === 0 && (
                <div className="text-center py-10 text-gray-600">
                  Listening for WebSockets... Click on cells to populate.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. VISUALTAB */}
        {activeTab === 'visual' && (
          <div className="flex flex-col gap-2 h-full items-center">
            <div className="flex items-center gap-1.5 text-pink-400 w-full mb-1">
              <Network size={12} />
              <span className="font-semibold text-[10px] uppercase">Distributed Architecture Flow</span>
            </div>

            {/* Architecture Node flowchart */}
            <div className="w-full bg-black/40 border border-white/5 p-4 rounded-lg flex flex-col gap-2.5 items-center relative overflow-hidden">
              
              {/* Flow elements */}
              <div className="flex items-center justify-between w-full z-10 px-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 font-bold font-mono text-[9px] shadow-[0_0_10px_rgba(236,72,153,0.1)]">
                    Browser
                  </div>
                  <span className="text-[8px] text-gray-500">React Client</span>
                </div>

                <div className="w-10 border-t border-dashed border-gray-600 flex justify-center relative">
                  <div className={`w-1.5 h-1.5 rounded-full bg-pink-400 absolute -top-[3.5px] ${visualPulse ? 'left-full transition-all duration-[600ms] ease-linear' : 'left-0'}`} />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold font-mono text-[9px]">
                    NodeJS
                  </div>
                  <span className="text-[8px] text-gray-500">Socket.IO</span>
                </div>

                <div className="w-10 border-t border-dashed border-gray-600 flex justify-center relative">
                  <div className={`w-1.5 h-1.5 rounded-full bg-cyan-400 absolute -top-[3.5px] ${visualPulse ? 'left-full transition-all duration-[600ms] ease-linear' : 'left-0'}`} />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-bold font-mono text-[9px]">
                    Redis
                  </div>
                  <span className="text-[8px] text-gray-500">Lock Mutex</span>
                </div>
              </div>

              {/* Vertical link connector */}
              <div className="h-4 border-l border-dashed border-gray-600 relative">
                <div className={`w-1.5 h-1.5 rounded-full bg-red-400 absolute -left-[3.5px] ${visualPulse ? 'top-full transition-all duration-[400ms] ease-linear' : 'top-0'}`} />
              </div>

              {/* Second row elements */}
              <div className="flex items-center justify-between w-full z-10 px-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold font-mono text-[9px]">
                    Broadcast
                  </div>
                  <span className="text-[8px] text-gray-500">All Clients</span>
                </div>

                <div className="w-10 border-t border-dashed border-gray-600 flex justify-center relative">
                  <div className={`w-1.5 h-1.5 rounded-full bg-yellow-400 absolute -top-[3.5px] ${visualPulse ? 'right-full transition-all duration-[600ms] ease-linear' : 'right-0'}`} />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold font-mono text-[9px]">
                    Prisma
                  </div>
                  <span className="text-[8px] text-gray-500">ORM Bridge</span>
                </div>

                <div className="w-10 border-t border-dashed border-gray-600 flex justify-center relative">
                  <div className={`w-1.5 h-1.5 rounded-full bg-purple-400 absolute -top-[3.5px] ${visualPulse ? 'left-0 transition-all duration-[500ms] ease-linear' : 'left-full'}`} />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold font-mono text-[9px]">
                    Postgres
                  </div>
                  <span className="text-[8px] text-gray-500">SQL Db</span>
                </div>
              </div>

              {/* Pulse status indicator footer */}
              <div className="w-full text-center border-t border-white/5 pt-2 mt-1">
                <span className="text-[9px] text-gray-500 font-mono">
                  {visualPulse ? '⚡ Packet Emitted: claim validated & broadcast' : 'Idle. Waiting for capture pulse.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. API TAB */}
        {activeTab === 'api' && (
          <div className="flex flex-col gap-2 h-full">
            <div className="flex items-center gap-1.5 text-pink-400 mb-1">
              <Code2 size={12} />
              <span className="font-semibold text-[10px] uppercase">Public API Documentation</span>
            </div>

            <div className="space-y-2 h-72 overflow-y-auto pr-1">
              {/* Endpoint 1 */}
              <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 font-extrabold rounded">GET</span>
                  <span className="font-bold font-mono">/api/grid</span>
                </div>
                <span className="text-[9px] text-gray-400 leading-normal">
                  Fetches current 10,000 grid tiles status array.
                </span>
              </div>

              {/* Endpoint 2 */}
              <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 font-extrabold rounded">GET</span>
                  <span className="font-bold font-mono">/api/stats</span>
                </div>
                <span className="text-[9px] text-gray-400 leading-normal">
                  Returns server uptime, connection metrics and Redis hit rates.
                </span>
              </div>

              {/* Endpoint 3 */}
              <div className="bg-white/5 border border-white/5 p-2 rounded flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 font-extrabold rounded">GET</span>
                  <span className="font-bold font-mono">/api/leaderboard</span>
                </div>
                <span className="text-[9px] text-gray-400 leading-normal">
                  Returns global user rankings and combined scores list.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 5. EVENTS TAB */}
        {activeTab === 'events' && (
          <div className="flex flex-col gap-2.5 h-full">
            <div className="flex items-center gap-1.5 text-pink-400 mb-1">
              <Globe size={12} />
              <span className="font-semibold text-[10px] uppercase">Game Master World Events</span>
            </div>
            
            <p className="text-[9px] text-gray-500 leading-normal mb-1">
              Inject dynamic environmental changes across the entire game board. These states adapt colors and trigger physical distortions in real time.
            </p>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
              {/* Earthquake */}
              <button
                onClick={() => setServerEvent('earthquake')}
                className={`py-2 rounded-lg border transition-all cursor-pointer ${
                  serverEvent === 'earthquake'
                    ? 'bg-orange-600 border-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                    : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                🫨 Earthquake
              </button>

              {/* Eclipse */}
              <button
                onClick={() => setServerEvent('eclipse')}
                className={`py-2 rounded-lg border transition-all cursor-pointer ${
                  serverEvent === 'eclipse'
                    ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                    : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                🌑 Solar Eclipse
              </button>

              {/* Black Hole */}
              <button
                onClick={() => setServerEvent('blackhole')}
                className={`py-2 rounded-lg border transition-all cursor-pointer ${
                  serverEvent === 'blackhole'
                    ? 'bg-pink-600 border-pink-500 text-white shadow-[0_0_10px_rgba(219,39,119,0.3)]'
                    : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                🕳️ Black Hole
              </button>

              {/* Clear event */}
              <button
                onClick={() => setServerEvent('clear')}
                className={`py-2 rounded-lg border transition-all cursor-pointer ${
                  serverEvent === 'clear'
                    ? 'bg-green-600 border-green-500 text-white'
                    : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                ☀️ Reset Event
              </button>
            </div>

            {/* Display banner of active event */}
            {serverEvent !== 'clear' && (
              <div className="mt-2 bg-pink-500/10 border border-pink-500/20 p-2.5 rounded-lg text-center animate-pulse">
                <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider block">
                  🚨 SYSTEM ALERT
                </span>
                <span className="text-[9px] text-gray-300 leading-normal block mt-0.5">
                  An active {serverEvent} event is spreading across all grid sectors.
                </span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
