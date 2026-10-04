import React from 'react';
import { useExam } from '../context/ExamContext';
import { ShieldAlert, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  const { currentView, setCurrentView } = useExam();

  if (currentView === 'cbt-exam') return null;

  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl text-white tracking-tight">
                NTA<span className="text-indigo-400">Pulse</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                CBT Testing System
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Engineered specifically for serious JEE Main, JEE Advanced, and NEET UG aspirants.
              Experience genuine computer-based exam ergonomics, authoritative timing, instant evaluation, and actionable weakness analytics.
            </p>
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-amber-200/90 flex items-start gap-2 max-w-md">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Academic Disclaimer:</strong> CBT practice interface inspired by competitive examination workflows.
                NTA Pulse is an independent preparation and analytics platform and is not affiliated with, authorized, or operated by the National Testing Agency (NTA).
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Exam Prep</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button onClick={() => setCurrentView('tests')} className="hover:text-white transition-colors">
                  JEE Main Full Mocks (Physics, Chem, Math)
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('tests')} className="hover:text-white transition-colors">
                  NEET UG Diagnostic Mocks (Bio, Chem, Phy)
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('student-custom-test')} className="hover:text-white transition-colors">
                  High-Yield Chapter Sprint Tests
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('student-custom-test')} className="hover:text-white transition-colors">
                  Student Custom Test Builder
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Administration</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <button onClick={() => setCurrentView('admin-dashboard')} className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Admin Control Center
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('admin-ai-generator')} className="hover:text-white transition-colors">
                  AI Question Generator (Gemini 3.8)
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('admin-paper-builder')} className="hover:text-white transition-colors">
                  Blueprint & Paper Generator
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('admin-questions')} className="hover:text-white transition-colors">
                  Question Bank & Validation
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} NTA Pulse. All mock papers, formulas and CBT analytics strictly for student practice.</p>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Secure Testing Engine Active
            </span>
          </div>
        </div>
      </footer>
    );
  };
