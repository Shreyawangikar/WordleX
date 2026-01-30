import "./WordleGrid.css";
import type { LetterResult } from "../solver/wordleSolver";

interface Row {
  word: string;
  result: LetterResult[];
  editable?: boolean;
}

export function WordleGrid({
  rows,
  onTileClick,
}: {
  rows: Row[];
  onTileClick?: (rowIdx: number, colIdx: number) => void;
}) {
  return (
    <div className="grid">
      {Array.from({ length: 6 }).map((_, rowIdx) => {
        const row = rows[rowIdx];

        return (
          <div key={rowIdx} className="row">
            {Array.from({ length: 5 }).map((_, colIdx) => {
              const letter = row?.word[colIdx]?.toUpperCase() ?? "";
              const status = row?.result[colIdx];

              const editable = row?.editable;

              return (
                <div
                  key={colIdx}
                  className={`tile ${status ?? ""} ${
                    editable ? "editable" : ""
                  }`}
                  style={{
                    animationDelay: `${colIdx * 120}ms`,
                  }}
                  onClick={() =>
                    editable && onTileClick?.(rowIdx, colIdx)
                  }
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
