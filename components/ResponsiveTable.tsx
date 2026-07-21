import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn("table-container w-full overflow-x-auto", className)}>
      <div className="table-wrapper">
        {children}
      </div>
    </div>
  );
}
