"use client";

import { useState } from "react";
import {
  calculateEconomics,
  calculateEconomicsHeatmap,
  calculateEconomicsSensitivity,
  DEFAULT_ECONOMICS_INPUT,
  type EconomicsHeatmapRow,
  type EconomicsInput,
  type SensitivityAxis,
} from "@/lib/economics";
import { formatEok, formatPercent } from "@/lib/estimator";

const copy = {
  input: "경제성 입력",
  title: "경제성 분석 화면",
  desc: "주기기 금액과 운영 가정을 입력해 LCOE, IRR, DSCR을 계산합니다.",
  project: "프로젝트",
  capex: "투자비 가정",
  operations: "운영 가정",
  finance: "차입 구조",
  basis: "계산 기준",
  result: "경제성 결과",
  manualHint: "주기기 금액은 수동 입력이며, 계산은 로컬에서 결정론적으로 수행합니다.",
  projectName: "프로젝트명",
  capacity: "용량 (MW)",
  mainEquipment: "주기기 금액 (억원/MW)",
  epcAdder: "EPC 가산 (%)",
  tariff: "판매단가 (원/kWh)",
  fuel: "연료비 (원/kWh)",
  capacityFactor: "용량계수 (%)",
  degradation: "연간 성능 저하 (%)",
  fixedOm: "고정 O&M (%/년)",
  stackReserve: "스택 적립비 (%/년)",
  stackCycle: "스택 교체 주기 (년)",
  stackReplacement: "스택 교체비 (원/kW)",
  discount: "할인율 (%)",
  life: "사업기간 (년)",
  debtRatio: "차입비율 (%)",
  debtRate: "차입금리 (%)",
  debtTenor: "차입기간 (년)",
  tax: "법인세율 (%)",
  totalCapex: "총 투자비",
  equity: "자기자본",
  debt: "차입금",
  yearOneRevenue: "1차년도 매출",
  yearOneEbitda: "1차년도 EBITDA",
  lcoe: "LCOE",
  projectIrr: "프로젝트 IRR",
  equityIrr: "자기자본 IRR",
  equityPayback: "자기자본 회수",
  minDscr: "최소 DSCR",
  avgDscr: "평균 DSCR",
  bridge: "투자비 구성",
  bridgeDesc: "주기기 금액과 EPC 가산으로 총 투자비를 구성합니다.",
  metrics: "핵심 지표",
  metricsDesc: "수익성과 차입 안정성을 한 화면에서 확인합니다.",
  stackLifecycle: "스택 교체",
  stackLifecycleDesc: "주기별 교체비 반영 시점을 연간 현금흐름과 함께 확인합니다.",
  annual: "연간 현금흐름",
  annualDesc: "발전량, 매출, EBITDA, 프로젝트 CF, DSCR, 자기자본 CF를 연도별로 표시합니다.",
  sensitivity: "민감도 분석",
  sensitivityDesc: "주요 변수의 상하 변동이 경제성에 미치는 영향을 토네이도 차트로 비교합니다.",
  sensitivityShock: "변동폭 (%)",
  heatmap: "판매단가 / 연료비 격자",
  heatmapDesc: "판매단가와 연료비를 동시에 흔든 프로젝트 IRR 격자입니다.",
  sensitivityBase: "기준",
  tornado: "토네이도 차트",
  downside: "하향 시나리오",
  upside: "상향 시나리오",
  noStackEvents: "현재 가정에서는 스택 교체 이벤트가 없습니다.",
  none: "해당 없음",
};

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatMaybePercent(value: number | null) {
  if (value === null) return copy.none;
  return formatPercent(value, 2);
}

function formatMaybeYears(value: number | null) {
  if (value === null) return copy.none;
  return `${value.toFixed(2)}년`;
}

function formatMaybeDscr(value: number | null) {
  if (value === null) return copy.none;
  return value.toFixed(2);
}

function cashflowClass(value: number) {
  return value >= 0 ? "cashflow-positive" : "cashflow-negative";
}

function scenarioMetricClass(current: number | null, base: number | null, inverse = false) {
  if (current === null || base === null) {
    return "";
  }

  const better = inverse ? current < base : current > base;
  if (Math.abs(current - base) < 0.0001) {
    return "";
  }

  return better ? "sensitivity-positive" : "sensitivity-negative";
}

