import type { ReactNode } from "react";

type NovaCardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "small" | "normal" | "large";
};

const PADDING_KLASSEN = {
  none: "",
  small: "p-4",
  normal: "p-6",
  large: "p-8",
};

export default function NovaCard({
  children,
  className = "",
  hover = false,
  padding = "normal",
}: NovaCardProps) {
  return (
    <div
      className={`
        rounded-2xl
        border
        border-[var(--nova-rand)]
        bg-[var(--nova-flaeche)]
        text-[var(--nova-text)]
        shadow-lg
        transition-all
        duration-300
        ${hover ? "hover:-translate-y-1 hover:bg-[var(--nova-flaeche-hover)] hover:shadow-xl" : ""}
        ${PADDING_KLASSEN[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}