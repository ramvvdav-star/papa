import { 
  TestDefinition, 
  UserExamResponse, 
  TestAttemptResult, 
  QuestionResultReview, 
  SubjectAnalysisItem, 
  ChapterAnalysisItem, 
  MistakeCategoryBreakdown, 
  PracticeRecommendation,
  SubjectName
} from '../types/exam.js';

function normalizeOptionSet(val?: string): string {
  if (!val) return '';
  return val
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(',');
}

export function evaluateTestAttempt(
  test: TestDefinition,
  responses: Record<string, UserExamResponse>,
  totalTestDurationSeconds: number,
  timeTakenSeconds: number,
  userId: string,
  userName: string,
  options?: {
    enableNegativeMarking?: boolean;
  }
): TestAttemptResult {
  const enableNegativeMarking = options?.enableNegativeMarking !== false;

  let totalScore = 0;
  let totalAttempted = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalUnanswered = 0;
  let negativeMarksLost = 0;

  const questionReviews: QuestionResultReview[] = [];
  const subjectMap = new Map<SubjectName, {
    total: number;
    maxScore: number;
    attempted: number;
    correct: number;
    incorrect: number;
    score: number;
    timeSpent: number;
  }>();

  const chapterMap = new Map<string, {
    subject: SubjectName;
    total: number;
    attempted: number;
    correct: number;
    score: number;
  }>();

  let conceptualCount = 0;
  let calculationCount = 0;
  let timePressureCount = 0;
  let guessCount = 0;

  test.questions.forEach((q) => {
    const resp = responses[q.id];
    const isAnswered = Boolean(
      resp &&
        (resp.status === 'ANSWERED' || resp.status === 'ANSWERED_AND_MARKED') &&
        ((q.type === 'NUMERICAL' && resp.numericalValue !== undefined && resp.numericalValue.trim() !== '') ||
          (q.type !== 'NUMERICAL' && resp.selectedOption !== undefined && resp.selectedOption.trim() !== ''))
    );
    const timeSpent = resp ? resp.timeSpentSeconds : 0;

    let isCorrect = false;
    let marksAwarded = 0;
    let studentAnswer: string | undefined = undefined;
    let mistakeTag: QuestionResultReview['mistakeTag'] = 'UNATTEMPTED';

    if (isAnswered && resp) {
      totalAttempted++;
      if (q.type === 'MCQ' || q.type === 'ASSERTION_REASON') {
        studentAnswer = resp.selectedOption?.trim().toUpperCase();
        isCorrect = studentAnswer === q.correctAnswer.trim().toUpperCase();
      } else if (q.type === 'MULTIPLE_CORRECT') {
        studentAnswer = normalizeOptionSet(resp.selectedOption);
        const correctSet = normalizeOptionSet(q.correctAnswer);
        isCorrect = Boolean(studentAnswer && studentAnswer === correctSet);
      } else {
        studentAnswer = resp.numericalValue?.trim();
        const studentNum = parseFloat(studentAnswer || '');
        const correctNum = parseFloat(q.correctAnswer.trim());
        const tolerance = q.tolerance ?? 0.1;
        isCorrect = !isNaN(studentNum) && !isNaN(correctNum) && Math.abs(studentNum - correctNum) <= tolerance;
      }

      if (isCorrect) {
        totalCorrect++;
        marksAwarded = q.positiveMarks;
        mistakeTag = 'ACCURATE';
      } else {
        totalIncorrect++;
        const negDeduction = enableNegativeMarking ? (q.negativeMarks ?? 0) : 0;
        marksAwarded = -negDeduction;
        negativeMarksLost += negDeduction;

        // Categorize mistake based on response patterns & timing
        if (timeSpent < 35) {
          guessCount++;
          mistakeTag = 'GUESS';
        } else if (timeTakenSeconds > (totalTestDurationSeconds * 0.9) && timeSpent < 50) {
          timePressureCount++;
          mistakeTag = 'TIME_PRESSURE';
        } else if (q.type === 'NUMERICAL' || q.chapter.toLowerCase().includes('mechanics') || q.chapter.toLowerCase().includes('calculus')) {
          calculationCount++;
          mistakeTag = 'CALCULATION';
        } else {
          conceptualCount++;
          mistakeTag = 'CONCEPTUAL';
        }
      }
    } else {
      totalUnanswered++;
      marksAwarded = 0;
      mistakeTag = 'UNATTEMPTED';
    }

    totalScore += marksAwarded;

    questionReviews.push({
      question: q,
      studentAnswer,
      isCorrect,
      isAttempted: isAnswered,
      isMarked: resp ? (resp.status === 'MARKED_FOR_REVIEW' || resp.status === 'ANSWERED_AND_MARKED') : false,
      marksAwarded,
      timeSpentSeconds: timeSpent,
      mistakeTag
    });

    // Aggregate Subject
    if (!subjectMap.has(q.subject)) {
      subjectMap.set(q.subject, {
        total: 0,
        maxScore: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        score: 0,
        timeSpent: 0
      });
    }
    const subjData = subjectMap.get(q.subject)!;
    subjData.total++;
    subjData.maxScore += (q.positiveMarks || test.positiveMarks || 4);
    subjData.score += marksAwarded;
    subjData.timeSpent += timeSpent;
    if (isAnswered) {
      subjData.attempted++;
      if (isCorrect) subjData.correct++;
      else subjData.incorrect++;
    }

    // Aggregate Chapter
    if (!chapterMap.has(q.chapter)) {
      chapterMap.set(q.chapter, {
        subject: q.subject,
        total: 0,
        attempted: 0,
        correct: 0,
        score: 0
      });
    }
    const chapData = chapterMap.get(q.chapter)!;
    chapData.total++;
    chapData.score += marksAwarded;
    if (isAnswered) {
      chapData.attempted++;
      if (isCorrect) chapData.correct++;
    }
  });

  const computedMaxFromQuestions = test.questions.reduce(
    (sum, q) => sum + (q.positiveMarks || test.positiveMarks || 4),
    0
  );
  const maxScore = test.totalMarks || computedMaxFromQuestions || (test.questions.length * test.positiveMarks);
  const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  const attemptRate = test.questions.length > 0 ? Math.round((totalAttempted / test.questions.length) * 100) : 0;
  const percentage = maxScore > 0 ? Math.round((Math.max(0, totalScore) / maxScore) * 100) : 0;

  // Build subject analysis items
  const subjectAnalysis: SubjectAnalysisItem[] = Array.from(subjectMap.entries()).map(([subject, data]) => {
    const sAccuracy = data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0;
    const avgTime = data.total > 0 ? Math.round(data.timeSpent / data.total) : 0;
    return {
      subject,
      score: data.score,
      maxScore: data.maxScore,
      totalQuestions: data.total,
      attempted: data.attempted,
      correct: data.correct,
      incorrect: data.incorrect,
      unanswered: data.total - data.attempted,
      accuracy: sAccuracy,
      timeSpentSeconds: data.timeSpent,
      avgTimePerQuestion: avgTime
    };
  });

  // Build chapter analysis items
  const chapterAnalysis: ChapterAnalysisItem[] = Array.from(chapterMap.entries()).map(([chapter, data]) => {
    const cAccuracy = data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0;
    const isWeak = (data.attempted > 0 && cAccuracy < 60) || (data.attempted === 0 && data.total >= 2);
    return {
      chapter,
      subject: data.subject,
      totalQuestions: data.total,
      attempted: data.attempted,
      correct: data.correct,
      accuracy: cAccuracy,
      score: data.score,
      isWeak
    };
  });

  const mistakeAnalysis: MistakeCategoryBreakdown = {
    conceptual: conceptualCount,
    calculation: calculationCount,
    timePressure: timePressureCount,
    guess: guessCount,
    unanswered: totalUnanswered,
    negativeMarksLost
  };

  // Simulated percentile & rank calculation based on typical distribution
  const normScoreRatio = Math.max(0, totalScore) / Math.max(1, maxScore);
  const rawPercentile = Math.min(99.98, Math.max(12.5, (1 / (1 + Math.exp(-6 * (normScoreRatio - 0.45)))) * 100));
  const simulatedPercentile = parseFloat(rawPercentile.toFixed(2));
  const totalParticipantsSimulated = 18450;
  const practiceRank = Math.max(1, Math.round(totalParticipantsSimulated * (1 - (simulatedPercentile / 100))));

  // Generate personalized actionable recommendations
  const recommendations: PracticeRecommendation[] = [];
  const weakChapters = chapterAnalysis.filter(c => c.isWeak);
  weakChapters.slice(0, 3).forEach((wc, idx) => {
    recommendations.push({
      id: `rec-chap-${idx}`,
      title: `Strengthen ${wc.chapter} (${wc.subject})`,
      subject: wc.subject,
      chapter: wc.chapter,
      reason: wc.attempted > 0 
        ? `Accuracy was ${wc.accuracy}% in this test with marks lost.` 
        : `Questions were left unattempted in this high-scoring section.`,
      actionText: `Practice 25 targeted questions in ${wc.chapter}`,
      priority: idx === 0 ? 'HIGH' : 'MEDIUM'
    });
  });

  if (negativeMarksLost >= 8) {
    const primarySubject = test.subjects[0] || 'Physics';
    recommendations.push({
      id: 'rec-neg-marking',
      title: 'Reduce Negative Marking Traps',
      subject: primarySubject,
      chapter: 'Test Strategy',
      reason: `You conceded ${negativeMarksLost} negative marks due to incorrect answers. Eliminating blind guesses will directly raise your rank.`,
      actionText: 'Apply the 50/50 elimination rule before locking answers',
      priority: 'HIGH'
    });
  }

  if (recommendations.length === 0) {
    const primarySubject = test.subjects[0] || 'Physics';
    recommendations.push({
      id: 'rec-pace',
      title: 'Maintain Consistency & Speed Drills',
      subject: primarySubject,
      chapter: 'Speed Improvement',
      reason: 'Solid fundamental accuracy demonstrated across all subjects.',
      actionText: 'Attempt a full-length timed mock under strict exam conditions',
      priority: 'LOW'
    });
  }

  const courseType =
    test.courseType ||
    (test.examType === 'NEET' ? 'NEET' : test.examType === 'JEE_ADVANCED' ? 'JEE_ADVANCED' : 'JEE');
  const courseId =
    test.courseId ||
    (courseType === 'NEET' ? 'course_neet' : courseType === 'JEE_ADVANCED' ? 'course_jee_adv' : 'course_jee');

  return {
    id: `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    testId: test.id,
    testTitle: test.title,
    courseId,
    courseType,
    examType: test.examType,
    testType: test.testType,
    attemptSetLabel: test.activeAttemptSet || 'Set A',
    snapshotQuestionIds: test.questions.map((q) => q.questionId || q.id),
    userId,
    userName,
    startedAt: new Date(Date.now() - (timeTakenSeconds * 1000)).toISOString(),
    submittedAt: new Date().toISOString(),
    timeTakenSeconds,
    totalScore,
    maxScore,
    percentage,
    accuracy,
    attemptRate,
    totalQuestions: test.questions.length,
    totalAttempted,
    totalCorrect,
    totalIncorrect,
    totalUnanswered,
    negativeMarksLost,
    simulatedPercentile,
    practiceRank,
    totalParticipantsSimulated,
    subjectAnalysis,
    chapterAnalysis,
    mistakeAnalysis,
    questionReviews,
    recommendations
  };
}
