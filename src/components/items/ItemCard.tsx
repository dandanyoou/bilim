"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { CATEGORY_LABEL, type Category } from "@/lib/categories";
import { formatWon } from "@/lib/money";
import type { ItemListRow } from "@/lib/items/queries";

interface Props {
  item: ItemListRow;
  /** 벤토 그리드에서 큰 칸으로 그릴지. 사진·제목이 더 크게 나온다. */
  featured?: boolean;
}

export function ItemCard({ item, featured = false }: Props) {
  const photos = item.photoKeys.length > 0 ? item.photoKeys : [];
  const [frame, setFrame] = useState(0);
  const [hovered, setHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (hovered && photos.length > 1) {
      intervalRef.current = setInterval(() => {
        setFrame((f) => (f + 1) % photos.length);
      }, 850);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hovered, photos.length]);

  function onLeave() {
    setHovered(false);
    setFrame(0);
  }

  return (
    <motion.div
      whileHover={{ y: -4, rotate: -0.4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={onLeave}
      className={featured ? "sm:col-span-2 sm:row-span-2" : ""}
    >
      <Link
        href={`/items/${item.id}`}
        className="group block h-full overflow-hidden rounded-2xl border border-line bg-white/60 transition-shadow hover:shadow-lg hover:shadow-ink/5"
      >
        <div className={`relative w-full overflow-hidden bg-cream-soft ${featured ? "aspect-[4/3]" : "aspect-square"}`}>
          {photos.length > 0 ? (
            photos.map((key, i) => (
              <Image
                key={key}
                src={`/uploads/${key}`}
                alt={item.title}
                fill
                sizes={featured ? "60vw" : "(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 90vw"}
                className="object-cover transition-opacity duration-500"
                style={{ opacity: i === frame ? 1 : 0 }}
                priority={i === 0}
              />
            ))
          ) : (
            <div className="flex h-full items-center justify-center font-hand text-2xl text-ink-soft/50">
              빌림
            </div>
          )}
          {photos.length > 1 && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className="h-1 w-1 rounded-full transition-colors"
                  style={{ backgroundColor: i === frame ? "var(--color-lime)" : "rgba(255,255,255,0.6)" }}
                />
              ))}
            </div>
          )}
        </div>
        <div className={`space-y-1.5 p-4 ${featured ? "sm:p-5" : ""}`}>
          <span className="text-xs text-accent">{CATEGORY_LABEL[item.category as Category] ?? item.category}</span>
          <h3 className={`line-clamp-1 font-medium text-ink ${featured ? "text-lg" : ""}`}>{item.title}</h3>
          <p className={`font-semibold text-ink ${featured ? "text-base" : "text-sm"}`}>
            일 {formatWon(item.dailyFee)}
            <span className="ml-1.5 text-xs font-normal text-ink-soft">· 보증금 {formatWon(item.deposit)}</span>
          </p>
          <p className="truncate text-xs text-ink-soft">{item.pickupPlace}</p>
        </div>
      </Link>
    </motion.div>
  );
}
