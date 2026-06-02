import React from 'react';
import { CheckCircle2, XCircle, Beaker, RotateCw } from 'lucide-react';

export default function UnitTestMatrix({ testResults, status }) {
  return (
    <div className="flex flex-col flex-1 shrink-0 bg-[#0A0A0F] overflow-hidden border-t border-[#2A2B3D]">
      <div className="h-10 flex items-center px-4 shrink-0 border-b border-[#2A2B3D] bg-[#11121C]">
        <Beaker className="w-4 h-4 text-gray-400 mr-2" />
        <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">Live Unit Tests</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {testResults.map((test, index) => {
          const isPass = test.status === "pass";
          // If the system is repairing, maybe show a loading spinner for tests that are pass so it looks like it's "running"
          // Actually, we'll just show pass/fail instantly for simplicity.
          
          return (
            <div 
              key={test.name}
              className={`flex items-center justify-between p-2.5 rounded border transition-all duration-300 ${
                isPass 
                  ? "bg-emerald-900/10 border-emerald-900/30 text-emerald-400" 
                  : "bg-red-900/10 border-red-900/30 text-red-400"
              }`}
            >
              <div className="flex items-center">
                {isPass ? (
                  <CheckCircle2 className="w-4 h-4 mr-2 opacity-80" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2 opacity-80 animate-pulse" />
                )}
                <span className="text-xs font-mono">{test.name}</span>
              </div>
              <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                isPass ? "bg-emerald-900/30 text-emerald-300" : "bg-red-900/30 text-red-300"
              }`}>
                {test.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
