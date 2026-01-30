
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";


import { WordleGrid } from "./components/WordleGrid";
import { Keyboard } from "./components/Keyboard";

import { loadAllWords } from "./solver/loadWords";
import { filterCandidates } from "./solver/wordleSolver";
import { rankGuesses, getPartitions } from "./solver/entropy";
import { EntropyTooltip } from "./components/EntropyTooltip";


import type { Feedback, LetterResult } from "./solver/wordleSolver";

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [currentGuess, setCurrentGuess] = useState("");

  const [letterStates, setLetterStates] = useState<
    Record<string, LetterResult>
  >({});

  const [rows, setRows] = useState<
    { word: string; result: LetterResult[]; editable?: boolean }[]
  >([]);

  const [suggestions, setSuggestions] = useState<
    { word: string; score: number }[]
  >([]);
  const [hoveredEl, setHoveredEl] = useState<HTMLElement | null>(null);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [remaining, setRemaining] = useState<string[]>([]);

  // Load word lists
  useEffect(() => {
    loadAllWords().then(({ possible }) => {
      setRemaining(possible);
      setSuggestions(rankGuesses(possible, possible, 10));
    });
  }, []);
 
  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);
  

  // Keyboard typing
  const handleKeyPress = useCallback(
    (key: string) => {
      if (rows.some((r) => r.editable)) return;
      if (rows.length >= 6) return;

      if (key === "back") {
        setCurrentGuess((g) => g.slice(0, -1));
        return;
      }

      if (key === "enter") {
        if (currentGuess.length !== 5) return;

        setRows((r) => [
          ...r,
          {
            word: currentGuess,
            result: Array(5).fill("gray"),
            editable: true,
          },
        ]);

        setCurrentGuess("");
        return;
      }

      if (/^[a-z]$/.test(key) && currentGuess.length < 5) {
        setCurrentGuess((g) => g + key);
      }
    },
    [rows, currentGuess]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key === "enter") {
        handleKeyPress("enter");
      } else if (key === "backspace") {
        handleKeyPress("back");
      } else if (/^[a-z]$/.test(key)) {
        handleKeyPress(key);
      }
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, [handleKeyPress]);
  

  // Tile click -> cycle color
  const handleTileClick = (rowIdx: number, colIdx: number) => {
    setRows((prev) =>
      prev.map((row, r) => {
        if (r !== rowIdx || !row.editable) return row;

        const next = [...row.result];
        const cur = next[colIdx];

        next[colIdx] =
          cur === "gray"
            ? "yellow"
            : cur === "yellow"
            ? "green"
            : "gray";

        return { ...row, result: next };
      })
    );
  };

  // Confirm feedback and run solver
  const confirmRow = () => {
    const row = rows.find((r) => r.editable);
    if (!row) return;

    const fb: Feedback = {
      guess: row.word,
      result: row.result,
    };

    const newFeedbacks = [...feedbacks, fb];
    setFeedbacks(newFeedbacks);

    const filtered = filterCandidates(remaining, newFeedbacks);
    setRemaining(filtered);

    const ranked = rankGuesses(filtered, filtered, 10);
    setSuggestions(ranked);

    // Update keyboard coloring
    setLetterStates((prev) => {
      const next = { ...prev };

      row.result.forEach((res, i) => {
        const ch = row.word[i];

        if (next[ch] === "green") return;
        if (next[ch] === "yellow" && res === "gray") return;

        next[ch] = res;
      });

      return next;
    });

    // Lock row
    setRows((r) =>
      r.map((rr) =>
        rr.editable ? { ...rr, editable: false } : rr
      )
    );
  };

  return (
    <div className="app" style={{ padding: 24 }}>
      <h1>WordleX Solver</h1>

      <button onClick={() => setDarkMode((d) => !d)}>
        {darkMode ? "Light Mode" : "Dark Mode"}
      </button>

      <WordleGrid
  rows={[
    ...rows,
    ...(currentGuess && !rows.some((r) => r.editable)
      ? [
          {
            word: currentGuess,
            result: [],
          },
        ]
      : []),
  ]}
  onTileClick={handleTileClick}
/>


      <Keyboard
        letterStates={letterStates}
        onKeyPress={handleKeyPress}
      />

      <button
        style={{ marginTop: 12 }}
        disabled={!rows.some((r) => r.editable)}
        onClick={confirmRow}
      >
        Confirm Feedback
      </button>

      <h3>
        Remaining words:{" "}
        <AnimatePresence mode="wait">
          <motion.span
            key={remaining.length}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ display: "inline-block" }}
          >
            {remaining.length}
          </motion.span>
        </AnimatePresence>
      </h3>

      <h3>Top suggestions</h3>

      <div style={{ maxWidth: 400 }}>
        {suggestions.map((s) => {
          const parts = getPartitions(s.word, remaining);
          return (
            <div key={s.word} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div
                  ref={el => hoveredWord === s.word ? setHoveredEl(el) : undefined}
                  onMouseEnter={e => {
                    setHoveredWord(s.word);
                    setHoveredEl(e.currentTarget);
                  }}
                  onMouseLeave={() => {
                    setHoveredWord(null);
                    setHoveredEl(null);
                  }}
                  style={{ position: "relative" }}
                >
                  <span>{s.word}</span>
                  {hoveredWord === s.word && hoveredEl && (
                    <EntropyTooltip
                      reference={hoveredEl}
                      word={s.word}
                      score={s.score}
                      partitions={parts}
                    />
                  )}
                </div>
                <span>{s.score.toFixed(2)}</span>
              </div>
              <div
                title={`Expected information gain: ${s.score.toFixed(2)} bits`}
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
                    width: `${
                      suggestions[0]
                        ? (s.score / suggestions[0].score) * 100
                        : 0
                    }%`,
                    background: "#4ade80",
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <ul style={{ paddingLeft: 16 }}>
        <AnimatePresence>
          {remaining.slice(0, 20).map((w) => (
            <motion.li
              key={w}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              {w}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

export default App;
