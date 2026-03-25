import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const ConnectionChecker = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [checking, setChecking] = useState(false);

  // ✅ Direct function - no imports needed
  const checkConnection = async () => {
    setChecking(true);
    try {
      const response = await fetch('http://localhost:5000/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Short timeout to fail fast
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        console.log('✅ Backend is running');
        setIsConnected(true);
      } else {
        console.warn('⚠️ Backend responded with error');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('❌ Backend connection failed:', error.message);
      setIsConnected(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isConnected) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50">
      <div className="flex items-center justify-center gap-3">
        <WifiOff className="w-5 h-5" />
        <span className="font-medium">
          Cannot connect to backend server. Make sure it's running on port 5000.
        </span>
        <button 
          onClick={checkConnection}
          disabled={checking}
          className="flex items-center gap-2 bg-white text-red-600 px-3 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </div>
    </div>
  );
};

export default ConnectionChecker;