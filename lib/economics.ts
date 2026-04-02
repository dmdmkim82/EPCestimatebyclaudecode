export type EconomicsInput = {
  projectName: string;
  capacityMw: number;
  mainEquipmentCostEokPerMw: number;
  epcAdderPct: number;
  tariffKrwPerKwh: number;
  fuelCostKrwPerKwh: number;
  capacityFactorPct: number;
  degradationRatePct: number;
  fixedOandMRatePct: number;
  stackReserveRatePct: number;
  stackReplacementCycleYears: number;
  stackReplacementCostKrwPerKw: number;
  discountRatePct: number;
  projectLifeYears: number;
  debtRatioPct: number;
  debtInterestRatePct: number;
  debtTenorYears: number;
  taxRatePct: number;
};

export type EconomicsYearRow = {
  year: number;
  generationMWh: number;
  revenueEok: number;
  opexEok: number;
  stackReplacementEok: number;
  ebitdaEok: number;
  projectCashFlowEok: number;
  debtServiceEok: number;
  dscr: number | null;
  equityCashFlowEok: number;
  cumulativeProjectCashFlowEok: number;
  cumulativeEquityCashFlowEok: number;
};

export type EconomicsResult = {
  totalCapexEok: number;
  mainEquipmentCapexEok: number;
  epcAdderEok: number;
  debtAmountEok: number;
  equityAmountEok: number;
  annualGenerationMWhYear1: number;
  annualRevenueEokYear1: number;
  annualOpexEokYear1: number;
  stackReplacementEventEok: number;
  annualEbitdaEokYear1: number;
  lcoeKrwPerKwh: number;
  projectIrrPct: number | null;
  equityIrrPct: number | null;
  projectPaybackYears: number | null;
  equityPaybackYears: number | null;
  minDscr: number | null;
  avgDscr: number | null;
  annualDebtServiceEok: number;
  rows: EconomicsYearRow[];
};

export type EconomicsHeatmapCell = {
  tariffKrwPerKwh: number;
  fuelCostKrwPerKwh: number;
  projectIrrPct: number | null;
  lcoeKrwPerKwh: number;
};

export type EconomicsHeatmapRow = {
  fuelCostKrwPerKwh: number;
  cells: EconomicsHeatmapCell[];
};

export type SensitivityTarget =
  | "mainEquipmentCostEokPerMw"
  | "tariffKrwPerKwh"
  | "fuelCostKrwPerKwh"
  | "capacityFactorPct";

export type SensitivityCase = {
  changeLabel: string;
  adjustedValue: number;
  result: EconomicsResult;
};

export type SensitivityAxis = {
  key: SensitivityTarget;
  label: string;
  unit: string;
  baseValue: number;
  downCase: SensitivityCase;
  upCase: SensitivityCase;
  lcoeSwingPct: number;
  equityIrrSwingPct: number | null;
  projectIrrSwingPct: number | null;
};

export type EconomicsScenario = {
  id: "worst" | "base" | "best";
  title: string;
  summary: string;
  input: EconomicsInput;
  result: EconomicsResult;
  adjustments: string[];
};

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

export const DEFAULT_ECONOMICS_INPUT: EconomicsInput = {
  projectName: "SOFC 경제성 분석",
  capacityMw: 10,
  mainEquipmentCostEokPerMw: 7.2,
  epcAdderPct: 72,
  tariffKrwPerKwh: 255,
  fuelCostKrwPerKwh: 110,
  capacityFactorPct: 90,
  degradationRatePct: 0.4,
  fixedOandMRatePct: 2.5,
  stackReserveRatePct: 1.5,
  stackReplacementCycleYears: 5,
  stackReplacementCostKrwPerKw: 0,
  discountRatePct: 6,
  projectLifeYears: 20,
  debtRatioPct: 65,
  debtInterestRatePct: 5.2,
  debtTenorYears: 15,
  taxRatePct: 22,
};

const SENSITIVITY_META: Record<
  SensitivityTarget,
  { label: string; unit: string; min: number; max: number }
