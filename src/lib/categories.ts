// SSAD 3.9 설정값 enabled_categories: 1단계에서는 DB enum 6종 중 3종만 허용한다.
// 나머지(bicycle, scooter, space)는 2단계 제외 범위(1.3절 표3)라 UI/API에서 모두 막는다.

export const ENABLED_CATEGORIES = ["electronics", "camping_living", "event_clothing"] as const;
export type Category = (typeof ENABLED_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  electronics: "전자제품",
  camping_living: "캠핑·생활",
  event_clothing: "행사용 의류",
};

export function isEnabledCategory(value: string): value is Category {
  return (ENABLED_CATEGORIES as readonly string[]).includes(value);
}
