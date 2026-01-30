import { useEffect, useState } from "react";
import { loadAllWords } from "./solver/loadWords";
import {
  Feedback,
  filterCandidates,
} from "./solver/wordleSolver";

function App() {
  const [allowed, setAllowed] = useState<string[]>([]);
  const [possible, setPossible] = useState<string[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [remaining, setRemaining] = useState<string[]>([]);

  useEffect(() => {
    loadAllWords().then(({ allowed, possible }) => {
      setAllowed(allowed);
      setPossible(possible);
      setRemaining(possible);
    });
  }, []);

  const handleAddGuess = (guess: string, result: string) => {
    const parsed = result.split("") as any;

    const fb: Feedback = {
      guess,
      result: parsed,
    };

    const newFeedbacks = [...feedbacks, fb];
    setFeedbacks(newFeedbacks);

    const filtered = filterCandidates(remaining, newFeedbacks);
    setRemaining(filtered);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>WordleX Solver</h1>

      <GuessInput onSubmit={handleAddGuess} />

      <h3>Remaining words: {remaining.length}</h3>

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
      <p>
        Enter guess + result (g=green, y=yellow, x=gray):
      </p>

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