> = {
  mainEquipmentCostEokPerMw: {
    label: "\uC8FC\uAE30\uAE30 \uAE08\uC561",
    unit: "\uC5B5\uC6D0/MW",
    min: 0,
    max: 100,
  },
  tariffKrwPerKwh: {
    label: "\uD310\uB9E4\uB2E8\uAC00",
    unit: "\uC6D0/kWh",
    min: 0,
    max: 1000,
  },
  fuelCostKrwPerKwh: {
    label: "\uC5F0\uB8CC\uBE44",
    unit: "\uC6D0/kWh",
    min: 0,
    max: 1000,
  },
  capacityFactorPct: {
    label: "\uC6A9\uB7C9\uACC4\uC218",
    unit: "%",
    min: 1,
    max: 100,
  },
};

function npv(rate: number, cashFlows: number[]) {
  return cashFlows.reduce((sum, cashFlow, index) => {
    return sum + cashFlow / Math.pow(1 + rate, index);
  }, 0);
}

function calculateIrr(cashFlows: number[]) {
  if (!cashFlows.some((value) => value < 0) || !cashFlows.some((value) => value > 0)) {
    return null;
  }

  let low = -0.99;
  let high = 1;
  let lowNpv = npv(low, cashFlows);
  let highNpv = npv(high, cashFlows);

  while (lowNpv * highNpv > 0 && high < 100) {
    high *= 2;
    highNpv = npv(high, cashFlows);
  }

  if (lowNpv * highNpv > 0) {
    return null;
  }

  for (let iteration = 0; iteration < 120; iteration += 1) {
    const mid = (low + high) / 2;
    const midNpv = npv(mid, cashFlows);

    if (Math.abs(midNpv) < 0.000001) {
      return mid;
    }

    if (lowNpv * midNpv <= 0) {
      high = mid;
      highNpv = midNpv;
    } else {
      low = mid;
      lowNpv = midNpv;
    }
  }

  return (low + high) / 2;
}

function calculateAnnuityPayment(principal: number, annualRate: number, tenorYears: number) {
  if (principal <= 0 || tenorYears <= 0) {
    return 0;
  }

  if (annualRate === 0) {
    return principal / tenorYears;
  }

  const factor = Math.pow(1 + annualRate, tenorYears);
  return (principal * annualRate * factor) / (factor - 1);
}

function calculatePaybackYears(cashFlows: number[]) {
  let cumulative = cashFlows[0];

  for (let index = 1; index < cashFlows.length; index += 1) {
    const previous = cumulative;
    cumulative += cashFlows[index];

    if (cumulative >= 0) {
      const needed = Math.abs(previous);
      const currentFlow = cashFlows[index];
      const fraction = currentFlow === 0 ? 0 : needed / currentFlow;
      return index - 1 + fraction;
    }
  }

  return null;
}

