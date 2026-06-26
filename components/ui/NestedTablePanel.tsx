"use client";

import type { ReactNode } from "react";
import { highlightedSectionPanelStyle } from "@/components/ui/layoutStyles";

type NestedTablePanelProps = {
  children: ReactNode;
};

export function NestedTablePanel({ children }: NestedTablePanelProps) {
  return (
    <div
      style={{
        ...highlightedSectionPanelStyle,
        marginTop: "0.5rem",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "auto",
      }}
    >
      {children}
    </div>
  );
}
