export type ProjectType = "singleOutdoor" | "singleOffice" | "multiLevel";
export type CostCategory = "S" | "P" | "C";

export type ReferenceProjectItem = {
  code: string;
  name: string;
  category: CostCategory;
  amountEok: number;
  note?: string;
};

export type ReferenceProject = {
  id: string;
  name: string;
  source: "built-in" | "excel-upload";
  sourceFileName?: string;
  referenceYear: number;
  referenceCapacityMw: number;
  totalEok: number;
  items: ReferenceProjectItem[];
  notes: string[];
};

export type DrawingChangeInput = {
  referenceDrawingName: string;
  targetDrawingName: string;
  civilPct: number;
  electricalPct: number;
  mechanicalPct: number;
  controlPct: number;
};

export type InflationProfileInput = {
  sourceLabel: string;
  serviceRate: number;
  procurementRate: number;
  constructionRate: number;
};

export type LcoeInput = {
  capacityFactorPct: number;
  fixedOandMRatePct: number;
  stackReplacementRatePct: number;
  fuelCostKrwPerKwh: number;
  discountRatePct: number;
  projectLifeYears: number;
};

export type EstimateInput = {
  projectName: string;
  siteName: string;
  siteAddress: string;
  latitude: number;
  longitude: number;
  projectType: ProjectType;
  capacityMw: number;
  baseYear: number;
  startYear: number;
  marginRate: number;
  warrantyRate: number;
  siteSurvey: Record<string, number>;
  drawingChange: DrawingChangeInput;
  inflation: InflationProfileInput;
  lcoe: LcoeInput;
};

export type CostItem = {
  code: string;
  name: string;
  category: CostCategory;
  kind: "reference" | "project-addon" | "site-survey" | "drawing-change";
  amountEok: number;
  adjustedAmountEok: number;
  unitPriceEok?: number;
  qty?: number;
  note?: string;
  basis?: string;
};

export type RiskRow = {
  label: string;
  total: number;
};

export type RiskFinding = {
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
  mitigation: string;
  impactEok: number;
};

export type BasisPoint = {
  title: string;
  detail: string;
};

export type LcoeBenchmark = {
  label: string;
  lcoeKrwPerKwh: number;
  deltaPct: number;
  note: string;
};

export type LcoeResult = {
  fuelCellKrwPerKwh: number;
  annualGenerationMWh: number;
  annualizedCapexEok: number;
  annualFuelCostEok: number;
  annualFixedCostEok: number;
  benchmarks: LcoeBenchmark[];
};

