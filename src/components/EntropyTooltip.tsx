
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { motion } from "framer-motion";
import { useEffect } from "react";

export function EntropyTooltip({
  reference,
  word,
  score,
  partitions,
}: {
  reference: HTMLElement | null;
  word: string;
  score: number;
  partitions: number[];
}) {
  const { refs, floatingStyles, update } = useFloating({
    placement: "right",
    middleware: [offset(8), flip(), shift()],
  });

  useEffect(() => {
    if (reference) refs.setReference(reference);
  }, [reference]);

  useEffect(() => {
    if (!refs.reference.current || !refs.floating.current)
      return;

    return autoUpdate(
      refs.reference.current,
      refs.floating.current,
      update
    );
  }, [refs.reference, refs.floating, update]);

  return (
    <motion.div
      ref={refs.setFloating}
      style={{ ...floatingStyles }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="entropy-tooltip"
    >
      <strong>{word}</strong>

      <div>Info gain: {score.toFixed(2)} bits</div>

      <div className="parts">
        {partitions.map((p, i) => (
          <div key={i}>Group {i + 1}: {p}</div>
        ))}
      </div>

      <div className="hint">
        Higher entropy splits candidates more evenly.
      </div>
    </motion.div>
  );
}