function formatScenarioValue(value: number, unit: string) {
  if (unit === "억원/MW") return `${value.toFixed(2)} ${unit}`;
  if (unit === "%") return `${value.toFixed(1)}${unit}`;
  return `${value.toFixed(0)} ${unit}`;
}

type TornadoRow = {
  label: string;
  baseValueLabel: string;
  downLabel: string;
  upLabel: string;
  downDelta: number | null;
  upDelta: number | null;
  impact: number;
};

function buildTornadoRows(
  axes: SensitivityAxis[],
  baseValue: number | null,
  pickValue: (axis: SensitivityAxis, direction: "down" | "up") => number | null,
  formatDelta: (value: number | null) => string,
): { rows: TornadoRow[]; maxImpact: number } {
  const rows = axes
    .map((axis) => {
      const downValue = pickValue(axis, "down");
      const upValue = pickValue(axis, "up");
      const downDelta =
        baseValue === null || downValue === null ? null : downValue - baseValue;
      const upDelta = baseValue === null || upValue === null ? null : upValue - baseValue;
      const impact = Math.max(Math.abs(downDelta ?? 0), Math.abs(upDelta ?? 0));

      return {
        label: axis.label,
        baseValueLabel: formatScenarioValue(axis.baseValue, axis.unit),
        downLabel: `${axis.downCase.changeLabel} ${formatDelta(downDelta)}`,
        upLabel: `${axis.upCase.changeLabel} ${formatDelta(upDelta)}`,
        downDelta,
        upDelta,
        impact,
      };
    })
    .sort((left, right) => right.impact - left.impact);

  return {
    rows,
    maxImpact: Math.max(...rows.map((row) => row.impact), 0.0001),
  };
}

function tornadoBarClass(delta: number | null, inverse = false) {
  if (delta === null || Math.abs(delta) < 0.0001) {
    return "tornado-bar tornado-bar--neutral";
  }

  const positive = inverse ? delta < 0 : delta > 0;
  return positive ? "tornado-bar tornado-bar--positive" : "tornado-bar tornado-bar--negative";
}

function getHeatmapRange(rows: EconomicsHeatmapRow[]) {
  const values = rows.flatMap((row) =>
    row.cells
      .map((cell) => cell.projectIrrPct)
      .filter((value): value is number => value !== null),
  );

  return {
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
  };
}

function heatmapIntensity(value: number | null, min: number, max: number) {
  if (value === null) return 0.5;
  if (Math.abs(max - min) < 0.0001) return 0.5;
  return (value - min) / (max - min);
}

function heatmapCellStyle(value: number | null, min: number, max: number) {
  const intensity = heatmapIntensity(value, min, max);
  const hue = 12 + intensity * 112;
  const alpha = 0.18 + intensity * 0.48;

  return {
    backgroundColor: `hsla(${hue.toFixed(1)}, 72%, 56%, ${alpha.toFixed(3)})`,
  };
}

