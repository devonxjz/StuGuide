export const DEVELOPMENT_AREAS = [
  { value: "physical", label: "Thể chất" },
  { value: "cognitive", label: "Nhận thức" },
  { value: "language", label: "Ngôn ngữ" },
  { value: "social-emotional", label: "Tình cảm & KNXH" },
  { value: "aesthetic", label: "Thẩm mỹ" },
] as const;

export type DevelopmentArea = (typeof DEVELOPMENT_AREAS)[number]["value"];
export const DEVELOPMENT_AREA_VALUES = DEVELOPMENT_AREAS.map((a) => a.value) as [
  DevelopmentArea,
  ...DevelopmentArea[],
];

export function getAreaLabel(value: string): string {
  return DEVELOPMENT_AREAS.find((a) => a.value === value)?.label ?? value;
}
