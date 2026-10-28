import Image from "next/image";
import type { ShowcasePhoto } from "@/lib/items/queries";

interface Props {
  photos: ShowcasePhoto[];
}

/**
 * 히어로 옆에서 쉬지 않고 세로로 흐르는 실제 상품 사진 벽. 순수 CSS 애니메이션이라
 * 서버 컴포넌트로 둬도 된다 — 상태나 이벤트가 필요 없다.
 */
export function PhotoWall({ photos }: Props) {
  if (photos.length === 0) return null;

  // 사진을 3열로 나누고, 각 열은 자기 사진을 두 벌 이어 붙여 끊김없이 순환시킨다.
  const columns: ShowcasePhoto[][] = [[], [], []];
  photos.forEach((p, i) => columns[i % 3].push(p));

  const directions = ["up", "down", "up"] as const;
  const durations = ["34s", "40s", "30s"];

  return (
    <div className="grid h-[520px] grid-cols-3 gap-3 overflow-hidden sm:h-[640px]">
      {columns.map((col, i) => (
        <div key={i} className="relative overflow-hidden rounded-2xl">
          <div
            className={`flex flex-col gap-3 ${directions[i] === "up" ? "photo-wall-up" : "photo-wall-down"}`}
            style={{ animationDuration: durations[i] }}
          >
            {[...col, ...col].map((photo, j) => (
              <div key={`${photo.storageKey}-${j}`} className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-cream-soft">
                <Image
                  src={`/uploads/${photo.storageKey}`}
                  alt={photo.title}
                  fill
                  sizes="33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
