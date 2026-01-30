export type Stats = {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDist: number[];
  lastWinDate: string | null;
};

const EMPTY: Stats = {
  gamesPlayed: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDist: [0, 0, 0, 0, 0, 0],
  lastWinDate: null,
};

export function loadStats(): Stats {
  const raw = localStorage.getItem("wordlex-stats");
  return raw ? JSON.parse(raw) : EMPTY;
}

export function saveStats(stats: Stats) {
  localStorage.setItem(
    "wordlex-stats",
    JSON.stringify(stats)
  );
}
