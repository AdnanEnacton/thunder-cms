"use client";

import { createPortal } from "react-dom";

interface SlashHintProps {
  visible: boolean;
  position: { top: number; left: number } | null;
}

export function SlashHint({ visible, position }: SlashHintProps) {
  if (!visible || !position) return null;

  return createPortal(
    <span
      className="notion-slash-hint"
      style={{ top: position.top, left: position.left }}
      aria-hidden
    >
      {" for commands"}
    </span>,
    document.body,
  );
}