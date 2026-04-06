"use client";

import { useState } from "react";
import {
  DISCIPLINES,
  DEFAULT_DISCIPLINE_INPUT,
  calculateAllDisciplines,
  calculateDiscipline,
  fmtEok,
  fmtFactor,
  type DisciplineId,
  type DisciplineInput,
  type DisciplineItem,
  type DisciplineRefInput,
  type DisciplineTargetInput,
} from "@/lib/discipline-estimator";

// ── 숫자 입력 필드 ─────────────────────────────────────────────────
function NumField({
  label, value, unit, min = 0, max = 99999, step = 0.1, onChange,
}: {
  label: string; value: number; unit?: string;
  min?: number; max?: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="dp-field">
      <label className="dp-field__label">{label}</label>
      <div className="dp-field__row">
        <input
          className="dp-field__input"
          max={max} min={min} step={step} type="number" value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
        />
        {unit && <span className="dp-field__unit">{unit}</span>}
      </div>
    </div>
  );
}

// ── 결과 행 ────────────────────────────────────────────────────────
function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`dp-result-row${highlight ? " dp-result-row--highlight" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// ── 단일 공종 카드 ─────────────────────────────────────────────────
function DisciplineCard({
  disc,
  input,
  onChange,
}: {
  disc: DisciplineItem;
  input: DisciplineRefInput & DisciplineTargetInput;
  onChange: (patch: Partial<DisciplineRefInput & DisciplineTargetInput>) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const result = calculateDiscipline(disc, input);
  const hasRef = input.refAmountEok > 0 && input.refCapacityMw > 0;

  return (
    <div className="dp-card">
      <button
        className="dp-card__header"
        type="button"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="dp-card__title-group">
          <span className="dp-card__dot" style={{ background: disc.color }} />
          <div>
            <span className="dp-card__title">{disc.label}</span>
            <span className="dp-card__sub">{disc.labelSub}</span>
          </div>
        </div>
        <div className="dp-card__header-right">
          {hasRef && (
            <span className="dp-card__total" style={{ color: disc.color }}>
              {fmtEok(result.finalEok)}
            </span>
          )}
          <span className="dp-card__chevron">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="dp-card__body">
          {/* 기준 데이터 */}
          <div className="dp-section">
            <span className="dp-section__label">기준 데이터</span>
            <div className="dp-grid">
              <NumField
                label="기준 공사 금액" max={9999} min={0} step={0.1} unit="억원"
                value={input.refAmountEok}
                onChange={(v) => onChange({ refAmountEok: v })}
              />
              <NumField
                label="기준 용량" max={500} min={0.1} step={0.1} unit="MW"
                value={input.refCapacityMw}
                onChange={(v) => onChange({ refCapacityMw: v })}
              />
              <NumField
                label="기준 연도" max={2040} min={2010} step={1} unit="년"
                value={input.refYear}
                onChange={(v) => onChange({ refYear: v })}
              />
            </div>

            <label className="dp-toggle">
              <input
                checked={input.useQuantity} type="checkbox"
                onChange={(e) => onChange({ useQuantity: e.target.checked })}
              />
              <span>물량 기반 환산 사용 ({disc.quantityLabel} · {disc.quantityUnit})</span>
            </label>

            {input.useQuantity && (
              <div className="dp-grid">
                <NumField
                  label={`기준 ${disc.quantityLabel}`} max={999999} min={0} step={1} unit={disc.quantityUnit}
                  value={input.refQuantity}
                  onChange={(v) => onChange({ refQuantity: v })}
                />
                <NumField
                  label={`목표 ${disc.quantityLabel}`} max={999999} min={0} step={1} unit={disc.quantityUnit}
                  value={input.targetQuantity}
                  onChange={(v) => onChange({ targetQuantity: v })}
                />
              </div>
            )}
          </div>

          {/* 신규 프로젝트 조건 */}
          <div className="dp-section">
            <span className="dp-section__label">신규 프로젝트 조건</span>
            <div className="dp-grid">
              <NumField
                label="목표 용량" max={500} min={0.1} step={0.1} unit="MW"
                value={input.targetCapacityMw}
                onChange={(v) => onChange({ targetCapacityMw: v })}
              />
              <NumField
                label="착공 연도" max={2040} min={2020} step={1} unit="년"
                value={input.targetYear}
                onChange={(v) => onChange({ targetYear: v })}
              />
              <NumField
                label="물가상승률" max={20} min={0} step={0.1} unit="%/년"
                value={input.inflationPct}
                onChange={(v) => onChange({ inflationPct: v })}
              />
              <NumField
                label="현장 가산 계수" max={3} min={1} step={0.01} unit="배"
                value={input.siteFactor}
                onChange={(v) => onChange({ siteFactor: v })}
              />
            </div>
          </div>

          {/* 산출 결과 */}
          {hasRef ? (
            <div className="dp-result">
              <span className="dp-section__label">산출 결과</span>
              <div className="dp-result__meta">
                <span>스케일 지수 {disc.scalingExp}</span>
                <span>
                  {result.yearDiff > 0
                    ? `${result.yearDiff}년 × ${input.inflationPct}% 물가상승`
                    : "물가상승 없음"}
                </span>
              </div>
              <ResultRow
                label="용량 비례 환산"
                value={`${fmtEok(result.capacityScaledEok)}  (${fmtFactor(result.scaleFactor)})`}
              />
              {input.useQuantity && input.refQuantity > 0 && (
                <ResultRow label="물량 비례 환산" value={fmtEok(result.quantityScaledEok)} />
              )}
              <ResultRow
                label="물가상승 반영"
                value={`${fmtEok(result.inflatedEok)}  (×${result.inflationMultiplier.toFixed(3)})`}
              />
              {input.siteFactor > 1 && (
                <ResultRow label="현장 가산 계수" value={`×${input.siteFactor.toFixed(2)}`} />
              )}
              <ResultRow highlight label="공종 예상 금액" value={fmtEok(result.finalEok)} />
            </div>
          ) : (
            <p className="dp-hint">기준 금액과 용량을 입력하면 산출 결과가 표시됩니다.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────
export function DisciplinePanel() {
  const [disciplineInput, setDisciplineInput] = useState<DisciplineInput>(DEFAULT_DISCIPLINE_INPUT);

  function patchDiscipline(id: DisciplineId, patch: Partial<DisciplineRefInput & DisciplineTargetInput>) {
    setDisciplineInput((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  const summary = calculateAllDisciplines(disciplineInput);
  const hasAny =
    disciplineInput.electrical.refAmountEok > 0 ||
    disciplineInput.civil.refAmountEok > 0 ||
    disciplineInput.mechanical.refAmountEok > 0;

  return (
    <div className="discipline-panel">
      <div className="dp-intro">
        <p>
          각 공종의 <strong>기준 금액 · 용량</strong>을 입력하면<br />
          신규 프로젝트 예상 공종 금액을 자동 산출합니다.
        </p>
      </div>

      {DISCIPLINES.map((disc) => (
        <DisciplineCard
          key={disc.id}
          disc={disc}
          input={disciplineInput[disc.id]}
          onChange={(patch) => patchDiscipline(disc.id, patch)}
        />
      ))}

      {hasAny && (
        <div className="dp-total">
          {DISCIPLINES.map((disc) => (
            <div className="dp-total__row" key={disc.id}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: disc.color, display: "inline-block" }} />
                {disc.label}
              </span>
              <strong>{fmtEok(summary[disc.id].finalEok)}</strong>
            </div>
          ))}
          <div className="dp-total__row dp-total__row--grand">
            <span>공종 합계</span>
            <strong>{fmtEok(summary.totalEok)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
