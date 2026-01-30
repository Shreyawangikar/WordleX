// Get a compact string feedback pattern for a guess/answer pair
export function getFeedbackPattern(guess: string, answer: string): string {
  return scoreGuess(guess, answer)
    .map((c) => c[0])
    .join("");
}
// src/solver/wordleSolver.ts

export type LetterResult = "green" | "yellow" | "gray";

export interface Feedback {
  guess: string;
  result: LetterResult[];
}


// Compare guess vs answer and return color feedback
export function scoreGuess(guess: string, answer: string): LetterResult[] {
  const res: LetterResult[] = Array(5).fill("gray");
  const answerChars = answer.split("");
  const used = Array(5).fill(false);

  // Greens first
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      res[i] = "green";
      used[i] = true;
    }
  }

  // Yellows
  for (let i = 0; i < 5; i++) {
    if (res[i] === "green") continue;

    for (let j = 0; j < 5; j++) {
      if (!used[j] && guess[i] === answerChars[j]) {
        res[i] = "yellow";
        used[j] = true;
        break;
      }
    }
  }

  return res;
}

// Check if a word matches given feedback
export function matchesFeedback(
  word: string,
  feedback: Feedback
): boolean {
  const simulated = scoreGuess(feedback.guess, word);
  return simulated.every((v, i) => v === feedback.result[i]);
}

// Filter remaining candidates
export function filterCandidates(
  candidates: string[],
  feedbacks: Feedback[]
): string[] {
  return candidates.filter((word) =>
    feedbacks.every((fb) => matchesFeedback(word, fb))
  );
}
