// src/solver/loadWords.ts

export async function loadWordList(path: string): Promise<string[]> {
  const res = await fetch(path);
  const text = await res.text();

  return text
    .split("\n")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
}

export async function loadAllWords() {
  const [allowed, possible] = await Promise.all([
    loadWordList("/data/allowed_words.txt"),
    loadWordList("/data/possible_words.txt"),
  ]);

  return { allowed, possible };
}
