"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

const NAV_LINKS = [
  { href: "/items", label: "둘러보기" },
  { href: "/items/new", label: "물품 등록" },
  { href: "/rentals", label: "내 대여" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden gap-6 text-sm md:flex">
      {NAV_LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <motion.div
            key={link.href}
            initial="rest"
            whileHover="hover"
            animate="rest"
            className="relative py-1"
          >
            <Link
              href={link.href}
              className={`transition-colors duration-200 ${active ? "text-ink" : "text-ink-soft hover:text-ink"}`}
            >
              {link.label}
            </Link>
            <motion.span
              className="absolute bottom-0 left-0 h-px bg-ink"
              variants={{
                rest: { scaleX: active ? 1 : 0, originX: 0 },
                hover: { scaleX: 1, originX: 0 },
              }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%" }}
            />
          </motion.div>
        );
      })}
    </nav>
  );
}
