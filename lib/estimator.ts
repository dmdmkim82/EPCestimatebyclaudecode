export type EstimateCategory = "E" | "P" | "C" | "ETC";
export type ItemPricingMode = "UNIT" | "MANUAL" | "PERCENT";
export type PercentBase = "DIRECT_EPC" | "CURRENT_TOTAL" | "CATEGORY_E" | "CATEGORY_P" | "CATEGORY_C";

export type EstimateProjectMeta = {
  projectName: string;
  clientName: string;
  location: string;
  estimateNo: string;
  currency: "KRW";
  baseYear: number;
  startYear: number;
  preparedBy: string;
  notes: string;
};

export type EstimateItem = {
  id: string;
  code: string;
  category: EstimateCategory;
  subcategory: string;
  name: string;
  spec: string;
  unit: string;
  pricingMode: ItemPricingMode;
  qty: number;
  unitPrice: number;
  manualAmount: number;
  percentRate: number;
  percentBase: PercentBase;
  note: string;
  referenceItemId: string;
  referenceLabel: string;
  referenceAmount: number;
  referenceCode: string;
};

export type EstimateItemCandidate = {
  id?: string;
  code?: string;
  category?: unknown;
  subcategory?: string;
  name?: string;
  spec?: string;
  unit?: string;
  pricingMode?: unknown;
  qty?: unknown;
  unitPrice?: unknown;
  manualAmount?: unknown;
  percentRate?: unknown;
  percentBase?: unknown;
  note?: string;
  referenceItemId?: string;
  referenceLabel?: string;
  referenceAmount?: unknown;
  referenceCode?: string;
};

export type ResolvedEstimateItem = EstimateItem & {
  amount: number;
};

export type SubcategorySummary = {
  name: string;
  total: number;
  count: number;
};

export type CategorySummary = {
  category: EstimateCategory;
  label: string;
  total: number;
  count: number;
  shareOfGrandTotal: number;
  subcategories: SubcategorySummary[];
};

export type EstimateWorkbook = {
  meta: EstimateProjectMeta;
  items: EstimateItem[];
};

export type EstimateSummary = {
  resolvedItems: ResolvedEstimateItem[];
  categoryTotals: Record<EstimateCategory, number>;
  categorySummaries: CategorySummary[];
  directTotal: number;
  etcTotal: number;
  grandTotal: number;
  topItems: ResolvedEstimateItem[];
};

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

export const CATEGORY_ORDER: EstimateCategory[] = ["E", "P", "C", "ETC"];

export const CATEGORY_LABELS: Record<EstimateCategory, string> = {
  E: "E Service Cost",
  P: "P Procurement",
  C: "C Construction",
  ETC: "Etc / Indirect",
};

export const CATEGORY_SHORT_LABELS: Record<EstimateCategory, string> = {
  E: "E",
  P: "P",
  C: "C",
  ETC: "Etc",
};

export const CATEGORY_DESCRIPTIONS: Record<EstimateCategory, string> = {
  E: "설계, PM, 시운전, 인허가 지원 같은 서비스성 비용",
  P: "장치, 구매자재, 패키지 장비, 전기자재 같은 구매 항목",
  C: "기계, 배관, 전기, 계장, 건축, 토목 등 현장 시공 항목",
  ETC: "간접비, 세금, 인허가, escalation, contingency, 하자보수 등",
};

export const CATEGORY_SHEET_NAMES: Record<EstimateCategory, string> = {
  E: "E_Service",
  P: "P_Procurement",
  C: "C_Construction",
  ETC: "Etc_Indirect",
};

export const SUBCATEGORY_OPTIONS: Record<EstimateCategory, string[]> = {
  E: [
    "사업관리",
    "기본설계",
    "상세설계",
    "구매지원",
    "시운전/커미셔닝",
    "성능보증",
    "교육/운영지원",
    "인허가 지원",
  ],
  P: [
    "주요 패키지",
    "연료전지/주기기",
    "기계 자재",
    "배관/밸브",
    "전기 자재",
    "계장 자재",
    "건축 자재",
    "토목 자재",
  ],
  C: [
    "기계",
    "배관",
    "전기",
    "계장",
    "건축",
    "토목",
    "시운전",
  ],
  ETC: [
    "간접비",
    "세금",
    "인허가",
    "물가상승",
    "Contingency",
    "하자보수",
    "보험/보증",
    "기타",
  ],
};

