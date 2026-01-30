import "./Keyboard.css";
import type { LetterResult } from "../solver/wordleSolver";

type KeyState = LetterResult | undefined;

interface Props {
  letterStates: Record<string, KeyState>;
}

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

export function Keyboard({ letterStates }: Props) {
  return (
    <div className="keyboard">
      {ROWS.map((row) => (
        <div key={row} className="keyboard-row">
          {row.split("").map((ch) => {
            const state = letterStates[ch];

            return (
              <div
                key={ch}
                className={`key ${state ?? ""}`}
              >
                {ch.toUpperCase()}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
