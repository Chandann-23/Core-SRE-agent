import React from 'react';

export default function MetricsPanel({ status, mttrTime, finalMttrTime, auditLogsCount }) {
  const isHealthy = status === "HEALTHY" || status === "RESTORED";
  
  return (
    <div className="grid grid-cols-3 gap-4 p-4 border-b border-[#2A2B3D] bg-[#11121C]">
      {/* MTTR Score */}
      <div className="bg-[#1A1C29] border border-[#2A2B3D] p-4 rounded-lg flex flex-col items-center justify-center">
        <h4 className="text-gray-400 text-xs mb-1 uppercase tracking-wider font-semibold">MTTR Score</h4>
        <span className={`text-2xl font-bold font-mono tracking-tight ${status === "REPAIRING" ? "text-yellow-400" : "text-gray-100"}`}>
          {status === "RESTORED" ? finalMttrTime : mttrTime}
        </span>
        <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Mean Time To Repair</span>
      </div>

      {/* System Status */}
      <div className={`border p-4 rounded-lg flex flex-col items-center justify-center transition-colors duration-500 ${
        isHealthy 
          ? "bg-[#1A2922] border-emerald-900/50" 
          : status === "REPAIRING"
          ? "bg-[#29221A] border-amber-900/50"
          : status === "PENDING_APPROVAL"
          ? "bg-[#1A2529] border-cyan-900/50"
          : "bg-[#291A1A] border-red-900/50"
      }`}>
        <h4 className="text-gray-400 text-xs mb-1 uppercase tracking-wider font-semibold">System Status</h4>
        <span className={`text-xl font-bold tracking-wide ${
          isHealthy 
            ? "text-emerald-400" 
            : status === "REPAIRING"
            ? "text-amber-400"
            : status === "PENDING_APPROVAL"
            ? "text-cyan-400 animate-pulse"
            : "text-red-400"
        }`}>
          {status === "HEALTHY" ? "Healthy" : 
           status === "VULNERABLE" ? "Critical Vulnerability" : 
           status === "REPAIRING" ? "Autonomous Repair in Progress" : 
           status === "PENDING_APPROVAL" ? "Awaiting Human Approval" : "System Restored"}
        </span>
        <span className={`text-[10px] mt-1 uppercase tracking-widest ${
          isHealthy ? "text-emerald-600/70" : status === "REPAIRING" ? "text-amber-600/70" : status === "PENDING_APPROVAL" ? "text-cyan-600/70" : "text-red-600/70"
        }`}>
          {isHealthy ? "Fully Operational" : status === "PENDING_APPROVAL" ? "Manual Intervention Required" : "Action Required"}
        </span>
      </div>

      {/* Audit Logs Count */}
      <div className="bg-[#1A1C29] border border-[#2A2B3D] p-4 rounded-lg flex flex-col items-center justify-center">
        <h4 className="text-gray-400 text-xs mb-1 uppercase tracking-wider font-semibold">Audit Events</h4>
        <span className="text-2xl font-bold font-mono text-cyan-400">
          {auditLogsCount}
        </span>
        <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Events Tracked</span>
      </div>
    </div>
  );
}
