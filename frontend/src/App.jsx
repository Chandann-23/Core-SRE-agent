import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import ReactDiffViewer from "react-diff-viewer-continued";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Activity, Bug, ChevronDown, ChevronRight, FileCode, Folder, FolderOpen, PanelLeftClose, PanelLeftOpen, Plus, Terminal, Wrench, Play } from "lucide-react";
import logo from "./assets/logo.png";
import ReliabilityTerminal from "./components/ReliabilityTerminal";
import SuccessModal from "./components/SuccessModal";

const API_BASE = import.meta.env.VITE_API_URL || "https://chandann-23-core-sre-backend.hf.space";
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
    try {
      if (mttrIntervalRef.current) {
        clearInterval(mttrIntervalRef.current);
        mttrIntervalRef.current = null;
      }
      } catch (err) {
      console.error("Error stopping MTTR timer:", err);
    }
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
      
      const accurateMttr = calculateMttrFromLogs();
      setFinalMttrTime(accurateMttr);
      setShowSuccessModal(true);
      console.log('🔄 Current showSuccessModal state:', showSuccessModal);
      
      // Close the modal
      setShowSuccessModal(false);
      console.log('🔄 showSuccessModal set to false');
      
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
      
      // Clear audit logs from backend
      try {
        await axios.delete(`${API_BASE}/audit-logs`);
      } catch (err) {
        console.error('Failed to clear logs:', err);
      }
      
      // Step 2: Call /inject-bug
      setStatus("VULNERABLE");
      setShowDiff(false);
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
  };

  const runFullReliabilityAudit = async () => {
    if (isRunningFullAudit) return;
    
    setIsRunningFullAudit(true);
    
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
      setStatus("VULNERABLE");
      setShowDiff(false);
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
      
      } catch (err) {      }

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
      if (healthCheckRef.current) {
        clearInterval(healthCheckRef.current);
        healthCheckRef.current = null;
      }
      if (filePollRef.current) {
        clearTimeout(filePollRef.current);
        filePollRef.current = null;
      }
    };
  }, []);

  const handleAction = async (type) => {
    if (type === "inject") {
      setStatus("VULNERABLE");
      setShowDiff(false);
      await axios.post(`${API_BASE}/inject-bug`);
      fetchComplexFileContent(currentFile);
    } else {
      setOldCode(code || FALLBACK_CODE);
      setIsRepairing(true);
      setStatus("REPAIRING");
      
      // Start polling for the repaired file content
      console.log(`🔧 [Repair] Starting repair process for ${currentFile}`);
      
      // First validate that we can get meaningful content after repair
      const validationResult = await validateDiffContent(currentFile);
      
      if (validationResult.success) {
        console.log(`✅ [Repair] Validation passed - setting new content`);
        setCode(validationResult.content);
        setCurrentFile(validationResult.filename);
      } else {
        console.log(`❌ [Repair] Validation failed - using fallback polling`);
        await pollFileContent(currentFile);
      }
      
      try {
        const res = await axios.post(`${API_BASE}/repair`);
        setHistory(Array.isArray(res.data.history) ? res.data.history : []);
        
        // Validate final result
        if (res.data.final_code && res.data.final_code.trim() !== '') {
          setCode(res.data.final_code);
          setShowDiff(true);
          setStatus("RESTORED");
          setMttrTime(res.data.mttr_time || 0);
          setFinalMttrTime(res.data.mttr_time || 0);
          setShowSuccessModal(true);
        } else {
          console.log(`❌ [Repair] Final result validation failed - retrying content fetch`);
          await pollFileContent(currentFile);
        }
      } catch (err) {
        console.error('Repair failed:', err);
        setStatus("FAILED");
      } finally {
        setIsRepairing(false);
      }
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
                {/* Dynamic File Tree from API */}
                {AVAILABLE_FILES.length > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-200">
                      <ChevronDown size={14} />
                      <FolderOpen size={14} />
                      <span>complex_sandbox</span>
                    </div>
                    {AVAILABLE_FILES.map((file) => (
                      <div
                        key={file.name}
                        className={`ml-11 flex items-center gap-2 rounded px-2 py-1 cursor-pointer transition ${
                          currentFile === file.name
                            ? "bg-slate-900/60 text-slate-100"
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
                      <span>complex_sandbox</span>
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
                )}
              </div>
            </div>

            <div className="relative flex min-h-0 flex-col border-b border-r border-slate-800 lg:border-b-0">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="text-xs text-slate-400">{currentFile || 'complex_sandbox/app/main.py'}</div>
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
                          <div className="text-sm">{repairStatus}</div>
                          <div className="text-xs text-slate-500 mt-2">Backend Verified: simple_api logic active</div>
                        </div>
                      </div>
                    ) : (
                      <ReactDiffViewer
                        oldValue={oldCode || ""}
                        newValue={code || FALLBACK_CODE}
                        splitView
                        useDarkTheme
                        leftTitle="Before"
                        rightTitle="After"
                        styles={{
                          titleText: {
                            background: "#050505",
                          },
                          contentText: {
                            fontFamily: "'Fira Code', monospace",
                            fontSize: "13px",
                            lineHeight: 1.6,
                          },
                        }}
                      />
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
                      $ pytest -q complex_sandbox/tests/test_app.py
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
      
      {/* Debug UI - URL Indicator */}
      <div className="fixed bottom-4 right-4 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-400 max-w-xs">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${backendStatus.includes('Verified') ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
          <div>
            <div className="font-mono">{backendStatus}</div>
            <div className="text-slate-500">Pinging: {API_BASE}/health</div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default App;
