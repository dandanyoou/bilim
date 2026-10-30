"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";

const CHARS = ["빌", "림"];

const charVariants: Variants = {
  rest: { opacity: 1, y: 0, filter: "blur(0px)" },
  hover: (i: number) => ({
    opacity: 0.35,
    y: -2,
    filter: "blur(1.2px)",
    transition: { duration: 0.18, delay: i * 0.06, ease: "easeInOut" },
  }),
};

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`font-hand text-3xl tracking-wide text-ink ${className}`}>
      <motion.span
        initial="rest"
        whileHover="hover"
        animate="rest"
        className="inline-flex"
      >
        {CHARS.map((char, i) => (
          <motion.span
            key={i}
            variants={charVariants}
            custom={i}
            style={{ display: "inline-block" }}
          >
            {char}
          </motion.span>
        ))}
      </motion.span>
    </Link>
  );
}
