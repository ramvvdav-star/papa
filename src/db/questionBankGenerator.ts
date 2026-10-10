import type { Question } from '../types/exam.ts';
import {
  normalizeQuestion,
  normalizeQuestionText,
  computeQuestionFingerprint,
} from '../data/questionBankEngine.ts';
import { getCentralizedQuestionBank } from '../data/fullLengthPapersGenerator.ts';

export { normalizeQuestion, normalizeQuestionText, computeQuestionFingerprint };

/**
 * Generates the authoritative centralized question bank (5,500+ unique questions)
 * across JEE_MAIN, JEE_ADVANCED, and NEET with permanent canonical questionIds
 * (e.g. jee_physics_000001) and zero duplicate question texts.
 */
export function generateMassiveQuestionBank(): Question[] {
  return getCentralizedQuestionBank();
}

export function generateQuestionBank(_targetCount?: number): Question[] {
  return getCentralizedQuestionBank();
}