export const PRICING_MODE_OPTIONS: Array<SelectOption<ItemPricingMode>> = [
  { value: "UNIT", label: "수량 x 단가", description: "라인아이템 직접 산출" },
  { value: "MANUAL", label: "금액 직접입력", description: "고정금액 추가" },
  { value: "PERCENT", label: "비율 적용", description: "기준 금액에 요율 적용" },
];

export const PERCENT_BASE_OPTIONS: Array<SelectOption<PercentBase>> = [
  { value: "DIRECT_EPC", label: "직접 EPC 합계", description: "E + P + C 직접비 합계" },
  { value: "CURRENT_TOTAL", label: "현재 누계", description: "직전까지 반영된 총계" },
  { value: "CATEGORY_E", label: "E 합계", description: "Service Cost 기준" },
  { value: "CATEGORY_P", label: "P 합계", description: "Procurement 기준" },
  { value: "CATEGORY_C", label: "C 합계", description: "Construction 기준" },
];

export const DEFAULT_META: EstimateProjectMeta = {
  projectName: "SOFC EPC 개산견적",
  clientName: "Internal Review",
  location: "경기권",
  estimateNo: "EST-2026-001",
  currency: "KRW",
  baseYear: 2026,
  startYear: 2027,
  preparedBy: "Codex",
  notes:
    "Reference Excel을 먼저 입력한 뒤 대분류/소분류/기준항목을 선택하고 PJT 금액을 채우는 구조입니다.",
};

const DEFAULT_ITEMS: EstimateItem[] = [];

export const DEFAULT_WORKBOOK: EstimateWorkbook = {
  meta: DEFAULT_META,
  items: DEFAULT_ITEMS,
};

const codePrefix: Record<EstimateCategory, string> = {
  E: "E",
  P: "P",
  C: "C",
  ETC: "ETC",
};

let itemSequence = 10_000;

function roundCurrency(value: number) {
  return Math.round(value);
}