export function calculateEconomics(input: EconomicsInput): EconomicsResult {
  const mainEquipmentCapexEok = input.capacityMw * input.mainEquipmentCostEokPerMw;
  const epcAdderEok = mainEquipmentCapexEok * (input.epcAdderPct / 100);
  const totalCapexEok = mainEquipmentCapexEok + epcAdderEok;
  const debtAmountEok = totalCapexEok * (input.debtRatioPct / 100);
  const equityAmountEok = totalCapexEok - debtAmountEok;
  const stackReplacementEventEok =
    (input.capacityMw * 1000 * input.stackReplacementCostKrwPerKw) / 100_000_000;
  const annualDebtServiceEok = calculateAnnuityPayment(
    debtAmountEok,
    input.debtInterestRatePct / 100,
    input.debtTenorYears,
  );

  const projectCashFlows = [-totalCapexEok];
  const equityCashFlows = [-equityAmountEok];
  const rows: EconomicsYearRow[] = [];
  const discountRate = input.discountRatePct / 100;
  const depreciationEok = totalCapexEok / Math.max(1, input.projectLifeYears);
  const fixedCostRate =
    (input.fixedOandMRatePct + input.stackReserveRatePct) / 100;

  let discountedCostsKrw = totalCapexEok * 100_000_000;
  let discountedGenerationKwh = 0;
  let remainingDebtEok = debtAmountEok;
  let cumulativeProjectCashFlowEok = -totalCapexEok;
  let cumulativeEquityCashFlowEok = -equityAmountEok;

  for (let year = 1; year <= input.projectLifeYears; year += 1) {
    const degradationFactor = Math.pow(1 - input.degradationRatePct / 100, year - 1);
    const generationMWh =
      input.capacityMw * 8760 * (input.capacityFactorPct / 100) * degradationFactor;
    const generationKwh = generationMWh * 1000;
    const revenueEok = (generationKwh * input.tariffKrwPerKwh) / 100_000_000;
    const fuelCostEok = (generationKwh * input.fuelCostKrwPerKwh) / 100_000_000;
    const fixedCostEok = totalCapexEok * fixedCostRate;
    const stackReplacementEok =
      input.stackReplacementCycleYears > 0 &&
      input.stackReplacementCostKrwPerKw > 0 &&
      year % input.stackReplacementCycleYears === 0
        ? stackReplacementEventEok
        : 0;
    const opexEok = fuelCostEok + fixedCostEok + stackReplacementEok;
    const ebitdaEok = revenueEok - opexEok;
    const taxableIncomeEok = Math.max(0, ebitdaEok - depreciationEok);
    const taxEok = taxableIncomeEok * (input.taxRatePct / 100);
    const projectCashFlowEok = ebitdaEok - taxEok;

    let debtServiceEok = 0;
    let dscr: number | null = null;

    if (year <= input.debtTenorYears && remainingDebtEok > 0) {
      const interestEok = remainingDebtEok * (input.debtInterestRatePct / 100);
      const principalEok = Math.min(
        remainingDebtEok,
        Math.max(0, annualDebtServiceEok - interestEok),
      );

      debtServiceEok = interestEok + principalEok;
      remainingDebtEok -= principalEok;
      dscr = debtServiceEok > 0 ? projectCashFlowEok / debtServiceEok : null;
    }

    const equityCashFlowEok = projectCashFlowEok - debtServiceEok;

    cumulativeProjectCashFlowEok += projectCashFlowEok;
    cumulativeEquityCashFlowEok += equityCashFlowEok;

    projectCashFlows.push(projectCashFlowEok);
    equityCashFlows.push(equityCashFlowEok);

    discountedCostsKrw += (opexEok * 100_000_000) / Math.pow(1 + discountRate, year);
    discountedGenerationKwh += generationKwh / Math.pow(1 + discountRate, year);

    rows.push({
      year,
      generationMWh: round(generationMWh, 0),
      revenueEok: round(revenueEok, 2),
      opexEok: round(opexEok, 2),
      stackReplacementEok: round(stackReplacementEok, 2),
      ebitdaEok: round(ebitdaEok, 2),
      projectCashFlowEok: round(projectCashFlowEok, 2),
      debtServiceEok: round(debtServiceEok, 2),
      dscr: dscr === null ? null : round(dscr, 2),
      equityCashFlowEok: round(equityCashFlowEok, 2),
      cumulativeProjectCashFlowEok: round(cumulativeProjectCashFlowEok, 2),
      cumulativeEquityCashFlowEok: round(cumulativeEquityCashFlowEok, 2),
    });
  }

  const dscrValues = rows
    .map((row) => row.dscr)
    .filter((value): value is number => value !== null);

  return {
    totalCapexEok: round(totalCapexEok, 2),
    mainEquipmentCapexEok: round(mainEquipmentCapexEok, 2),
    epcAdderEok: round(epcAdderEok, 2),
    debtAmountEok: round(debtAmountEok, 2),
    equityAmountEok: round(equityAmountEok, 2),
    annualGenerationMWhYear1: rows[0]?.generationMWh ?? 0,
    annualRevenueEokYear1: rows[0]?.revenueEok ?? 0,
    annualOpexEokYear1: rows[0]?.opexEok ?? 0,
    stackReplacementEventEok: round(stackReplacementEventEok, 2),
    annualEbitdaEokYear1: rows[0]?.ebitdaEok ?? 0,
    lcoeKrwPerKwh: round(discountedCostsKrw / Math.max(1, discountedGenerationKwh), 1),
    projectIrrPct: (() => {
      const value = calculateIrr(projectCashFlows);
      return value === null ? null : round(value * 100, 2);
    })(),
    equityIrrPct: (() => {
      const value = calculateIrr(equityCashFlows);
      return value === null ? null : round(value * 100, 2);
    })(),
    projectPaybackYears: (() => {
      const value = calculatePaybackYears(projectCashFlows);
      return value === null ? null : round(value, 2);
    })(),
    equityPaybackYears: (() => {
      const value = calculatePaybackYears(equityCashFlows);
      return value === null ? null : round(value, 2);
    })(),
    minDscr: dscrValues.length > 0 ? round(Math.min(...dscrValues), 2) : null,
    avgDscr:
      dscrValues.length > 0
        ? round(dscrValues.reduce((sum, value) => sum + value, 0) / dscrValues.length, 2)
        : null,
    annualDebtServiceEok: round(annualDebtServiceEok, 2),
    rows,
  };
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundScenarioValue(value: number, key: SensitivityTarget) {
  if (key === "mainEquipmentCostEokPerMw" || key === "capacityFactorPct") {
    return round(value, 2);
  }

  return round(value, 0);
}

function getIrrSwing(upValue: number | null, downValue: number | null) {
  if (upValue === null || downValue === null) {
    return null;
  }

  return round(upValue - downValue, 2);
}

export function calculateEconomicsSensitivity(
  input: EconomicsInput,
  shockPct: number,
): SensitivityAxis[] {
  const ratio = shockPct / 100;

  return (Object.keys(SENSITIVITY_META) as SensitivityTarget[]).map((key) => {
    const meta = SENSITIVITY_META[key];
    const baseValue = input[key];
    const downValue = clampValue(baseValue * (1 - ratio), meta.min, meta.max);
    const upValue = clampValue(baseValue * (1 + ratio), meta.min, meta.max);
    const downInput = { ...input, [key]: roundScenarioValue(downValue, key) };
    const upInput = { ...input, [key]: roundScenarioValue(upValue, key) };
    const downResult = calculateEconomics(downInput);
    const upResult = calculateEconomics(upInput);

    return {
      key,
      label: meta.label,
      unit: meta.unit,
      baseValue: roundScenarioValue(baseValue, key),
      downCase: {
        changeLabel: `-${shockPct}%`,
        adjustedValue: roundScenarioValue(downValue, key),
        result: downResult,
      },
      upCase: {
        changeLabel: `+${shockPct}%`,
        adjustedValue: roundScenarioValue(upValue, key),
        result: upResult,
      },
      lcoeSwingPct: round(
        ((upResult.lcoeKrwPerKwh - downResult.lcoeKrwPerKwh) /
          Math.max(0.01, downResult.lcoeKrwPerKwh)) *
          100,
        2,
      ),
      equityIrrSwingPct: getIrrSwing(upResult.equityIrrPct, downResult.equityIrrPct),
      projectIrrSwingPct: getIrrSwing(upResult.projectIrrPct, downResult.projectIrrPct),
    };
  });
}

export function calculateEconomicsHeatmap(
  input: EconomicsInput,
  tariffShockPct: number,
  fuelShockPct: number,
  steps = 5,
): EconomicsHeatmapRow[] {
  const size = clampValue(Math.round(steps), 3, 9);
  const offsets = Array.from({ length: size }, (_, index) =>
    size === 1 ? 0 : (index / (size - 1) - 0.5) * 2,
  );
  const tariffs = offsets.map((offset) =>
    round(
      clampValue(input.tariffKrwPerKwh * (1 + (tariffShockPct / 100) * offset), 0, 1000),
      0,
    ),
  );
  const fuels = [...offsets]
    .reverse()
    .map((offset) =>
      round(
        clampValue(input.fuelCostKrwPerKwh * (1 + (fuelShockPct / 100) * offset), 0, 1000),
        0,
      ),
    );

  return fuels.map((fuelCostKrwPerKwh) => ({
    fuelCostKrwPerKwh,
    cells: tariffs.map((tariffKrwPerKwh) => {
      const result = calculateEconomics({
        ...input,
        tariffKrwPerKwh,
        fuelCostKrwPerKwh,
      });

      return {
        tariffKrwPerKwh,
        fuelCostKrwPerKwh,
        projectIrrPct: result.projectIrrPct,
        lcoeKrwPerKwh: result.lcoeKrwPerKwh,
      };
    }),
  }));
}

function scalePercentField(value: number, shockPct: number, direction: "up" | "down") {
  const ratio = shockPct / 100;
  return direction === "up" ? value * (1 + ratio) : value * (1 - ratio);
}

export function calculateEconomicsScenarioSet(
  input: EconomicsInput,
  shockPct: number,
): EconomicsScenario[] {
  const bestInput: EconomicsInput = {
    ...input,
    mainEquipmentCostEokPerMw: round(
      clampValue(scalePercentField(input.mainEquipmentCostEokPerMw, shockPct, "down"), 0, 100),
      2,
    ),
    tariffKrwPerKwh: round(
      clampValue(scalePercentField(input.tariffKrwPerKwh, shockPct, "up"), 0, 1000),
      0,
    ),
    fuelCostKrwPerKwh: round(
      clampValue(scalePercentField(input.fuelCostKrwPerKwh, shockPct, "down"), 0, 1000),
      0,
    ),
    capacityFactorPct: round(
      clampValue(scalePercentField(input.capacityFactorPct, shockPct, "up"), 1, 100),
      2,
    ),
    debtInterestRatePct: round(
      clampValue(scalePercentField(input.debtInterestRatePct, shockPct, "down"), 0, 20),
      2,
    ),
  };

  const worstInput: EconomicsInput = {
    ...input,
    mainEquipmentCostEokPerMw: round(
      clampValue(scalePercentField(input.mainEquipmentCostEokPerMw, shockPct, "up"), 0, 100),
      2,
    ),
    tariffKrwPerKwh: round(
      clampValue(scalePercentField(input.tariffKrwPerKwh, shockPct, "down"), 0, 1000),
      0,
    ),
    fuelCostKrwPerKwh: round(
      clampValue(scalePercentField(input.fuelCostKrwPerKwh, shockPct, "up"), 0, 1000),
      0,
    ),
    capacityFactorPct: round(
      clampValue(scalePercentField(input.capacityFactorPct, shockPct, "down"), 1, 100),
      2,
    ),
    debtInterestRatePct: round(
      clampValue(scalePercentField(input.debtInterestRatePct, shockPct, "up"), 0, 20),
      2,
    ),
  };

  return [
    {
      id: "worst",
      title: "보수",
      summary: "투자비 상승, 판매단가 하락, 연료비 상승, 이용률 하락, 금리 상승",
      input: worstInput,
      result: calculateEconomics(worstInput),
      adjustments: [
        `주기기 금액 +${shockPct}%`,
        `판매단가 -${shockPct}%`,
        `연료비 +${shockPct}%`,
        `용량계수 -${shockPct}%`,
        `차입금리 +${shockPct}%`,
      ],
    },
    {
      id: "base",
      title: "기준",
      summary: "현재 입력 가정",
      input,
      result: calculateEconomics(input),
      adjustments: ["현재 주기기 금액, 판매단가, 연료비, 이용률, 차입 가정을 적용"],
    },
    {
      id: "best",
      title: "낙관",
      summary: "투자비 하락, 판매단가 상승, 연료비 하락, 이용률 상승, 금리 하락",
      input: bestInput,
      result: calculateEconomics(bestInput),
      adjustments: [
        `주기기 금액 -${shockPct}%`,
        `판매단가 +${shockPct}%`,
        `연료비 -${shockPct}%`,
        `용량계수 +${shockPct}%`,
        `차입금리 -${shockPct}%`,
      ],
    },
  ];
}
