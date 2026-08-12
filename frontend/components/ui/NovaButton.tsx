import type { ButtonHTMLAttributes, ReactNode } from "react";

type NovaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variante?: "primary" | "secondary" | "ghost";
};

export default function NovaButton({
  children,
  variante = "primary",
  className = "",
  ...props
}: NovaButtonProps) {
  const varianten = {
    primary:
      "nova-akzent-verlauf text-white hover:brightness-110 shadow-lg",

    secondary:
       "bg-[var(--nova-flaeche)] text-[var(--nova-text)] border border-[var(--nova-rand)] hover:border-[var(--nova-akzent)] hover:text-[var(--nova-akzent)]",

    ghost:
      "bg-transparent text-[var(--nova-text)] hover:bg-[var(--nova-flaeche-hover)]",
  };

  return (
    <button
      {...props}
      className={`
        inline-flex
        items-center
        justify-center
        rounded-xl
        px-4
        py-2.5
        font-semibold
        transition-all
        duration-300
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${varianten[variante]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
