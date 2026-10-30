"use client";

import { useEffect } from "react";

/**
 * knot처럼 "스크롤 한 번 = 한 섹션"을 만든다. CSS scroll-snap(mandatory)만으로는
 * 트랙패드로 세게 밀면 두 섹션을 건너뛸 수 있어서, 휠 입력을 가로채 정확히 한
 * 섹션만 이동시키고 다음 입력은 애니메이션이 끝날 때까지 잠근다.
 * 터치스크린·prefers-reduced-motion에서는 그냥 둔다 — 강제로 페이지를 넘기는
 * 느낌이 모바일 스크롤이나 모션 민감도 설정과는 안 맞는다.
 */
export function FullPageScrollController() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const sections = Array.from(document.querySelectorAll<HTMLElement>(".scroll-section"));
    if (sections.length < 2) return;

    let locked = false;
    let currentIndex = 0;

    function sectionTops() {
      return sections.map((s) => s.offsetTop);
    }

    function nearestIndex() {
      const tops = sectionTops();
      const y = window.scrollY;
      let best = 0;
      let bestDist = Infinity;
      tops.forEach((top, i) => {
        const dist = Math.abs(top - y);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    }

    currentIndex = nearestIndex();

    function goTo(index: number) {
      const clamped = Math.max(0, Math.min(sections.length - 1, index));
      if (clamped === currentIndex) return;
      locked = true;
      currentIndex = clamped;
      sections[clamped].scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        locked = false;
      }, 650);
    }

    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) < 10) return;
      e.preventDefault();
      if (locked) return;
      goTo(currentIndex + (e.deltaY > 0 ? 1 : -1));
    }

    // 사용자가 스크롤바를 직접 드래그하는 등 휠을 거치지 않는 이동도 있으니
    // 느슨하게 현재 위치를 계속 따라간다(잠겨 있지 않을 때만).
    function onScroll() {
      if (locked) return;
      currentIndex = nearestIndex();
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
