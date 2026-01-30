import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";


import { WordleGrid } from "./components/WordleGrid";
import { Keyboard } from "./components/Keyboard";

import { loadAllWords } from "./solver/loadWords";
import { filterCandidates } from "./solver/wordleSolver";
import { rankGuesses, getPartitions } from "./solver/entropy";
import { EntropyTooltip } from "./components/EntropyTooltip";
import { secondsUntilTomorrow, formatTime } from "./game/countdown";


import type { Feedback, LetterResult } from "./solver/wordleSolver";

const isTouchDevice = () =>
  window.matchMedia("(pointer: coarse)").matches;

// --- STATS HELPERS (inlined for compatibility) ---
type Stats = {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDist: number[];
  lastWinDate: string | null;
};
const EMPTY_STATS: Stats = {
  gamesPlayed: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDist: [0, 0, 0, 0, 0, 0],
  lastWinDate: null,
};
function loadStats(): Stats {
  const raw = localStorage.getItem("wordlex-stats");
  return raw ? JSON.parse(raw) : { ...EMPTY_STATS };
}
function saveStats(stats: Stats) {
  localStorage.setItem("wordlex-stats", JSON.stringify(stats));
}

import { loginAnon } from "./firebase/firebase";

function App() {
 const [showGuide, setShowGuide] = useState(() => {
  return !localStorage.getItem("seen-guide");
});
 const [showStats, setShowStats] = useState(false);


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


  // Add ESC key closes modal effect (must be after setShowWinModal is declared)

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [remaining, setRemaining] = useState<string[]>([]);
  const [showWinModal, setShowWinModal] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(secondsUntilTomorrow());

  // Add ESC key closes modal effect (must be after setShowWinModal is declared)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowStats(false);
        setShowGuide(false);
        setShowWinModal(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const [stats, setStats] = useState(() => loadStats());

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

  useEffect(() => {
    loginAnon();
  }, []);

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 180,
      spread: 90,
      origin: { y: 0.6 },
    });
  }, []);

  const confirmRow = useCallback(() => {
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
    setRows((r) =>
      r.map((rr) =>
        rr.editable ? { ...rr, editable: false } : rr
      )
    );
    const isWin = row.result.every((r) => r === "green");
    const todayKey = new Date().toISOString().slice(0, 10);
    if (isWin) {
      const updated = { ...stats };
      updated.gamesPlayed += 1;
      updated.wins += 1;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (stats.lastWinDate === yesterday) {
        updated.currentStreak += 1;
      } else {
        updated.currentStreak = 1;
      }
      updated.maxStreak = Math.max(updated.maxStreak, updated.currentStreak);
      updated.guessDist[rows.length - 1]++;
      updated.lastWinDate = todayKey;
      setStats(updated);
      saveStats(updated);
      setShowWinModal(true);
      fireConfetti();
    } else if (!isWin && rows.length === 6) {
      const updated = {
        ...stats,
        gamesPlayed: stats.gamesPlayed + 1,
        currentStreak: 0,
      };
      setStats(updated);
      saveStats(updated);
    }
  }, [rows, feedbacks, remaining, stats, setStats, setFeedbacks, setRemaining, setSuggestions, setLetterStates, setRows, setShowWinModal, fireConfetti]);

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

  // Suggestion click handler: auto-type suggestion into current guess
  const applySuggestion = (word: string) => {
    // Don't overwrite a row waiting for feedback
    if (rows.some((r) => r.editable)) return;
    setCurrentGuess(word);
  };

  const resetGame = () => {
    setRows([]);
    setFeedbacks([]);
    setLetterStates({});
    setCurrentGuess("");
    setShowWinModal(false);
    loadAllWords().then(({ possible }) => {
      setRemaining(possible);
      setSuggestions(rankGuesses(possible, possible, 10));
    });
  };

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(secondsUntilTomorrow());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft !== 0) return;
    const id = window.setTimeout(() => {
      resetGame();
    }, 0);
    return () => window.clearTimeout(id);
  }, [secondsLeft]);

  useEffect(() => {
    if (!hoveredWord) return;

    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest(".entropy-tooltip")) {
        setHoveredWord(null);
        setHoveredEl(null);
      }
    };

    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, [hoveredWord]);

  return (
  <div className="app">

    {/* HEADER */}
    <div className="header-bar">
      <h1 className="title">
        <span className="t-green">W</span>
        <span className="t-yellow">o</span>
        <span className="t-gray">r</span>
        <span className="t-gray">d</span>
        <span className="t-gray">l</span>
        <span className="t-yellow">e</span>
        <span className="t-green">X</span>
      </h1>
      <div
        className="countdown"
        title={`Next puzzle in ${formatTime(secondsLeft)}`}
      >
        ⏳ {formatTime(secondsLeft)}
      </div>
    </div>


    <button
      className="guide-button"
      onClick={() => setShowGuide(true)}
      title="How to use WordleX"
    >
      ❔
    </button>
<button
  className="stats-button"
  onClick={() => {
    setShowStats(true);
    console.log(showStats); // Debug: should print true when clicked
  }}
  title="Statistics"
>
  📊
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

                  <div>
                    <span
                      className="suggestion-word clickable"
                      tabIndex={0}
                      onMouseEnter={(e) => {
                        if (isTouchDevice()) return;
                        setHoveredWord(s.word);
                        setHoveredEl(e.currentTarget as HTMLElement);
                      }}
                      onMouseLeave={() => {
                        if (isTouchDevice()) return;
                        setHoveredWord(null);
                        setHoveredEl(null);
                      }}
                      onFocus={(e) => {
                        setHoveredWord(s.word);
                        setHoveredEl(e.currentTarget as HTMLElement);
                      }}
                      onBlur={() => {
                        setHoveredWord(null);
                        setHoveredEl(null);
                      }}
                      onClick={(e) => {
                        // Always type the suggestion into the grid
                        applySuggestion(s.word);

                        // On touch devices, also toggle the tooltip
                        if (!isTouchDevice()) return;
                        if (hoveredWord === s.word) {
                          setHoveredWord(null);
                          setHoveredEl(null);
                        } else {
                          setHoveredWord(s.word);
                          setHoveredEl(e.currentTarget as HTMLElement);
                        }
                      }}
                    >
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
            
            <div className="stats-panel">
              <div>
                <b>Played</b>
                <div>{stats.gamesPlayed}</div>
              </div>
              <div>
                <b>Win %</b>
                <div>{stats.gamesPlayed ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0}</div>
              </div>
              <div>
                <b>Streak</b>
                <div>{stats.currentStreak}</div>
              </div>
              <div>
                <b>Max</b>
                <div>{stats.maxStreak}</div>
              </div>
            </div>
            <p className="next-countdown">
              Next puzzle in <b>{formatTime(secondsLeft)}</b>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <AnimatePresence>
      {showStats && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowStats(false)}
        >
          <motion.div
            className="modal"
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* CLOSE BUTTON */}
            <button
              className="modal-close"
              onClick={() => setShowStats(false)}
            >
              ✕
            </button>

            <h2>Statistics</h2>

            <div className="stats-panel">
              <div>
                <b>Played</b>
                <div>{stats.gamesPlayed}</div>
              </div>
              <div>
                <b>Win %</b>
                <div>
                  {stats.gamesPlayed
                    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
                    : 0}
                </div>
              </div>
              <div>
                <b>Current Streak</b>
                <div>{stats.currentStreak}</div>
              </div>
              <div>
                <b>Max Streak</b>
                <div>{stats.maxStreak}</div>
              </div>
            </div>

            <p className="next-countdown">
              Next puzzle in <b>{formatTime(secondsLeft)}</b>
            </p>
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
            <h2>How to Use WordleX</h2>
            <p>
              WordleX is an intelligent Wordle assistant powered by information theory.
              Enter your guesses and feedback, and the solver will recommend the most
              informative next moves.
            </p>
            <ul className="guide-list">
              <li>
                <b>Enter a Guess</b> — Type using your keyboard or tap the on-screen keys.
              </li>
              <li>
                <b>Submit</b> — Press <kbd>Enter</kbd> to lock the word into the grid.
              </li>
              <li>
                <b>Set Feedback</b> — Click each tile to cycle through colors:
                <span className="legend gray">Gray</span> not in word,
                <span className="legend yellow">Yellow</span> wrong position,
                <span className="legend green">Green</span> correct.
              </li>
              <li>
                <b>Confirm Feedback</b> — Run the solver and narrow down remaining answers.
              </li>
              <li>
                <b>View Suggestions</b> — See the top-ranked words and expected information
                gain on the right panel.
              </li>
              <li>
                <b>Entropy Tooltips</b> — Hover a suggestion to view partition breakdowns
                and how the score is calculated.
              </li>
              <li>
                <b>Daily Puzzle</b> — Solve in six tries or mark the puzzle complete once
                all tiles turn green.
              </li>
            </ul>
            <p>
              Good luck — and may entropy be on your side. 🙂
            </p>
            <button
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
