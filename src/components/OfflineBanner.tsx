import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-600/95 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-md backdrop-blur-sm sticky top-0 z-50 no-print">
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>Офлайн-режим — данные сохраняются локально на вашем устройстве (IndexedDB/Cache).</span>
    </div>
  );
};
