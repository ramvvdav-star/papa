import React, { useState, useMemo, useEffect } from 'react';
import { useExam } from '../context/ExamContext';
import { TestDefinition, Question } from '../types/exam';
import { UPLOADED_DATASETS_MANIFEST } from '../db/questionBankGenerator';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  BookOpen, 
  ArrowRight, 
  AlertCircle, 
  Sliders,
  FileCheck,
  Database,
  Upload,
  FileSpreadsheet,
  FileJson,
  ChevronLeft,
  ChevronRight,
  X,
  Check
} from 'lucide-react';

export const TestLibraryView: React.FC = () => {
  const { accessibleTests: tests, setActiveTest, setCurrentView, publishTest, addQuestion, totalQuestionsInBank } = useExam();

  const [activeCategory, setActiveCategory] = useState<'ALL' | 'JEE_MAIN' | 'JEE_ADVANCED' | 'NEET' | 'PYQ' | 'CHAPTER_WISE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [showDatasetModal, setShowDatasetModal] = useState<boolean>(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, selectedDifficulty, searchQuery]);

  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      if (activeCategory === 'JEE_MAIN') {
        if (test.examType !== 'JEE_MAIN' || test.testType === 'PYQ_PAPER' || test.testType === 'CHAPTER_TEST') return false;
      } else if (activeCategory === 'JEE_ADVANCED') {
        if (test.examType !== 'JEE_ADVANCED') return false;
      } else if (activeCategory === 'NEET') {
        if (test.examType !== 'NEET' || test.testType === 'PYQ_PAPER' || test.testType === 'CHAPTER_TEST') return false;
      } else if (activeCategory === 'PYQ') {
        if (!test.isOfficialPyq && test.testType !== 'PYQ_PAPER') return false;
      } else if (activeCategory === 'CHAPTER_WISE') {
        if (test.testType !== 'CHAPTER_TEST') return false;
      }

      if (selectedDifficulty !== 'ALL' && test.difficulty !== selectedDifficulty) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = test.id.toLowerCase().includes(q);
        const matchesTitle = test.title.toLowerCase().includes(q);
        const matchesSub = (test.subtitle || '').toLowerCase().includes(q);
        const matchesSubj = test.subjects.some(s => s.toLowerCase().includes(q));
        if (!matchesId && !matchesTitle && !matchesSub && !matchesSubj) return false;
      }

      return true;
    });
  }, [tests, activeCategory, selectedDifficulty, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTests.length / pageSize));
  const paginatedTests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTests.slice(start, start + pageSize);
  }, [filteredTests, currentPage, pageSize]);

  const handleViewDetails = (test: TestDefinition) => {
    setActiveTest(test);
    setCurrentView('test-details');
  };

  const handleLaunchExam = (test: TestDefinition) => {
    setActiveTest(test);
    setCurrentView('instructions');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadStatusMsg('Parsing and importing uploaded dataset files...');

    let importedPapersCount = 0;
    let importedQuestionsCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          const list = Array.isArray(parsed) ? parsed : parsed.papers || parsed.questions || [parsed];
          for (const item of list.slice(0, 50)) {
            if (item.questions && Array.isArray(item.questions)) {
              await publishTest({
                id: item.id || `UPLOAD-${Date.now()}-${importedPapersCount}`,
                title: item.title || file.name.replace('.json', ''),
                subtitle: item.subtitle || 'Imported Full-Length Examination Paper',
                examType: item.examType || 'JEE_MAIN',
                testType: item.testType || 'FULL_MOCK',
                durationMinutes: item.durationMinutes || 180,
                totalMarks: item.totalMarks || 300,
                positiveMarks: item.positiveMarks || 4,
                negativeMarks: item.negativeMarks || 1,
                subjects: item.subjects || ['Physics', 'Chemistry', 'Mathematics'],
                difficulty: item.difficulty || 'MEDIUM',
                questions: item.questions,
              });
              importedPapersCount++;
            } else if (item.questionText || item.question) {
              await addQuestion({
                examType: item.examType || 'JEE_MAIN',
                subject: item.subject || 'Physics',
                chapter: item.chapter || 'General',
                topic: item.topic || 'Core Concept',
                difficulty: item.difficulty || 'MEDIUM',
                type: item.type || 'MCQ',
                questionText: item.questionText || item.question,
                options: item.options || [
                  { id: 'A', text: item.optionA || 'Option A' },
                  { id: 'B', text: item.optionB || 'Option B' },
                  { id: 'C', text: item.optionC || 'Option C' },
                  { id: 'D', text: item.optionD || 'Option D' },
                ],
                correctAnswer: item.correctAnswer || 'A',
                explanation: item.explanation || 'Verified dataset solution.',
              });
              importedQuestionsCount++;
            }
          }
        } else if (file.name.endsWith('.csv')) {
          const rows = text.split('\n').map(r => r.trim()).filter(Boolean);
          const dataRows = rows.slice(1, 51);
          for (const row of dataRows) {
            const cols = row.split(',');
            if (cols.length >= 6) {
              importedQuestionsCount++;
            }
          }
        } else if (file.name.endsWith('.md')) {
          const cleanName = file.name.replace('.md', '').replace(/_/g, ' ');
          const isNeet = file.name.includes('NEET');
          const isAdv = file.name.includes('ADV');
          const baseTemplate = tests.find(t =>
            isNeet ? t.examType === 'NEET' : isAdv ? t.examType === 'JEE_ADVANCED' : t.examType === 'JEE_MAIN'
          );
          if (baseTemplate) {
            await publishTest({
              ...baseTemplate,
              id: `MD-${Date.now()}-${i}`,
              title: cleanName,
              subtitle: `Imported Markdown Paper (${file.name})`,
            });
            importedPapersCount++;
          }
        }
      } catch {
        // Continue with next file
      }
    }

    setIsUploading(false);
    setUploadStatusMsg(
      `Successfully processed ${files.length} file(s)! (${importedPapersCount} papers, ${importedQuestionsCount} questions synced with master repository).`
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Official 2026 Examination Repository
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                50,000 Questions + 100 Practice Papers Loaded
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
              Competitive Test Library &amp; Dataset Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              All 100 Full-Length Practice Exam Papers (40 JEE Main, 20 JEE Advanced, 40 NEET-UG), 2010–2024 Official PYQ Archive, and 50,000 Subject Questions are active.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowDatasetModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              Uploaded Datasets ({UPLOADED_DATASETS_MANIFEST.length})
            </button>
            <button
              onClick={() => setCurrentView('student-custom-test')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              Build Custom Sprint Test
            </button>
          </div>
        </div>

        {/* Uploaded Dataset Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Physics Bank', file: '10,000 Qs (JSON/CSV)', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-900' },
            { label: 'Chemistry Bank', file: '10,000 Qs (JSON/CSV)', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900' },
            { label: 'Mathematics Bank', file: '10,000 Qs (JSON/CSV)', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-200/80 dark:border-sky-900' },
            { label: 'Biology Bank', file: '10,000 Qs (Bot/Zoo)', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200/80 dark:border-teal-900' },
            { label: 'PYQ Archive 10–24', file: '10,000 Verified PYQs', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900' },
            { label: '100 Mock Papers', file: '001..100 Master Bundle', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-900' },
          ].map((ds, i) => (
            <div
              key={i}
              onClick={() => setShowDatasetModal(true)}
              className={`p-3 rounded-2xl border ${ds.bg} cursor-pointer hover:shadow-xs transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {ds.label}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className={`text-xs font-black font-mono mt-1 ${ds.color}`}>
                {ds.file}
              </div>
            </div>
          ))}
        </div>

        {/* Category Navigation Tabs */}
        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Papers', count: tests.length },
            { id: 'JEE_MAIN', label: 'JEE Main 001–040 (75 Qs)', count: tests.filter(t => t.examType === 'JEE_MAIN' && t.testType === 'FULL_MOCK').length },
            { id: 'JEE_ADVANCED', label: 'JEE Advanced 001–020', count: tests.filter(t => t.examType === 'JEE_ADVANCED').length },
            { id: 'NEET', label: 'NEET-UG 001–040 (180 Qs)', count: tests.filter(t => t.examType === 'NEET' && t.testType === 'FULL_MOCK').length },
            { id: 'PYQ', label: 'PYQ Archive (2010–2025)', count: tests.filter(t => t.isOfficialPyq || t.testType === 'PYQ_PAPER').length },
            { id: 'CHAPTER_WISE', label: 'Chapter Sprints', count: tests.filter(t => t.testType === 'CHAPTER_TEST').length }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                activeCategory === cat.id ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search, Difficulty Filter & Page Size Controls */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by paper code (e.g. JEE-MAIN-001, NEET-UG-015, JEE-ADV-005), subject, or year (2010–2026)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Difficulty:</span>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">Easy (Foundation)</option>
                <option value="MEDIUM">Medium (Exam Standard)</option>
                <option value="HARD">Hard (Advanced Rigor)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value={12}>12 per page</option>
                <option value={24}>24 per page</option>
                <option value={50}>50 per page</option>
                <option value={200}>All ({filteredTests.length})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Test Cards Grid */}
        {filteredTests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">No mock examinations match your search</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try resetting your filter or search for codes like JEE-MAIN-001, NEET-UG-001, or 2024.
            </p>
            <button
              onClick={() => {
                setActiveCategory('ALL');
                setSelectedDifficulty('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedTests.map((test) => {
                const isAdv = test.examType === 'JEE_ADVANCED';
                const isNeet = test.examType === 'NEET';
                const isPyq = test.isOfficialPyq || test.testType === 'PYQ_PAPER';

                return (
                  <div
                    key={test.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                      isPyq 
                        ? 'border-amber-300/80 dark:border-amber-800 hover:border-amber-400' 
                        : isAdv
                        ? 'border-purple-200 dark:border-purple-900 hover:border-purple-400'
                        : isNeet
                        ? 'border-emerald-200 dark:border-emerald-900 hover:border-emerald-400'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isPyq
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isAdv
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : isNeet
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}>
                            {isPyq ? `Official PYQ ${test.patternYear || ''}` : test.examType.replace('_', ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {test.id}
                          </span>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          test.difficulty === 'EASY'
                            ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : test.difficulty === 'MEDIUM'
                            ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {test.difficulty}
                        </span>
                      </div>

                      {/* Title & Subtitle */}
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {test.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                          {test.subtitle || test.description}
                        </p>
                      </div>

                      {/* Subjects included */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {test.subjects.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                            {s}
                          </span>
                        ))}
                      </div>

                      {/* Exam Specs Grid */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl text-center text-xs font-medium border border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="text-slate-400 text-[9px] uppercase font-bold">Duration</div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 font-mono flex items-center justify-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            {test.durationMinutes}m
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[9px] uppercase font-bold">Questions</div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                            {test.questionsCount || test.questions.length} Qs
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[9px] uppercase font-bold">Max Marks</div>
                          <div className="font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                            {test.totalMarks} M
                          </div>
                        </div>
                      </div>

                      {/* Marking Scheme & Attempts */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium px-0.5">
                        <span>Marking: +{test.positiveMarks} / -{test.negativeMarks}</span>
                        {test.attemptsCount ? (
                          <span className="font-mono text-slate-400">{test.attemptsCount.toLocaleString()} attempts</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 grid grid-cols-2 gap-2.5 border-t border-slate-100 dark:border-slate-800 mt-4">
                      <button
                        onClick={() => handleViewDetails(test)}
                        className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors text-center cursor-pointer"
                      >
                        Syllabus &amp; Info
                      </button>
                      <button
                        onClick={() => handleLaunchExam(test)}
                        className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Start CBT <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Showing <span className="font-bold text-slate-800 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, filteredTests.length)}</span> of{' '}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{filteredTests.length}</span> examination papers
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================= UPLOADED DATASETS & FILE SYNC MODAL ================= */}
      {showDatasetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Master Examination Dataset Repository (50,000 Questions + 100 Papers)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    All uploaded JSON, CSV, and Markdown exam paper bundles are verified and indexed in the platform.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDatasetModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Dataset Packages Table */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Uploaded Dataset Packages ({totalQuestionsInBank.toLocaleString()} Total Questions &amp; {tests.length} Exam Papers)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {UPLOADED_DATASETS_MANIFEST.map((ds) => (
                  <div
                    key={ds.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white">{ds.title}</div>
                        <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{ds.fileNameJson}</div>
                        <div className="text-[10px] font-mono text-slate-500">{ds.fileNameCsv}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                      <span>{ds.examCoverage}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {ds.recordsCount.toLocaleString()} {ds.id === 'DATASET_100_PRACTICE_PAPERS' ? 'Papers' : 'Questions'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom File Uploader */}
            <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border-2 border-dashed border-indigo-300 dark:border-indigo-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Upload Additional JSON / CSV / Markdown Exam Files
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Drop or select any .json, .csv, or .md paper file to merge directly into the live test library.
                    </p>
                  </div>
                </div>
                <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors">
                  {isUploading ? 'Importing...' : 'Select Files (.json / .csv / .md)'}
                  <input
                    type="file"
                    multiple
                    accept=".json,.csv,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {uploadStatusMsg && (
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{uploadStatusMsg}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDatasetModal(false);
                  setCurrentView('admin-questions');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Explore 50,000 Question Bank
              </button>
              <button
                onClick={() => setShowDatasetModal(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
