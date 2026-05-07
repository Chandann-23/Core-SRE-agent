import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Clock, Activity, CheckCircle, XCircle, X } from 'lucide-react';

const ReliabilityTerminal = ({ 
  isOpen, 
  auditLogs, 
  isTestActive, 
  mttrTime, 
  systemStatus,
  formatTime,
  showWaitingMessage,
  onToggle,
  onResetTimer 
}) => {
  const logContainerRef = useRef(null);
  const terminalEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [auditLogs, autoScroll]);

  useEffect(() => {
    // Scroll to the bottom whenever auditLogs changes
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [auditLogs]);

  const getStatusIcon = () => {
    if (!isTestActive) return null;
    if (systemStatus === 'Healthy') return <CheckCircle className="w-4 h-4 text-cyan-400" />;
    if (systemStatus === 'Error') return <XCircle className="w-4 h-4 text-rose-400" />;
    return <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />;
  };

  const getStatusColor = () => {
    if (showWaitingMessage) return 'text-yellow-400 border-yellow-400/30';
    if (systemStatus === 'Healthy') return 'text-emerald-400 border-emerald-400/30 shadow-[0_0_15px_rgba(34,197,94,0.4)]';
    if (systemStatus === 'Error') return 'text-rose-400 border-rose-400/30';
    return 'text-cyan-400 border-cyan-400/30';
  };

  if (!isOpen) {
    return (
      <div className="border-t border-white/10 bg-slate-950/80 backdrop-blur-xl p-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-4 py-2 bg-[#161B22] border border-white/10 rounded text-slate-300 hover:bg-slate-800 transition-colors text-sm font-inter font-semibold"
        >
          <Terminal className="w-4 h-4" />
          View Live Audit Console
          {isTestActive && (
            <span className="ml-2 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">
              ACTIVE
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 bg-black animate-slideUpSpring">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 px-3 py-1.5 bg-black border border-white/10 rounded text-slate-300 hover:bg-white/10 transition-colors text-sm font-inter font-semibold"
          >
            <Terminal className="w-4 h-4" />
            Hide Console
          </button>
          
          {isTestActive && (
            <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-md ${getStatusColor()}`}>
              <Clock className="w-4 h-4" />
              <span className="font-inter text-sm font-bold">
                {showWaitingMessage ? 'Still waiting for cloud propagation...' : `MTTR: ${formatTime(mttrTime)}`}
              </span>
              {showWaitingMessage ? (
                <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse" />
              ) : (
                <>
                  {getStatusIcon()}
                  <button
                    onClick={onResetTimer}
                    className="ml-1 p-1 rounded hover:bg-slate-700 transition-colors"
                    title="Reset timer"
                  >
                    <X className="w-3 h-3 text-slate-400 hover:text-red-400" />
                  </button>
                </>
              )}
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
        <div className="bg-black border border-purple-400/30 p-4 font-mono text-sm">
          <div className="mb-3 text-purple-300 text-xs font-bold">
            $ CORE SRE Reliability Audit Trail
            {isTestActive && (
              <span className="ml-3 text-purple-400 animate-pulse">
                ● Monitoring Active
              </span>
            )}
          </div>
          
          <div
            ref={logContainerRef}
            className="space-y-0.5 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-black"
          >
            {auditLogs.length === 0 ? (
              <div className="text-purple-300 text-xs">
                Waiting for audit logs...
              </div>
            ) : (
              auditLogs.map((log, index) => (
                <div
                  key={index}
                  className="text-purple-300 text-xs leading-relaxed font-mono"
                >
                  <span className="text-purple-400 font-mono">{log.split(']')[0]}]</span>
                  <span className={`ml-2 ${index === auditLogs.length - 1 ? 'text-purple-200 font-semibold' : 'text-purple-300'}`}>
                    {log.split(']').slice(1).join(']')}
                  </span>
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>

          {isTestActive && (
            <div className="mt-3 pt-3 border-t border-purple-400/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <span className="text-purple-300 text-xs font-mono">
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
