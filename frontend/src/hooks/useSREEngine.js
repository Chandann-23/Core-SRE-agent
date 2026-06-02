import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:7860";
const WS_BASE = API_BASE.replace(/^http/, 'ws');

const defaultTests = [
  { name: "test_auth_bypass", status: "pass" },
  { name: "test_tax_calculation", status: "pass" },
  { name: "test_payment_gateway", status: "pass" },
  { name: "test_race_condition", status: "pass" },
  { name: "test_db_deadlock", status: "pass" }
];

const initialHistory = [
  "$ Initializing CORE SRE Engine v2.4.1...",
  "$ Connecting to financial telemetry stream...",
  "$ Sandbox environment mapped & verified",
  "$ System status: OPTIMAL",
  "$ Awaiting anomaly triggers..."
];

const initialAuditLogs = [
  "Engine boot sequence initiated",
  "Loaded heuristics engine: GLM-4 Neural Core",
  "Sandbox environment mapped to isolated Docker container",
  "Monitoring financial gateway on port 7860",
  "System fully operational. Zero anomalies detected."
];

export function useSREEngine() {
  const [status, setStatus] = useState("HEALTHY");
  const [history, setHistory] = useState(initialHistory);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [code, setCode] = useState("");
  const [oldCode, setOldCode] = useState("");
  const [mttrTime, setMttrTime] = useState("00:00");
  const [finalMttrTime, setFinalMttrTime] = useState("00:00");
  const [testResults, setTestResults] = useState(defaultTests);
  
  const wsRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/audit`);
    
    ws.onopen = () => console.log("WebSocket connected");
    ws.onclose = () => console.log("WebSocket disconnected");
    ws.onerror = (err) => console.error("WebSocket error:", err);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "log") {
        setAuditLogs(prev => [...prev, data.message]);
      } else if (data.type === "status") {
        setStatus(data.status);
        if (data.status === "VULNERABLE" && data.file_path) {
          fetchFileContent("main.py");
        } else if (data.status === "REPAIRING") {
          startMttrTimer();
        } else if (data.status === "FAILED") {
          stopMttrTimer();
        } else if (data.status === "PENDING_APPROVAL") {
          // Keep MTTR timer running while waiting for human
          if (data.proposed_code) {
            setCode(data.proposed_code);
          }
        }
      } else if (data.type === "repair_complete") {
        setStatus(data.status);
        if (data.final_code) {
          setCode(data.final_code);
        }
        // Frontend calculates the true total time, ignore backend's partial metric
        // setFinalMttrTime(data.mttr_score); 
        stopMttrTimer();
      } else if (data.type === "test_results") {
        setTestResults(data.tests);
      }
    };
    
    wsRef.current = ws;
  }, []);

  const fetchFileContent = async (filename) => {
    try {
      const res = await axios.get(`${API_BASE}/get-file/complex_sandbox/app/${filename}`);
      if (res.data && res.data.content) {
        setCode(res.data.content);
        return res.data.content;
      }
    } catch (e) {
      console.error(e);
    }
    return "";
  };

  const startMttrTimer = () => {
    // If the timer is already running (e.g. returning to REPAIRING from PENDING_APPROVAL), do not reset it
    if (timerIntervalRef.current) return;
    
    startTimeRef.current = Date.now();
    setMttrTime("00:00");
    
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
      const secs = (elapsed % 60).toString().padStart(2, "0");
      const timeStr = `${mins}:${secs}`;
      setMttrTime(timeStr);
      setFinalMttrTime(timeStr);
    }, 1000);
  };

  const stopMttrTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const injectBug = async () => {
    // Reset state
    stopMttrTimer();
    setHistory(["$ Injecting vulnerability into sandbox environment..."]);
    setAuditLogs([]);
    setFinalMttrTime("00:00");
    setMttrTime("00:00");
    setTestResults(defaultTests);
    
    // Save current clean code
    setOldCode(code);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "inject_bug" }));
    } else {
      console.error("WebSocket is not open");
      connectWebSocket(); // Attempt reconnect
    }
  };

  const runRepair = async () => {
    setHistory(prev => [...prev, "$ Initializing autonomous repair workflow...", "$ Starting MTTR timer..."]);
    
    // We capture the buggy code as oldCode so the diff shows buggy vs fixed
    setOldCode(code);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "repair" }));
    } else {
      console.error("WebSocket is not open");
    }
  };
  
  const approveRepair = async () => {
    setHistory(prev => [...prev, "$ Human approval granted. Initializing deployment phase..."]);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "approve_repair" }));
    } else {
      console.error("WebSocket is not open");
    }
  };

  const runFullAudit = async () => {
    // A full audit will inject the bug, and when the status becomes VULNERABLE, it should automatically trigger the repair.
    // For simplicity, we can just send 'inject_bug' and let the UI handle triggering 'repair' when the state changes.
    // Wait, the easiest way is to let the component `useEffect` watch for status === "VULNERABLE" and automatically call runRepair() if a flag `isFullAudit` is true.
    // We will return a promise or just let the caller handle it.
    await injectBug();
  };

  const resetSystem = () => {
    setStatus("HEALTHY");
    setHistory(initialHistory);
    setAuditLogs(initialAuditLogs);
    setMttrTime("00:00");
    setFinalMttrTime("00:00");
    setTestResults(defaultTests);
    stopMttrTimer();
    fetchFileContent("main.py");
  };

  return {
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
    setCode, // Allow manual edits
    fetchFileContent
  };
}