function nextItemId() {
  itemSequence += 1;
  return `item-${itemSequence}`;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const cleaned = value.replaceAll(",", "").trim();
    if (!cleaned) return 0;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function buildDefaultSubcategory(category: EstimateCategory) {
  return SUBCATEGORY_OPTIONS[category][0] ?? CATEGORY_LABELS[category];
}

function buildCategoryTotals() {
  return {
    E: 0,
    P: 0,
    C: 0,
    ETC: 0,
  } satisfies Record<EstimateCategory, number>;
}

function inferPricingMode(item: EstimateItem): ItemPricingMode {
  if (item.pricingMode === "PERCENT") return "PERCENT";
  if (item.pricingMode === "MANUAL") return "MANUAL";
  return "UNIT";
}

function calculateDirectAmount(item: EstimateItem) {
  const pricingMode = inferPricingMode(item);

  if (pricingMode === "MANUAL") {
    return roundCurrency(item.manualAmount);
  }

  if (pricingMode === "UNIT") {
    return roundCurrency(item.qty * item.unitPrice);
  }

  return roundCurrency(item.manualAmount);
}

function amountForPercentBase(
  percentBase: PercentBase,
  categoryTotals: Record<EstimateCategory, number>,
  directTotal: number,
  currentTotal: number,
) {
  if (percentBase === "CURRENT_TOTAL") return currentTotal;
  if (percentBase === "CATEGORY_E") return categoryTotals.E;
  if (percentBase === "CATEGORY_P") return categoryTotals.P;
  if (percentBase === "CATEGORY_C") return categoryTotals.C;
  return directTotal;
}

export function formatKrw(value: number) {
  return `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(roundCurrency(value))} 원`;
}

export function formatEok(value: number) {
  return `${new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100_000_000)} 억원`;
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function getPercentBaseLabel(base: PercentBase) {
  return PERCENT_BASE_OPTIONS.find((option) => option.value === base)?.label ?? base;
}

export function getCategoryLabel(category: EstimateCategory) {
  return CATEGORY_LABELS[category];
}

export function getSubcategoryOptions(category: EstimateCategory) {
  return SUBCATEGORY_OPTIONS[category];
}

export function buildNextCode(category: EstimateCategory, items: EstimateItem[]) {
  const prefix = codePrefix[category];
  const currentMax = items
    .filter((item) => item.category === category)
    .map((item) => {
      const raw = item.code.replace(`${prefix}-`, "");
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    })
    .reduce((max, value) => Math.max(max, value), 0);

  return `${prefix}-${String(currentMax + 1).padStart(3, "0")}`;
}

export function createEmptyItem(
  category: EstimateCategory,
  items: EstimateItem[],
  subcategory?: string,
): EstimateItem {
  const mode: ItemPricingMode = category === "ETC" ? "PERCENT" : "UNIT";

  return {
    id: nextItemId(),
    code: buildNextCode(category, items),
    category,
    subcategory: subcategory ?? buildDefaultSubcategory(category),
    name: "",
    spec: "",
    unit: mode === "PERCENT" ? "%" : "식",
    pricingMode: mode,
    qty: mode === "UNIT" ? 1 : 0,
    unitPrice: 0,
    manualAmount: 0,
    percentRate: mode === "PERCENT" ? 3 : 0,
    percentBase: "DIRECT_EPC",
    note: "",
    referenceItemId: "",
    referenceLabel: "",
    referenceAmount: 0,
    referenceCode: "",
  };
}

export function cloneWorkbook(workbook: EstimateWorkbook): EstimateWorkbook {
  return {
    meta: { ...workbook.meta },
    items: workbook.items.map((item) => ({ ...item })),
  };
}

export function createSeedWorkbook(): EstimateWorkbook {
  return cloneWorkbook(DEFAULT_WORKBOOK);
}

export function normalizeCategory(value: unknown): EstimateCategory {
  if (value === "E" || value === "P" || value === "C" || value === "ETC") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (normalized === "ETC" || normalized === "ETC / INDIRECT" || normalized === "ETC_INDIRECT") {
      return "ETC";
    }
    if (normalized === "E" || normalized.startsWith("E ")) return "E";
    if (normalized === "P" || normalized.startsWith("P ")) return "P";
    if (normalized === "C" || normalized.startsWith("C ")) return "C";
  }

  return "ETC";
}

export function normalizePricingMode(
  category: EstimateCategory,
  pricingMode: unknown,
  qty: unknown,
  unitPrice: unknown,
  manualAmount: unknown,
  percentRate: unknown,
): ItemPricingMode {
  if (pricingMode === "UNIT" || pricingMode === "MANUAL" || pricingMode === "PERCENT") {
    return pricingMode;
  }

  if (typeof pricingMode === "string") {
    const normalized = pricingMode.trim().toUpperCase();
    if (normalized === "UNIT" || normalized === "QTY" || normalized === "QTY*PRICE") return "UNIT";
    if (normalized === "MANUAL" || normalized === "FIXED" || normalized === "LUMP SUM")
      return "MANUAL";
    if (normalized === "PERCENT" || normalized === "RATE") return "PERCENT";
  }

  if (normalizeNumber(percentRate) > 0) return "PERCENT";
  if (normalizeNumber(qty) > 0 || normalizeNumber(unitPrice) > 0) return "UNIT";
  if (normalizeNumber(manualAmount) > 0) return "MANUAL";

  return category === "ETC" ? "PERCENT" : "UNIT";
}

export function normalizePercentBase(value: unknown): PercentBase {
  if (
    value === "DIRECT_EPC" ||
    value === "CURRENT_TOTAL" ||
    value === "CATEGORY_E" ||
    value === "CATEGORY_P" ||
    value === "CATEGORY_C"
  ) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (normalized === "CURRENT" || normalized === "CURRENT_TOTAL" || normalized === "TOTAL") {
      return "CURRENT_TOTAL";
    }
    if (normalized === "E" || normalized === "CATEGORY_E") return "CATEGORY_E";
    if (normalized === "P" || normalized === "CATEGORY_P") return "CATEGORY_P";
    if (normalized === "C" || normalized === "CATEGORY_C") return "CATEGORY_C";
  }

  return "DIRECT_EPC";
}

