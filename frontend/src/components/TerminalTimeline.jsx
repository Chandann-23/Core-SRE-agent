import React, { useRef, useEffect } from 'react';

const SECTION_HEADER_REGEX = /##\s*([A-Za-z]+)\s*:?/g;

export default function TerminalTimeline({ history }) {
  const terminalRef = useRef(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const timelineEntries = history.flatMap((entry, index) => {
    const text = String(entry ?? "").trim();
    if (!text) return [];
    
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
        type: "section",
        label,
        body: bodyWithoutCode
      });
    }
    return parsed;
  });

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0F] border-l border-[#2A2B3D] overflow-hidden">
      <div className="flex items-center px-4 py-2 border-b border-[#2A2B3D] bg-[#11121C]">
        <div className="text-xs font-semibold text-gray-400 tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
          TERMINAL / TIMELINE
        </div>
      </div>
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm scroll-smooth custom-scrollbar"
      >
        {timelineEntries.length === 0 ? (
          <div className="text-gray-600 italic">Waiting for events...</div>
        ) : (
          timelineEntries.map((item) => (
            <div key={item.id} className="animate-fade-in">
              {item.type === "terminal" ? (
                <div className="text-emerald-400 border border-emerald-900/30 bg-emerald-900/10 p-3 rounded flex items-start">
                  <span className="mr-3 opacity-70">$&gt;</span>
                  <span className="flex-1 leading-relaxed">{item.body.substring(2)}</span>
                </div>
              ) : (
                <div className="text-blue-300 border border-blue-900/30 bg-blue-900/10 p-3 rounded flex flex-col">
                  <span className="text-xs font-bold text-blue-500 mb-1 tracking-widest">
                    [{item.label}]
                  </span>
                  <span className="leading-relaxed opacity-90">{item.body}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
