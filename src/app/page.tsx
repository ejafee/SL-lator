"use client";

import { useState, useRef, useCallback } from "react";
import { WebcamFeed } from "@/components/WebcamFeed";
import { LogEntry, TranslationResult } from "@/types";

export default function Home() {
  const [text, setText] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [sensitivity, setSensitivity] = useState(70);
  const [latency, setLatency] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const textBuffer = useRef("");
  const lastInferenceAt = useRef<number>(Date.now());

  const handleLog = useCallback(async (entry: LogEntry) => {
    setLogs((prev) => [...prev, entry]);

    // Fire-and-forget server log write
    try {
      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    } catch {}
  }, []);

  const handleTranslation = useCallback((t: TranslationResult) => {
    setLatency(Date.now() - lastInferenceAt.current);
    lastInferenceAt.current = Date.now();
    if (!t.gloss || t.gloss === "...") return;
    if (t.confidence * 100 < sensitivity) return;

    // Append to text buffer
    if (t.gloss === "DEL") textBuffer.current = textBuffer.current.slice(0, -1);
    else if (t.gloss === "SPACE") textBuffer.current += " ";
    else textBuffer.current += t.gloss;
    setText(textBuffer.current);
  }, [sensitivity]);

  function downloadLog(format: "json" | "csv" | "txt") {
    let content = "";
    let mime = "text/plain";
    if (format === "json") {
      content = JSON.stringify(logs, null, 2);
      mime = "application/json";
    } else if (format === "csv") {
      content = "timestamp,gloss,confidence,isFallback\n" +
        logs.map(l => `${l.timestamp},${l.gloss},${l.confidence.toFixed(3)},${l.isFallback}`).join("\n");
      mime = "text/csv";
    } else {
      content = logs.map(l => `[${l.timestamp}] ${l.gloss} (${(l.confidence*100).toFixed(1)}%)`).join("\n");
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sl-lator-session-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submitFeedback() {
    if (!feedback.trim()) return;
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correction: feedback, logs: logs.slice(-10) }),
      });
      setFeedback("");
      alert("Feedback recorded. Model will improve with usage.");
    } catch {
      alert("Feedback failed");
    }
  }

  return (
    <main className="container mx-auto px-4 py-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">SL-lator</h1>
        <p className="text-sm text-slate-300">Real-time Sign Language Translator</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <WebcamFeed onLog={handleLog} onTranslation={handleTranslation} paused={paused} />

          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setPaused(p => !p)}
              className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm"
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button onClick={() => { textBuffer.current = ""; setText(""); }} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm">Clear Text</button>
            <label className="text-xs flex items-center gap-2 ml-auto">
              Sensitivity
              <input
                type="range" min={30} max={95} value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-32"
              />
              <span className="w-8">{sensitivity}</span>
            </label>
            {latency !== null && (
              <span className="text-xs text-slate-400 ml-2">{latency} ms</span>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <label className="text-xs text-slate-400">Translated Output</label>
            <div className="mt-1 min-h-[100px] p-3 rounded bg-slate-800/80 border border-slate-700 text-lg">
              {text || <span className="text-slate-500 text-sm">Sign a letter to begin...</span>}
            </div>
            <button onClick={() => navigator.clipboard.writeText(text)} className="mt-2 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Copy</button>
          </div>

          <div>
            <label className="text-xs text-slate-400">Export Session Log</label>
            <div className="mt-1 flex gap-2">
              <button onClick={() => downloadLog("txt")} className="px-2 py-1 text-xs rounded bg-emerald-700 hover:bg-emerald-600">TXT</button>
              <button onClick={() => downloadLog("json")} className="px-2 py-1 text-xs rounded bg-emerald-700 hover:bg-emerald-600">JSON</button>
              <button onClick={() => downloadLog("csv")} className="px-2 py-1 text-xs rounded bg-emerald-700 hover:bg-emerald-600">CSV</button>
              <span className="text-xs text-slate-400 ml-2">{logs.length} entries</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400">Help us improve (model flywheel)</label>
            <div className="mt-1 flex gap-2">
              <input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What should it have said?"
                className="flex-1 px-2 py-1 text-sm rounded bg-slate-800 border border-slate-700"
              />
              <button onClick={submitFeedback} className="px-3 py-1 text-xs rounded bg-indigo-700 hover:bg-indigo-600">Submit</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
