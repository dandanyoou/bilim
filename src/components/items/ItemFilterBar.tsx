import { CATEGORY_LABEL, ENABLED_CATEGORIES } from "@/lib/categories";

interface Props {
  category?: string;
  from?: string;
  to?: string;
  q?: string;
}

export function ItemFilterBar({ category, from, to, q }: Props) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white/50 p-4">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        검색어
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="물건 이름"
          className="rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        카테고리
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
        >
          <option value="">전체</option>
          {ENABLED_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        대여 시작
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        대여 종료
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
        />
      </label>

      <button
        type="submit"
        className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream hover:bg-ink/85"
      >
        검색
      </button>
    </form>
  );
}
