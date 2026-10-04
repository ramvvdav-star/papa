import React, { useState } from 'react';
import { useExam } from '../context/ExamContext';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  HelpCircle,
  Clock,
  Layers,
  Check
} from 'lucide-react';

export const ExamInstructionsView: React.FC = () => {
  const { activeTest, setCurrentView } = useExam();
  const [hasAgreed, setHasAgreed] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Hindi'>('English');

  if (!activeTest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <button 
          onClick={() => setCurrentView('tests')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          Back to Test Library
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentView('test-details')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Test Details
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Default Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as any)}
              className="py-1 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिंदी)</option>
            </select>
          </div>
        </div>

        {/* Official Header Card */}
        <div className="bg-white border-t-4 border-indigo-600 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-black text-slate-900">
              General Examination Instructions
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Please read the instructions carefully before initiating the computer-based testing interface.
            </p>
          </div>

          {/* Test Parameters Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Examination:</span>
              <span className="font-bold text-slate-800">{activeTest.examType.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Duration:</span>
              <span className="font-bold text-slate-800 font-mono">{activeTest.durationMinutes} Minutes</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Questions:</span>
              <span className="font-bold text-slate-800 font-mono">{activeTest.questions.length} Items</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Marking Scheme:</span>
              <span className="font-bold text-emerald-600 font-mono">+{activeTest.positiveMarks} Correct, -{activeTest.negativeMarks} Wrong</span>
            </div>
          </div>

          {/* Detailed Instructions Body */}
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
              1. General Instructions &amp; Timing
            </h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                The clock will be set at the server. The countdown timer in the top-center of the screen will display the remaining time available for you to complete the examination.
              </li>
              <li>
                When the timer reaches zero, the examination will end by itself automatically. You will not be required to end or submit your examination manually at zero time.
              </li>
              <li>
                You can navigate between any question or subject section at any time during the allocated test duration.
              </li>
            </ol>

            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide pt-2">
              2. Question Palette Symbols &amp; Status
            </h2>
            <p>
              The Question Palette displayed on the right side of screen will show the status of each question using one of the following official symbols:
            </p>

            {/* Visual Palette Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-md bg-slate-200 border border-slate-300 font-bold font-mono text-slate-700 flex items-center justify-center shrink-0">
                  01
                </span>
                <span className="font-medium text-slate-700">You have not visited the question yet.</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-md bg-red-600 font-bold font-mono text-white flex items-center justify-center shrink-0 shadow-xs">
                  02
                </span>
                <span className="font-medium text-slate-700">You have not answered the question.</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-md bg-emerald-600 font-bold font-mono text-white flex items-center justify-center shrink-0 shadow-xs">
                  03
                </span>
                <span className="font-medium text-slate-700">You have answered the question.</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-purple-600 font-bold font-mono text-white flex items-center justify-center shrink-0 shadow-xs">
                  04
                </span>
                <span className="font-medium text-slate-700">You have NOT answered the question, but marked it for review.</span>
              </div>

              <div className="flex items-center gap-3 sm:col-span-2">
                <div className="relative w-8 h-8 shrink-0">
                  <span className="w-8 h-8 rounded-full bg-purple-600 font-bold font-mono text-white flex items-center justify-center shadow-xs">
                    05
                  </span>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"></span>
                </div>
                <span className="font-medium text-slate-700">
                  The question has been answered AND marked for review (it will be evaluated in final scoring).
                </span>
              </div>
            </div>

            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wide pt-2">
              3. Navigating to a Question &amp; Answering
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Click on the question number in the Question Palette to jump directly to that question.</li>
              <li>Click on <strong>Save &amp; Next</strong> to save your answer and move to the next question.</li>
              <li>Click on <strong>Mark for Review &amp; Next</strong> to save answer (if chosen), mark it for review, and go to next question.</li>
              <li>Click on <strong>Clear Response</strong> to deselect your chosen option.</li>
            </ul>
          </div>

          {/* Mandatory Checkbox */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasAgreed}
                onChange={(e) => setHasAgreed(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-0.5 cursor-pointer"
              />
              <span className="text-xs text-slate-800 font-semibold leading-relaxed">
                I have read and understood all the instructions. All computer hardware allotted to me is in proper working condition. 
                I declare that I am not in possession of any unauthorized electronic devices. I agree to abide by the rules of this mock CBT examination.
              </span>
            </label>
          </div>

          {/* Button bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Step 1 of 2: Instruction Verification
            </span>

            <button
              onClick={() => setCurrentView('system-check')}
              disabled={!hasAgreed}
              className={`px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                hasAgreed
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Proceed to System Diagnostic <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
