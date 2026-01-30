import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";


import { WordleGrid } from "./components/WordleGrid";
import { Keyboard } from "./components/Keyboard";

import { loadAllWords } from "./solver/loadWords";
import { filterCandidates } from "./solver/wordleSolver";
import { rankGuesses, getPartitions } from "./solver/entropy";
import { EntropyTooltip } from "./components/EntropyTooltip";


import type { Feedback, LetterResult } from "./solver/wordleSolver";

function App() {
 const [showGuide, setShowGuide] = useState(true);


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
  const [hasWon, setHasWon] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);

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
  

  const fireConfetti = () => {
    confetti({
      particleCount: 180,
      spread: 90,
      origin: { y: 0.6 },
    });
  };

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

    const isWin = row.result.every((r) => r === "green");
    if (isWin) {
      setHasWon(true);
      setShowWinModal(true);
      fireConfetti();
    }
  };

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
        if (rows.some((r) => r.editable)) {
          confirmRow();
        } else {
          handleKeyPress("enter");
        }
      } else if (key === "backspace") {
        handleKeyPress("back");
      } else if (/^[a-z]$/.test(key)) {
        handleKeyPress(key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKeyPress, confirmRow, rows]);
  

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

  const resetGame = () => {
    setRows([]);
    setFeedbacks([]);
    setLetterStates({});
    setCurrentGuess("");
    setHasWon(false);
    setShowWinModal(false);
    loadAllWords().then(({ possible }) => {
      setRemaining(possible);
      setSuggestions(rankGuesses(possible, possible, 10));
    });
  };

  return (
  <div className="app">

    {/* HEADER */}
    <h1 className="title">
  <span className="t-green">W</span>
  <span className="t-yellow">o</span>
  <span className="t-gray">r</span>
  <span className="t-gray">d</span>
  <span className="t-gray">l</span>
  <span className="t-yellow">e</span>
  <span className="t-green">X</span>
</h1>


    <button
  className="guide-button"
  onClick={() => setShowGuide(true)}
>
  ❔
</button>

    {/* THEME TOGGLE */}
   
  <div
  className={`theme-switch ${darkMode ? "dark" : ""}`}
  onClick={() => setDarkMode((d) => !d)}
>
  <div className="switch-track">
    <span className="icon sun">☀</span>
    <span className="icon moon">☾</span>
    <div className="switch-thumb" />
  </div>
</div>



    {/* MAIN DASHBOARD */}
    <div className="main-layout">

      {/* LEFT PANEL */}
      <div className="left-panel">

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
          disabled={!rows.some((r) => r.editable)}
          onClick={confirmRow}
        >
          Confirm Feedback
        </button>

        <button
          onClick={() => {
            setHasWon(true);
            setShowWinModal(true);
          }}
          style={{ marginTop: 8 }}
        >
          🎉 I got the word!
        </button>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">

        <h3>
          Remaining words:{" "}
          <AnimatePresence mode="wait">
            <motion.span
              key={remaining.length}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.25 }}
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
              <div key={s.word} style={{ marginBottom: 10 }}>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    onMouseEnter={(e) => {
                      setHoveredWord(s.word);
                      setHoveredEl(e.currentTarget);
                    }}
                    onMouseLeave={() => {
                      setHoveredWord(null);
                      setHoveredEl(null);
                    }}
                    style={{ position: "relative" }}
                  >
                    <span className="suggestion-word">
                      {s.word}
                    </span>

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
                          ? (s.score / suggestions[0].score) *
                            100
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
    </div>

    <AnimatePresence>
      {showWinModal && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="modal"
            initial={{ scale: 0.6, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.6 }}
          >
            <h2>🎉 You solved it!</h2>
            <p>Great job — the word is cracked.</p>
            <button
  onClick={() => {
    setShowWinModal(false);
  }}
>
  Close
</button>

            <button
              onClick={resetGame}
              style={{ marginTop: 10 }}
            >
              🔄 New Game
            </button>
            
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <AnimatePresence>
  {showGuide && (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal"
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9 }}
      >
        <button
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            fontSize: 18,
            background: "transparent",
          }}
          onClick={() => setShowGuide(false)}
        >
          ✕
        </button>

        <h2>How To Use WordleX</h2>

        <p>
          WordleX is a solver that helps you crack the Wordle
          using information theory.
        </p>

        <ul style={{ textAlign: "left" }}>
          <li>Type guesses using your keyboard or click keys.</li>
          <li>Press Enter to submit a word.</li>
          <li>Click tiles to cycle colors.</li>
          <li>Gray = not in word.</li>
          <li>Yellow = wrong position.</li>
          <li>Green = correct.</li>
          <li>Click <b>Confirm Feedback</b> to run the solver.</li>
          <li>Hover suggestions to see entropy details.</li>
        </ul>

        <p>
          🎉 If all letters are green — you win!
        </p>

        <button
  style={{ marginTop: 14 }}
  onClick={() => {
    localStorage.setItem("seen-guide", "1");
    setShowGuide(false);
  }}
>
  Got it!
</button>

      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

  </div>
);

}

export default App;
