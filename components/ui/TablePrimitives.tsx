import type { CSSProperties, ReactNode } from "react";
import { tableActionGroupStyle } from "@/components/ui/layoutStyles";
import { tableStyle, tdStyle } from "@/components/ui/tableStyles";

type StandardTableProps = {
  children: ReactNode;
  style?: CSSProperties;
};

type TableEmptyRowProps = {
  colSpan: number;
  children: ReactNode;
};

type TableActionGroupProps = {
  children: ReactNode;
  style?: CSSProperties;
};

export function StandardTable({ children, style }: StandardTableProps) {
  return <table style={{ ...tableStyle, ...style }}>{children}</table>;
}

export function TableEmptyRow({ colSpan, children }: TableEmptyRowProps) {
  return (
    <tr>
      <td style={tdStyle} colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}

export function TableActionGroup({ children, style }: TableActionGroupProps) {
  return <div style={{ ...tableActionGroupStyle, ...style }}>{children}</div>;
}
