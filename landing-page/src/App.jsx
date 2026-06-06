import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  Terminal, 
  Zap, 
  Server, 
  Activity, 
  ArrowRight, 
  Code, 
  Cpu, 
  Layers, 
  Globe, 
  Award, 
  ExternalLink, 
  FileText, 
  Database, 
  CheckCircle2, 
  ArrowUpRight, 
  Brain 
} from 'lucide-react';

const GithubIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function App() {
  const features = [
    {
      icon: <ShieldAlert className="w-8 h-8 text-rose-400" />,
      title: "Autonomous Incident Remediation",
      desc: "When production errors occur, CORE SRE triggers a LangGraph state machine. It isolates the sandbox environment, ingests pytest stack traces, and drafts atomic code repairs using GLM-4 reasoning."
    },
    {
      icon: <Zap className="w-8 h-8 text-amber-400" />,
      title: "Live Unit Test Matrix",
      desc: "The dashboard displays a live-updating Unit Test Matrix that renders passing/failing states for key integration checks (such as tax calculations and payment processing) in real-time."
    },
    {
      icon: <Layers className="w-8 h-8 text-cyan-400" />,
      title: "Monaco Diff Editor Integration",
      desc: "Integrates a fully interactive VS Code-style Monaco Diff Editor that shows side-by-side git comparisons of the buggy vs. proposed repaired code. Enforces strict Human-in-the-Loop (HITL) gates."
    },
    {
      icon: <Activity className="w-8 h-8 text-emerald-400" />,
      title: "Real-Time Telemetry Dashboard",
      desc: "Simulates live financial gateway traffic volume and error rate spikes using a constrained random-walk algorithm, streamed instantly to the frontend dashboard via FastAPI WebSockets."
    },
    {
      icon: <Cpu className="w-8 h-8 text-violet-400" />,
      title: "Decoupled Architecture",
      desc: "Features a modern React client deployed on Vercel communicating with a containerized Python FastAPI ASGI backend hosted on Hugging Face Spaces, ensuring complete separation of concerns."
    },
    {
      icon: <Brain className="w-8 h-8 text-pink-400" />,
      title: "WebSocket Audit Trail",
      desc: "Streams the SRE Audit Trail, container lifecycle events, and test execution timelines directly to the client console, providing instant visibility into the self-healing loops."
    }
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Real-time Telemetry Observability",
      desc: "The dashboard monitors live gateway telemetry, rendering traffic volume and error rate spikes in a real-time SVG chart via WebSockets."
    },
    {
      step: "02",
      title: "Sandbox Incident Replication",
      desc: "When a bug is injected or detected, the backend provisions an isolated sandbox folder containing the target codebase (main.py)."
    },
    {
      step: "03",
      title: "Agentic Neural Repair Cycle",
      desc: "The LangGraph orchestration engine runs an analysis node that processes error tracebacks via LiteLLM and GLM-4, drafting a code correction."
    },
    {
      step: "04",
      title: "Regression Test & Deployment",
      desc: "The executor node applies the patch and runs Pytest suites in the sandbox. After human approval, metrics return to optimal health."
    }
  ];

  const featuredSystems = [
    {
      title: "ASTRA Intelligence",
      desc: "Full-Stack Platform & RAG Workflow Deployed a comprehensive multi-agent workspace integrating advanced retrieval-augmented generation and reactive, glassmorphism-styled dashboard elements.",
      tech: ["FastAPI", "LangChain", "React", "TailwindCSS"]
    },
    {
      title: "CORE SRE",
      desc: "Autonomous Site Reliability System Built an autonomous infrastructure recovery layer utilizing LangGraph and FastAPI architecture for intelligent, dual-phase system repair logic.",
      tech: ["LangGraph", "FastAPI", "DevOps", "Docker"]
    },
    {
      title: "Aetheris",
      desc: "E-Commerce Web Application (Inamigos Foundation) Developed and deployed a robust, sample online e-commerce platform, focusing on seamless user workflows, product catalog rendering, and responsive end-to-end interface logic.",
      tech: ["React", "Node.js", "Full-Stack", "Web Development"]
    },
    {
      title: "AXON Engine",
      desc: "Predictive Modeling Analytics Built a high performance data engine executing algorithmic predictions and core operational analytics with specialized performance modeling.",
      tech: ["Machine Learning", "NumPy", "Python", "Streamlit"]
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 font-sans overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-radial from-cyan-500/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-radial from-purple-500/5 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111115_1px,transparent_1px),linear-gradient(to_bottom,#111115_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-20" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Terminal className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">CORE SRE</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#home" className="hover:text-white transition-colors">Home</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#about-me" className="hover:text-white transition-colors">About Me</a>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com/Chandann-23/core-sre-agent" 
              target="_blank" 
              rel="noreferrer" 
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10"
              aria-label="GitHub"
            >
              <GithubIcon className="w-5 h-5" />
            </a>
            <a 
              href="https://core-sre-engine.vercel.app" 
              className="relative group overflow-hidden px-4.5 py-2 text-sm font-bold bg-white text-black rounded-lg transition-transform hover:scale-[1.02] flex items-center gap-2"
            >
              Launch App 
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-36 pb-20 px-6 max-w-7xl mx-auto relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-8">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Autonomous Site Reliability Infrastructure</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.05]">
            Meet your new <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_30px_rgba(6,182,212,0.15)]">
              AI Reliability Engineer.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            CORE SRE autonomously observes, isolates, analyzes, and repairs critical server vulnerabilities in real-time, executing robust multi-suite regression validations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4.5">
            <a 
              href="https://core-sre-engine.vercel.app" 
              className="px-8 py-4.5 text-base font-bold bg-white text-black rounded-lg hover:bg-gray-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              Launch SRE Dashboard
            </a>
            <a 
              href="#how-it-works" 
              className="px-8 py-4.5 text-base font-bold bg-zinc-900 text-white border border-white/10 rounded-lg hover:bg-zinc-800 hover:border-white/20 transition-all w-full sm:w-auto justify-center flex items-center gap-2"
            >
              See how it works
            </a>
          </div>
        </motion.div>

        {/* Premium Screen Dashboard Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mt-28 relative rounded-xl border border-white/10 bg-[#07070B] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none"></div>
          <div className="h-10 border-b border-white/10 flex items-center px-5 gap-2 bg-[#0C0D16]">
            <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            <div className="ml-4 text-xs font-mono text-gray-500">core-sre-engine.vercel.app</div>
          </div>
          
          <div className="relative p-6 md:p-12 flex flex-col md:flex-row items-center gap-10">
            {/* Visual Simulation Block */}
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono uppercase">Vulnerable</span>
                <span className="text-gray-400 text-sm font-mono">&gt; Injecting TypeError anomaly...</span>
              </div>
              <h3 className="text-3xl font-extrabold tracking-tight">Real-Time Autonomous Patching</h3>
              <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                Watch the engine dynamically construct a sandboxed environment, run live trace analytics, and write optimized corrections directly into your active python scripts in less than 30 seconds.
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-400">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 border border-white/10">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  <span>GLM-4 Core API</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 border border-white/10">
                  <Cpu className="w-3.5 h-3.5 text-violet-400" />
                  <span>Pytest Engine</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/5 border border-white/10">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WebSockets</span>
                </div>
              </div>
            </div>
            {/* Live Chart Visual Simulation */}
            <div className="flex-1 w-full relative rounded-lg border border-white/5 bg-[#030305] p-6 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  Telemetry Dashboard
                </span>
                <span className="text-xs text-gray-500 font-mono">Status: Healthy</span>
              </div>
              
              {/* Telemetry Visual Graph Wireframe */}
              <div className="h-44 flex items-end gap-1.5 border-b border-white/10 pb-1">
                {[45, 60, 55, 30, 80, 95, 75, 40, 65, 85, 90, 50, 45, 70, 85, 95, 60, 75, 90, 100].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end h-full">
                    {/* Error Line Simulation */}
                    <div 
                      className="w-full bg-cyan-400 rounded-t-sm transition-all duration-500" 
                      style={{ height: `${h * 0.7}%` }} 
                    />
                    {/* Traffic Line Simulation */}
                    <div 
                      className="w-full bg-emerald-500/40 rounded-t-sm mt-0.5" 
                      style={{ height: `${(100 - h) * 0.3}%` }} 
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 text-[10px] font-mono text-gray-600">
                <span>00:00:00</span>
                <span>00:00:15</span>
                <span>00:00:30</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-28 bg-zinc-950/80 border-y border-white/5 relative">
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-radial from-cyan-500/5 to-transparent blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Engineered for absolute reliability.</h2>
            <p className="text-gray-400 text-lg">
              CORE SRE automates complex production incident pipelines, bridging observability telemetry with structural self-healing logic.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, index) => (
              <motion.div 
                key={index}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
                className="p-8 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md hover:border-cyan-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="mb-6">{feat.icon}</div>
                  <h3 className="text-xl font-extrabold mb-4">{feat.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-28 max-w-7xl mx-auto px-6 relative">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">The Self-Healing Loop</h2>
          <p className="text-gray-400 text-lg">
            Understand how CORE SRE detects production infrastructure defects and applies automated repairs safely.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 relative">
          {workflowSteps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Arrow Connector for larger screens */}
              {index < 3 && (
                <div className="hidden lg:block absolute top-8 left-[90%] w-full h-[1px] bg-gradient-to-r from-cyan-500/20 to-transparent z-10" />
              )}
              <div className="p-7 rounded-2xl border border-white/5 bg-[#050508] hover:border-purple-500/30 transition-all h-full flex flex-col justify-between">
                <div>
                  <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white/10 to-transparent group-hover:from-cyan-400/20 transition-all mb-6">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-bold mb-3">{step.title}</h3>
                  <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About Me Section */}
      <section id="about-me" className="py-28 bg-zinc-950/80 border-t border-white/5 relative">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-radial from-purple-500/5 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Behind the Platform</h2>
            <p className="text-gray-400 text-lg">
              Meet the engineer building the future of autonomous systems and neural agent pipelines.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 items-start">
            {/* Left Bio Card */}
            <div className="lg:col-span-5 p-8 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-purple-600/10 blur-xl pointer-events-none" />
              
              <div className="flex flex-col items-center text-center">
                {/* Avatar with Animated Border */}
                <div className="relative w-32 h-32 rounded-2xl overflow-hidden mb-6 p-[2px] bg-gradient-to-br from-cyan-500 to-purple-600 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
                  <img 
                    src="https://avatars.githubusercontent.com/u/198415414?v=4" 
                    alt="Chandan PO" 
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                </div>

                <h3 className="text-2xl font-black tracking-tight mb-1">Chandan PO</h3>
                <p className="text-cyan-400 font-mono text-sm mb-4">AI/ML &amp; Full-Stack Systems Engineer</p>
                
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs font-mono text-gray-400">Presidency University</span>
                  <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs font-mono text-gray-400">Bangalore, IN</span>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-sm">
                  Focused on building production-ready agentic AI platforms, cognitive-inspired memory systems, and self-healing infrastructure layers. Specialized in the intersection of Generative AI, distributed MLOps, and real-time observability.
                </p>

                {/* Profile Links */}
                <div className="grid grid-cols-2 gap-4 w-full">
                  <a 
                    href="https://github.com/Chandann-23" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-zinc-900 border border-white/5 hover:bg-zinc-800 hover:border-white/10 text-white font-bold text-sm transition-all"
                  >
                    <GithubIcon className="w-4.5 h-4.5" />
                    GitHub
                  </a>
                  <a 
                    href="https://in.linkedin.com/in/chandan-po" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-zinc-900 border border-white/5 hover:bg-zinc-800 hover:border-white/10 text-white font-bold text-sm transition-all"
                  >
                    <LinkedinIcon className="w-4.5 h-4.5" />
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>

            {/* Right Portfolio Showcase */}
            <div className="lg:col-span-7 space-y-6">
              <h4 className="text-lg font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-cyan-400" />
                Featured Systems
              </h4>
              
              <div className="grid gap-4.5">
                {featuredSystems.map((proj, idx) => (
                  <div 
                    key={idx}
                    className="p-5.5 rounded-xl border border-white/5 bg-[#050508] hover:border-cyan-500/20 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h5 className="font-extrabold text-white text-base tracking-tight">{proj.title}</h5>
                        <ArrowUpRight className="w-4.5 h-4.5 text-gray-600 hover:text-cyan-400 transition-colors" />
                      </div>
                      <p className="text-gray-400 text-xs md:text-sm leading-relaxed mb-4">{proj.desc}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {proj.tech.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-cyan-500/5 border border-cyan-500/10 text-[10px] font-mono text-cyan-400">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-radial from-cyan-500/10 to-transparent blur-3xl -z-10" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-8 tracking-tight leading-tight">Ready to experience autonomous incident response?</h2>
          <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">Launch the CORE SRE Sandbox environment to simulate vulnerabilities and witness autonomous AI repair loops.</p>
          <a 
            href="https://core-sre-engine.vercel.app" 
            className="inline-flex items-center gap-2 px-9 py-5 text-lg font-bold bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] transition-all"
          >
            Launch Dashboard <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black py-12 relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-zinc-900 flex items-center justify-center border border-white/10">
              <Terminal className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <span className="font-extrabold text-sm tracking-wider text-gray-400">CORE SRE</span>
          </div>
          <div className="text-gray-500 text-xs md:text-sm">
            © 2026 Chandan PO. All rights reserved. Engineered for the autonomous future.
          </div>
        </div>
      </footer>
    </div>
  );
}
