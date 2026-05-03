import React, { useEffect } from 'react';
import { CheckCircle, Download, X, Trophy, Clock, Shield } from 'lucide-react';

const SuccessModal = ({ 
  isOpen, 
  onClose, 
  mttrTime, 
  auditLogs, 
  vulnerabilityType = "IndexError" 
}) => {
  // Add Escape key support
  useEffect(() => {
    try {
      const handleEscapeKey = (event) => {
        if (event.key === 'Escape' && isOpen) {
          console.log('🔄 NUCLEAR RESET: Escape key pressed!');
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        try {
          document.removeEventListener('keydown', handleEscapeKey);
        } catch (err) {
          console.error('Error removing escape key listener:', err);
        }
      };
    } catch (err) {
      console.error('Error setting up escape key listener:', err);
      return () => {}; // Return empty cleanup function
    }
  }, [isOpen, onClose]);

  console.log('🔄 NUCLEAR RESET: SuccessModal render, isOpen:', isOpen);
  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadAuditReport = () => {
    const timestamp = new Date().toISOString();
    const report = `CORE SRE Reliability Audit Report
Generated: ${timestamp}

=== EXECUTIVE SUMMARY ===
Status: ✅ SUCCESS
Vulnerability Type: ${vulnerabilityType}
Mean Time To Repair (MTTR): ${formatTime(mttrTime)}
System Status: Healthy

=== AUDIT TRAIL ===
${auditLogs.join('\n')}

=== PERFORMANCE METRICS ===
- Detection Time: Immediate
- Analysis Time: Automated
- Repair Time: ${formatTime(mttrTime)}
- Total Downtime: ${formatTime(mttrTime)}
- Autonomous Resolution: Yes

=== RECOMMENDATIONS ===
✅ System successfully recovered automatically
✅ No manual intervention required
✅ Agent demonstrated autonomous SRE capabilities
✅ MTTR within acceptable limits for production systems

This report demonstrates the effectiveness of autonomous recovery systems 
in minimizing downtime and reducing operational overhead.
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reliability-audit-report-${timestamp.split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none">
      <div className="mx-4 max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl pointer-events-auto" style={{ zIndex: 9999 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-full">
              <Trophy className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Reliability Audit Complete</h2>
              <p className="text-sm text-slate-400">System successfully recovered</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              console.log('🔄 NUCLEAR RESET: X button clicked!');
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            className="p-2 rounded-md hover:bg-slate-800 transition-colors z-[9999] relative cursor-pointer"
            style={{ zIndex: 9999 }}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success Message */}
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-white font-medium">
                Agent successfully repaired {vulnerabilityType} in sandbox environment.
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Autonomous recovery completed without manual intervention.
              </p>
            </div>
          </div>

          {/* MTTR Score Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">MTTR Score</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {formatTime(mttrTime)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Mean Time To Repair
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-slate-300">System Status</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                Healthy
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Fully Operational
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-slate-300">Audit Logs</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {auditLogs.length}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Events Tracked
              </div>
            </div>
          </div>

          {/* Professional Summary */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Performance Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Detection Method:</span>
                <span className="text-white">Automated Analysis</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Repair Strategy:</span>
                <span className="text-white">AI-Powered Fix Generation</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Human Intervention:</span>
                <span className="text-emerald-400">Not Required</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Business Impact:</span>
                <span className="text-emerald-400">Minimal Downtime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-slate-800 bg-slate-800/30">
          <div className="text-sm text-slate-400">
            This demonstrates enterprise-grade autonomous SRE capabilities
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadAuditReport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white hover:bg-slate-600 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Download Audit Report
            </button>
            <button
              onClick={(e) => {
                console.log('🔄 NUCLEAR RESET: Close Report button clicked!');
                e.stopPropagation();
                e.preventDefault();
                onClose();
              }}
              className="px-4 py-2 bg-emerald-600 border border-emerald-500 rounded-md text-white hover:bg-emerald-700 transition-colors text-sm font-medium z-[9999] relative cursor-pointer"
              style={{ zIndex: 9999 }}
            >
              Close Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
