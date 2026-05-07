---
title: Core Sre Backend
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# CORE SRE: Autonomous Recovery Engine

**CORE SRE** is a production-grade Site Reliability Engineering (SRE) agent designed to autonomously detect, analyze, and repair system vulnerabilities within a sandboxed environment. By leveraging the power of **GLM-5.1** and **LangGraph**, the system moves beyond simple monitoring to active, code-level remediation.

---

## 🚀 Overview

In modern distributed systems, Mean Time To Repair (MTTR) is the most critical metric. **CORE SRE** minimizes this by automating the entire incident response lifecycle:

*   **Detection**: Constant monitoring of system telemetry and tracebacks.
*   **Injection**: Capability to simulate realistic vulnerabilities (e.g., `IndexError`, `TypeError`) for testing and validation.
*   **Analysis**: Utilizes a specialized AI brain to perform deep dependency scanning and root-cause analysis.
*   **Repair**: Generates and applies atomic code patches to the source files.
*   **Verification**: Automatically triggers **Pytest** suites to ensure the patch is sound before declaring the system "Healthy".

---

## 🛠️ Technical Stack

*   **Brain**: GLM-5.1 Neural Engine & LangGraph for agentic workflows.
*   **Backend**: FastAPI (Python 3.10) hosted on Hugging Face Spaces.
*   **Frontend**: Next.js & React with a custom **Astra-inspired Glassmorphism** UI.
*   **Infrastructure**: Sandboxed execution environment for safe code manipulation.
*   **Styling**: Tailwind CSS with a strict "Obsidian & Amethyst" professional palette.

---

## 📁 Project Structure

*   `frontend/`: Next.js application featuring real-time audit trails and VS Code-style IDE integration.
*   `tests/`: Comprehensive Python test suite for system verification and MTTR accuracy.
*   `core_logic.py`: The heart of the SRE agent, managing the LangGraph repair cycles.
*   `simple_api.py`: FastAPI endpoints for bug injection, repair triggers, and live log streaming.

---

## 📊 Key Features

*   **Real-time Audit Trail**: A live terminal feed that streams agent thoughts and actions as they happen.
*   **Automated MTTR Tracking**: Precise calculation of recovery time, displayed in a professional dashboard interface.
*   **Functional Diff Viewer**: High-contrast, code-level comparison of the "Buggy" vs. "Repaired" states.
*   **Glassmorphism UI**: A high-end developer experience utilizing deep blurs, pure black backgrounds, and purple accents.

---

## 🏁 Getting Started

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Chandann-23/Core-SRE-agent.git
    
```
2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    npm install
    ```
3.  **Run the Engine**:
    *   Start the backend: `python simple_api.py`
    *   Start the frontend: `npm run dev`

---
