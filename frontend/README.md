# Core SRE Engine - Frontend Node

This directory contains the React/Vite frontend for the Core SRE Autonomous Recovery System.

## Architecture

The frontend is built as a highly responsive, single-page application (SPA) designed to visualize complex real-time telemetry and abstract the complexity of autonomous AI agents executing code patches in the background.

### Core Components

- **`App.jsx`**: The main dashboard layout grid, coordinating the state and visual components.
- **`useSREEngine.js`**: The central nervous system of the frontend. A custom React Hook that manages all state transitions (HEALTHY ➔ VULNERABLE ➔ REPAIRING ➔ RESTORED) and handles the asynchronous WebSocket connection to the Python backend.
- **`SystemMetricsChart.jsx`**: A handcrafted SVG-based telemetry chart utilizing mathematical random-walks and bounded constraints to visualize live financial traffic and error rates with zero-dependency overhead.
- **`TerminalTimeline.jsx`**: A styled, auto-scrolling terminal window that renders the chronological sequence of SRE events.
- **`CodeViewer.jsx`**: Integrates `@monaco-editor/react` to provide a VS Code-like experience within the browser, rendering syntax-highlighted Python code and generating live visual diffs (`oldCode` vs `newCode`).
- **`UnitTestMatrix.jsx`**: A dynamic grid component that visualizes the state of the backend test suite, utilizing Framer Motion for smooth state transitions (Pass/Fail).

## Styling & Aesthetic

The dashboard utilizes **Tailwind CSS v4** to enforce a strict, premium Dark Mode aesthetic. 

Key design tokens include:
- Deep obsidian backgrounds (`#020617`, `#0A0A0F`)
- Subtle borders (`#2A2B3D`) to delineate panel boundaries without clutter.
- Vibrant, highly accessible semantic colors (Emerald for healthy, Red for vulnerable, Blue for traffic) to ensure instant visual comprehension during simulated outages.
- Customized scrollbars and micro-animations to mimic a high-end enterprise command center.

## Running Locally

```bash
# Install dependencies
npm install

# Run the Vite development server (HMR enabled)
npm run dev
```

*Note: The frontend will attempt to connect to `http://localhost:7860` for the backend. If deployed in production, it will automatically route to the configured HuggingFace Space.*
