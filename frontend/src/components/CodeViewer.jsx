import React from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';

export default function CodeViewer({ showDiff, oldCode, code, currentFile }) {
  // Common Monaco options
  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    lineHeight: 1.6,
    padding: { top: 20, bottom: 20 },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: "smooth",
    cursorSmoothCaretAnimation: "on",
    formatOnPaste: true,
    readOnly: true,
    renderLineHighlight: "all",
  };

  const diffOptions = {
    ...editorOptions,
    renderSideBySide: true,
    ignoreTrimWhitespace: false,
    enableSplitViewResizing: true,
    originalEditable: false,
    diffWordWrap: "off",
  };

  return (
    <div className="flex-1 bg-[#0A0A0F] relative overflow-hidden flex flex-col">
      {showDiff ? (
        <div className="flex-1 animate-fade-in flex flex-col h-full">
          <div className="bg-[#11121C] border-b border-[#2A2B3D] py-2 px-4 flex justify-between items-center text-xs font-mono text-gray-400">
            <div className="flex items-center gap-4">
              <span className="text-red-400">● Before (Buggy Code)</span>
              <span className="text-emerald-400">● After (Fixed Code)</span>
            </div>
            <span className="bg-[#2A2B3D] px-2 py-1 rounded text-gray-300">
              Diff View: {currentFile}
            </span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <DiffEditor
              height="100%"
              language="python"
              theme="vs-dark"
              original={oldCode || ""}
              modified={code || ""}
              options={diffOptions}
              className="absolute inset-0"
              loading={
                <div className="flex h-full items-center justify-center text-gray-500">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                  Loading diff viewer...
                </div>
              }
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 animate-fade-in flex flex-col h-full">
          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              options={editorOptions}
              className="absolute inset-0"
              loading={
                <div className="flex h-full items-center justify-center text-gray-500 font-mono text-sm">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                  Initializing environment...
                </div>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
