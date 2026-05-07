import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import ReactDiffViewer from "react-diff-viewer-continued";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Activity, Bug, ChevronDown, ChevronRight, FileCode, Folder, FolderOpen, PanelLeftClose, PanelLeftOpen, Plus, Terminal, Wrench, Play, X } from "lucide-react";
import ReliabilityTerminal from "./components/ReliabilityTerminal";
import SuccessModal from "./components/SuccessModal";

const API_BASE = import.meta.env.VITE_API_URL || "https://chandann-23-core-sre-backend.hf.space";
const FALLBACK_CODE = `fastapi import FastAPI

app = FastAPI()

class ProcessRequest(BaseModel):
    values: list[int]

@app.post("/process")
async def process_payload(payload: ProcessRequest) -> dict[str, int | None]:
    first = payload.values[0] if payload.values else None
    total = sum(payload.values)
    return {"first": first, "total": total}
`;
const axiosInstance = axios.create({
  timeout: 30000, // 30 seconds timeout for Hugging Face
  headers: {
    'Content-Type': 'application/json',
  },
});

const apiCall = async (method, url, data = null) => {
  try {
    const config = {
      method,
      url: `${API_BASE}${url}`,
      timeout: 60000, // 60 seconds timeout
    };
    if (data) {
      config.data = data;
    }
    const response = await axiosInstance(config);
    return response;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - Hugging Face backend may be starting up');
      throw new Error('Backend request timeout. Please try again in a moment.');
    }
    throw error;
  }
};

const SECTION_HEADER_REGEX = /##\s*(ANALYSIS|HYPOTHESIS|CODE|VERIFICATION)\b/gi;

