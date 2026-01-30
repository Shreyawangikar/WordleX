import "./WordleGrid.css";
import type { LetterResult } from "../solver/wordleSolver";

interface Row {
  word: string;
  result: LetterResult[];
}

export function WordleGrid({ rows }: { rows: Row[] }) {
  return (
    <div className="grid">
      {Array.from({ length: 6 }).map((_, rowIdx) => {
        const row = rows[rowIdx];

        return (
          <div key={rowIdx} className="row">
            {Array.from({ length: 5 }).map((_, colIdx) => {
              const letter = row?.word[colIdx]?.toUpperCase() ?? "";
              const status = row?.result[colIdx];

              return (
                <div
                  key={colIdx}
                  className={`tile ${status ?? ""}`}
                  style={{
                    animationDelay: `${colIdx * 120}ms`,
                  }}
                >
                  <div className="tile-inner">{letter}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