export type LayoutBlock = {
  id: string;
  label: string;
  kind: "module" | "aux" | "grid";
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LayoutPreview = {
  moduleCount: number;
  rows: number;
  cols: number;
  estimatedLandM2: number;
  blocks: LayoutBlock[];
  notes: string[];
};

export type EstimateResult = {
  years: number;
  capacityFactor: number;
  referenceProjectName: string;
  referenceYear: number;
  referenceCapacityMw: number;
  referenceTotalEok: number;
  scaledReferenceTotalEok: number;
  escalatedReferenceTotalEok: number;
  costItems: CostItem[];
  categoryTotals: Record<CostCategory, number>;
  siteItems: CostItem[];
  drawingItems: CostItem[];
  projectAddonSubtotal: number;
  costSubtotal: number;
  siteSubtotal: number;
  drawingSubtotal: number;
  marginEffect: number;
  constructionQuote: number;
  warranty: number;
  grandTotal: number;
  referenceDeltaEok: number;
  referenceDeltaPct: number;
  riskGrade: "LOW" | "MEDIUM" | "HIGH";
  scenarios: RiskRow[];
  strategies: RiskRow[];
  findings: RiskFinding[];
  basis: BasisPoint[];
  lcoe: LcoeResult;
  layout: LayoutPreview;
  mapQuery: string;
};

export type EscalationBreakdownRow = {
  category: CostCategory;
  label: string;
  annualRatePct: number;
  years: number;
  multiplier: number;
  compoundedPct: number;
};

export type MonteCarloBucket = {
  min: number;
  max: number;
  count: number;
};

export type MonteCarloSummary = {
  sampleCount: number;
  seed: number;
  p10: number;
  p50: number;
  p90: number;
  mean: number;
  min: number;
  max: number;
  buckets: MonteCarloBucket[];
};

export type EstimateBenchmark = {
  currentManwonPerKw: number;
  rangeMinManwonPerKw: number;
  rangeAvgManwonPerKw: number;
  rangeMaxManwonPerKw: number;
  positionPct: number;
  status: "LOW" | "NORMAL" | "HIGH";
  verdict: string;
};

export type EstimateUncertaintyProfile = {
  S: number;
  P: number;
  C: number;
  site: number;
  drawing: number;
};

type ProjectOption = {
  id: ProjectType;
  label: string;
  description: string;
};

type SiteSurveyOption = {
  id: string;
  label: string;
  unit: string;
  unitPriceEokPerUnit: number;
  note: string;
};

const round = (value: number, digits = 4) => Number(value.toFixed(digits));

const KW_BENCHMARK_RANGE = {
  min: 80,
  avg: 120,
  max: 160,
} as const;

export const DEFAULT_UNCERTAINTY_PROFILE: EstimateUncertaintyProfile = {
  S: 20,
  P: 20,
  C: 20,
  site: 20,
  drawing: 20,
};

const DEFAULT_REFERENCE_ITEMS: ReferenceProjectItem[] = [
  {
    code: "S-101",
    name: "엔지니어링 / 인허가",
    category: "S",
    amountEok: 12.44,
    note: "기준 프로젝트 설계, 인허가, 라이선스 패키지",
  },
  {
    code: "S-102",
    name: "프로젝트 관리 / 시운전",
    category: "S",
    amountEok: 10.9,
    note: "기준 프로젝트 PMO 및 시운전 지원",
  },
  {
    code: "P-201",
    name: "연료전지 모듈 패키지",
    category: "P",
    amountEok: 22.1,
    note: "주기기 SOFC / BOP 조달 패키지",
  },
  {
    code: "P-202",
    name: "보조기기 패키지",
    category: "P",
    amountEok: 8.4,
    note: "스키드, 수처리, 보조설비",
  },
  {
    code: "P-203",
    name: "전기 패키지",
    category: "P",
    amountEok: 6.04,
    note: "변압기, 스위치기어, 제어 인터페이스",
  },
  {
    code: "C-301",
    name: "토목 및 기초 공사",
    category: "C",
    amountEok: 18.5,
    note: "지반개량 및 설비 기초",
  },
  {
    code: "C-302",
    name: "기계 설치 / 배관 공사",
    category: "C",
    amountEok: 15.8,
    note: "기계 설치 및 유틸리티 배관",
  },
  {
    code: "C-303",
    name: "전기 설치 공사",
    category: "C",
    amountEok: 10.2,
    note: "케이블, 단말 처리, 패널 접속",
  },
  {
    code: "C-304",
    name: "부대 건축물 / 외함",
    category: "C",
    amountEok: 11.28,
    note: "부대 구조물 및 유틸리티실",
  },
];

const DEFAULT_REFERENCE_TOTAL = round(
  DEFAULT_REFERENCE_ITEMS.reduce((sum, item) => sum + item.amountEok, 0),
  2,
);

export const DEFAULT_REFERENCE_PROJECT: ReferenceProject = {
  id: "built-in-2025-9p9mw",
  name: "PJT Added Workbook",
  source: "built-in",
  referenceYear: 2025,
  referenceCapacityMw: 9.9,
  totalEok: DEFAULT_REFERENCE_TOTAL,
  items: DEFAULT_REFERENCE_ITEMS,
  notes: [
    "검토한 9.9MW 워크북을 기준으로 만든 기본 참조값입니다.",
    "실제 입찰 검토 시에는 업로드한 Excel 기준서를 우선 사용하세요.",
  ],
};

export const DEFAULT_REFERENCE_DATABASE: ReferenceProject[] = [
  DEFAULT_REFERENCE_PROJECT,
];

const PROJECT_ADDONS_PER_MW: Record<ProjectType, CostItem[]> = {
  singleOutdoor: [],
  singleOffice: [
    {
      code: "ADD-C-305",
      name: "사무동 및 철골 프레임",
      category: "C",
      kind: "project-addon",
      amountEok: 1.2,
      adjustedAmountEok: 0,
      note: "기준연도 MW당 단가 가정",
      basis: "사무동 / 지원동 범위",
    },
    {
      code: "ADD-C-306",
      name: "HVAC 및 부대설비",
      category: "C",
      kind: "project-addon",
      amountEok: 0.48,
      adjustedAmountEok: 0,
      note: "기준연도 MW당 단가 가정",
      basis: "건물 HVAC 및 지원설비",
    },
  ],
  multiLevel: [
    {
      code: "ADD-C-307",
      name: "복층 구조 프레임",
      category: "C",
      kind: "project-addon",
      amountEok: 1.8,
      adjustedAmountEok: 0,
      note: "기준연도 MW당 단가 가정",
      basis: "복층 플랜트 배치",
    },
    {
      code: "ADD-C-308",
      name: "수직 이송 설비",
      category: "C",
      kind: "project-addon",
      amountEok: 0.32,
      adjustedAmountEok: 0,
      note: "기준연도 MW당 단가 가정",
      basis: "수직 물류 / 양중 가산",
    },
  ],
};

export const PROJECT_OPTIONS: ProjectOption[] = [
  {
    id: "singleOutdoor",
    label: "단층 옥외형",
    description: "9.9MW 옥외형 기준 프로젝트와 가장 유사합니다.",
  },
  {
    id: "singleOffice",
    label: "단층 + 사무동",
    description: "옥외형 기준에 사무동 / 지원동 범위를 더합니다.",
  },
  {
    id: "multiLevel",
    label: "복층형",
    description: "복층 배치에 따른 추가 구조물과 양중 범위를 반영합니다.",
  },
];

export const SITE_SURVEY_OPTIONS: SiteSurveyOption[] = [
  {
    id: "grading",
    label: "부지 정지",
    unit: "lot",
    unitPriceEokPerUnit: 1.5,
    note: "대량 토공 및 레벨링",
  },
  {
    id: "retainingWall",
    label: "옹벽",
    unit: "m",
    unitPriceEokPerUnit: 0.025,
    note: "사면 안정화 또는 부지 옹벽",
  },
  {
    id: "hru",
    label: "HRU",
    unit: "MW",
    unitPriceEokPerUnit: 0.12,
    note: "출력 규모 연동 열회수 패키지",
  },
  {
    id: "hws",
    label: "온수 시스템",
    unit: "MW",
    unitPriceEokPerUnit: 0.08,
    note: "지역난방 또는 유틸리티 온수 배관",
  },
  {
    id: "mws",
    label: "중온수 시스템",
    unit: "MW",
    unitPriceEokPerUnit: 0.06,
    note: "공정 / 유틸리티 수계 패키지",
  },
  {
    id: "heatPipe",
    label: "열배관 200A",
    unit: "km",
    unitPriceEokPerUnit: 0.35,
    note: "지역 유틸리티 배관",
  },
  {
    id: "lineOverhead",
    label: "22.9kV 가공선로",
    unit: "km",
    unitPriceEokPerUnit: 0.45,
    note: "가공 송전 연계",
  },
  {
    id: "lineUnderground",
    label: "22.9kV 지중선로",
    unit: "km",
    unitPriceEokPerUnit: 0.8,
    note: "지중 송전 연계",
  },
];

export const DEFAULT_INPUT: EstimateInput = {
  projectName: "인천 연료전지 EPC",
  siteName: "송도 집단에너지 부지",
  siteAddress: "인천 송도",
  latitude: 37.3886,
  longitude: 126.6432,
  projectType: "singleOutdoor",
  capacityMw: 10,
  baseYear: 2025,
  startYear: 2027,
  marginRate: 12,
  warrantyRate: 1.5,
  siteSurvey: Object.fromEntries(SITE_SURVEY_OPTIONS.map((item) => [item.id, 0])),
  drawingChange: {
    referenceDrawingName: "",
    targetDrawingName: "",
    civilPct: 0,
    electricalPct: 0,
    mechanicalPct: 0,
    controlPct: 0,
  },
  inflation: {
    sourceLabel: "2025년 EPC 복합 물가지수 가정",
    serviceRate: 2.8,
    procurementRate: 5.4,
    constructionRate: 6.8,
  },
  lcoe: {
    capacityFactorPct: 90,
    fixedOandMRatePct: 3,
    stackReplacementRatePct: 1.5,
    fuelCostKrwPerKwh: 110,
    discountRatePct: 6,
    projectLifeYears: 20,
  },
};

export const REFERENCE_TEMPLATE = {
  name: DEFAULT_REFERENCE_PROJECT.name,
  referenceYear: DEFAULT_REFERENCE_PROJECT.referenceYear,
  referenceCapacityMw: DEFAULT_REFERENCE_PROJECT.referenceCapacityMw,
  referenceType: "단층 옥외형",
  referenceTotalEok: DEFAULT_REFERENCE_PROJECT.totalEok,
};

function getAnnualRateForCategory(
  category: CostCategory,
  inflation: InflationProfileInput,
) {
  if (category === "S") return inflation.serviceRate / 100;
  if (category === "P") return inflation.procurementRate / 100;
  return inflation.constructionRate / 100;
}

export function getEscalationBreakdown(
  baseYear: number,
  startYear: number,
  inflation: InflationProfileInput,
): EscalationBreakdownRow[] {
  const years = Math.max(0, startYear - baseYear);

  return [
    {
      category: "S",
      label: "서비스",
      annualRatePct: inflation.serviceRate,
      years,
      multiplier: round(Math.pow(1 + inflation.serviceRate / 100, years), 4),
      compoundedPct:
        years === 0 ? 0 : round((Math.pow(1 + inflation.serviceRate / 100, years) - 1) * 100, 2),
    },
    {
      category: "P",
      label: "조달",
      annualRatePct: inflation.procurementRate,
      years,
      multiplier: round(Math.pow(1 + inflation.procurementRate / 100, years), 4),
      compoundedPct:
        years === 0
          ? 0
          : round((Math.pow(1 + inflation.procurementRate / 100, years) - 1) * 100, 2),
    },
    {
      category: "C",
      label: "시공",
      annualRatePct: inflation.constructionRate,
      years,
      multiplier: round(Math.pow(1 + inflation.constructionRate / 100, years), 4),
      compoundedPct:
        years === 0
          ? 0
          : round((Math.pow(1 + inflation.constructionRate / 100, years) - 1) * 100, 2),
    },
  ];
}

function inflateAmount(
  amountEok: number,
  category: CostCategory,
  years: number,
  inflation: InflationProfileInput,
) {
  const annualRate = getAnnualRateForCategory(category, inflation);
  return amountEok * Math.pow(1 + annualRate, years);
}

function computeMarginTotals(
  costSubtotal: number,
  siteSubtotal: number,
  marginRate: number,
  warrantyRate: number,
) {
  const quotedBase = costSubtotal + siteSubtotal;
  const constructionQuote = quotedBase / (1 - marginRate / 100);
  const warranty = constructionQuote * (warrantyRate / 100);
  const grandTotal = constructionQuote + warranty;

  return {
    constructionQuote,
    warranty,
    grandTotal,
  };
}

function reduceCategoryTotals(items: CostItem[]) {
  return items.reduce<Record<CostCategory, number>>(
    (acc, item) => {
      acc[item.category] += item.adjustedAmountEok;
      return acc;
    },
    { S: 0, P: 0, C: 0 },
  );
}

function buildDrawingItems(
  input: EstimateInput,
  baseCategoryTotals: Record<CostCategory, number>,
  years: number,
): CostItem[] {
  const drawing = input.drawingChange;
  const items: Array<{
    code: string;
    name: string;
    category: CostCategory;
    pct: number;
    amountEok: number;
    note: string;
  }> = [];

  const civilBase = baseCategoryTotals.C * 0.4;
  if (drawing.civilPct > 0) {
    items.push({
      code: "DRW-C-401",
      name: "토목 도면 차이",
      category: "C",
      pct: drawing.civilPct,
      amountEok: civilBase * (drawing.civilPct / 100),
      note: "토목 / 기초 비중이 큰 시공 범위에 적용",
    });
  }

  const electricalBase = baseCategoryTotals.C * 0.2 + baseCategoryTotals.P * 0.12;
  if (drawing.electricalPct > 0) {
    items.push({
      code: "DRW-P-402",
      name: "전기 도면 차이",
      category: "P",
      pct: drawing.electricalPct,
      amountEok: electricalBase * (drawing.electricalPct / 100),
      note: "스위치기어, 케이블, 접속 범위에 적용",
    });
  }

  const mechanicalBase = baseCategoryTotals.C * 0.18 + baseCategoryTotals.P * 0.16;
  if (drawing.mechanicalPct > 0) {
    items.push({
      code: "DRW-C-403",
      name: "기계 / 배관 도면 차이",
      category: "C",
      pct: drawing.mechanicalPct,
      amountEok: mechanicalBase * (drawing.mechanicalPct / 100),
      note: "배관, 스키드, 기계 접속 범위에 적용",
    });
  }

  const controlBase = baseCategoryTotals.S * 0.18 + baseCategoryTotals.P * 0.08;
  if (drawing.controlPct > 0) {
    items.push({
      code: "DRW-S-404",
      name: "제어 / 계장 도면 차이",
      category: "S",
      pct: drawing.controlPct,
      amountEok: controlBase * (drawing.controlPct / 100),
      note: "로직, 제어, 인터페이스 엔지니어링에 적용",
    });
  }

  return items.map((item) => ({
    code: item.code,
    name: item.name,
    category: item.category,
    kind: "drawing-change",
    amountEok: item.amountEok,
    adjustedAmountEok: inflateAmount(item.amountEok, item.category, years, input.inflation),
    qty: item.pct,
    note: item.note,
    basis:
      input.drawingChange.referenceDrawingName && input.drawingChange.targetDrawingName
        ? `${input.drawingChange.referenceDrawingName} -> ${input.drawingChange.targetDrawingName}`
        : "수동 공종 차이 입력",
  }));
}

function calculateLcoe(grandTotal: number, input: EstimateInput): LcoeResult {
  const annualGenerationMWh =
    input.capacityMw * 8760 * (input.lcoe.capacityFactorPct / 100);
  const annualGenerationKWh = annualGenerationMWh * 1000;
  const capexKrw = grandTotal * 100_000_000;
  const discountRate = input.lcoe.discountRatePct / 100;
  const life = Math.max(1, input.lcoe.projectLifeYears);
  const capitalRecoveryFactor =
    discountRate === 0
      ? 1 / life
      : (discountRate * Math.pow(1 + discountRate, life)) /
        (Math.pow(1 + discountRate, life) - 1);

  const annualizedCapexKrw = capexKrw * capitalRecoveryFactor;
  const annualFuelCostKrw = annualGenerationKWh * input.lcoe.fuelCostKrwPerKwh;
  const annualFixedCostKrw =
    capexKrw *
    ((input.lcoe.fixedOandMRatePct + input.lcoe.stackReplacementRatePct) / 100);

  const fuelCellKrwPerKwh =
    (annualizedCapexKrw + annualFuelCostKrw + annualFixedCostKrw) /
    Math.max(1, annualGenerationKWh);

  const benchmarks = [
    {
      label: "유틸리티 태양광",
      lcoeKrwPerKwh: 118,
      note: "내부 계획 기준값",
    },
    {
      label: "육상풍력",
      lcoeKrwPerKwh: 136,
      note: "내부 계획 기준값",
    },
    {
      label: "LNG 열병합",
      lcoeKrwPerKwh: 173,
      note: "내부 계획 기준값",
    },
    {
      label: "BESS + 재생에너지 하이브리드",
      lcoeKrwPerKwh: 194,
      note: "내부 계획 기준값",
    },
  ].map((item) => ({
    ...item,
    deltaPct: round((fuelCellKrwPerKwh / item.lcoeKrwPerKwh - 1) * 100, 1),
  }));

  return {
    fuelCellKrwPerKwh: round(fuelCellKrwPerKwh, 1),
    annualGenerationMWh: round(annualGenerationMWh, 0),
    annualizedCapexEok: round(annualizedCapexKrw / 100_000_000, 2),
    annualFuelCostEok: round(annualFuelCostKrw / 100_000_000, 2),
    annualFixedCostEok: round(annualFixedCostKrw / 100_000_000, 2),
    benchmarks,
  };
}

function buildLayoutPreview(input: EstimateInput): LayoutPreview {
  const moduleCapacityMw =
    input.projectType === "multiLevel"
      ? 0.6
      : input.projectType === "singleOffice"
        ? 0.5
        : 0.45;
  const moduleCount = Math.max(1, Math.ceil(input.capacityMw / moduleCapacityMw));
  const cols = Math.max(2, Math.ceil(Math.sqrt(moduleCount * 1.4)));
  const rows = Math.max(1, Math.ceil(moduleCount / cols));
  const blocks: LayoutBlock[] = [];

  for (let index = 0; index < moduleCount; index += 1) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    blocks.push({
      id: `module-${index + 1}`,
      label: `FC-${index + 1}`,
      kind: "module",
      x: col * 1.25,
      y: row * 1.08,
      w: 1,
      h: 0.82,
    });
  }

  blocks.push({
    id: "aux-control",
    label: "제어 / 사무",
    kind: "aux",
    x: cols * 1.25 + 0.25,
    y: 0,
    w: 1.35,
    h: 0.95,
  });
  blocks.push({
    id: "aux-water",
    label: "용수 / 유틸리티",
    kind: "aux",
    x: cols * 1.25 + 0.25,
    y: 1.15,
    w: 1.35,
    h: 0.95,
  });
  blocks.push({
    id: "grid-yard",
    label: "계통 연계",
    kind: "grid",
    x: cols * 1.25 + 0.25,
    y: 2.3,
    w: 1.35,
    h: 1.05,
  });

  const lineLength =
    (input.siteSurvey.lineOverhead || 0) + (input.siteSurvey.lineUnderground || 0);
  const estimatedLandM2 =
    Math.round(moduleCount * 420 + 2400 + lineLength * 1100 + (input.siteSurvey.grading || 0) * 1200);

  const notes = [
    `${moduleCount}개 연료전지 블록을 ${rows}행 x ${cols}열로 배치했습니다.`,
    "부대 영역에는 제어동, 유틸리티 설비, 계통 연계 야드를 포함합니다.",
    lineLength > 0
      ? `계통 연계 구간에 선로 ${lineLength.toFixed(1)}km를 반영했습니다.`
      : "입력된 송전 연계 거리 값이 없습니다.",
  ];

  return {
    moduleCount,
    rows,
    cols,
    estimatedLandM2,
    blocks,
    notes,
  };
}