function App() {
  console.log('🚀 App function called');
  const [code, setCode] = useState("");
  const [history, setHistory] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [oldCode, setOldCode] = useState("");
  const [isRepairing, setIsRepairing] = useState(false);
  const [status, setStatus] = useState("IDLE");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const lastLogRef = useRef(null);
  
  // Reliability Lab states
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isTestActive, setIsTestActive] = useState(false);
  const [mttrStartTime, setMttrStartTime] = useState(null);
  const [mttrTime, setMttrTime] = useState(0);
  const [repairStartTime, setRepairStartTime] = useState(null);
  const [repairEndTime, setRepairEndTime] = useState(null);
  const [systemStatus, setSystemStatus] = useState("Healthy");
  const [isRunningFullAudit, setIsRunningFullAudit] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [finalMttrTime, setFinalMttrTime] = useState(0);
  const [immediateMttrTime, setImmediateMttrTime] = useState("00:00");
  const [showWaitingMessage, setShowWaitingMessage] = useState(false);
  const [currentFile, setCurrentFile] = useState("main.py");
  const [AVAILABLE_FILES, setAvailableFiles] = useState([]);
  const [backendStatus, setBackendStatus] = useState('Checking backend...');
  const [repairStatus, setRepairStatus] = useState('');
  const [isPollingFile, setIsPollingFile] = useState(false);
  const healthCheckRef = useRef(null);
  const filePollRef = useRef(null);
  
  const auditPollRef = useRef(null);
  const mttrIntervalRef = useRef(null);

  const startPersistentHealthCheck = () => {
    // Clear any existing health check interval
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current);
    }
    
    console.log('🔄 Starting persistent health check every 5 seconds...');
    setBackendStatus('Checking backend...');
    
    // Poll every 5 seconds indefinitely until success
    healthCheckRef.current = setInterval(async () => {
      try {
        const healthUrl = `${API_BASE}/health`;
        console.log(`🔍 Pinging health endpoint: ${healthUrl}`);
        
        const res = await apiCall('get', '/health');
        if (res.data && res.data.status === 'healthy') {
          console.log('✅ Backend Verified: simple_api logic active');
          setBackendStatus('Backend Verified: simple_api logic active');
          
          // Stop persistent polling on success
          if (healthCheckRef.current) {
            clearInterval(healthCheckRef.current);
            healthCheckRef.current = null;
          }
          
          // Fetch files once health check passes
          await fetchComplexFiles();
        }
      } catch (err) {
        console.log(`❌ Health check failed: ${err.message || 'Network error'}`);
        setBackendStatus(`Backend unavailable (${new Date().toLocaleTimeString()})`);
      }
    }, 5000); // Every 5 seconds
  };

  const checkBackendHealth = async (retryCount = 0) => {
    try {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
      if (retryCount > 0) {
        console.log(`Retrying health check (${retryCount}/3) in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const res = await apiCall('get', '/health');
      if (res.data && res.data.status === 'healthy') {
        console.log('✅ Backend Verified: simple_api logic active');
        setBackendStatus('Backend Verified: simple_api logic active');
        // Once health check passes, fetch files
        await fetchComplexFiles();
        return true;
      }
    } catch (err) {
      console.error(`Health check failed (attempt ${retryCount + 1}/3):`, err);
      if (retryCount < 2) {
        await checkBackendHealth(retryCount + 1);
      } else {
        console.error('Backend health check failed after 3 attempts, starting persistent polling');
        startPersistentHealthCheck();
      }
    }
  };

  const fetchComplexFiles = async (retryCount = 0) => {
    try {
      const res = await apiCall('get', '/files');
      if (res.data && res.data.files) {
        setAvailableFiles(res.data.files || []);
        setCurrentFile(res.data.current_file || "main.py");
        // Fetch the default file content
        await fetchComplexFileContent(res.data.current_file || "main.py");
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
      setAvailableFiles([
        {name: "main.py", path: "complex_sandbox/app/main.py", type: "main"},
        {name: "utils.py", path: "complex_sandbox/app/utils.py", type: "utils"}
      ]);
    }
  };

  const pollFileContent = async (filename, maxAttempts = 20) => {
    setIsPollingFile(true);
    setRepairStatus('Generating Repair Strategy...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`📊 [Polling] Attempt ${attempt}/${maxAttempts} for ${filename}`);
        const res = await apiCall('get', `/get-file/complex_sandbox/app/${filename}`);
        
        if (res.data && res.data.content && res.data.content.trim() !== '') {
          console.log(`✅ [Polling] Success - Got content for ${filename}`);
          setCode(res.data.content);
          setCurrentFile(res.data.filename || filename);
          setRepairStatus('');
          setIsPollingFile(false);
          return true;
        }
      } catch (err) {
        console.log(`❌ [Polling] Attempt ${attempt} failed:`, err.message);
      }
      
      // Wait 3 seconds between attempts
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        setRepairStatus(`Generating Repair Strategy... (${attempt}/${maxAttempts})`);
      }
    }
    
    console.log(`🛑 [Polling] Failed after ${maxAttempts} attempts`);
    setRepairStatus('Repair strategy generation failed');
    setIsPollingFile(false);
    return false;
  };

  const validateDiffContent = async (filename, maxAttempts = 15) => {
    // Enhanced validation for empty 'After' content in diff
    console.log(`🔍 [Diff Validation] Checking diff content for ${filename}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await apiCall('get', `/get-file/complex_sandbox/app/${filename}`);
        
        if (res.data && res.data.content && res.data.content.trim() !== '') {
          // Check if content is meaningful (not just placeholder)
          const content = res.data.content.trim();
          const isMeaningful = content.length > 50 && !content.includes('# File content not available') && !content.includes('# Backend unavailable');
          
          if (isMeaningful) {
            console.log(`✅ [Diff Validation] Found meaningful content (${content.length} chars)`);
            return {
              success: true,
              content: res.data.content,
              filename: res.data.filename || filename
            };
          }
        }
      } catch (err) {
        console.log(`❌ [Diff Validation] Attempt ${attempt} failed:`, err.message);
      }
      
      // Wait 5 seconds between validation attempts
      if (attempt < maxAttempts) {
        console.log(`🔄 [Diff Validation] Retrying in 5 seconds... (${attempt}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`🛑 [Diff Validation] No meaningful content found after ${maxAttempts} attempts`);
    return {
      success: false,
      content: '# Diff validation failed - no meaningful content found',
      filename: filename
    };
  };

  const fetchComplexFileContent = async (filename = "main.py", retryCount = 0) => {
    try {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
      if (retryCount > 0) {
        console.log(`Retrying file content fetch (${retryCount}/3) in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const res = await apiCall('get', `/get-file/complex_sandbox/app/${filename}`);
      if (res.data && res.data.content) {
        setCode(res.data.content);
        setCurrentFile(res.data.filename || filename);
      } else {
        setCode("# File content not available");
      }
    } catch (err) {
      console.error(`Failed to fetch ${filename}:`, err);
      
      // Exponential backoff retry for 404/500 errors
      if (retryCount < 3 && (err.response?.status === 404 || err.response?.status === 500)) {
        console.log(`Retrying file content fetch (${retryCount + 1}/3) with exponential backoff...`);
        setTimeout(() => fetchComplexFileContent(filename, retryCount + 1), 1000 * Math.pow(2, retryCount));
      } else {
        // Show backend status instead of static error
        setCode(`# ${backendStatus}`);
        setShowWaitingMessage(true);
      }
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return "00:00";
    
    // Handle if input is already a formatted string (like "00:14")
    if (typeof seconds === 'string') {
      return seconds; // Return as-is if already formatted
    }
    
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

const calculateAccurateMttr = (startTime, endTime) => {
  if (!startTime || !endTime) return "00:00";

  const diffMs = endTime - startTime;
  const totalSeconds = Math.floor(diffMs / 1000);

  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");

  const secs = (totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
};

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/audit-logs`);
      const newLogs = res.data.logs || [];
      console.log('📊 Polling: Fetched', newLogs.length, 'logs from backend');
      
      // AGGRESSIVE SUCCESS LISTENER - Log is ground truth!
      if (newLogs.some(log => log.includes('System restored to healthy state'))) {
        console.log('🎯 SUCCESS DETECTED IN LOGS - Force stopping everything!');
        
        // Force stop everything immediately and get final MTTR
        stopAuditPolling();
        const finalTime = stopMttrTimer();
        setImmediateMttrTime(finalTime);
        
        // Force set states
        setIsTestActive(false);
        setIsRunningFullAudit(false);
        setSystemStatus('Healthy');
        setShowWaitingMessage(false);
        
        // Trigger success immediately
        setShowSuccessModal(true);
        
        return; // Don't update logs further
      }
      
      console.log('📝 Updating auditLogs with', newLogs.length, 'entries');
      setAuditLogs(newLogs);
    } catch (err) {
      console.error("❌ Failed to fetch audit logs:", err);
    }
  };

  const startAuditPolling = () => {
    if (auditPollRef.current) return;
    
    console.log('🔄 Starting enhanced audit polling every 1 second...');
    // Initial fetch
    fetchAuditLogs();
    
    // Poll every 1 second for more real-time updates
    auditPollRef.current = setInterval(fetchAuditLogs, 1000);
  };

  const startMttrTimer = () => {
  if (mttrIntervalRef.current) return;

  const start = Date.now();

  setRepairStartTime(start);
  setMttrTime(0);

  mttrIntervalRef.current = setInterval(() => {
    const elapsed = Math.floor((Date.now() - start) / 1000);
    setMttrTime(elapsed);
  }, 1000);
};

  const stopMttrTimer = () => {
  if (mttrIntervalRef.current) {
    clearInterval(mttrIntervalRef.current);
    mttrIntervalRef.current = null;
  }

  const end = Date.now();
  setRepairEndTime(end);

  if (repairStartTime) {
    const finalTime = calculateAccurateMttr(repairStartTime, end);
    setFinalMttrTime(finalTime);
    return finalTime; // Return the calculated time for immediate use
  }
  return "00:00";
};

  const stopAuditPolling = () => {
    try {
      if (auditPollRef.current) {
        clearInterval(auditPollRef.current);
        auditPollRef.current = null;
      }
    } catch (err) {
      console.error("Error stopping audit polling:", err);
    }
  };

  const checkForSuccessInLogs = () => {
    // Check if audit logs indicate success - Updated for 6-step analysis process
    const successIndicators = [
      'System restored successfully after bug fix',
      'Executed pytest /tmp/complex_sandbox/tests/test_app.py with result status=passed',
      '🎉 [Executor] System restored - All tests passed!',
      '🎉 [Graph] Bug fixed successfully!',
      'Step 4: Call /repair',
      'Step 5: Start audit polling'
    ];
    
    return auditLogs.some(log => 
      successIndicators.some(indicator => log.includes(indicator))
    );
  };

  const handleSuccessDetected = () => {
    // IMMEDIATE success handling - stop everything and show success
    console.log('🎯 SUCCESS DETECTED IN LOGS - Immediate response!');
    
    // Stop all monitoring and get final MTTR
    stopAuditPolling();
    const finalTime = stopMttrTimer();
    
    // Set immediate MTTR time for modal
    setImmediateMttrTime(finalTime);
    
    // Update states immediately
    setIsTestActive(false);
    setIsRunningFullAudit(false);
    setSystemStatus('Healthy');
    setShowWaitingMessage(false);
    
    // Show success notification with accurate MTTR
    setShowSuccessModal(true);
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
  };

  const handleRunAudit = async () => {
    try {
      // Reset all states
      setHistory([]);
      setFinalMttrTime(0);
      
      // Clear logs for clean start
      setAuditLogs([
        "[00:00] 🚀 Starting autonomous repair process...",
        "[00:01] 🔍 Initializing SRE audit pipeline...",
        "[00:02] 🧠 Connecting to GLM-5.1 neural engine..."
      ]);
      
      // Reset all related states for fresh start
      setIsTestActive(false);
      setIsRunningFullAudit(false);
      setSystemStatus('Healthy');
      setShowWaitingMessage(false);
      
      // Reset timer completely
      setMttrTime(0);
      setMttrStartTime(null);
      setFinalMttrTime(0);
      setImmediateMttrTime("00:00");
      
      // Stop any running processes
      stopAuditPolling();
      stopMttrTimer();
      
      // Clear audit logs from backend
      try {
        await axios.delete(`${API_BASE}/audit-logs`);
      } catch (err) {
        console.error('Failed to clear logs:', err);
      }
      
      // Step 2: Call /inject-bug
      // Capture current clean code before bug injection
      const currentCleanCode = code || FALLBACK_CODE;
      setOldCode(currentCleanCode);
      setStatus("VULNERABLE");
      setShowDiff(false);
      
      setHistory(prev => [...prev, "$ Injecting simulated vulnerabilities..."]);
      await axios.post(`${API_BASE}/inject-bug`);
      
      setHistory(prev => [...prev, "$ Vulnerabilities injected - system compromised"]);
      
      // Step 3: Start MTTR timer
      startMttrTimer();
      setIsTestActive(true);
      setShowWaitingMessage(false);
      
      setHistory(prev => [...prev, "$ MTTR timer started - monitoring repair process"]);
      
      // Step 4: Call /repair
      setHistory(prev => [...prev, "$ Initiating autonomous repair sequence..."]);
      await axios.post(`${API_BASE}/repair`);
      
      setHistory(prev => [...prev, "$ Repair sequence initiated - monitoring progress"]);
      
      // Step 5: Start enhanced log polling (replacing broken EventSource)
      startAuditPolling();
      
      // Step 6: Refresh code display after repair starts
      const pollInterval = setInterval(async () => {
        await fetchComplexFileContent(currentFile);
        await fetchAuditLogs();
        
        // IMMEDIATE SUCCESS DETECTION - Check logs first (they're faster)
        const logsIndicateSuccess = checkForSuccessInLogs();
        
        if (logsIndicateSuccess) {
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

  const onSelectSession = (session) => {
    setSelectedSessionId(session.id);
    setCode(session.initial_code_snippet || FALLBACK_CODE);
    setHistory(session.history || []);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setFinalMttrTime(0);
    setImmediateMttrTime("00:00");
  };

  const runFullReliabilityAudit = async () => {
    if (isRunningFullAudit) return;
    
    setIsRunningFullAudit(true);
    setIsTerminalOpen(true);
    
    // Add real-time timeline entries
    setHistory(prev => [...prev, "$ Starting full reliability audit..."]);
    setHistory(prev => [...prev, "$ Initializing SRE pipeline..."]);
    setHistory(prev => [...prev, "$ Invoking GLM-5.1 Neural Engine..."]);
    
    // Inject initialization logs immediately
    setAuditLogs([
      "[00:00] 🔍 Initializing SRE pipeline...",
      "[00:01] 🧠 Invoking GLM-5.1 Neural Engine..."
    ]);
    
    try {
      // Refresh hook: Ensure we're seeing the latest complex sandbox code
      await fetchComplexFiles();
      await fetchComplexFileContent("main.py");
      
      // Step 1: Clear current logs
      try {
        await axios.delete(`${API_BASE}/audit-logs`);
      } catch (err) {
        console.error('Failed to clear logs:', err);
      }
      
      // Step 2: Call /inject-bug
      // Capture current clean code before bug injection
      const currentCleanCode = code || FALLBACK_CODE;
      setOldCode(currentCleanCode);
      setStatus("VULNERABLE");
      setShowDiff(false);
      
      setHistory(prev => [...prev, "$ Capturing clean code for diff comparison..."]);
      
      await axios.post(`${API_BASE}/inject-bug`);
      
      // Step 3: Start MTTR timer
      startMttrTimer();
      setIsTestActive(true);
      setShowWaitingMessage(false);
      
      // Step 4: Call /repair
      await axios.post(`${API_BASE}/repair`);
      
      // Step 5: Start audit polling
      startAuditPolling();
      
      // Step 6: Refresh code display after repair starts
      const pollInterval = setInterval(async () => {
        await fetchComplexFileContent(currentFile);
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
      console.error('Full audit failed:', err);
      setIsRunningFullAudit(false);
      setIsTestActive(false);
      stopAuditPolling();
      stopMttrTimer();
      // No alert - just reset state for demo continuity
    }
  };

  const fetchPastSessions = async () => {
    try {
      const res = await apiCall('get', '/sessions');
      const normalized = Array.isArray(res.data) ? res.data : [];
      setPastSessions(normalized);
      if (normalized.length > 0 && selectedSessionId === null) {
        setSelectedSessionId(normalized[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch past sessions");
    }
  };

  useEffect(() => {
    try {
      fetchPastSessions();
      checkBackendHealth(); // Check health first, then fetch files
      fetchComplexFileContent("main.py");
    } catch (error) {
      console.error('Initialization error:', error);
      setCode(FALLBACK_CODE);
      setAvailableFiles([{"name": "main.py", "path": "../complex_sandbox/app/main.py", "type": "main"}]);
      setCurrentFile("main.py");
    }
  }, []);

  useEffect(() => {
    try {
      // Start status polling
      const statusInterval = setInterval(() => {
        if (currentFile) {
          fetchComplexFileContent(currentFile);
        }
      }, 5000); // Poll every 5 seconds

      return () => {
        try {
          clearInterval(statusInterval);
        } catch (err) {
          console.error("Error cleaning up status interval:", err);
        }
      };
    } catch (err) {
      console.error("Status polling error:", err);
      return () => {}; // Return empty cleanup function
    }
  }, [currentFile]);

  useEffect(() => {
    if (isTestActive) {
      document.title = "🔬 Reliability Test Active | CORE SRE";
    } else if (isRepairing) {
      document.title = "🛠️ Repairing... | CORE SRE";
    } else {
      document.title = "CORE SRE | Autonomous Recovery System";
    }
  }, [isTestActive, isRepairing]);

  useEffect(() => {
    // Enhanced polling replaces broken EventSource
    // No EventSource since endpoint doesn't exist
  }, []);

  const handleAction = async (type) => {
    if (type === "inject") {
      // Add real-time timeline entry
      setHistory(prev => [...prev, "$ Injecting vulnerability into sandbox environment..."]);
      
      // Capture the current clean code before injecting bug
      const currentCleanCode = code || FALLBACK_CODE;
      setOldCode(currentCleanCode);
      setStatus("VULNERABLE");
      setShowDiff(false);
      
      setHistory(prev => [...prev, "$ Capturing clean code for diff comparison..."]);
      
      await axios.post(`${API_BASE}/inject-bug`);
      
      // Add completion timeline entry
      setHistory(prev => [...prev, "$ Bug injection complete - system now vulnerable"]);
      
      fetchComplexFileContent(currentFile);
    } else {
  try {
    // Don't set oldCode here - it should already contain the buggy code from injection
    setIsRepairing(true);
    setStatus("REPAIRING");
    setShowDiff(false);
    setIsTerminalOpen(true);

    // Add real-time timeline entries
    setHistory(prev => [...prev, "$ Initializing autonomous repair workflow..."]);
    setHistory(prev => [...prev, "$ Starting MTTR timer..."]);
    setHistory(prev => [...prev, "$ Calling GLM-5.1 neural engine for fix generation..."]);

    console.log("🚀 Starting repair workflow");

    // Start timer
    startMttrTimer();

    // CALL REPAIR API FIRST
    const repairRes = await axios.post(`${API_BASE}/repair`);

    setHistory(prev => [...prev, "$ Repair API call completed successfully"]);
    console.log("✅ Repair API finished");

    // NOW fetch repaired file
    const fileRes = await apiCall(
      "get",
      `/get-file/complex_sandbox/app/${currentFile}` 
    );

    const repairedCode =
      fileRes?.data?.content ||
      repairRes?.data?.final_code ||
      "";

    if (!repairedCode || repairedCode.trim() === "") {
      throw new Error("Empty repaired code received");
    }

    setHistory(prev => [...prev, "$ Repaired code loaded successfully"]);
    console.log("✅ Repaired code loaded");

    // Update code AFTER successful fetch
    setCode(repairedCode);

    // Show diff now
    setShowDiff(true);

    setHistory(prev => [...prev, "$ Generating code diff visualization..."]);

    // Add repair history entries to timeline without clearing existing entries
    if (Array.isArray(repairRes.data.history)) {
      setHistory(prev => [...prev, ...repairRes.data.history]);
    }

    setStatus("RESTORED");

    const finalTime = stopMttrTimer();
    setImmediateMttrTime(finalTime);

    setHistory(prev => [...prev, `$ Repair completed in ${finalTime} - system restored`]);

    setShowSuccessModal(true);

  } catch (err) {
    console.error("Repair failed:", err);

    stopMttrTimer();

    setStatus("FAILED");
  } finally {
    setIsRepairing(false);
  }
    }
  }

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
    <div className="min-h-screen text-white font-inter flex flex-col" style={{background: '#000000'}}>
      <div className="flex h-full">
        <aside
          className={`shrink-0 overflow-hidden border border-white/5 bg-slate-900/40 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "w-56 p-4 opacity-100" : "w-0 p-0 opacity-0"
          }`}
        >
          <div className="-m-4 mb-4 flex flex-col items-center justify-center border-b border-[#21262D] bg-[#161B22] py-10">
            <div className="text-lg font-bold tracking-[0.4em] uppercase text-white font-montserrat drop-shadow-[0_0_8px_rgba(34,211,238,0.15)]">CORE SRE</div>
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
          <header className="relative flex h-14 items-center justify-between border border-white/5 bg-slate-900/40 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] px-5">
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
              <div className="flex flex-col items-center">
                <div className="text-lg tracking-[0.4em] font-montserrat bg-gradient-to-r from-purple-400 to-violet-600 bg-clip-text text-transparent">CORE SRE</div>
                <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.3em] text-slate-500">
                  Autonomous Recovery System
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAboutOpen(true)}
                className="pointer-events-auto text-slate-400 hover:text-cyan-400 transition-colors duration-200 text-sm font-medium border border-white/20 px-3 py-1 rounded-md hover:border-cyan-400/50"
              >
                About
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runFullReliabilityAudit}
                disabled={isRunningFullAudit || isTestActive}
                className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-transparent px-4 py-1.5 text-xs text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 font-semibold font-inter transition-all duration-300 active:scale-95"
              >
                <Play size={14} className={isRunningFullAudit ? "animate-pulse" : ""} />
                {isRunningFullAudit ? "Running Audit..." : "Run Full Reliability Audit"}
              </button>
              <button
                type="button"
                onClick={() => handleAction("inject")}
                disabled={isTestActive}
                className="inline-flex items-center gap-2 rounded-md border border-purple-400 bg-transparent px-3 py-1.5 text-xs text-purple-400 hover:bg-purple-400/20 disabled:cursor-not-allowed disabled:opacity-40 font-semibold font-inter transition-all duration-300 active:scale-95"
              >
                <Bug size={14} />
                Inject Bug
              </button>
              <button
                type="button"
                onClick={() => handleAction("repair")}
                disabled={isRepairing || isTestActive}
                className="inline-flex items-center gap-2 rounded-md border border-purple-400 bg-transparent px-3 py-1.5 text-xs text-purple-400 hover:bg-purple-400/20 disabled:cursor-not-allowed disabled:opacity-40 font-semibold font-inter transition-all duration-300 active:scale-95"
              >
                {isRepairing ? <Activity size={14} className="animate-spin" /> : <Wrench size={14} />}
                Repair
              </button>
            </div>
          </header>

          <section className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_340px]">
            <div className="min-h-0 border border-white/5 bg-slate-900/40 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] p-4 lg:border-b-0">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 font-inter">Explorer</div>
              <div className="space-y-1 text-sm">
                {/* Dynamic File Tree from API */}
                {AVAILABLE_FILES.length > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-200">
                      <ChevronDown size={14} />
                      <FolderOpen size={14} />
                      <span className="text-purple-400">complex_sandbox</span>
                    </div>
                    {AVAILABLE_FILES.map((file) => (
                      <div
                        key={file.name}
                        className={`ml-11 flex items-center gap-2 rounded px-2 py-1 cursor-pointer transition ${
                          currentFile === file.name
                            ? "bg-slate-900/60 text-cyan-400 border-l-2 border-cyan-500"
                            : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
                        }`}
                        onClick={() => fetchComplexFileContent(file.name)}
                      >
                        <FileCode size={14} />
                        <span>{file.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-200">
                      <ChevronDown size={14} />
                      <FolderOpen size={14} />
                      <span className="text-purple-400">complex_sandbox</span>
                    </div>
                    <div className="ml-5 flex items-center gap-2 text-slate-300">
                      <ChevronRight size={14} className="opacity-0" />
                      <Folder size={14} />
                      <span className="bg-gradient-to-r from-purple-400 to-violet-600 bg-clip-text text-transparent">app</span>
                    </div>
                    <div className="ml-11 flex items-center gap-2 rounded bg-slate-900/60 px-2 py-1 text-slate-100">
                      <FileCode size={14} />
                      <span className="text-purple-400">main.py</span>
                    </div>
                    <div className="ml-5 flex items-center gap-2 text-slate-300">
                      <ChevronRight size={14} className="opacity-0" />
                      <Folder size={14} />
                      <span className="text-purple-400">tests</span>
                    </div>
                    <div className="ml-11 flex items-center gap-2 px-2 py-1 text-slate-400">
                      <FileCode size={14} />
                      <span className="text-purple-400">test_app.py</span>
                    </div>
                    <div className="ml-5 flex items-center gap-2 text-slate-300">
                      <ChevronRight size={14} className="opacity-0" />
                      <Folder size={14} />
                      <span className="text-purple-400">utils</span>
                    </div>
                    <div className="ml-11 flex items-center gap-2 px-2 py-1 text-slate-400">
                      <FileCode size={14} />
                      <span className="text-purple-400">utils.py</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="relative flex min-h-0 flex-col border border-white/5 bg-purple-950/20 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] lg:border-b-0">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                  </div>
                  <span className="text-xs text-slate-500 ml-2 font-mono">Editor</span>
                </div>
                <div className="text-xs text-slate-400 font-inter">{currentFile || 'complex_sandbox/app/main.py'}</div>
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
                    {isRepairing ? (
                      <div className="flex flex-col items-center justify-center h-full p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <div className="text-slate-400 text-center">
                          <div className="text-lg font-medium mb-2">SRE Analysis in Progress</div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full overflow-auto bg-[#050505] p-2">
                        <ReactDiffViewer
                          oldValue={oldCode || FALLBACK_CODE}
                          newValue={code || FALLBACK_CODE}
                          splitView={false}
                          useDarkTheme={true}
                          leftTitle="Before (Buggy Code)"
                          rightTitle="After (Fixed Code)"
                          styles={{
                            variables: {
                              dark: {
                                diffViewerBackground: 'transparent',
                                addedBackground: 'rgba(0, 255, 130, 0.12)',
                                addedGutterBackground: 'rgba(0, 255, 130, 0.2)',
                                removedBackground: 'rgba(255, 70, 70, 0.12)',
                                removedGutterBackground: 'rgba(255, 70, 70, 0.2)',
                                wordAddedBackground: 'rgba(0, 255, 130, 0.3)',
                                wordRemovedBackground: 'rgba(255, 70, 70, 0.3)',
                                addedColor: '#86efac',
                                removedColor: '#fca5a5',
                                gutterBackground: 'rgba(0, 0, 0, 0.3)',
                                gutterColor: '#9ca3af',
                                highlightBackground: 'rgba(59, 130, 246, 0.15)',
                                highlightGutterBackground: 'rgba(59, 130, 246, 0.25)',
                                highlightColor: '#bfdbfe',
                              }
                            },
                            titleBlock: {
                              background: 'rgba(15, 23, 42, 0.8)',
                              color: '#f3f4f6',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                            },
                            contentText: {
                              fontSize: '13px',
                              lineHeight: '1.6',
                              fontFamily: '"Fira Code", monospace',
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <pre className="code-highlighter-reset h-full overflow-auto bg-[#050505] p-4">
                    <SyntaxHighlighter
                      language="python"
                      style={atomDark}
                      wrapLongLines
                      wrapLines
                      className="code-highlighter-reset text-left whitespace-pre-wrap break-words"
                      lineProps={{
                        style: {
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        },
                      }}
                      customStyle={{
                        background: "transparent",
                        padding: 0,
                        margin: 0,
                        fontSize: "13px",
                        lineHeight: "1.6",
                        overflowX: "hidden",
                        textAlign: "left",
                        letterSpacing: "normal",
                        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                      }}
                    >
                      {code || FALLBACK_CODE}
                    </SyntaxHighlighter>
                  </pre>
                )}
              {isRepairing && (
                <div className="pointer-events-none absolute inset-x-0 top-[45px] bottom-0 overflow-hidden">
                  <div className="absolute inset-0 animate-[editorPulse_2.8s_ease-in-out_infinite] bg-cyan-400/5" />
                  <div className="h-12 w-full animate-[scan_2.2s_linear_infinite] bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent" />
                </div>
              )}
            </div>
            </div>

            <div className="min-h-0 border border-white/10 bg-black p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white font-inter">
                <Terminal size={14} />
                Terminal / Timeline
              </div>
              <div className="activity-scrollbar h-[calc(100%-24px)] space-y-3 overflow-auto pr-1">
                {timelineEntries.map((entry, index) =>
                  entry.type === "terminal" ? (
                    <div
                      key={entry.id}
                      ref={index === timelineEntries.length - 1 && !isRepairing ? lastLogRef : null}
                      className="flex items-center justify-between rounded border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white"
                    >
                      <span>{entry.body.startsWith("$") ? entry.body : `$ ${entry.body}`}</span>
                      <span className="ml-3 h-3 w-[2px] animate-pulse bg-white/90" />
                    </div>
                  ) : (
                    <div
                      key={entry.id}
                      ref={index === timelineEntries.length - 1 && !isRepairing ? lastLogRef : null}
                      className="max-w-[95%] rounded-md border border-white/10 bg-black px-3 py-2 text-white"
                    >
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white font-montserrat">
                        {entry.label}
                      </div>
                      <div className="text-[13px] leading-relaxed text-white">{entry.body}</div>
                    </div>
                  ),
                )}
                {!timelineEntries.length && (
                  <>
                    <div className="max-w-[95%] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300">
                      Agent thought: Ready to inject a bug or run autonomous repair.
                    </div>
                  </>
                )}
                {isRepairing && (
                  <div className="max-w-[95%] rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-[13px] leading-relaxed text-slate-300">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 font-montserrat">Analysis</div>
                    Agent thought: analyzing traceback, patching logic, and validating with pytest...
                  </div>
                )}
                {isRepairing && (
                  <div ref={lastLogRef} className="rounded border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-300">
                    $ running repair workflow
                  </div>
                )}
                {!isRepairing && !timelineEntries.length && (
                  <div ref={lastLogRef} className="text-xs text-slate-300">
                    No timeline entries yet.
                  </div>
                )}
              </div>
            </div>
          </section>
          
          <div className="fixed bottom-0 left-0 right-0 z-40">
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
          </div>
          
          <SuccessModal
            isOpen={showSuccessModal}
            onClose={handleCloseSuccessModal}
            mttrTime={immediateMttrTime || finalMttrTime}
            auditLogs={auditLogs}
            vulnerabilityType="IndexError"
          />
        </main>
      </div>
      
      {/* Debug UI - URL Indicator */}
      <div className="fixed bottom-20 right-4 z-50 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-lg p-2 text-xs text-slate-400 max-w-xs shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${backendStatus.includes('Verified') ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
          <div>
            <div className="font-mono">{backendStatus}</div>
            <div className="text-slate-500">Pinging: {API_BASE}/health</div>
          </div>
        </div>
      </div>
    {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAboutOpen(false)} />
          <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] max-w-2xl w-full max-h-[80vh] overflow-auto p-8">
            <button
              type="button"
              onClick={() => setIsAboutOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold font-montserrat bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-2">
                CORE SRE: Autonomous Recovery Engine
              </h2>
              <p className="text-slate-300 leading-relaxed">
                A production-grade SRE agent that utilizes <span className="text-cyan-400 font-semibold">GLM-5.1</span> and <span className="text-cyan-400 font-semibold">LangGraph</span> to autonomously detect, analyze, and repair system vulnerabilities in a sandboxed environment.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Key Features</h3>
              <div className="space-y-3 text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium text-white">Real-time MTTR Tracking</span>
                    <p className="text-sm text-slate-400">Monitor Mean Time To Repair with millisecond precision and live dashboard updates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium text-white">Deep-dependency Scanning</span>
                    <p className="text-sm text-slate-400">Analyze code dependencies and identify potential vulnerabilities before they impact production</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium text-white">Automated Pytest Verification</span>
                    <p className="text-sm text-slate-400">Run comprehensive test suites to validate repairs and ensure system reliability</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/10">
              <div className="text-sm text-slate-400">
                Version 1.0 • Enterprise SRE Dashboard
              </div>
              <button
                type="button"
                onClick={() => setIsAboutOpen(false)}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-md font-medium transition-colors duration-200 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
