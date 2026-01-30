// src/solver/entropy.ts

import { scoreGuess, getFeedbackPattern } from "./wordleSolver";
// Return partitions as a map from feedback pattern -> count
export function getPartitions(
  guess: string,
  candidates: string[]
): Map<string, number> {
  const map = new Map<string, number>();

  for (const word of candidates) {
    const pattern = getFeedbackPattern(guess, word);
    map.set(pattern, (map.get(pattern) ?? 0) + 1);
  }

  return map;
}
import type { LetterResult } from "./wordleSolver";


// Convert pattern array to compact string like "gyxgx"
export function patternKey(p: LetterResult[]): string {
  return p.map((c) => c[0]).join("");
}

// Compute expected information (entropy) for a guess
export function computeEntropy(
  guess: string,
  possibleAnswers: string[]
): number {
  const buckets = new Map<string, number>();

  for (const answer of possibleAnswers) {
    const pattern = patternKey(scoreGuess(guess, answer));
    buckets.set(pattern, (buckets.get(pattern) ?? 0) + 1);
  }

  let entropy = 0;
  const total = possibleAnswers.length;

  for (const count of buckets.values()) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

// Rank guesses by entropy
export function rankGuesses(
  guesses: string[],
  possibleAnswers: string[],
  topN = 20
): { word: string; score: number }[] {
  const scored = guesses.map((g) => ({
    word: g,
    score: computeEntropy(g, possibleAnswers),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topN);
}
