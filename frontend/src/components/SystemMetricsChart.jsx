import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

export default function SystemMetricsChart({ status }) {
  const [data, setData] = useState(
    Array.from({ length: 40 }).map((_, i) => ({
      time: i,
      errorRate: Math.random() * 2,
      traffic: 850 + Math.random() * 150
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prevData) => {
        const newData = [...prevData.slice(1)];
        const lastTime = prevData[prevData.length - 1].time;
        const lastTraffic = prevData[prevData.length - 1].traffic;
        const lastError = prevData[prevData.length - 1].errorRate;
        
        // Professional random walk
        let newErrorRate = Math.max(0, Math.min(5, lastError + (Math.random() - 0.5) * 1.5));
        let newTraffic = Math.max(800, Math.min(1000, lastTraffic + (Math.random() - 0.5) * 60));
        
        if (status === 'VULNERABLE' || status === 'REPAIRING' || status === 'PENDING_APPROVAL') {
          newErrorRate = Math.max(70, Math.min(95, lastError + (Math.random() - 0.5) * 10));
          newTraffic = Math.max(200, Math.min(450, lastTraffic + (Math.random() - 0.5) * 40));
        } else if (status === 'RESTORED') {
          newErrorRate = Math.max(0, Math.min(2, lastError + (Math.random() - 0.5) * 1.5));
        }
        
        newData.push({
          time: lastTime + 1,
          errorRate: newErrorRate,
          traffic: newTraffic
        });
        
        return newData;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [status]);

  // SVG Dimensions
  const width = 384;
  const height = 180;
  const padding = { top: 20, bottom: 20, left: 0, right: 0 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Path Generators
  const getPath = (key, maxVal) => {
    return data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * graphWidth;
      const y = padding.top + graphHeight - (d[key] / maxVal) * graphHeight;
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ');
  };

  const getArea = (key, maxVal) => {
    const path = getPath(key, maxVal);
    return `${path} L ${width - padding.right},${height - padding.bottom} L ${padding.left},${height - padding.bottom} Z`;
  };

  const trafficPath = getPath('traffic', 1200);
  const trafficArea = getArea('traffic', 1200);
  
  const errorPath = getPath('errorRate', 100);
  const errorArea = getArea('errorRate', 100);

  return (
    <div className="h-full w-full border-t border-[#2A2B3D] flex flex-col shrink-0 bg-[#0A0A0F] relative overflow-hidden">
      <div className="pt-3 pl-4 pb-1 flex items-center shrink-0 z-10 relative">
        <Activity className="w-4 h-4 text-gray-400 mr-2" />
        <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">
          Live Telemetry: Financial Gateway
        </span>
      </div>
      
      {/* Custom SVG Graph */}
      <div className="flex-1 w-full relative pl-1">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0">
          <defs>
            <linearGradient id="gradTraffic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradError" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line 
              key={i}
              x1="0" 
              y1={padding.top + graphHeight * ratio} 
              x2={width} 
              y2={padding.top + graphHeight * ratio} 
              stroke="#2A2B3D" 
              strokeWidth="1" 
              strokeDasharray="4 4" 
            />
          ))}

          {/* Traffic Data (Green) */}
          <path d={trafficArea} fill="url(#gradTraffic)" />
          <path d={trafficPath} fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Error Rate Data (Blue) */}
          <path d={errorArea} fill="url(#gradError)" />
          <path d={errorPath} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Legend */}
        <div className="absolute top-0 right-4 flex flex-col items-end z-10 pointer-events-none text-[9px] font-mono tracking-widest bg-[#0A0A0F]/80 p-1.5 rounded border border-[#2A2B3D] mt-1">
            <span className="text-gray-300 mb-1 flex items-center">
               <span className="w-2 h-2 rounded-sm bg-green-600 mr-2"></span>
               TRAFFIC: <strong className="ml-1 text-white">{Math.round(data[data.length - 1].traffic)} RPS</strong>
            </span>
            <span className="text-gray-300 flex items-center">
               <span className="w-2 h-2 rounded-sm bg-blue-600 mr-2"></span>
               ERRORS: <strong className="ml-1 text-white">{data[data.length - 1].errorRate.toFixed(1)}%</strong>
            </span>
        </div>
      </div>
    </div>
  );
}
