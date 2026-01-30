import { motion } from "framer-motion";
import {
  useFloating,
  offset,
  flip,
  shift,
  arrow,
  autoUpdate,
} from "@floating-ui/react-dom";
import { useState } from "react";

type Props = {
  reference: HTMLElement;
  word: string;
  score: number;
  partitions: Map<string, number>;
};

export function EntropyTooltip({
  reference,
  word,
  score,
  partitions,
}: Props) {
  const [arrowEl, setArrowEl] = useState<HTMLDivElement | null>(null);

  const [floatingEl, setFloatingEl] = useState<HTMLDivElement | null>(null);

  const {
    x,
    y,
    strategy,
    middlewareData,
    placement,
  } = useFloating({
    placement: "top",
    middleware: [
      offset(10),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowEl }),
    ],
    whileElementsMounted: autoUpdate,
    elements: {
      reference,
      floating: floatingEl,
    },
  });

  const staticSide = placement.split("-")[0];

  const topPartitions = [...partitions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <motion.div
      ref={setFloatingEl}
      className="entropy-tooltip"
      initial={{ opacity: 0, scale: 0.9, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 6 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      style={{
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
      }}
    >
      {/* ARROW */}
      <div
        ref={setArrowEl}
        className="entropy-arrow"
        style={{
          left: middlewareData.arrow?.x,
          top: middlewareData.arrow?.y,
          right: undefined,
          bottom: undefined,
          ...(staticSide === "top" && { bottom: "-6px" }),
          ...(staticSide === "bottom" && { top: "-6px" }),
        }}
      />

      <div className="entropy-body">
        <b>{word}</b>

        <div className="entropy-score">
          Expected info gain: {score.toFixed(2)} bits
        </div>

        <hr />

        <div className="entropy-partitions">
          Top partitions:
          {topPartitions.map(([pat, count]) => (
            <div key={pat}>
              {pat}: {count}
            </div>
          ))}
        </div>

        <div className="hint">
          Higher entropy = better next guess.
        </div>
      </div>
    </motion.div>
  );
}