function buildRiskFindings(
  input: EstimateInput,
  years: number,
  referenceProject: ReferenceProject,
  siteSubtotal: number,
  drawingSubtotal: number,
  categoryTotals: Record<CostCategory, number>,
): RiskFinding[] {
  const findings: RiskFinding[] = [];

  if (years >= 2) {
    findings.push({
      title: "물가상승 노출",
      severity: years >= 3 ? "HIGH" : "MEDIUM",
      reason: `${input.baseYear}년에서 ${input.startYear}년까지 ${years}년의 물가상승이 적용됩니다.`,
      mitigation: "장기 조달 품목을 조기 확정하고 공종별 물가상승 조항을 분리하세요.",
      impactEok: round(
        categoryTotals.P * (Math.pow(1 + input.inflation.procurementRate / 100, 0.5) - 1),
        2,
      ),
    });
  }

  if (siteSubtotal >= 5) {
    findings.push({
      title: "부지 정지 / 유틸리티 범위 리스크",
      severity: siteSubtotal >= 10 ? "HIGH" : "MEDIUM",
      reason: "토목과 계통 연계 가산이 견적에 유의미한 영향을 주고 있습니다.",
      mitigation: "초기 현장 검토 단계에서 지반, 유틸리티 구간, 계통 연계 가정을 재확인하세요.",
      impactEok: round(siteSubtotal * 0.15, 2),
    });
  }

  if (drawingSubtotal >= 2) {
    findings.push({
      title: "도면 차이 리스크",
      severity: drawingSubtotal >= 5 ? "HIGH" : "MEDIUM",
      reason: "기준 도면과 목표 도면 차이가 있어 공종별 가산 반영이 필요합니다.",
      mitigation: "최종 입찰 확정 전에 정식 모델 / 도면 차이 검토를 수행하세요.",
      impactEok: round(drawingSubtotal * 0.3, 2),
    });
  }

  const scaleDelta = input.capacityMw / referenceProject.referenceCapacityMw - 1;
  if (Math.abs(scaleDelta) >= 0.35) {
    findings.push({
      title: "기준 프로젝트 스케일링 불확실성",
      severity: Math.abs(scaleDelta) >= 0.6 ? "HIGH" : "MEDIUM",
      reason: `목표 용량이 선택한 기준 프로젝트와 ${(scaleDelta * 100).toFixed(1)}% 차이납니다.`,
      mitigation: "용량이 더 유사한 기준 프로젝트를 추가하거나 설비 블록 수 기준으로 보정하세요.",
      impactEok: round(categoryTotals.P * Math.abs(scaleDelta) * 0.08, 2),
    });
  }

  if (referenceProject.source === "built-in") {
    findings.push({
      title: "기준 프로젝트 정합성 부족",
      severity: "LOW",
      reason: "현재 견적은 업로드한 프로젝트별 기준서가 아니라 기본 샘플 기준값에 의존하고 있습니다.",
      mitigation: "보다 상세한 기준 워크북을 업로드해 일반 기준값을 대체하세요.",
      impactEok: round(categoryTotals.S * 0.03, 2),
    });
  }

  return findings;
}

