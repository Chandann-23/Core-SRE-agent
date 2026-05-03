import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import ReactDiffViewer from "react-diff-viewer-continued";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Activity, Bug, ChevronDown, ChevronRight, FileCode, Folder, FolderOpen, PanelLeftClose, PanelLeftOpen, Plus, Terminal, Wrench, Play } from "lucide-react";
import logo from "./assets/logo.png";
import ReliabilityTerminal from "./components/ReliabilityTerminal";
import SuccessModal from "./components/SuccessModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const FALLBACK_CODE = `from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ProcessRequest(BaseModel):
    values: list[int]

@app.post("/process")
async def process_payload(payload: ProcessRequest) -> dict[str, int | None]:
    first = payload.values[0] if payload.values else None
    total = sum(payload.values)
    return {"first": first, "total": total}
`;
const SECTION_HEADER_REGEX = /##\s*(ANALYSIS|HYPOTHESIS|CODE|VERIFICATION)\b/gi;

function App() {
  const [code, setCode] = useState("");
  const [history, setHistory] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [oldCode, setOldCode] = useState("");
  const [isRepairing, setIsRepairing] = useState(false);
  const [status, setStatus] = useState("IDLE");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const lastLogRef = useRef(null);
  
  // Reliability Lab states
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isTestActive, setIsTestActive] = useState(false);
  const [mttrStartTime, setMttrStartTime] = useState(null);
  const [mttrTime, setMttrTime] = useState(0);
  const [systemStatus, setSystemStatus] = useState("Healthy");
  const [isRunningFullAudit, setIsRunningFullAudit] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [finalMttrTime, setFinalMttrTime] = useState(0);
  const [showWaitingMessage, setShowWaitingMessage] = useState(false);
  
  const auditPollRef = useRef(null);
  const mttrIntervalRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/status`);
      setCode(res.data.code_context);
      setSystemStatus(res.data.status);
      
      // Auto-stop MTTR timer when system becomes healthy
      if (res.data.status === 'Healthy' && isTestActive && mttrStartTime) {
        stopMttrTimer();
        setIsTestActive(false);
      }
    } catch (err) {
      setCode(FALLBACK_CODE);
      console.error("Backend offline");
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return "00:00";
    
    // Handle sub-second times
    if (seconds < 1) {
      const ms = Math.round(seconds * 1000);
      return `< 1s (${ms}ms)`;
    }
    
    // Handle times under 10 seconds with millisecond precision
    if (seconds < 10) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.round((seconds % 1) * 100);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    
    // Standard MM:SS format for longer times
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/audit-logs`);
      const newLogs = res.data.logs || [];
      
      // AGGRESSIVE SUCCESS LISTENER - Log is ground truth!
      if (newLogs.some(log => log.includes('System restored to healthy state'))) {
        console.log('🎯 SUCCESS DETECTED IN LOGS - Force stopping everything!');
        
        // Force stop everything immediately
        stopAuditPolling();
        stopMttrTimer();
        
        // Force set states
        setIsTestActive(false);
        setIsRunningFullAudit(false);
        setSystemStatus('Healthy');
        setShowWaitingMessage(false);
        
        // Trigger success immediately with accurate MTTR
        const accurateMttr = calculateMttrFromLogs();
        setFinalMttrTime(accurateMttr);
        setShowSuccessModal(true);
        
        return; // Don't update logs further
      }
      
      setAuditLogs(newLogs);
    } catch (err) {
      console.error("Failed to fetch audit logs");
    }
  };

  const startAuditPolling = () => {
    if (auditPollRef.current) return;
    
    // Initial fetch
    fetchAuditLogs();
    
    // Poll every 2 seconds
    auditPollRef.current = setInterval(fetchAuditLogs, 2000);
  };

  const startMttrTimer = () => {
    // Only start timer if not already running
    if (mttrIntervalRef.current) return;
    
    // Add 500ms delay to prevent identical start/stop times
    setTimeout(() => {
      const now = Date.now();
      setMttrStartTime(now);
      setMttrTime(0);
      
      mttrIntervalRef.current = setInterval(() => {
        setMttrTime(Math.floor((Date.now() - now) / 1000));
      }, 1000);
      
      console.log('⏱️ MTTR timer started with 500ms delay');
    }, 500);
  };

  const stopMttrTimer = () => {
    if (mttrIntervalRef.current) {
      clearInterval(mttrIntervalRef.current);
      mttrIntervalRef.current = null;
    }
  };

  const stopAuditPolling = () => {
    if (auditPollRef.current) {
      clearInterval(auditPollRef.current);
      auditPollRef.current = null;
    }
  };

  const checkForSuccessInLogs = () => {
    // Check if audit logs indicate success - BULLETPROOF detection
    const successIndicators = [
      'System restored to healthy state',
      '✅ System restored',
      'Agent successfully repaired',
      'Fix applied, validating solution'
    ];
    
    return auditLogs.some(log => 
      successIndicators.some(indicator => log.includes(indicator))
    );
  };

  const handleSuccessDetected = () => {
    // IMMEDIATE success handling - stop everything and show success
    console.log('🎯 SUCCESS DETECTED IN LOGS - Immediate response!');
    
    // Stop all monitoring
    stopAuditPolling();
    stopMttrTimer();
    
    // Calculate accurate MTTR from logs
    const accurateMttr = calculateMttrFromLogs();
    setFinalMttrTime(accurateMttr);
    
    // Update states immediately
    setIsTestActive(false);
    setIsRunningFullAudit(false);
    setSystemStatus('Healthy');
    setShowWaitingMessage(false);
    
    // Show success notification with accurate MTTR
    setShowSuccessModal(true);
  };

  const calculateMttrFromLogs = () => {
    // Calculate MTTR using log timestamps with millisecond precision
    if (auditLogs.length < 2) return 0.5; // Minimum 500ms
    
    // Find bug injection log (start time)
    const bugInjectionLog = auditLogs.find(log => 
      log.includes('Bug injection started') || 
      log.includes('Bug injected')
    );
    
    // Find success log (end time)
    const successLog = auditLogs.find(log => 
      log.includes('System restored to healthy state') ||
      log.includes('✅ System restored')
    );
    
    if (!bugInjectionLog || !successLog) return 0.5; // Minimum 500ms
    
    // Extract timestamps from log entries
    // Format: [HH:MM:SS.mmm] message
    const startTimestamp = bugInjectionLog.match(/\[(\d{2}:\d{2}:\d{2}\.\d{3})\]/)?.[1];
    const endTimestamp = successLog.match(/\[(\d{2}:\d{2}:\d{2}\.\d{3})\]/)?.[1];
    
    if (!startTimestamp || !endTimestamp) return 0.5; // Minimum 500ms
    
    // Convert to milliseconds and calculate difference
    const [startH, startM, startSAndMs] = startTimestamp.split(':');
    const [endH, endM, endSAndMs] = endTimestamp.split(':');
    
    const [startS, startMs] = startSAndMs.split('.').map(Number);
    const [endS, endMs] = endSAndMs.split('.').map(Number);
    
    const startTotalMs = (parseInt(startH) * 3600 + parseInt(startM) * 60 + startS) * 1000 + startMs;
    const endTotalMs = (parseInt(endH) * 3600 + parseInt(endM) * 60 + endS) * 1000 + endMs;
    
    const mttrMs = endTotalMs - startTotalMs;
    
    // Apply minimum floor for network/LLM realism
    return Math.max(mttrMs, 500) / 1000; // Convert to seconds, minimum 500ms
  };

  const handleResetTimer = () => {
    console.log('🔄 Manual timer reset triggered');
    
    // Stop everything
    stopAuditPolling();
    stopMttrTimer();
    
    // Reset all states
    setIsTestActive(false);
    setIsRunningFullAudit(false);
    setSystemStatus('Healthy');
    setShowWaitingMessage(false);
    setShowSuccessModal(false);
    
    // Reset timer
    setMttrTime(0);
    setMttrStartTime(null);
    setFinalMttrTime(0);
    
    // Clear logs for clean start
    setAuditLogs([]);
  };

  const showSuccessNotification = () => {
    // Calculate accurate MTTR from logs
    const accurateMttr = calculateMttrFromLogs();
    setFinalMttrTime(accurateMttr);
    setShowSuccessModal(true);
  };

  const clearAuditLogs = async () => {
    try {
      await axios.delete(`${API_BASE}/audit-logs`);
      setAuditLogs([]);
    } catch (err) {
      console.error("Failed to clear audit logs");
    }
  };

  const handleCloseSuccessModal = () => {
    console.log('🔄 Closing success modal and resetting all states');
    
    // Close the modal
    setShowSuccessModal(false);
    
    // Reset all related states for fresh start
    setIsTestActive(false);
    setIsRunningFullAudit(false);
    setSystemStatus('Healthy');
    setShowWaitingMessage(false);
    
    // Reset timer completely
    setMttrTime(0);
    setMttrStartTime(null);
    setFinalMttrTime(0);
    
    // Stop any running processes
    stopAuditPolling();
    stopMttrTimer();
    
    // Clear logs for clean start (optional - comment out if you want to keep logs)
    // setAuditLogs([]);
  };

  const runFullReliabilityAudit = async () => {
    if (isRunningFullAudit) return;
    
    setIsRunningFullAudit(true);
    try {
      // Step 1: Clear current logs
      await clearAuditLogs();
      
      // Step 2: Call /inject-bug
      setStatus("VULNERABLE");
      setShowDiff(false);
      await axios.post(`${API_BASE}/inject-bug`);
      await fetchStatus();
      
      // Step 3: Automatically open the terminal
      setIsTerminalOpen(true);
      
      // Step 4: Start monitoring (start timer only now)
      setIsTestActive(true);
      startAuditPolling();
      startMttrTimer(); // Start timer exactly when bug is injected
      
      // Step 5: Call /repair
      const res = await axios.post(`${API_BASE}/repair`);
      setHistory(Array.isArray(res.data.history) ? res.data.history : []);
      
      // Step 6: BULLETPROOF polling logic - logs are truth!
      const pollInterval = setInterval(async () => {
        await fetchStatus();
        await fetchAuditLogs();
        
        // IMMEDIATE SUCCESS DETECTION - Check logs first (they're faster)
        const logsIndicateSuccess = checkForSuccessInLogs();
        
        if (logsIndicateSuccess) {
          clearInterval(pollInterval);
          handleSuccessDetected();
          console.log('🎯 Success detected via audit logs (immediate response)');
          return;
        }
        
        // Fallback to status endpoint
        if (systemStatus === 'Healthy') {
          clearInterval(pollInterval);
          handleSuccessDetected();
          console.log('🎯 Success detected via status endpoint');
          return;
        }
      }, 1000);
      
      // Timeout after 3 minutes (180 seconds) - subtle warning instead of interruptive alert
      setTimeout(() => {
        // Only show warning if we haven't already detected success
        if (isTestActive) {
          clearInterval(pollInterval);
          stopAuditPolling();
          stopMttrTimer();
          setIsTestActive(false);
          setIsRunningFullAudit(false);
          setShowWaitingMessage(true);
          
          // Check one last time for success in logs
          const successInLogs = checkForSuccessInLogs();
          
          if (successInLogs) {
            console.log('🎯 Success detected via audit logs during timeout check');
            handleSuccessDetected();
          } else {
            console.log('⏱️ 3 minutes reached - showing subtle waiting message');
          }
        }
      }, 180000);
      
    } catch (err) {
      console.error("Full audit failed:", err);
      setIsRunningFullAudit(false);
      setIsTestActive(false);
      stopAuditPolling();
      stopMttrTimer();
      // No alert - just reset state for demo continuity
    }
  };

  const fetchPastSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/sessions`);
      const normalized = Array.isArray(res.data) ? res.data : [];
      setPastSessions(normalized);
      if (normalized.length > 0 && selectedSessionId === null) {
        setSelectedSessionId(normalized[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch sessions");
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchPastSessions();
  }, []);

  useEffect(() => {
    if (isTestActive) {
      document.title = "🔬 Reliability Test Active | CORE SRE";
    } else if (isRepairing) {
      document.title = "🛠️ Repairing... | CORE SRE";
    } else {
      document.title = "CORE SRE | Autonomous Recovery";
    }
  }, [isTestActive, isRepairing]);

  useEffect(() => {
    lastLogRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, isRepairing]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      stopAuditPolling();
      if (mttrIntervalRef.current) {
        clearInterval(mttrIntervalRef.current);
      }
    };
  }, []);

  const handleAction = async (type) => {
    if (type === "inject") {
      setStatus("VULNERABLE");
      setShowDiff(false);
      await axios.post(`${API_BASE}/inject-bug`);
      fetchStatus();
    } else {
      setOldCode(code || FALLBACK_CODE);
      setIsRepairing(true);
      setStatus("REPAIRING");
      try {
        const res = await axios.post(`${API_BASE}/repair`);
        setHistory(Array.isArray(res.data.history) ? res.data.history : []);
        setCode(res.data.final_code);
        setShowDiff(true);
        setStatus(res.data.is_fixed ? "RESOLVED" : "FAILED");
        await fetchPastSessions();
      } catch (err) {
        setStatus("ERROR");
      }
      setIsRepairing(false);
    }
  };

  const timelineEntries = history.flatMap((entry, index) => {
    const text = String(entry ?? "").trim();
    if (!text) {
      return [];
    }
    if (text.startsWith("$")) {
      return [{ id: `${index}-terminal`, type: "terminal", label: "Terminal", body: text }];
    }
    const sections = [...text.matchAll(SECTION_HEADER_REGEX)];
    if (!sections.length) {
      return [{ id: `${index}-note`, type: "section", label: "Note", body: text }];
    }

    const parsed = [];
    for (let i = 0; i < sections.length; i += 1) {
      const current = sections[i];
      const start = current.index ?? 0;
      const end = i + 1 < sections.length ? sections[i + 1].index ?? text.length : text.length;
      const chunk = text.slice(start, end).trim();
      const label = (current[1] || "Note").toUpperCase();
      const bodyWithoutHeader = chunk.replace(/^##\s*[A-Z]+\s*:?\s*/i, "").trim();
      const bodyWithoutCode = bodyWithoutHeader
        .replace(/```[\s\S]*?```/g, "[code block hidden]")
        .replace(/<code>[\s\S]*?<\/code>/gi, "[code block hidden]");
      parsed.push({
        id: `${index}-${label}-${i}`,
        type: label === "VERIFICATION" ? "verification" : "section",
        label,
        body: bodyWithoutCode || "No details provided.",
      });
    }
    return parsed;
  });

  return (
    <div className="h-screen w-full bg-[#0a0a0a] text-slate-200">
      <div className="flex h-full">
        <aside
          className={`shrink-0 overflow-hidden border-r border-slate-800 bg-slate-950 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "w-56 p-4 opacity-100" : "w-0 p-0 opacity-0"
          }`}
        >
          <div className="-m-4 mb-4 flex flex-col items-center justify-center border-b border-slate-900/50 bg-[#000000] py-10">
            <img src={logo} alt="CORE SRE" className="h-12 w-auto" />
            <div className="mt-4 font-mono text-lg font-bold tracking-[0.2em] text-white">CORE SRE</div>
            <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.3em] text-slate-500">
              Autonomous Recovery System
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="mb-3 flex w-full items-center justify-center rounded-md border border-slate-700 bg-slate-900 py-2 text-slate-300 hover:bg-slate-800"
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>

          {isSidebarOpen && (
            <>
              <div className="mb-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Project</div>
                <div className="w-full rounded-md border border-slate-800 bg-black/40 px-2 py-2 text-xs font-semibold text-slate-100">
                  PROJECT: SRE_SANDBOX
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Past Sessions</span>
              </div>
              <div className="space-y-2 text-sm">
                {pastSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => onSelectSession(session)}
                    className={`w-full rounded-md px-2 py-2 text-left transition ${
                      selectedSessionId === session.id
                        ? "border border-slate-700 bg-slate-900 text-slate-100"
                        : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                    }`}
                  >
                    <div className="truncate text-xs font-medium">
                      Session #{session.id}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate text-slate-400">{new Date(session.timestamp).toLocaleString()}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          session.is_fixed
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {session.is_fixed ? "Success" : "Failure"}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-[11px] text-slate-400">
                      {session.initial_code_snippet}
                    </div>
                  </button>
                ))}
                {!pastSessions.length && (
                  <div className="rounded-md border border-dashed border-slate-800 px-2 py-3 text-xs text-slate-500">
                    No saved sessions yet.
                  </div>
                )}
              </div>
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                <Plus size={14} />
                New Session
              </button>
            </>
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="relative flex h-14 items-center justify-between border-b border-slate-800 px-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-300 hover:bg-slate-800"
                aria-label={isSidebarOpen ? "Close history sidebar" : "Open history sidebar"}
              >
                {isSidebarOpen ? "<<" : ">>"}
              </button>
            </div>

            <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4">
              <img src={logo} alt="CORE SRE" className="h-9 w-auto opacity-95" />
              <div className="flex flex-col items-center">
                <div className="brand-title text-lg tracking-[0.35em] text-slate-100">CORE SRE</div>
                <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.3em] text-slate-500">
                  Autonomous Recovery System
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runFullReliabilityAudit}
                disabled={isRunningFullAudit || isTestActive}
                className="inline-flex items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 font-semibold"
              >
                <Play size={14} className={isRunningFullAudit ? "animate-pulse" : ""} />
                {isRunningFullAudit ? "Running Audit..." : "Run Full Reliability Audit"}
              </button>
              <button
                type="button"
                onClick={() => handleAction("inject")}
                disabled={isTestActive}
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Bug size={14} />
                Inject Bug
              </button>
              <button
                type="button"
                onClick={() => handleAction("repair")}
                disabled={isRepairing || isTestActive}
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-100 px-3 py-1.5 text-xs text-slate-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRepairing ? <Activity size={14} className="animate-spin" /> : <Wrench size={14} />}
                Repair
              </button>
            </div>
          </header>

          <section className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_340px]">
            <div className="min-h-0 border-b border-r border-slate-800 p-4 lg:border-b-0">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Explorer</div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-slate-200">
                  <ChevronDown size={14} />
                  <FolderOpen size={14} />
                  <span>target_sandbox</span>
                </div>
                <div className="ml-5 flex items-center gap-2 text-slate-300">
                  <ChevronRight size={14} className="opacity-0" />
                  <Folder size={14} />
                  <span>app</span>
                </div>
                <div className="ml-11 flex items-center gap-2 rounded bg-slate-900/60 px-2 py-1 text-slate-100">
                  <FileCode size={14} />
                  <span>main.py</span>
                </div>
                <div className="ml-5 flex items-center gap-2 text-slate-300">
                  <ChevronRight size={14} className="opacity-0" />
                  <Folder size={14} />
                  <span>tests</span>
                </div>
                <div className="ml-11 flex items-center gap-2 px-2 py-1 text-slate-400">
                  <FileCode size={14} />
                  <span>test_app.py</span>
                </div>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-col border-b border-r border-slate-800 lg:border-b-0">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="text-xs text-slate-400">target_sandbox/app/main.py</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDiff(false)}
                    className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      !showDiff ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    Source
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDiff(true)}
                    className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      showDiff ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    Diff
                  </button>
                  <div className="text-xs text-slate-500">{status}</div>
                </div>
              </div>
              <div className="code-panel-reset h-full flex-1 overflow-y-auto overflow-x-hidden">
                {showDiff ? (
                  <div className="h-full overflow-auto bg-[#050505] p-2">
                    <ReactDiffViewer
                      oldValue={oldCode || ""}
                      newValue={code || FALLBACK_CODE}
                      splitView
                      useDarkTheme
                      leftTitle="Before"
                      rightTitle="After"
                      styles={{
                        diffContainer: {
                          background: "#050505",
                        },
                        contentText: {
                          fontFamily: "'Fira Code', monospace",
                          fontSize: "13px",
                          lineHeight: 1.6,
                        },
                        line: {
                          background: "#050505",
                        },
                        marker: {
                          background: "#050505",
                        },
                        wordAdded: {
                          background: "rgba(34, 197, 94, 0.1)",
                        },
                        lineNumber: {
                          color: "#94a3b8",
                        },
                        wordRemoved: {
                          background: "rgba(239, 68, 68, 0.1)",
                        },
                        gutter: {
                          background: "#050505",
                        },
                        highlightedGutter: {
                          background: "#050505",
                        },
                        highlightedLine: {
                          background: "#050505",
                        },
                      }}
                    />
                  </div>
                ) : (
                  <pre className="text-left whitespace-pre-wrap break-words">
                    <SyntaxHighlighter
                      language="python"
                      style={atomDark}
                      wrapLongLines
                      wrapLines
                      className="code-highlighter-reset text-left whitespace-pre-wrap break-words"
                      lineProps={{
                        style: {
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          textAlign: "left",
                          lineHeight: "1.6",
                        },
                      }}
                      customStyle={{
                        margin: 0,
                        minHeight: "100%",
                        background: "#0a0a0a",
                        fontSize: "13px",
                        lineHeight: "1.6",
                        padding: "20px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        overflowX: "hidden",
                        textAlign: "left",
                        letterSpacing: "normal",
                        fontFamily: "'Fira Code', monospace",
                      }}
                    >
                      {code || FALLBACK_CODE}
                    </SyntaxHighlighter>
                  </pre>
                )}
              </div>
              {isRepairing && (
                <div className="pointer-events-none absolute inset-x-0 top-[45px] bottom-0 overflow-hidden">
                  <div className="absolute inset-0 animate-[editorPulse_2.8s_ease-in-out_infinite] bg-cyan-400/5" />
                  <div className="h-12 w-full animate-[scan_2.2s_linear_infinite] bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent" />
                </div>
              )}
            </div>

            <div className="min-h-0 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Terminal size={14} />
                Terminal / Timeline
              </div>
              <div className="activity-scrollbar h-[calc(100%-24px)] space-y-3 overflow-auto pr-1">
                {timelineEntries.map((entry, index) =>
                  entry.type === "terminal" ? (
                    <div
                      key={entry.id}
                      ref={index === timelineEntries.length - 1 && !isRepairing ? lastLogRef : null}
                      className="flex items-center justify-between rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-emerald-300"
                    >
                      <span>{entry.body.startsWith("$") ? entry.body : `$ ${entry.body}`}</span>
                      <span className="ml-3 h-3 w-[2px] animate-pulse bg-emerald-300/90" />
                    </div>
                  ) : (
                    <div
                      key={entry.id}
                      ref={index === timelineEntries.length - 1 && !isRepairing ? lastLogRef : null}
                      className={`max-w-[95%] rounded-md border-l-2 border-blue-500 bg-slate-900/40 px-3 py-2 ${
                        entry.type === "verification" ? "text-emerald-100" : "text-slate-100"
                      }`}
                    >
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                        {entry.label}
                      </div>
                      <div className="text-[13px] leading-relaxed">{entry.body}</div>
                    </div>
                  ),
                )}
                {!timelineEntries.length && (
                  <>
                    <div className="rounded border border-slate-800 bg-black/40 px-3 py-2 font-mono text-xs text-emerald-300">
                      $ pytest -q target_sandbox/tests/test_app.py
                    </div>
                    <div className="max-w-[95%] rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
                      Agent thought: Ready to inject a bug or run autonomous repair.
                    </div>
                  </>
                )}
                {isRepairing && (
                  <div className="max-w-[95%] rounded-md border-l-2 border-blue-500 bg-slate-900/40 px-3 py-2 text-[13px] leading-relaxed text-slate-200">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">Analysis</div>
                    Agent thought: analyzing traceback, patching logic, and validating with pytest...
                  </div>
                )}
                {isRepairing && (
                  <div ref={lastLogRef} className="rounded border border-slate-800 bg-black/40 px-3 py-2 font-mono text-xs text-emerald-300">
                    $ running repair workflow
                  </div>
                )}
                {!isRepairing && !timelineEntries.length && (
                  <div ref={lastLogRef} className="text-xs text-slate-500">
                    No timeline entries yet.
                  </div>
                )}
              </div>
            </div>
          </section>
          
          <ReliabilityTerminal
            isOpen={isTerminalOpen}
            auditLogs={auditLogs}
            isTestActive={isTestActive}
            mttrTime={mttrTime}
            systemStatus={systemStatus}
            formatTime={formatTime}
            showWaitingMessage={showWaitingMessage}
            onToggle={() => setIsTerminalOpen(!isTerminalOpen)}
            onResetTimer={handleResetTimer}
          />
          
          <SuccessModal
            isOpen={showSuccessModal}
            onClose={handleCloseSuccessModal}
            mttrTime={finalMttrTime}
            auditLogs={auditLogs}
            vulnerabilityType="IndexError"
          />
        </main>
      </div>
    </div>
  );
}

export default App;