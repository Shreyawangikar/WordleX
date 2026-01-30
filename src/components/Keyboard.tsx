import "./Keyboard.css";
import type { LetterResult } from "../solver/wordleSolver";

type KeyState = LetterResult | undefined;

interface Props {
  letterStates: Record<string, KeyState>;
  onKeyPress: (key: string) => void;
}

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

export function Keyboard({ letterStates, onKeyPress }: Props) {
  return (
    <div className="keyboard">
      {ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="keyboard-row">
          {rowIdx === 2 && (
            <button className="key wide" onClick={() => onKeyPress("enter")}>
              Enter
            </button>
          )}

          {row.split("").map((ch) => {
            const state = letterStates[ch];

            return (
              <button
                key={ch}
                className={`key ${state ?? ""}`}
                onClick={() => onKeyPress(ch)}
              >
                {ch.toUpperCase()}
              </button>
            );
          })}

          {rowIdx === 2 && (
            <button className="key wide" onClick={() => onKeyPress("back")}>
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
