export type MonthlyControlCheckStatus = "ok" | "not_ok" | "na";

export type MonthlyControlChecklistItem = {
  id: string;
  label: string;
};

export type MonthlyControlChecklistSection = {
  id: string;
  title: string;
  items: MonthlyControlChecklistItem[];
};

/** Pikat e kontrollit periodik mujor (mirëmbajtje). */
export const MONTHLY_CONTROL_CHECKLIST: MonthlyControlChecklistSection[] = [
  {
    id: "cabin",
    title: "Kabina dhe dyer",
    items: [
      { id: "cabin-doors", label: "Mbyllje dhe sirtarë dyerash kabine" },
      { id: "cabin-lighting", label: "Ndriçimi i kabinës" },
      { id: "cabin-buttons", label: "Butonat e thirrjes në kabinë" },
      { id: "cabin-communication", label: "Interkom / alarm komunikimi" },
    ],
  },
  {
    id: "mechanical",
    title: "Sistemi mekanik",
    items: [
      { id: "ropes", label: "Kabllo tërheqëse dhe lidhje" },
      { id: "brakes", label: "Sistemi i frenimit" },
      { id: "lubrication", label: "Lubrifikimi (udhëzues, makinë)" },
      { id: "counterweight", label: "Counterweight / sistemi i peshës" },
    ],
  },
  {
    id: "safety",
    title: "Siguria",
    items: [
      { id: "speed-governor", label: "Limitatori i shpejtësise" },
      { id: "door-sensors", label: "Sensorët e dereve / fotocelula" },
      { id: "emergency-button", label: "Butoni i alarmit emergjent" },
      { id: "pit-safety", label: "Gropë / hapësira e poshtme (nëse aplikohet)" },
    ],
  },
  {
    id: "machine-room",
    title: "Makineria",
    items: [
      { id: "electrical-panel", label: "Paneli elektrik" },
      { id: "motor-drive", label: "Motori / ndërmarrësi" },
      { id: "machine-ventilation", label: "Ventilimi i makinerisë" },
      { id: "machine-cleanliness", label: "Pastrimi dhe gjendja e përgjithshme" },
    ],
  },
];

export const MONTHLY_CONTROL_CHECK_STATUS_LABELS: Record<MonthlyControlCheckStatus, string> = {
  ok: "Konforme",
  not_ok: "Jo konforme",
  na: "Nuk aplikohet",
};

export function allMonthlyControlChecklistItemIds(): string[] {
  return MONTHLY_CONTROL_CHECKLIST.flatMap((section) => section.items.map((item) => item.id));
}
