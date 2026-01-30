import { WordleGrid } from "./components/WordleGrid";
import { Keyboard } from "./components/Keyboard";

import { rankGuesses } from "./solver/entropy";

import { useEffect, useState } from "react";
import { loadAllWords } from "./solver/loadWords";
import type { Feedback, LetterResult } from "./solver/wordleSolver";
import { filterCandidates } from "./solver/wordleSolver";

function App() {
  const [currentGuess, setCurrentGuess] = useState("");

  const [letterStates, setLetterStates] = useState<
  Record<string, LetterResult>
>({});

  const [rows, setRows] = useState<
  { word: string; result: LetterResult[] }[]
>([]);

  const [suggestions, setSuggestions] = useState<
  { word: string; score: number }[]
>([]);

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [remaining, setRemaining] = useState<string[]>([]);

  useEffect(() => {
    loadAllWords().then(({ possible }) => {
      setRemaining(possible);
setSuggestions(rankGuesses(possible, possible, 10));

    });
  }, []);

  const handleAddGuess = (guess: string, result: string) => {
  const parsed: LetterResult[] = result.split("").map((c) => {
    if (c === "g") return "green";
    if (c === "y") return "yellow";
    return "gray";
  });

  // Update grid rows
  setRows((r) => [...r, { word: guess, result: parsed }]);

  // Update keyboard letter states
  setLetterStates((prev) => {
    const next = { ...prev };

    parsed.forEach((res, i) => {
      const ch = guess[i];

      if (next[ch] === "green") return;
      if (next[ch] === "yellow" && res === "gray") return;

      next[ch] = res;
    });

    return next;
  });

  const fb: Feedback = {
    guess,
    result: parsed,
  };

  const newFeedbacks = [...feedbacks, fb];
  setFeedbacks(newFeedbacks);

  const filtered = filterCandidates(remaining, newFeedbacks);
  setRemaining(filtered);

  const ranked = rankGuesses(filtered, filtered, 10);
  setSuggestions(ranked);
};


const handleKeyPress = (key: string) => {
  if (rows.length >= 6) return;

  if (key === "back") {
    setCurrentGuess((g) => g.slice(0, -1));
    return;
  }

  if (key === "enter") {
    if (currentGuess.length !== 5) return;

    handleAddGuess(currentGuess, "xxxxx");
    setCurrentGuess("");
    return;
  }

  if (/^[a-z]$/.test(key) && currentGuess.length < 5) {
    setCurrentGuess((g) => g + key);
  }
};

  return (
    <div style={{ padding: 24 }}>
      <h1>WordleX Solver</h1>
      <WordleGrid
  rows={[
    ...rows,
    ...(rows.length < 6 && currentGuess
      ? [{ word: currentGuess, result: [] as LetterResult[] }]
      : []),
  ]}
/>


      <Keyboard letterStates={letterStates} onKeyPress={handleKeyPress} />


      {/* <GuessInput onSubmit={handleAddGuess} /> */}

      <h3>Remaining words: {remaining.length}</h3>
      

<h3>Top suggestions</h3>

<div style={{ maxWidth: 400 }}>
  {suggestions.map((s) => (
    <div key={s.word} style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{s.word}</span>
        <span>{s.score.toFixed(2)}</span>
      </div>

      <div
        style={{
          height: 8,
          background: "#ddd",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(s.score / suggestions[0].score) * 100}%`,
            background: "#4ade80",
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  ))}
</div>

<ul>
  {remaining.slice(0, 20).map((w) => (
    <li key={w}>{w}</li>
  ))}
</ul>

      
    </div>
  );
}

function GuessInput({
  onSubmit,
}: {
  onSubmit: (guess: string, result: string) => void;
}) {
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState("");

  return (
    <div>
      <p>Enter guess + result (g=green, y=yellow, x=gray):</p>

      <input
        placeholder="raise"
        value={guess}
        maxLength={5}
        onChange={(e) => setGuess(e.target.value.toLowerCase())}
      />

      <input
        placeholder="gxyyg"
        value={result}
        maxLength={5}
        onChange={(e) => setResult(e.target.value.toLowerCase())}
      />

      <button
        onClick={() => {
          if (guess.length === 5 && result.length === 5) {
            onSubmit(guess, result);
            setGuess("");
            setResult("");
          }
        }}
      >
        Add Guess
      </button>
    </div>
  );
}

export default App;
