export const AGE_GROUPS = [
  { value: "24-36m", label: "24–36 tháng", short: "Nhà trẻ" },
  { value: "3-4y", label: "3–4 tuổi", short: "MG bé" },
  { value: "4-5y", label: "4–5 tuổi", short: "MG nhỡ" },
  { value: "5-6y", label: "5–6 tuổi", short: "MG lớn" },
] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number]["value"];
export const AGE_GROUP_VALUES = AGE_GROUPS.map((g) => g.value) as [AgeGroup, ...AgeGroup[]];

export function getAgeLabel(value: string): string {
  return AGE_GROUPS.find((g) => g.value === value)?.label ?? value;
}
