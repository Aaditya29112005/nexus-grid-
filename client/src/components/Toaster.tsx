'use client';

import React, { useEffect } from 'react';
import { useGridStore } from '../store/useGridStore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Award } from 'lucide-react';

export default function Toaster() {
  const { notifications, removeNotification } = useGridStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <ToastCard
            key={notif.id}
            id={notif.id}
            message={notif.message}
            type={notif.type}
            onClose={removeNotification}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastCardProps {
  id: string;
  message: string;
  type: 'achievement' | 'alert' | 'info';
  onClose: (id: string) => void;
}

function ToastCard({ id, message, type, onClose }: ToastCardProps) {
  // Auto-dismiss after 3.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  let icon = <CheckCircle size={16} className="text-cyan-400" />;
  let border = 'border-cyan-500/20';
  let glow = 'shadow-[0_0_12px_rgba(34,211,238,0.1)]';

  if (type === 'achievement') {
    icon = <Award size={18} className="text-yellow-400 animate-bounce" />;
    border = 'border-yellow-500/30';
    glow = 'shadow-[0_0_15px_rgba(234,179,8,0.15)]';
  } else if (type === 'alert') {
    icon = <AlertCircle size={16} className="text-red-500" />;
    border = 'border-red-500/20';
    glow = 'shadow-[0_0_12px_rgba(239,68,68,0.1)]';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      layout
      className={`pointer-events-auto p-3.5 rounded-xl glass-panel border ${border} ${glow} flex items-start gap-3 justify-between`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <p className="text-xs font-semibold text-gray-200 leading-normal">
          {message}
        </p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="text-gray-500 hover:text-white text-[10px] font-bold cursor-pointer px-1"
      >
        ✕
      </button>
    </motion.div>
  );
}
