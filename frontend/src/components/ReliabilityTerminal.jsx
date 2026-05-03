import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Clock, Activity, CheckCircle, XCircle } from 'lucide-react';

const ReliabilityTerminal = ({ 
  isOpen, 
  auditLogs, 
  isTestActive, 
  mttrTime, 
  systemStatus,
  onToggle 
}) => {
  const logContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [auditLogs, autoScroll]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    if (!isTestActive) return null;
    if (systemStatus === 'Healthy') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (systemStatus === 'Error') return <XCircle className="w-4 h-4 text-rose-400" />;
    return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
  };

  const getStatusColor = () => {
    if (systemStatus === 'Healthy') return 'text-emerald-400 border-emerald-400/30';
    if (systemStatus === 'Error') return 'text-rose-400 border-rose-400/30';
    return 'text-blue-400 border-blue-400/30';
  };

  if (!isOpen) {
    return (
      <div className="border-t border-slate-800 bg-slate-950 p-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-300 hover:bg-slate-800 transition-colors text-sm font-mono"
        >
          <Terminal className="w-4 h-4" />
          View Live Audit Console
          {isTestActive && (
            <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
              ACTIVE
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-300 hover:bg-slate-800 transition-colors text-sm font-mono"
          >
            <Terminal className="w-4 h-4" />
            Hide Console
          </button>
          
          {isTestActive && (
            <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-md ${getStatusColor()}`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono text-sm font-bold">
                MTTR: {formatTime(mttrTime)}
              </span>
              {getStatusIcon()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-950"
            />
            Auto-scroll
          </label>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-black rounded-lg border border-slate-800 p-4 font-mono text-sm">
          <div className="mb-3 text-emerald-400 text-xs font-bold">
            $ CORE SRE Reliability Audit Trail
            {isTestActive && (
              <span className="ml-3 text-blue-400 animate-pulse">
                ● Monitoring Active
              </span>
            )}
          </div>
          
          <div
            ref={logContainerRef}
            className="space-y-1 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
          >
            {auditLogs.length === 0 ? (
              <div className="text-slate-500 text-xs">
                No audit logs yet. Start a reliability test to see live updates.
              </div>
            ) : (
              auditLogs.map((log, index) => (
                <div
                  key={index}
                  className="text-slate-300 text-xs leading-relaxed hover:bg-slate-900/50 px-2 py-1 rounded transition-colors"
                >
                  <span className="text-slate-500">{log.split(']')[0]}]</span>
                  <span className="ml-2">{log.split(']').slice(1).join(']')}</span>
                </div>
              ))
            )}
          </div>

          {isTestActive && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-blue-400 text-xs font-mono">
                  Real-time monitoring active...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReliabilityTerminal;
