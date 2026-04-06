/**
 * discipline-estimator.ts
 *
 * 공종별 (전기/계장, 토목/건축, 기계/배관) 금액 산출 엔진
 *
 * 산출 방식:
 * 1. 용량 비례 환산 (스케일링 지수 적용)
 * 2. 물가상승 반영 (연도 차이 × 물가상승률)
 * 3. 현장 가산 계수 반영
 */

// ── 타입 ──────────────────────────────────────────────────────────

export type DisciplineId = "electrical" | "civil" | "mechanical";

export interface DisciplineItem {
  id: DisciplineId;
  label: string;
  labelSub: string;
  quantityLabel: string;   // 물량 단위 레이블
  quantityUnit: string;    // 물량 단위 (㎡, m, 식 등)
  scalingExp: number;      // 스케일링 지수 (0.6~1.0)
  color: string;           // UI 강조색
}

/** 공종 정의 */
export const DISCIPLINES: DisciplineItem[] = [
  {
    id: "electrical",
    label: "전기 / 계장",
    labelSub: "Electrical & Instrumentation",
    quantityLabel: "케이블 트레이 길이",
    quantityUnit: "m",
    scalingExp: 0.75,
    color: "#4f7fff",
  },
  {
    id: "civil",
    label: "토목 / 건축",
    labelSub: "Civil & Architecture",
    quantityLabel: "구조물 연면적",
    quantityUnit: "㎡",
    scalingExp: 0.65,
    color: "#12b886",
  },
  {
    id: "mechanical",
    label: "기계 / 배관",
    labelSub: "Mechanical & Piping",
    quantityLabel: "배관 연장",
    quantityUnit: "m",
    scalingExp: 0.80,
    color: "#f59f00",
  },
];

/** 공종별 기준 입력값 */
export interface DisciplineRefInput {
  /** 기준 총 공사 금액 (억원) */
  refAmountEok: number;
  /** 기준 프로젝트 용량 (MW) */
  refCapacityMw: number;
  /** 기준 연도 */
  refYear: number;
  /** 기준 물량 (옵션) */
  refQuantity: number;
  /** 기준 물량 사용 여부 */
  useQuantity: boolean;
}

/** 신규 프로젝트 조건 */
export interface DisciplineTargetInput {
  /** 목표 용량 (MW) */
  targetCapacityMw: number;
  /** 목표 연도 */
  targetYear: number;
  /** 물가상승률 (%, 연간) */
  inflationPct: number;
  /** 목표 물량 (useQuantity=true 일 때) */
  targetQuantity: number;
  /** 현장 가산 계수 (1.0 = 기본) */
  siteFactor: number;
}

/** 공종별 전체 입력 */
export interface DisciplineInput {
  electrical: DisciplineRefInput & DisciplineTargetInput;
  civil: DisciplineRefInput & DisciplineTargetInput;
  mechanical: DisciplineRefInput & DisciplineTargetInput;
}

/** 공종별 산출 결과 */
export interface DisciplineResult {
  id: DisciplineId;
  label: string;
  /** 용량 비례 환산 금액 (억원) */
  capacityScaledEok: number;
  /** 물량 비례 환산 금액 (억원, useQuantity=true 일 때만 유효) */
  quantityScaledEok: number;
  /** 실제 사용된 환산 금액 (억원) */
  scaledEok: number;
  /** 스케일 팩터 */
  scaleFactor: number;
  /** 물가상승 반영 금액 (억원) */
  inflatedEok: number;
  /** 현장 가산 반영 최종 금액 (억원) */
  finalEok: number;
  /** 연도 차이 */
  yearDiff: number;
  /** 물가상승 배율 */
  inflationMultiplier: number;
}

/** 전체 공종 합산 */
export interface DisciplineSummary {
  electrical: DisciplineResult;
  civil: DisciplineResult;
  mechanical: DisciplineResult;
  totalEok: number;
}

// ── 기본값 ────────────────────────────────────────────────────────