function TornadoPanel({
  title,
  baseLabel,
  rows,
  maxImpact,
  inverse = false,
}: {
  title: string;
  baseLabel: string;
  rows: TornadoRow[];
  maxImpact: number;
  inverse?: boolean;
}) {
  return (
    <article className="tornado-panel">
      <div className="tornado-panel__header">
        <div>
          <span className="tornado-panel__label">{copy.tornado}</span>
          <h4>{title}</h4>
        </div>
        <strong>{baseLabel}</strong>
      </div>
      <div className="tornado-panel__legend">
        <span>{copy.downside}</span>
        <span>{copy.sensitivityBase}</span>
        <span>{copy.upside}</span>
      </div>
      <div className="tornado-list">
        {rows.map((row) => (
          <div className="tornado-row" key={`${title}-${row.label}`}>
            <div className="tornado-row__bars">
              <div className="tornado-row__half tornado-row__half--left">
                <div
                  className={tornadoBarClass(row.downDelta, inverse)}
                  style={{ width: `${(Math.abs(row.downDelta ?? 0) / maxImpact) * 100}%` }}
                />
              </div>
              <div className="tornado-row__center">
                <strong>{row.label}</strong>
                <span>{row.baseValueLabel}</span>
              </div>
              <div className="tornado-row__half tornado-row__half--right">
                <div
                  className={tornadoBarClass(row.upDelta, inverse)}
                  style={{ width: `${(Math.abs(row.upDelta ?? 0) / maxImpact) * 100}%` }}
                />
              </div>
            </div>
            <div className="tornado-row__labels">
              <span className={scenarioMetricClass(row.downDelta, 0, inverse)}>{row.downLabel}</span>
              <span />
              <span className={scenarioMetricClass(row.upDelta, 0, inverse)}>{row.upLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function EconomicsStudio() {
  const [input, setInput] = useState<EconomicsInput>(DEFAULT_ECONOMICS_INPUT);
  const [sensitivityShockPct, setSensitivityShockPct] = useState(10);
  const result = calculateEconomics(input);
  const sensitivityAxes = calculateEconomicsSensitivity(input, sensitivityShockPct);
  const heatmapRows = calculateEconomicsHeatmap(
    input,
    sensitivityShockPct,
    sensitivityShockPct,
    5,
  );
  const heatmapRange = getHeatmapRange(heatmapRows);
  const stackReplacementRows = result.rows.filter((row) => row.stackReplacementEok > 0);

  const lcoeTornado = buildTornadoRows(
    sensitivityAxes,
    result.lcoeKrwPerKwh,
    (axis, direction) =>
      direction === "down" ? axis.downCase.result.lcoeKrwPerKwh : axis.upCase.result.lcoeKrwPerKwh,
    (value) => (value === null ? copy.none : `${value >= 0 ? "+" : ""}${value.toFixed(1)} 원/kWh`),
  );

  const projectIrrTornado = buildTornadoRows(
    sensitivityAxes,
    result.projectIrrPct,
    (axis, direction) =>
      direction === "down" ? axis.downCase.result.projectIrrPct : axis.upCase.result.projectIrrPct,
    (value) => (value === null ? copy.none : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%p`),
  );

  const equityIrrTornado = buildTornadoRows(
    sensitivityAxes,
    result.equityIrrPct,
    (axis, direction) =>
      direction === "down" ? axis.downCase.result.equityIrrPct : axis.upCase.result.equityIrrPct,
    (value) => (value === null ? copy.none : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%p`),
  );

  const setField = <K extends keyof EconomicsInput>(key: K, value: EconomicsInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="b2b-layout">
      <aside className="estimate-panel b2b-panel">
        <div className="control-group">
          <div className="control-header">
            <span className="control-label">{copy.input}</span>
            <h2>{copy.title}</h2>
            <p>{copy.desc}</p>
          </div>
          <p className="field-hint">{copy.manualHint}</p>
        </div>

        <div className="control-group">
          <div className="control-header control-header--compact">
            <span className="control-label">{copy.project}</span>
            <h3>프로젝트 기본값</h3>
          </div>
          <div className="field-grid field-grid--two">
            <label className="field field--full">
              <span>{copy.projectName}</span>
              <input
                type="text"
                value={input.projectName}
                onChange={(event) => setField("projectName", event.target.value)}
              />
            </label>
            <label className="field">
              <span>{copy.capacity}</span>
              <input
                type="number"
                min="0.1"
                max="300"
                step="0.1"
                value={input.capacityMw}
                onChange={(event) =>
                  setField("capacityMw", clampNumber(Number(event.target.value), 0.1, 300))
                }
              />
            </label>
          </div>
        </div>

        <div className="control-group">
          <div className="control-header control-header--compact">
            <span className="control-label">{copy.capex}</span>
            <h3>투자비 입력</h3>
          </div>
          <div className="field-grid field-grid--two">
            <label className="field">
              <span>{copy.mainEquipment}</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={input.mainEquipmentCostEokPerMw}
                onChange={(event) =>
                  setField(
                    "mainEquipmentCostEokPerMw",
                    clampNumber(Number(event.target.value), 0, 100),
                  )
                }
              />
            </label>
            <label className="field">
              <span>{copy.epcAdder}</span>
              <input
                type="number"
                min="0"
                max="300"
                step="0.1"
                value={input.epcAdderPct}
                onChange={(event) =>
                  setField("epcAdderPct", clampNumber(Number(event.target.value), 0, 300))
                }
              />
            </label>
          </div>
        </div>

        <div className="control-group">
          <div className="control-header control-header--compact">
            <span className="control-label">{copy.operations}</span>
            <h3>운영 가정</h3>
          </div>
          <div className="field-grid field-grid--two">
            <label className="field">
              <span>{copy.tariff}</span>
              <input
                type="number"
                min="0"
                max="1000"
                step="1"
                value={input.tariffKrwPerKwh}
                onChange={(event) =>
                  setField("tariffKrwPerKwh", clampNumber(Number(event.target.value), 0, 1000))
                }
              />
            </label>
            <label className="field">
              <span>{copy.fuel}</span>
              <input
                type="number"
                min="0"
                max="1000"
                step="1"
                value={input.fuelCostKrwPerKwh}
                onChange={(event) =>
                  setField("fuelCostKrwPerKwh", clampNumber(Number(event.target.value), 0, 1000))
                }
              />
            </label>
            <label className="field">
              <span>{copy.capacityFactor}</span>
              <input
                type="number"
                min="1"
                max="100"
                step="0.1"
                value={input.capacityFactorPct}
                onChange={(event) =>
                  setField("capacityFactorPct", clampNumber(Number(event.target.value), 1, 100))
                }
              />
            </label>
            <label className="field">
              <span>{copy.degradation}</span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={input.degradationRatePct}
                onChange={(event) =>
                  setField("degradationRatePct", clampNumber(Number(event.target.value), 0, 10))
                }
              />
            </label>
            <label className="field">
              <span>{copy.fixedOm}</span>
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={input.fixedOandMRatePct}
                onChange={(event) =>
                  setField("fixedOandMRatePct", clampNumber(Number(event.target.value), 0, 20))
                }
              />
            </label>
            <label className="field">
              <span>{copy.stackReserve}</span>
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={input.stackReserveRatePct}
                onChange={(event) =>
                  setField("stackReserveRatePct", clampNumber(Number(event.target.value), 0, 20))
                }
              />
            </label>
            <label className="field">
              <span>{copy.stackCycle}</span>
              <input
                type="number"
                min="0"
                max="20"
                step="1"
                value={input.stackReplacementCycleYears}
                onChange={(event) =>
                  setField(
                    "stackReplacementCycleYears",
                    clampNumber(Number(event.target.value), 0, 20),
                  )
                }
              />
            </label>
            <label className="field">
              <span>{copy.stackReplacement}</span>
              <input
                type="number"
                min="0"
                max="5000000"
                step="10000"
                value={input.stackReplacementCostKrwPerKw}
                onChange={(event) =>
                  setField(
                    "stackReplacementCostKrwPerKw",
                    clampNumber(Number(event.target.value), 0, 5_000_000),
                  )
                }
              />
            </label>
            <label className="field">
              <span>{copy.discount}</span>
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={input.discountRatePct}
                onChange={(event) =>
                  setField("discountRatePct", clampNumber(Number(event.target.value), 0, 20))
                }
              />
            </label>
            <label className="field">
              <span>{copy.life}</span>
              <input
                type="number"
                min="1"
                max="40"
                step="1"
                value={input.projectLifeYears}
                onChange={(event) =>
                  setField("projectLifeYears", clampNumber(Number(event.target.value), 1, 40))
                }
              />
            </label>
          </div>
        </div>

        <div className="control-group">
          <div className="control-header control-header--compact">
            <span className="control-label">{copy.finance}</span>
            <h3>차입 구조</h3>
          </div>
          <div className="field-grid field-grid--two">
            <label className="field">
              <span>{copy.debtRatio}</span>
              <input
                type="number"
                min="0"
                max="95"
                step="0.1"
                value={input.debtRatioPct}
                onChange={(event) =>
                  setField("debtRatioPct", clampNumber(Number(event.target.value), 0, 95))
                }
              />
            </label>
            <label className="field">
              <span>{copy.debtRate}</span>
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={input.debtInterestRatePct}
                onChange={(event) =>
                  setField("debtInterestRatePct", clampNumber(Number(event.target.value), 0, 20))
                }
              />
            </label>
            <label className="field">
              <span>{copy.debtTenor}</span>
              <input
                type="number"
                min="1"
                max="30"
                step="1"
                value={input.debtTenorYears}
                onChange={(event) =>
                  setField("debtTenorYears", clampNumber(Number(event.target.value), 1, 30))
                }
              />
            </label>
            <label className="field">
              <span>{copy.tax}</span>
              <input
                type="number"
                min="0"
                max="40"
                step="0.1"
                value={input.taxRatePct}
                onChange={(event) =>
                  setField("taxRatePct", clampNumber(Number(event.target.value), 0, 40))
                }
              />
            </label>
          </div>
        </div>
      </aside>

      <section className="estimate-results">
        <div className="result-main">
          <div className="result-main__copy">
            <span className="control-label">{copy.result}</span>
            <h2>{formatEok(result.totalCapexEok)}</h2>
            <p>{input.projectName} 기준 총 투자비와 핵심 경제성 지표를 요약합니다.</p>
          </div>
          <div className="result-main__meta">
            <div>
              <span>{copy.lcoe}</span>
              <strong>{result.lcoeKrwPerKwh.toFixed(1)} 원/kWh</strong>
            </div>
            <div>
              <span>{copy.projectIrr}</span>
              <strong>{formatMaybePercent(result.projectIrrPct)}</strong>
            </div>
            <div>
              <span>{copy.equityIrr}</span>
              <strong>{formatMaybePercent(result.equityIrrPct)}</strong>
            </div>
          </div>
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <span>{copy.totalCapex}</span>
            <strong>{formatEok(result.totalCapexEok)}</strong>
          </article>
          <article className="summary-card">
            <span>{copy.equity}</span>
            <strong>{formatEok(result.equityAmountEok)}</strong>
          </article>
          <article className="summary-card">
            <span>{copy.debt}</span>
            <strong>{formatEok(result.debtAmountEok)}</strong>
          </article>
          <article className="summary-card">
            <span>{copy.yearOneRevenue}</span>
            <strong>{formatEok(result.annualRevenueEokYear1)}</strong>
          </article>
          <article className="summary-card">
            <span>{copy.yearOneEbitda}</span>
            <strong>{formatEok(result.annualEbitdaEokYear1)}</strong>
          </article>
        </div>

        <div className="insight-grid">
          <article className="panel-surface">
            <div className="panel-surface__header">
              <span className="control-label">{copy.bridge}</span>
              <h3>{copy.bridgeDesc}</h3>
            </div>
            <div className="metric-list">
              <div className="metric-row">
                <span>{copy.mainEquipment}</span>
                <strong>{formatEok(result.mainEquipmentCapexEok)}</strong>
              </div>
              <div className="metric-row">
                <span>{copy.epcAdder}</span>
                <strong>{formatEok(result.epcAdderEok)}</strong>
              </div>
              <div className="metric-row">
                <span>{copy.totalCapex}</span>
                <strong>{formatEok(result.totalCapexEok)}</strong>
              </div>
            </div>
          </article>

          <article className="panel-surface">
            <div className="panel-surface__header">
              <span className="control-label">{copy.metrics}</span>
              <h3>{copy.metricsDesc}</h3>
            </div>
            <div className="metric-list">
              <div className="metric-row">
                <span>{copy.lcoe}</span>
                <strong>{result.lcoeKrwPerKwh.toFixed(1)} 원/kWh</strong>
              </div>
              <div className="metric-row">
                <span>{copy.projectIrr}</span>
                <strong>{formatMaybePercent(result.projectIrrPct)}</strong>
              </div>
              <div className="metric-row">
                <span>{copy.equityIrr}</span>
                <strong>{formatMaybePercent(result.equityIrrPct)}</strong>
              </div>
              <div className="metric-row">
                <span>{copy.minDscr}</span>
                <strong>{formatMaybeDscr(result.minDscr)}</strong>
              </div>
              <div className="metric-row">
                <span>{copy.avgDscr}</span>
                <strong>{formatMaybeDscr(result.avgDscr)}</strong>
              </div>
              <div className="metric-row">
                <span>{copy.stackReplacement}</span>
                <strong>{formatEok(result.stackReplacementEventEok)}</strong>
              </div>
              <div className="metric-row">
                <span>{copy.equityPayback}</span>
                <strong>{formatMaybeYears(result.equityPaybackYears)}</strong>
              </div>
            </div>
          </article>

          <article className="panel-surface">
            <div className="panel-surface__header">
              <span className="control-label">{copy.stackLifecycle}</span>
              <h3>{copy.stackLifecycleDesc}</h3>
            </div>
            {stackReplacementRows.length === 0 ? (
              <p className="empty-state">{copy.noStackEvents}</p>
            ) : (
              <div className="metric-list">
                {stackReplacementRows.map((row) => (
                  <div className="metric-row" key={`stack-${row.year}`}>
                    <span>{row.year}차년도</span>
                    <strong>{formatEok(row.stackReplacementEok)}</strong>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>

        <article className="panel-surface">
          <div className="panel-surface__header">
            <span className="control-label">{copy.sensitivity}</span>
            <h3>{copy.sensitivityDesc}</h3>
          </div>
          <div className="field-grid field-grid--two">
            <label className="field">
              <span>{copy.sensitivityShock}</span>
              <input
                type="number"
                min="1"
                max="30"
                step="1"
                value={sensitivityShockPct}
                onChange={(event) =>
                  setSensitivityShockPct(clampNumber(Number(event.target.value), 1, 30))
                }
              />
            </label>
          </div>
          <div className="tornado-grid">
            <TornadoPanel
              title={copy.equityIrr}
              baseLabel={formatMaybePercent(result.equityIrrPct)}
              rows={equityIrrTornado.rows}
              maxImpact={equityIrrTornado.maxImpact}
            />
            <TornadoPanel
              title={copy.projectIrr}
              baseLabel={formatMaybePercent(result.projectIrrPct)}
              rows={projectIrrTornado.rows}
              maxImpact={projectIrrTornado.maxImpact}
            />
            <TornadoPanel
              title={copy.lcoe}
              baseLabel={`${result.lcoeKrwPerKwh.toFixed(1)} 원/kWh`}
              rows={lcoeTornado.rows}
              maxImpact={lcoeTornado.maxImpact}
              inverse
            />
          </div>
        </article>

        <article className="panel-surface">
          <div className="panel-surface__header">
            <span className="control-label">{copy.heatmap}</span>
            <h3>{copy.heatmapDesc}</h3>
          </div>
          <div className="heatmap-wrap">
            <div
              className="heatmap-grid"
              style={{
                gridTemplateColumns: `120px repeat(${heatmapRows[0]?.cells.length ?? 0}, minmax(92px, 1fr))`,
              }}
            >
              <div className="heatmap-corner">연료비 \\ 판매단가</div>
              {heatmapRows[0]?.cells.map((cell) => (
                <div className="heatmap-axis heatmap-axis--top" key={`tariff-${cell.tariffKrwPerKwh}`}>
                  {cell.tariffKrwPerKwh.toFixed(0)}
                </div>
              ))}
              {heatmapRows.map((row) => (
                <div
                  className="heatmap-row-group"
                  key={`row-${row.fuelCostKrwPerKwh}`}
                  style={{ display: "contents" }}
                >
                  <div className="heatmap-axis heatmap-axis--left">
                    {row.fuelCostKrwPerKwh.toFixed(0)}
                  </div>
                  {row.cells.map((cell) => (
                    <div
                      className="heatmap-cell"
                      key={`cell-${row.fuelCostKrwPerKwh}-${cell.tariffKrwPerKwh}`}
                      style={heatmapCellStyle(
                        cell.projectIrrPct,
                        heatmapRange.min,
                        heatmapRange.max,
                      )}
                    >
                      <strong>{formatMaybePercent(cell.projectIrrPct)}</strong>
                      <small>{cell.lcoeKrwPerKwh.toFixed(1)} 원/kWh</small>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel-surface">
          <div className="panel-surface__header">
            <span className="control-label">{copy.annual}</span>
            <h3>{copy.annualDesc}</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>연도</th>
                  <th>발전량</th>
                  <th>매출</th>
                  <th>운영비</th>
                  <th>스택 교체</th>
                  <th>EBITDA</th>
                  <th>프로젝트 CF</th>
                  <th>차입 상환</th>
                  <th>DSCR</th>
                  <th>자기자본 CF</th>
                  <th>누적 자기자본 CF</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td>{row.generationMWh.toLocaleString("en-US")} MWh</td>
                    <td className={cashflowClass(row.revenueEok)}>{formatEok(row.revenueEok)}</td>
                    <td>{formatEok(row.opexEok)}</td>
                    <td>{formatEok(row.stackReplacementEok)}</td>
                    <td className={cashflowClass(row.ebitdaEok)}>{formatEok(row.ebitdaEok)}</td>
                    <td className={cashflowClass(row.projectCashFlowEok)}>
                      {formatEok(row.projectCashFlowEok)}
                    </td>
                    <td>{formatEok(row.debtServiceEok)}</td>
                    <td>{formatMaybeDscr(row.dscr)}</td>
                    <td className={cashflowClass(row.equityCashFlowEok)}>
                      {formatEok(row.equityCashFlowEok)}
                    </td>
                    <td className={cashflowClass(row.cumulativeEquityCashFlowEok)}>
                      {formatEok(row.cumulativeEquityCashFlowEok)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
