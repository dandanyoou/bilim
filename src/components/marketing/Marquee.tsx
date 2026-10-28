interface Props {
  items: string[];
  className?: string;
}

/**
 * 가로로 끊김 없이 흐르는 틸커. 목록을 두 벌 이어 붙이고 -50% 만큼만 이동시켜
 * 루프 이음매가 안 보이게 한다. 마우스를 올리면 멈춘다(읽을 수 있게).
 */
export function Marquee({ items, className = "" }: Props) {
  const doubled = [...items, ...items];
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-8">
            <span className="text-sm font-medium tracking-wide text-ink-soft">{item}</span>
            <span aria-hidden className="text-lime">
              ◆
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