export function makeDisciplineRefInput(): DisciplineRefInput {
  return {
    refAmountEok: 0,
    refCapacityMw: 9.9,
    refYear: 2023,
    refQuantity: 0,
    useQuantity: false,
  };
}

export function makeDisciplineTargetInput(): DisciplineTargetInput {
  return {
    targetCapacityMw: 10,
    targetYear: 2025,
    inflationPct: 3.5,
    targetQuantity: 0,
    siteFactor: 1.0,
  };
}

export const DEFAULT_DISCIPLINE_INPUT: DisciplineInput = {
  electrical: { ...makeDisciplineRefInput(), ...makeDisciplineTargetInput() },
  civil:      { ...makeDisciplineRefInput(), ...makeDisciplineTargetInput() },
  mechanical: { ...makeDisciplineRefInput(), ...makeDisciplineTargetInput() },
};

// ── 계산 ──────────────────────────────────────────────────────────

/**
 * 단일 공종 금액 산출
 */
export function calculateDiscipline(
  disciplineItem: DisciplineItem,
  input: DisciplineRefInput & DisciplineTargetInput,
): DisciplineResult {
  const {
    refAmountEok,
    refCapacityMw,
    refYear,
    refQuantity,
    useQuantity,
    targetCapacityMw,
    targetYear,
    inflationPct,
    targetQuantity,
    siteFactor,
  } = input;

  const safeRef = Math.max(refAmountEok, 0);
  const safeRefCap = Math.max(refCapacityMw, 0.01);
  const safeTargetCap = Math.max(targetCapacityMw, 0.01);

  // ① 용량 비례 환산
  const capRatio = safeTargetCap / safeRefCap;
  const scaleFactor = Math.pow(capRatio, disciplineItem.scalingExp);
  const capacityScaledEok = safeRef * scaleFactor;

  // ② 물량 비례 환산 (선택)
  const safeRefQty = Math.max(refQuantity, 0.01);
  const safeTargetQty = Math.max(targetQuantity, 0.01);
  const quantityScaledEok = useQuantity && refQuantity > 0
    ? safeRef * (safeTargetQty / safeRefQty)
    : capacityScaledEok;

  const scaledEok = useQuantity && refQuantity > 0
    ? quantityScaledEok
    : capacityScaledEok;

  // ③ 물가상승 반영
  const yearDiff = Math.max(targetYear - refYear, 0);
  const inflationMultiplier = Math.pow(1 + inflationPct / 100, yearDiff);
  const inflatedEok = scaledEok * inflationMultiplier;

  // ④ 현장 가산
  const safeSiteFactor = Math.max(siteFactor, 1.0);
  const finalEok = inflatedEok * safeSiteFactor;

  return {
    id: disciplineItem.id,
    label: disciplineItem.label,
    capacityScaledEok,
    quantityScaledEok,
    scaledEok,
    scaleFactor,
    inflatedEok,
    finalEok,
    yearDiff,
    inflationMultiplier,
  };
}

/**
 * 전체 공종 합산 산출
 */
export function calculateAllDisciplines(
  input: DisciplineInput,
): DisciplineSummary {
  const disciplineMap = Object.fromEntries(
    DISCIPLINES.map((d) => [d.id, d])
  ) as Record<DisciplineId, DisciplineItem>;

  const electrical = calculateDiscipline(disciplineMap.electrical, input.electrical);
  const civil      = calculateDiscipline(disciplineMap.civil,      input.civil);
  const mechanical = calculateDiscipline(disciplineMap.mechanical,  input.mechanical);

  return {
    electrical,
    civil,
    mechanical,
    totalEok: electrical.finalEok + civil.finalEok + mechanical.finalEok,
  };
}

// ── 포맷 유틸 ─────────────────────────────────────────────────────

export function fmtEok(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "—";
  return `${value.toFixed(2)}억`;
}

export function fmtFactor(value: number): string {
  return `×${value.toFixed(3)}`;
}

export function fmtPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
