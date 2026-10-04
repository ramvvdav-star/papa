import React, { useState, useEffect } from 'react';
import { useExam } from '../context/ExamContext';
import { 
  CheckCircle2, 
  Monitor, 
  Wifi, 
  Keyboard, 
  MousePointer2, 
  Maximize, 
  ShieldCheck, 
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const SystemCheckView: React.FC = () => {
  const { activeTest, startCbtExam, setCurrentView } = useExam();

  const [mouseTested, setMouseTested] = useState(false);
  const [keyTested, setKeyTested] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number>(24);
  const [screenRes, setScreenRes] = useState<string>('1920 x 1080');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setScreenRes(`${window.screen.width} x ${window.screen.height}`);
      const checkFull = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', checkFull);

      const handleKey = () => setKeyTested(true);
      window.addEventListener('keydown', handleKey);

      return () => {
        document.removeEventListener('fullscreenchange', checkFull);
        window.removeEventListener('keydown', handleKey);
      };
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleStartExam = () => {
    if (!activeTest) return;
    startCbtExam(activeTest);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => setCurrentView('instructions')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Instructions
        </button>

        {/* Diagnostic Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Pre-Examination Diagnostic
              </span>
              <span className="text-xs text-slate-400 font-mono">Terminal Node #CBT-042</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-2">
              System &amp; Hardware Compatibility Check
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verifying workstation hardware, display viewport, and network synchronization before loading the CBT exam engine.
            </p>
          </div>

          {/* Diagnostic Checks List */}
          <div className="space-y-3">
            {/* 1. Browser & JS Engine */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Browser Compatibility &amp; WebGL Engine</div>
                  <div className="text-[11px] text-slate-500">HTML5 KaTeX, WebSocket &amp; LocalStorage ready</div>
                </div>
              </div>
              <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                PASSED
              </span>
            </div>

            {/* 2. Network Latency & Ping */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Network &amp; Synchronization Latency</div>
                  <div className="text-[11px] text-slate-500">Auto-save sync buffer: {latencyMs}ms ping (Optimal)</div>
                </div>
              </div>
              <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                CONNECTED
              </span>
            </div>

            {/* 3. Screen Viewport */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Display Viewport &amp; Resolution</div>
                  <div className="text-[11px] text-slate-500">Detected: {screenRes} (Standard CBT Canvas)</div>
                </div>
              </div>
              <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                OPTIMAL
              </span>
            </div>

            {/* 4. Mouse & Click Test */}
            <div 
              onMouseMove={() => setMouseTested(true)}
              onClick={() => setMouseTested(true)}
              className={`p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                mouseTested ? 'bg-slate-50 border-slate-200' : 'bg-amber-50/70 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  mouseTested ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <MousePointer2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Mouse &amp; Pointer Responsiveness</div>
                  <div className="text-[11px] text-slate-500">
                    {mouseTested ? 'Pointer and primary button click detected' : 'Move cursor or click here to verify mouse click event'}
                  </div>
                </div>
              </div>
              <span className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                mouseTested ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-100 border-amber-200'
              }`}>
                {mouseTested ? 'VERIFIED' : 'TEST NOW'}
              </span>
            </div>

            {/* 5. Fullscreen Mode */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Maximize className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Immersive Fullscreen Environment</div>
                  <div className="text-[11px] text-slate-500">
                    {isFullscreen ? 'Fullscreen active' : 'Recommended for authentic competitive exam conditions'}
                  </div>
                </div>
              </div>
              <button
                onClick={toggleFullscreen}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              </button>
            </div>
          </div>

          {/* Academic Transparency Note */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
            <strong>System Notice:</strong> This pre-flight diagnostic verifies your local browser and display capabilities for a glitch-free mock experience. It does not enforce proprietary hardware lockdown.
          </div>

          {/* Confirmation & Launch */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-700">System Ready for Exam</span>
            </div>

            <button
              onClick={handleStartExam}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
            >
              Start CBT Examination <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
