import React, { useEffect, useState } from "react";
import axios from "axios";
import { Activity, Bug, FileCode, Folder, FolderOpen, Play, Wrench, X, Terminal, CheckCircle } from "lucide-react";
import SuccessModal from "./components/SuccessModal";
import CodeViewer from "./components/CodeViewer";
import TerminalTimeline from "./components/TerminalTimeline";
import MetricsPanel from "./components/MetricsPanel";
import SystemMetricsChart from "./components/SystemMetricsChart";
import InfrastructureMap from "./components/InfrastructureMap";
import UnitTestMatrix from "./components/UnitTestMatrix";
import { useSREEngine } from "./hooks/useSREEngine";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:7860";

function App() {
  const {
    status,
    history,
    auditLogs,
    code,
    oldCode,
    mttrTime,
    finalMttrTime,
    testResults,
    injectBug,
    runRepair,
    approveRepair,
    runFullAudit,
    resetSystem,
    setCode,
    fetchFileContent
  } = useSREEngine();

  const [availableFiles, setAvailableFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState("main.py");
  const [backendStatus, setBackendStatus] = useState("Checking backend...");
  const [isRunningFullAudit, setIsRunningFullAudit] = useState(false);
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // File Loading
  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Show success modal when restored
  useEffect(() => {
    if (status === "RESTORED") {
      setShowSuccessModal(true);
      setIsRunningFullAudit(false);
    }
  }, [status]);

  // Handle Full Audit auto-repair
  useEffect(() => {
    if (isRunningFullAudit && status === "VULNERABLE") {
      // Small delay for visual effect
      setTimeout(() => {
        runRepair();
      }, 1000);
    }
  }, [status, isRunningFullAudit, runRepair]);

  const handleFullAudit = async () => {
    setIsRunningFullAudit(true);
    await runFullAudit(); // Actually injectBug underneath
  };

  const checkBackendHealth = async () => {
    try {
      const res = await axios.get(`${API_BASE}/health`);
      if (res.data && res.data.status === 'healthy') {
        setBackendStatus('Backend Verified: WS endpoint active');
        fetchFiles();
      }
    } catch (err) {
      setBackendStatus('Backend unavailable. Is simple_api.py running?');
      setTimeout(checkBackendHealth, 5000);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API_BASE}/files`);
      if (res.data && res.data.files) {
        setAvailableFiles(res.data.files);
        fetchFileContent("main.py");
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0A0F] text-gray-300 font-sans overflow-hidden">
      
      {/* Left Sidebar: Infrastructure Explorer */}
      {isSidebarOpen && (
        <div className="w-64 bg-[#0A0A0F] border-r border-[#2A2B3D] flex flex-col shrink-0 transition-all duration-300">
          <div className="h-14 flex items-center px-4 border-b border-[#2A2B3D] shrink-0">
            <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">EXPLORER</span>
          </div>
          
          <div className="flex-1 flex flex-col min-h-0">
            <div className="h-1/2 min-h-[300px] flex flex-col shrink-0">
              <InfrastructureMap 
                status={status} 
                currentFile={currentFile} 
                onFileSelect={(filename) => {
                  setCurrentFile(filename);
                  fetchFileContent(filename);
                }} 
              />
            </div>
            <UnitTestMatrix testResults={testResults} status={status} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="h-14 bg-[#0A0A0F] border-b border-[#2A2B3D] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-[#2A2B3D] rounded text-gray-400">
              <Folder className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center ml-4 cursor-pointer" onClick={() => setIsAboutOpen(true)}>
              <h1 className="text-lg font-mono font-bold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                CORE SRE
              </h1>
              <span className="text-[8px] uppercase tracking-[0.3em] text-indigo-500/70 font-bold -mt-1">
                Autonomous Recovery System
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleFullAudit}
              disabled={status !== "HEALTHY"}
              className="flex items-center px-4 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#2A2B3D] rounded bg-[#11121C] hover:bg-[#1A1C29] text-gray-300 disabled:opacity-50 transition-colors"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Full Reliability Audit
            </button>
            <div className="w-px h-6 bg-[#2A2B3D] mx-1"></div>
            <button
              onClick={injectBug}
              disabled={status !== "HEALTHY" && status !== "RESTORED"}
              className="flex items-center px-4 py-1.5 text-xs font-bold uppercase tracking-wider border border-red-900/50 rounded bg-red-900/10 hover:bg-red-900/20 text-red-400 disabled:opacity-50 transition-colors"
            >
              <Bug className="w-4 h-4 mr-2" />
              Inject Bug
            </button>
            <button
              onClick={runRepair}
              disabled={status !== "VULNERABLE"}
              className={`flex items-center px-4 py-1.5 text-xs font-bold uppercase tracking-wider border rounded transition-colors ${
                status === "VULNERABLE" 
                  ? "border-indigo-900/50 bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-300" 
                  : "border-[#2A2B3D] bg-[#11121C] text-gray-500 opacity-50"
              }`}
            >
              <Wrench className="w-4 h-4 mr-2" />
              Repair
            </button>
            <button
              onClick={approveRepair}
              disabled={status !== "PENDING_APPROVAL"}
              className={`flex items-center px-4 py-1.5 text-xs font-bold uppercase tracking-wider border rounded transition-all duration-300 ${
                status === "PENDING_APPROVAL" 
                  ? "border-emerald-500/50 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse" 
                  : "border-[#2A2B3D] bg-[#11121C] text-gray-500 opacity-50 hidden"
              }`}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Patch
            </button>
            <button
              onClick={resetSystem}
              className="flex items-center px-4 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#2A2B3D] rounded hover:bg-[#2A2B3D] text-gray-400 transition-colors"
            >
              Reset
            </button>
          </div>
        </header>

        {/* Central Workspace */}
        <div className="flex-1 flex min-h-0">
          
          <div className="flex-1 flex flex-col min-w-0 border-r border-[#2A2B3D]">
            {/* Top Metrics Panel */}
            <MetricsPanel 
              status={status} 
              mttrTime={mttrTime} 
              finalMttrTime={finalMttrTime} 
              auditLogsCount={auditLogs.length} 
            />
            
            {/* Code Viewer (Monaco) */}
            <CodeViewer 
              showDiff={status === "RESTORED" || status === "REPAIRING" || status === "PENDING_APPROVAL"} 
              oldCode={oldCode} 
              code={code} 
              currentFile={currentFile} 
            />
          </div>

          {/* Right Sidebar: Timeline and Telemetry */}
          <div className="w-96 flex flex-col shrink-0 bg-[#0A0A0F]">
            <div className="flex-1 min-h-0 flex flex-col border-b border-[#2A2B3D]">
              <TerminalTimeline history={history} />
            </div>
            <div className="h-[220px] shrink-0 flex flex-col bg-[#11121C]">
              <SystemMetricsChart status={status} />
            </div>
          </div>
        </div>

        {/* Bottom Console: Real-time Audit Logs */}
        <div className="h-48 border-t border-[#2A2B3D] bg-[#0A0A0F] flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2B3D] bg-[#11121C]">
            <div className="text-[10px] font-bold text-gray-400 tracking-[0.2em] flex items-center">
              <Terminal className="w-3 h-3 mr-2" />
              CORE SRE Audit Trail
            </div>
            <div className="text-[10px] text-gray-500 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${backendStatus.includes('Verified') ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              {backendStatus}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed text-gray-400 custom-scrollbar flex flex-col-reverse">
            {auditLogs.length === 0 ? (
              <span className="italic opacity-50">Waiting for audit logs...</span>
            ) : (
              [...auditLogs].reverse().map((log, i) => (
                <div key={i} className={`py-0.5 ${log.includes('✅') || log.includes('passed') ? 'text-emerald-400' : log.includes('❌') || log.includes('failed') ? 'text-red-400' : log.includes('Phase') ? 'text-blue-300' : ''}`}>
                  <span className="opacity-50 mr-3">&gt;</span>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {showSuccessModal && (
        <SuccessModal 
          onClose={() => setShowSuccessModal(false)}
          mttrScore={finalMttrTime}
          auditLogsCount={auditLogs.length}
        />
      )}

    </div>
  );
}

// Minimal icon component
function ChevronDownIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

export default App;
