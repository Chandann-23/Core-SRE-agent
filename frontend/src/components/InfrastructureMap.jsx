import React from 'react';
import { Server, Database, Shield, Globe, Activity, Network } from 'lucide-react';

export default function InfrastructureMap({ status, currentFile, onFileSelect }) {
  // Define colors based on system status
  const getStatusColor = (nodeType) => {
    if (status === 'HEALTHY' || status === 'RESTORED') return 'text-emerald-400';
    
    // During an incident, the Payment Service is specifically vulnerable
    if (nodeType === 'vulnerable') {
      if (status === 'VULNERABLE') return 'text-red-400 animate-pulse drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]';
      if (status === 'REPAIRING') return 'text-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]';
      if (status === 'PENDING_APPROVAL') return 'text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]';
    }
    
    // Other services might show slight degradation (yellow) during an incident, but not critical
    if (status === 'VULNERABLE' || status === 'REPAIRING') return 'text-yellow-500/70';
    if (status === 'PENDING_APPROVAL') return 'text-emerald-400/50';
    
    return 'text-emerald-400';
  };

  const getBorderColor = (nodeType) => {
    if (status === 'HEALTHY' || status === 'RESTORED') return 'border-emerald-500/20';
    
    if (nodeType === 'vulnerable') {
      if (status === 'VULNERABLE') return 'border-red-500/50 bg-red-900/10';
      if (status === 'REPAIRING') return 'border-amber-500/50 bg-amber-900/10';
      if (status === 'PENDING_APPROVAL') return 'border-cyan-500/50 bg-cyan-900/10';
    }
    return 'border-gray-800';
  };

  return (
    <div className="flex-1 flex flex-col p-3 overflow-y-auto custom-scrollbar bg-[#0A0A0F]">
      <div className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mb-4 pl-2 flex items-center">
        <Network className="w-3 h-3 mr-2" />
        Topology Map
      </div>

      {/* Frontend Dashboard */}
      <div className="mb-2 pl-2">
        <div className={`flex items-center p-2 rounded border ${getBorderColor('normal')} transition-colors`}>
          <Globe className={`w-4 h-4 mr-3 ${getStatusColor('normal')}`} />
          <span className="text-xs font-semibold text-gray-300 tracking-wide">Frontend Dashboard (React)</span>
        </div>
      </div>
      
      {/* Connector Line */}
      <div className="w-px h-4 bg-[#2A2B3D] ml-6 my-1"></div>

      {/* SRE Agent API */}
      <div className="mb-2 pl-6">
        <div className={`flex items-center p-2 rounded border ${getBorderColor('normal')} transition-colors`}>
          <Activity className={`w-4 h-4 mr-3 ${getStatusColor('normal')}`} />
          <span className="text-xs font-medium text-gray-300">SRE Agent Node (FastAPI)</span>
        </div>
      </div>
      
      {/* Connector Line */}
      <div className="w-px h-4 bg-[#2A2B3D] ml-6 my-1"></div>

      {/* Execution Sandbox (VULNERABLE NODE) */}
      <div className="mb-2 pl-6">
        <div className={`flex flex-col p-2 rounded border ${getBorderColor('vulnerable')} transition-all duration-300`}>
          <div className="flex items-center mb-2">
            <Server className={`w-4 h-4 mr-3 ${getStatusColor('vulnerable')}`} />
            <span className={`text-xs font-bold ${status !== 'HEALTHY' && status !== 'RESTORED' ? 'text-gray-100' : 'text-gray-300'}`}>
              Execution Sandbox
            </span>
            {status !== 'HEALTHY' && status !== 'RESTORED' && (
              <span className={`ml-auto flex h-2 w-2 relative`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  status === 'VULNERABLE' ? 'bg-red-400' : status === 'REPAIRING' ? 'bg-amber-400' : 'bg-cyan-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  status === 'VULNERABLE' ? 'bg-red-500' : status === 'REPAIRING' ? 'bg-amber-500' : 'bg-cyan-500'
                }`}></span>
              </span>
            )}
          </div>
          
          {/* Files inside the sandbox */}
          <div className="pl-6 space-y-1 mt-1 border-l border-[#2A2B3D] ml-2">
            <div 
              onClick={() => onFileSelect('main.py')}
              className={`flex items-center px-2 py-1.5 text-xs rounded cursor-pointer transition-colors ${
                currentFile === 'main.py' 
                  ? "bg-[#2A2B3D] text-indigo-300 font-medium border border-[#3A3B4D]" 
                  : "text-gray-400 hover:bg-[#11121C] hover:text-gray-200 border border-transparent"
              }`}
            >
              <span className="opacity-50 mr-2 text-[10px]">app/</span>main.py
            </div>
            <div 
              onClick={() => onFileSelect('utils.py')}
              className={`flex items-center px-2 py-1.5 text-xs rounded cursor-pointer transition-colors ${
                currentFile === 'utils.py' 
                  ? "bg-[#2A2B3D] text-indigo-300 font-medium border border-[#3A3B4D]" 
                  : "text-gray-400 hover:bg-[#11121C] hover:text-gray-200 border border-transparent"
              }`}
            >
              <span className="opacity-50 mr-2 text-[10px]">app/</span>utils.py
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
