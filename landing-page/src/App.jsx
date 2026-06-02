import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Terminal, Zap, Server, Activity, ArrowRight, Code } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 font-sans overflow-hidden">
      <div className="glow-effect"></div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-lg tracking-wide">CORE SRE</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/Chandann-23/core-sre-agent" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <Code className="w-5 h-5" />
            </a>
            <a 
              href="https://core-sre-engine.vercel.app" 
              className="px-4 py-2 text-sm font-bold bg-white text-black rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto mt-20"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-8">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Autonomous AI Engineer
          </div>
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8 leading-tight">
            Meet your new <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
              Site Reliability Engineer.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            CORE SRE autonomously detects, analyzes, and repairs critical infrastructure vulnerabilities in real-time using GLM-4 neural reasoning.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="https://core-sre-engine.vercel.app" 
              className="px-8 py-4 text-base font-bold bg-white text-black rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              Launch Dashboard
            </a>
            <a 
              href="#how-it-works" 
              className="px-8 py-4 text-base font-bold bg-transparent text-white border border-white/20 rounded-lg hover:bg-white/5 transition-colors w-full sm:w-auto justify-center flex"
            >
              See how it works
            </a>
          </div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mt-24 relative rounded-xl border border-white/10 bg-[#0A0A0F] shadow-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none"></div>
          <div className="h-8 border-b border-white/10 flex items-center px-4 gap-2 bg-[#11121C]">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=2000&q=80" 
            alt="Dashboard Preview" 
            className="w-full object-cover opacity-50 grayscale mix-blend-screen"
            style={{ height: '500px' }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
             <div className="text-center">
                <Activity className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Zero-Latency Telemetry</h3>
                <p className="text-gray-400">Streamed directly via WebSockets to the React Edge.</p>
             </div>
          </div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-24 bg-zinc-950 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-sm hover:border-cyan-500/50 transition-colors">
              <ShieldAlert className="w-10 h-10 text-red-400 mb-6" />
              <h3 className="text-xl font-bold mb-4">Autonomous Repair</h3>
              <p className="text-gray-400 leading-relaxed">
                When a vulnerability hits production, CORE SRE isolates the sandbox, analyzes the stack trace, and writes a perfect patch using GLM-4 heuristics.
              </p>
            </div>
            <div className="p-8 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-sm hover:border-cyan-500/50 transition-colors">
              <Zap className="w-10 h-10 text-cyan-400 mb-6" />
              <h3 className="text-xl font-bold mb-4">Real-Time Validation</h3>
              <p className="text-gray-400 leading-relaxed">
                Live unit test matrices visually prove that the AI patch resolved the anomaly without introducing regressions into the monolith.
              </p>
            </div>
            <div className="p-8 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-sm hover:border-cyan-500/50 transition-colors">
              <Server className="w-10 h-10 text-purple-400 mb-6" />
              <h3 className="text-xl font-bold mb-4">Human in the Loop</h3>
              <p className="text-gray-400 leading-relaxed">
                Review Monaco diffs of the AI's proposed code changes before hitting "Approve". Full automation, zero loss of control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-b from-cyan-500/10 to-transparent blur-3xl z-0"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to automate your incident response?</h2>
          <p className="text-xl text-gray-400 mb-10">Deploy CORE SRE to your cluster in minutes.</p>
          <a 
            href="https://core-sre-engine.vercel.app" 
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors shadow-[0_0_40px_rgba(6,182,212,0.4)]"
          >
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-gray-500" />
            <span className="font-bold text-gray-500 tracking-wide">CORE SRE</span>
          </div>
          <div className="text-gray-500 text-sm">
            © 2026 Core SRE Inc. All rights reserved. Built for the autonomous future.
          </div>
        </div>
      </footer>
    </div>
  );
}