export function normalizeItem(candidate: EstimateItemCandidate, fallbackItems: EstimateItem[]): EstimateItem {
  const category = normalizeCategory(candidate.category);
  const pricingMode = normalizePricingMode(
    category,
    candidate.pricingMode,
    candidate.qty,
    candidate.unitPrice,
    candidate.manualAmount,
    candidate.percentRate,
  );

  return {
    id: candidate.id?.trim() || nextItemId(),
    code: candidate.code?.trim() || buildNextCode(category, fallbackItems),
    category,
    subcategory:
      candidate.subcategory?.trim() || buildDefaultSubcategory(category),
    name: candidate.name?.trim() || "",
    spec: candidate.spec?.trim() || "",
    unit:
      pricingMode === "PERCENT"
        ? "%"
        : candidate.unit?.trim() || "식",
    pricingMode,
    qty: normalizeNumber(candidate.qty),
    unitPrice: normalizeNumber(candidate.unitPrice),
    manualAmount: normalizeNumber(candidate.manualAmount),
    percentRate: normalizeNumber(candidate.percentRate),
    percentBase: normalizePercentBase(candidate.percentBase),
    note: candidate.note?.trim() || "",
    referenceItemId: candidate.referenceItemId?.trim() || "",
    referenceLabel: candidate.referenceLabel?.trim() || "",
    referenceAmount: normalizeNumber(candidate.referenceAmount),
    referenceCode: candidate.referenceCode?.trim() || "",
  };
}

export function calculateWorkbookSummary(workbook: EstimateWorkbook): EstimateSummary {
  const items = workbook.items.map((item) => normalizeItem(item, workbook.items));
  const categoryTotals = buildCategoryTotals();

  const directResolved: ResolvedEstimateItem[] = [];
  const etcResolved: ResolvedEstimateItem[] = [];

  for (const item of items) {
    if (item.category === "ETC") continue;
    const amount = calculateDirectAmount(item);
    categoryTotals[item.category] += amount;
    directResolved.push({
      ...item,
      amount,
    });
  }

  const directTotal = categoryTotals.E + categoryTotals.P + categoryTotals.C;
  let runningTotal = directTotal;

  for (const item of items) {
    if (item.category !== "ETC") continue;

    const amount =
      item.pricingMode === "PERCENT"
        ? roundCurrency(
            amountForPercentBase(item.percentBase, categoryTotals, directTotal, runningTotal) *
              (item.percentRate / 100),
          )
        : calculateDirectAmount(item);

    categoryTotals.ETC += amount;
    runningTotal += amount;
    etcResolved.push({
      ...item,
      amount,
    });
  }

  const resolvedMap = new Map<string, ResolvedEstimateItem>();
  for (const item of [...directResolved, ...etcResolved]) {
    resolvedMap.set(item.id, item);
  }

  const resolvedItems = items
    .map((item) => resolvedMap.get(item.id))
    .filter((item): item is ResolvedEstimateItem => Boolean(item));

  const grandTotal = directTotal + categoryTotals.ETC;
  const categorySummaries = CATEGORY_ORDER.map((category) => {
    const categoryItems = resolvedItems.filter((item) => item.category === category);
    const subcategoryMap = new Map<string, SubcategorySummary>();

    for (const item of categoryItems) {
      const current = subcategoryMap.get(item.subcategory) ?? {
        name: item.subcategory,
        total: 0,
        count: 0,
      };
      current.total += item.amount;
      current.count += 1;
      subcategoryMap.set(item.subcategory, current);
    }

    return {
      category,
      label: CATEGORY_LABELS[category],
      total: categoryTotals[category],
      count: categoryItems.length,
      shareOfGrandTotal: grandTotal > 0 ? categoryTotals[category] / grandTotal : 0,
      subcategories: [...subcategoryMap.values()].sort((left, right) => right.total - left.total),
    };
  });

  return {
    resolvedItems,
    categoryTotals,
    categorySummaries,
    directTotal,
    etcTotal: categoryTotals.ETC,
    grandTotal,
    topItems: [...resolvedItems].sort((left, right) => right.amount - left.amount).slice(0, 5),
  };
}

export function getItemComputedAmount(item: EstimateItem, summary: EstimateSummary) {
  const resolved = summary.resolvedItems.find((candidate) => candidate.id === item.id);
  return resolved?.amount ?? 0;
}
