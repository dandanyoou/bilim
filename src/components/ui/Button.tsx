import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-ink text-cream hover:bg-ink/85",
  secondary: "bg-transparent text-ink border border-ink/25 hover:border-ink/60",
  ghost: "bg-transparent text-ink-soft hover:text-ink",
  danger: "bg-danger text-cream hover:bg-danger/85",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none";

interface CommonProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${BASE} ${VARIANT_CLASS[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={`${BASE} ${VARIANT_CLASS[variant]} ${className}`}>
      {children}
    </Link>
  );
}