function inferRiskGrade(findings: RiskFinding[], scenarios: RiskRow[], grandTotal: number) {
  if (findings.some((item) => item.severity === "HIGH")) return "HIGH" as const;
  if (findings.some((item) => item.severity === "MEDIUM")) return "MEDIUM" as const;
  const worstScenario = Math.max(...scenarios.map((item) => item.total));
  const delta = worstScenario / Math.max(1, grandTotal) - 1;
  if (delta >= 0.12) return "HIGH" as const;
  if (delta >= 0.05) return "MEDIUM" as const;
  return "LOW" as const;
}

export function formatEok(value: number, digits = 2) {
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}\uC5B5\uC6D0`;
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

function hashSeed(source: string) {
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleTriangular(
  random: () => number,
  minimum: number,
  mode: number,
  maximum: number,
) {
  const ratio = (mode - minimum) / (maximum - minimum);
  const value = random();

  if (value <= ratio) {
    return minimum + Math.sqrt(value * (maximum - minimum) * (mode - minimum));
  }

  return maximum - Math.sqrt((1 - value) * (maximum - minimum) * (maximum - mode));
}

function quantile(sortedValues: number[], percentile: number) {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = (sortedValues.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;

  if (lowerIndex === upperIndex) return sortedValues[lowerIndex];

  return (
    sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight
  );
}

export function inferCostCategoryFromText(text: string): CostCategory {
  const normalized = text.toLowerCase();
  if (
    /(service|engineering|permit|commission|pm|startup|licen|용역|설계|인허가|시운전|pm)/i.test(
      normalized,
    )
  ) {
    return "S";
  }

  if (
    /(equipment|package|procurement|purchase|material|stack|module|transformer|switchgear|기기|주기기|구매|자재|변압기|반출입)/i.test(
      normalized,
    )
  ) {
    return "P";
  }

  return "C";
}

export function buildEstimateFingerprint(
  input: EstimateInput,
  referenceProject: ReferenceProject,
) {
  return JSON.stringify({
    projectName: input.projectName,
    siteName: input.siteName,
    siteAddress: input.siteAddress,
    latitude: round(input.latitude, 6),
    longitude: round(input.longitude, 6),
    projectType: input.projectType,
    capacityMw: round(input.capacityMw, 3),
    baseYear: input.baseYear,
    startYear: input.startYear,
    marginRate: round(input.marginRate, 3),
    warrantyRate: round(input.warrantyRate, 3),
    siteSurvey: input.siteSurvey,
    drawingChange: input.drawingChange,
    inflation: input.inflation,
    referenceId: referenceProject.id,
    referenceTotalEok: round(referenceProject.totalEok, 4),
    referenceItems: referenceProject.items.map((item) => ({
      code: item.code,
      category: item.category,
      amountEok: round(item.amountEok, 4),
    })),
  });
}

export function runMonteCarloEstimate(
  result: EstimateResult,
  input: EstimateInput,
  referenceProject: ReferenceProject,
  sampleCount = 10_000,
  uncertaintyProfile: EstimateUncertaintyProfile = DEFAULT_UNCERTAINTY_PROFILE,
): MonteCarloSummary {
  const deterministicItems = [...result.costItems, ...result.siteItems];
  const seed = hashSeed(buildEstimateFingerprint(input, referenceProject));
  const random = createSeededRandom(seed);

  if (deterministicItems.length === 0) {
    return {
      sampleCount,
      seed,
      p10: result.grandTotal,
      p50: result.grandTotal,
      p90: result.grandTotal,
      mean: result.grandTotal,
      min: result.grandTotal,
      max: result.grandTotal,
      buckets: [{ min: result.grandTotal, max: result.grandTotal, count: sampleCount }],
    };
  }

  const samples = Array.from({ length: sampleCount }, () => {
    const sampledAdjustedCost = deterministicItems.reduce((sum, item) => {
      const uncertaintyPct =
        item.kind === "site-survey"
          ? uncertaintyProfile.site
          : item.kind === "drawing-change"
            ? uncertaintyProfile.drawing
            : uncertaintyProfile[item.category];
      const minimumFactor = 1 - uncertaintyPct / 100;
      const maximumFactor = 1 + uncertaintyPct / 100;
      const factor = sampleTriangular(random, minimumFactor, 1, maximumFactor);
      return sum + item.adjustedAmountEok * factor;
    }, 0);
    const constructionQuote = sampledAdjustedCost / (1 - input.marginRate / 100);
    const warranty = constructionQuote * (input.warrantyRate / 100);
    return constructionQuote + warranty;
  }).sort((left, right) => left - right);

  const p10 = quantile(samples, 0.1);
  const p50 = quantile(samples, 0.5);
  const p90 = quantile(samples, 0.9);
  const min = samples[0];
  const max = samples[samples.length - 1];
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const bucketCount = 24;
  const span = Math.max(max - min, 0.0001);
  const step = span / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    min: min + step * index,
    max: index === bucketCount - 1 ? max : min + step * (index + 1),
    count: 0,
  }));

  for (const value of samples) {
    const bucketIndex = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((value - min) / step)),
    );
    buckets[bucketIndex].count += 1;
  }

  return {
    sampleCount,
    seed,
    p10: round(p10, 2),
    p50: round(p50, 2),
    p90: round(p90, 2),
    mean: round(mean, 2),
    min: round(min, 2),
    max: round(max, 2),
    buckets: buckets.map((bucket) => ({
      min: round(bucket.min, 2),
      max: round(bucket.max, 2),
      count: bucket.count,
    })),
  };
}

export function buildKwBenchmark(result: EstimateResult, input: EstimateInput): EstimateBenchmark {
  const currentManwonPerKw = (result.grandTotal * 10) / Math.max(0.1, input.capacityMw);
  let status: EstimateBenchmark["status"] = "NORMAL";
  let verdict = "평균 수준 - 정상 범위";

  if (currentManwonPerKw < KW_BENCHMARK_RANGE.min) {
    status = "LOW";
    verdict = "기준 범위 이하 - 누락 여부 점검 필요";
  } else if (currentManwonPerKw < 100) {
    verdict = "하단 범위 - 절감형 수준";
  } else if (currentManwonPerKw <= 140) {
    verdict = "평균 수준 - 정상 범위";
  } else if (currentManwonPerKw <= KW_BENCHMARK_RANGE.max) {
    verdict = "상단 범위 - 범위 내 보수적 수준";
  } else {
    status = "HIGH";
    verdict = "기준 범위 상회 - 범위 확대 사유 확인 필요";
  }

  const positionPct =
    ((currentManwonPerKw - KW_BENCHMARK_RANGE.min) /
      (KW_BENCHMARK_RANGE.max - KW_BENCHMARK_RANGE.min)) *
    100;

  return {
    currentManwonPerKw: round(currentManwonPerKw, 1),
    rangeMinManwonPerKw: KW_BENCHMARK_RANGE.min,
    rangeAvgManwonPerKw: KW_BENCHMARK_RANGE.avg,
    rangeMaxManwonPerKw: KW_BENCHMARK_RANGE.max,
    positionPct: round(Math.min(130, Math.max(-10, positionPct)), 1),
    status,
    verdict,
  };
}

export function calculateEstimate(
  input: EstimateInput,
  referenceProject: ReferenceProject = DEFAULT_REFERENCE_PROJECT,
): EstimateResult {
  const years = Math.max(0, input.startYear - input.baseYear);
  const capacityFactor = input.capacityMw / Math.max(0.1, referenceProject.referenceCapacityMw);

  const referenceItems = referenceProject.items.map<CostItem>((item) => ({
    code: item.code,
    name: item.name,
    category: item.category,
    kind: "reference",
    amountEok: item.amountEok * capacityFactor,
    adjustedAmountEok: inflateAmount(
      item.amountEok * capacityFactor,
      item.category,
      years,
      input.inflation,
    ),
    note: item.note ?? `${referenceProject.name} baseline`,
    basis: referenceProject.name,
  }));

  const projectAddonItems = PROJECT_ADDONS_PER_MW[input.projectType].map((item) => {
    const amountEok = item.amountEok * input.capacityMw;

    return {
      ...item,
      amountEok,
      adjustedAmountEok: inflateAmount(amountEok, item.category, years, input.inflation),
      qty: input.capacityMw,
      unitPriceEok: item.amountEok,
    };
  });

  const preDrawingItems = [...referenceItems, ...projectAddonItems];
  const preDrawingBaseCategoryTotals = preDrawingItems.reduce<Record<CostCategory, number>>(
    (acc, item) => {
      acc[item.category] += item.amountEok;
      return acc;
    },
    { S: 0, P: 0, C: 0 },
  );
  const drawingItems = buildDrawingItems(input, preDrawingBaseCategoryTotals, years);

  const siteItems = SITE_SURVEY_OPTIONS.map((option) => {
    const qty = input.siteSurvey[option.id] || 0;
    if (qty <= 0) return null;

    const amountEok = option.unitPriceEokPerUnit * qty;

    return {
      code: `SITE-${option.id}`,
      name: option.label,
      category: "C" as const,
      kind: "site-survey" as const,
      amountEok,
      adjustedAmountEok: inflateAmount(amountEok, "C", years, input.inflation),
      qty,
      unitPriceEok: option.unitPriceEokPerUnit,
      note: `${option.note} / ${option.unit}`,
      basis: `Site review input (${option.unit})`,
    };
  }).filter(Boolean) as CostItem[];

  const costItems = [...preDrawingItems, ...drawingItems];
  const categoryTotals = reduceCategoryTotals(costItems);
  const projectAddonSubtotal = projectAddonItems.reduce(
    (sum, item) => sum + item.adjustedAmountEok,
    0,
  );
  const costSubtotal = costItems.reduce((sum, item) => sum + item.adjustedAmountEok, 0);
  const siteSubtotal = siteItems.reduce((sum, item) => sum + item.adjustedAmountEok, 0);
  const drawingSubtotal = drawingItems.reduce((sum, item) => sum + item.adjustedAmountEok, 0);
  const baseTotals = computeMarginTotals(
    costSubtotal,
    siteSubtotal,
    input.marginRate,
    input.warrantyRate,
  );

  const inflationScenario = computeMarginTotals(
    costSubtotal * 1.025,
    siteSubtotal * 1.025,
    input.marginRate,
    input.warrantyRate,
  );

  const delayedCostSubtotal = costItems.reduce((sum, item) => {
    const annualRate = getAnnualRateForCategory(item.category, input.inflation);
    return sum + item.adjustedAmountEok * (1 + annualRate / 2);
  }, 0);

  const delayedSiteSubtotal = siteItems.reduce(
    (sum, item) =>
      sum + item.adjustedAmountEok * (1 + input.inflation.constructionRate / 100 / 2),
    0,
  );

  const oneHalfYearDelayScenario = computeMarginTotals(
    delayedCostSubtotal,
    delayedSiteSubtotal,
    input.marginRate,
    input.warrantyRate,
  );

  const gridShock = computeMarginTotals(
    costSubtotal,
    siteSubtotal + Math.max(1, siteSubtotal * 0.12),
    input.marginRate,
    input.warrantyRate,
  );

  const commodityShock = computeMarginTotals(
    costSubtotal + categoryTotals.P * 0.06,
    siteSubtotal,
    input.marginRate,
    input.warrantyRate,
  );

  const conservativeMargin = Math.min(49.9, input.marginRate + 3);
  const aggressiveMargin = Math.max(0, input.marginRate - 3);

  const conservative = computeMarginTotals(
    costSubtotal,
    siteSubtotal,
    conservativeMargin,
    input.warrantyRate,
  );
  const neutral = computeMarginTotals(
    costSubtotal,
    siteSubtotal,
    input.marginRate,
    input.warrantyRate,
  );
  const aggressive = computeMarginTotals(
    costSubtotal,
    siteSubtotal,
    aggressiveMargin,
    input.warrantyRate,
  );

  const scenarios: RiskRow[] = [
    { label: "복합 물가상승 +2.5%", total: inflationScenario.grandTotal },
    { label: "공기 지연 +6개월", total: oneHalfYearDelayScenario.grandTotal },
    { label: "계통 / 토목 추가 리스크", total: gridShock.grandTotal },
    { label: "조달 원자재 +6%", total: commodityShock.grandTotal },
  ];

  const strategies: RiskRow[] = [
    {
      label: `보수형 (${conservativeMargin.toFixed(1)}%)`,
      total: conservative.grandTotal,
    },
    { label: `기준형 (${input.marginRate.toFixed(1)}%)`, total: neutral.grandTotal },
    {
      label: `공격형 (${aggressiveMargin.toFixed(1)}%)`,
      total: aggressive.grandTotal,
    },
  ];

  const escalatedReferenceTotalEok = referenceItems.reduce(
    (sum, item) => sum + item.adjustedAmountEok,
    0,
  );
  const comparisonBase = Math.max(0.01, escalatedReferenceTotalEok);
  const referenceDeltaEok = baseTotals.grandTotal - comparisonBase;
  const referenceDeltaPct = (referenceDeltaEok / comparisonBase) * 100;
  const findings = buildRiskFindings(
    input,
    years,
    referenceProject,
    siteSubtotal,
    drawingSubtotal,
    categoryTotals,
  );
  const riskGrade = inferRiskGrade(findings, scenarios, baseTotals.grandTotal);
  const lcoe = calculateLcoe(baseTotals.grandTotal, input);
  const layout = buildLayoutPreview(input);

  const basis: BasisPoint[] = [
    {
      title: "선택한 기준 프로젝트",
      detail: `${referenceProject.name} (${referenceProject.referenceCapacityMw}MW / ${referenceProject.referenceYear}) 기준서 ${referenceProject.items.length}개 항목을 사용했습니다.`,
    },
    {
      title: "용량 보정",
      detail: `${referenceProject.referenceCapacityMw}MW 기준 프로젝트를 ${input.capacityMw.toFixed(1)}MW로 환산했습니다. (${formatPercent(capacityFactor * 100, 1)} 수준)`,
    },
    {
      title: "물가상승 로직",
      detail: `${input.baseYear} -> ${input.startYear}, ${input.inflation.sourceLabel} 기준으로 S/P/C 물가상승률 ${formatPercent(input.inflation.serviceRate)}, ${formatPercent(input.inflation.procurementRate)}, ${formatPercent(input.inflation.constructionRate)}를 적용했습니다.`,
    },
    {
      title: "현장 가산",
      detail:
        siteItems.length > 0
          ? `${siteItems.length}개 현장 검토 항목을 반영했고, 물가상승 후 합계는 ${formatEok(siteSubtotal)}입니다.`
          : "입력된 현장 가산 항목이 없습니다.",
    },
    {
      title: "도면 차이",
      detail:
        drawingItems.length > 0
          ? `${drawingItems.length}개 공종 차이 가산을 적용했고, 합계는 ${formatEok(drawingSubtotal)}입니다.`
          : "적용된 도면 차이 가산이 없습니다.",
    },
    {
      title: "상업 조건",
      detail: `EPC 소계에 목표 마진 ${formatPercent(input.marginRate)}와 하자보수 ${formatPercent(input.warrantyRate)}를 반영했습니다.`,
    },
  ];

  const mapQuery =
    input.latitude || input.longitude
      ? `${input.latitude},${input.longitude}`
      : `${input.siteName} ${input.siteAddress}`.trim();

  return {
    years,
    capacityFactor: round(capacityFactor),
    referenceProjectName: referenceProject.name,
    referenceYear: referenceProject.referenceYear,
    referenceCapacityMw: referenceProject.referenceCapacityMw,
    referenceTotalEok: round(referenceProject.totalEok, 2),
    scaledReferenceTotalEok: round(referenceProject.totalEok * capacityFactor, 2),
    escalatedReferenceTotalEok: round(escalatedReferenceTotalEok, 2),
    costItems,
    categoryTotals: {
      S: round(categoryTotals.S, 2),
      P: round(categoryTotals.P, 2),
      C: round(categoryTotals.C, 2),
    },
    siteItems,
    drawingItems,
    projectAddonSubtotal: round(projectAddonSubtotal, 2),
    costSubtotal: round(costSubtotal, 2),
    siteSubtotal: round(siteSubtotal, 2),
    drawingSubtotal: round(drawingSubtotal, 2),
    marginEffect: round(baseTotals.constructionQuote - (costSubtotal + siteSubtotal), 2),
    constructionQuote: round(baseTotals.constructionQuote, 2),
    warranty: round(baseTotals.warranty, 2),
    grandTotal: round(baseTotals.grandTotal, 2),
    referenceDeltaEok: round(referenceDeltaEok, 2),
    referenceDeltaPct: round(referenceDeltaPct, 1),
    riskGrade,
    scenarios: scenarios.map((row) => ({
      label: row.label,
      total: round(row.total, 2),
    })),
    strategies: strategies.map((row) => ({
      label: row.label,
      total: round(row.total, 2),
    })),
    findings: findings.map((item) => ({
      ...item,
      impactEok: round(item.impactEok, 2),
    })),
    basis,
    lcoe,
    layout,
    mapQuery,
  };
}
