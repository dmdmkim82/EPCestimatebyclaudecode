"use client";

import { useEffect, useRef } from "react";
import {
  formatEok,
  formatPercent,
  type EstimateBenchmark,
  type EstimateUncertaintyProfile,
  type MonteCarloSummary,
} from "@/lib/estimator";

export type EstimateHistorySnapshot = {
  id: string;
  signature: string;
  savedAt: string;
  projectName: string;
  referenceProjectName: string;
  capacityMw: number;
  baseYear: number;
  startYear: number;
  riskGrade: "LOW" | "MEDIUM" | "HIGH";
  escalatedReferenceTotalEok: number;
  projectAddonSubtotal: number;
  drawingSubtotal: number;
  siteSubtotal: number;
  marginEffect: number;
  warranty: number;
  constructionQuote: number;
  grandTotal: number;
};

type EstimateAnalyticsProps = {
  monteCarlo: MonteCarloSummary;
  benchmark: EstimateBenchmark;
  currentEntry: EstimateHistorySnapshot;
  previousEntry: EstimateHistorySnapshot | null;
  history: EstimateHistorySnapshot[];
  uncertaintyProfile: EstimateUncertaintyProfile;
  onChangeUncertainty: (key: keyof EstimateUncertaintyProfile, value: number) => void;
  onResetUncertainty: () => void;
  onClearHistory: () => void;
  onJumpToSection: (sectionId: string) => void;
};

type WaterfallRow = {
  key: string;
  label: string;
  delta: number;
};

function MonteCarloHistogram({ monteCarlo }: { monteCarlo: MonteCarloSummary }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || 720;
    const height = 230;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(pixelRatio, pixelRatio);
    context.clearRect(0, 0, width, height);

    const padding = { top: 16, right: 14, bottom: 28, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxCount = Math.max(...monteCarlo.buckets.map((bucket) => bucket.count), 1);

    context.strokeStyle = "rgba(37, 56, 88, 0.12)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padding.left, padding.top + chartHeight);
    context.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    context.stroke();

    monteCarlo.buckets.forEach((bucket, index) => {
      const barWidth = chartWidth / monteCarlo.buckets.length;
      const barHeight = (bucket.count / maxCount) * (chartHeight - 8);
      const x = padding.left + index * barWidth + 1;
      const y = padding.top + chartHeight - barHeight;
      const mid = (bucket.min + bucket.max) / 2;

      if (mid <= monteCarlo.p10) {
        context.fillStyle = "#3ab37d";
      } else if (mid >= monteCarlo.p90) {
        context.fillStyle = "#d46a56";
      } else {
        context.fillStyle = "#5f7fd6";
      }

      context.fillRect(x, y, Math.max(barWidth - 2, 2), Math.max(barHeight, 2));
    });

    const markers = [
      { value: monteCarlo.p10, label: "P10", color: "#2e8f63" },
      { value: monteCarlo.p50, label: "P50", color: "#3656b5" },
      { value: monteCarlo.p90, label: "P90", color: "#b45441" },
    ];

    markers.forEach((marker) => {
      const x =
        padding.left +
        ((marker.value - monteCarlo.min) / Math.max(monteCarlo.max - monteCarlo.min, 0.001)) *
          chartWidth;
      context.strokeStyle = marker.color;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(x, padding.top);
      context.lineTo(x, padding.top + chartHeight);
      context.stroke();

      context.fillStyle = marker.color;
      context.font = "12px Pretendard Local, Pretendard, sans-serif";
      context.textAlign = "center";
      context.fillText(marker.label, x, 12);
    });
  }, [monteCarlo]);

  return <canvas className="mc-chart" ref={canvasRef} aria-label="Monte Carlo 히스토그램" />;
}

function percentileBar(value: number, max: number) {
  return `${Math.max(8, Math.min(100, (value / Math.max(max, 0.001)) * 100))}%`;
}

function formatSavedAt(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildWaterfallRows(
  currentEntry: EstimateHistorySnapshot,
  previousEntry: EstimateHistorySnapshot | null,
): WaterfallRow[] {
  if (!previousEntry) return [];

  return [
    {
      key: "reference",
      label: "기준 EPC 본체",
      delta: currentEntry.escalatedReferenceTotalEok - previousEntry.escalatedReferenceTotalEok,
    },
    {
      key: "projectAddon",
      label: "유형 가산",
      delta: currentEntry.projectAddonSubtotal - previousEntry.projectAddonSubtotal,
    },
    {
      key: "drawing",
      label: "도면 차이",
      delta: currentEntry.drawingSubtotal - previousEntry.drawingSubtotal,
    },
    {
      key: "site",
      label: "현장 가산",
      delta: currentEntry.siteSubtotal - previousEntry.siteSubtotal,
    },
    {
      key: "margin",
      label: "마진 효과",
      delta: currentEntry.marginEffect - previousEntry.marginEffect,
    },
    {
      key: "warranty",
      label: "하자보수",
      delta: currentEntry.warranty - previousEntry.warranty,
    },
  ].filter((row) => Math.abs(row.delta) >= 0.01);
}

export function EstimateAnalytics({
  monteCarlo,
  benchmark,
  currentEntry,
  previousEntry,
  history,
  uncertaintyProfile,
  onChangeUncertainty,
  onResetUncertainty,
  onClearHistory,
  onJumpToSection,
}: EstimateAnalyticsProps) {
  const percentileMax = Math.max(monteCarlo.p10, monteCarlo.p50, monteCarlo.p90);
  const historyDeltaPct = previousEntry
    ? (currentEntry.grandTotal - previousEntry.grandTotal) / Math.max(previousEntry.grandTotal, 0.01)
    : null;
  const waterfallRows = buildWaterfallRows(currentEntry, previousEntry);
  const waterfallMax = Math.max(...waterfallRows.map((row) => Math.abs(row.delta)), 0.01);
  const uncertaintyAverage =
    (uncertaintyProfile.S +
      uncertaintyProfile.P +
      uncertaintyProfile.C +
      uncertaintyProfile.site +
      uncertaintyProfile.drawing) /
    5;

  return (
    <section className="estimate-analytics">
      <div className="estimate-analytics__grid">
        <article className="panel-surface">
          <div className="panel-surface__header panel-surface__header--split">
            <div>
              <span className="control-label">Monte Carlo 확률론적 견적</span>
              <h3>삼각분포 10,000회 시뮬레이션</h3>
            </div>
            <span className="tag">평균 불확실도 {formatPercent(uncertaintyAverage, 0)}</span>
          </div>
          <p className="panel-surface__text">
            항목별 조정금액에 불확실도를 주고, 같은 입력이면 같은 결과가 나오도록 고정 seed 방식으로
            계산합니다.
          </p>
          <div className="mc-settings">
            <label className="mc-settings__field">
              <span>서비스</span>
              <input
                type="number"
                min="0"
                max="50"
                step="1"
                value={uncertaintyProfile.S}
                onChange={(event) => onChangeUncertainty("S", Number(event.target.value))}
              />
            </label>
            <label className="mc-settings__field">
              <span>조달</span>
              <input
                type="number"
                min="0"
                max="50"
                step="1"
                value={uncertaintyProfile.P}
                onChange={(event) => onChangeUncertainty("P", Number(event.target.value))}
              />
            </label>
            <label className="mc-settings__field">
              <span>시공</span>
              <input
                type="number"
                min="0"
                max="50"
                step="1"
                value={uncertaintyProfile.C}
                onChange={(event) => onChangeUncertainty("C", Number(event.target.value))}
              />
            </label>
            <label className="mc-settings__field">
              <span>현장</span>
              <input
                type="number"
                min="0"
                max="50"
                step="1"
                value={uncertaintyProfile.site}
                onChange={(event) => onChangeUncertainty("site", Number(event.target.value))}
              />
            </label>
            <label className="mc-settings__field">
              <span>도면차이</span>
              <input
                type="number"
                min="0"
                max="50"
                step="1"
                value={uncertaintyProfile.drawing}
                onChange={(event) => onChangeUncertainty("drawing", Number(event.target.value))}
              />
            </label>
            <button className="text-button" type="button" onClick={onResetUncertainty}>
              기본값 복원
            </button>
          </div>
          <div className="mc-percentiles">
            <div className="mc-percentiles__row">
              <div>
                <strong>P10</strong>
                <span>낙관값</span>
              </div>
              <div className="mc-percentiles__track">
                <span
                  className="mc-percentiles__fill mc-percentiles__fill--p10"
                  style={{ width: percentileBar(monteCarlo.p10, percentileMax) }}
                />
              </div>
              <strong>{formatEok(monteCarlo.p10)}</strong>
            </div>
            <div className="mc-percentiles__row">
              <div>
                <strong>P50</strong>
                <span>기대값</span>
              </div>
              <div className="mc-percentiles__track">
                <span
                  className="mc-percentiles__fill mc-percentiles__fill--p50"
                  style={{ width: percentileBar(monteCarlo.p50, percentileMax) }}
                />
              </div>
              <strong>{formatEok(monteCarlo.p50)}</strong>
            </div>
            <div className="mc-percentiles__row">
              <div>
                <strong>P90</strong>
                <span>보수값</span>
              </div>
              <div className="mc-percentiles__track">
                <span
                  className="mc-percentiles__fill mc-percentiles__fill--p90"
                  style={{ width: percentileBar(monteCarlo.p90, percentileMax) }}
                />
              </div>
              <strong>{formatEok(monteCarlo.p90)}</strong>
            </div>
          </div>
          <MonteCarloHistogram monteCarlo={monteCarlo} />
          <div className="mc-summary">
            <div className="metric-row">
              <span>평균</span>
              <strong>{formatEok(monteCarlo.mean)}</strong>
            </div>
            <div className="metric-row">
              <span>분포 범위</span>
              <strong>
                {formatEok(monteCarlo.min)} ~ {formatEok(monteCarlo.max)}
              </strong>
            </div>
          </div>
        </article>

        <article className="panel-surface">
          <div className="panel-surface__header">
            <span className="control-label">₩/kW 벤치마크</span>
            <h3>국내 SOFC EPC 범위 대비 위치</h3>
          </div>
          <p className="panel-surface__text">
            내부 기준 범위 {benchmark.rangeMinManwonPerKw} ~ {benchmark.rangeMaxManwonPerKw}
            만원/kW와 이번 견적을 비교합니다.
          </p>
          <div className="benchmark-card">
            <div className="benchmark-card__headline">
              <strong>
                {benchmark.currentManwonPerKw.toLocaleString("en-US", {
                  maximumFractionDigits: 1,
                })}
                만원/kW
              </strong>
              <span className={`benchmark-chip benchmark-chip--${benchmark.status.toLowerCase()}`}>
                {benchmark.verdict}
              </span>
            </div>
            <div className="benchmark-scale">
              <div className="benchmark-scale__range" />
              <div
                className="benchmark-scale__marker benchmark-scale__marker--min"
                style={{ left: "0%" }}
              >
                <span>하한</span>
                <strong>{benchmark.rangeMinManwonPerKw}</strong>
              </div>
              <div
                className="benchmark-scale__marker benchmark-scale__marker--avg"
                style={{ left: "50%" }}
              >
                <span>평균</span>
                <strong>{benchmark.rangeAvgManwonPerKw}</strong>
              </div>
              <div
                className="benchmark-scale__marker benchmark-scale__marker--max"
                style={{ left: "100%" }}
              >
                <span>상한</span>
                <strong>{benchmark.rangeMaxManwonPerKw}</strong>
              </div>
              <div
                className="benchmark-scale__current"
                style={{ left: `${Math.max(0, Math.min(100, benchmark.positionPct))}%` }}
              >
                <span>이번 견적</span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <article className="panel-surface">
        <div className="panel-surface__header panel-surface__header--split">
          <div>
            <span className="control-label">견적 이력 비교</span>
            <h3>직전 저장본 대비 증감 워터폴</h3>
          </div>
          <button className="text-button" type="button" onClick={onClearHistory}>
            이력 초기화
          </button>
        </div>
        <div className="history-comparison">
          <div className="history-comparison__summary">
            <div className="metric-row">
              <span>저장 건수</span>
              <strong>{history.length}건</strong>
            </div>
            <div className="metric-row">
              <span>직전 대비</span>
              <strong>
                {historyDeltaPct === null
                  ? "비교 기준 없음"
                  : `${historyDeltaPct >= 0 ? "+" : ""}${formatPercent(historyDeltaPct * 100, 1)}`}
              </strong>
            </div>
            <div className="metric-row">
              <span>직전 견적</span>
              <strong>{previousEntry ? formatEok(previousEntry.grandTotal) : "없음"}</strong>
            </div>
          </div>

          <div className="waterfall-card">
            {previousEntry ? (
              <>
                <div className="waterfall-card__meta">
                  <strong>{previousEntry.projectName}</strong>
                  <span>{formatSavedAt(previousEntry.savedAt)} 저장본 기준</span>
                </div>
                <div className="waterfall-list">
                  {waterfallRows.length === 0 ? (
                    <p className="empty-state">직전 저장본과 동일합니다.</p>
                  ) : (
                    waterfallRows.map((row) => (
                      <button
                        className="waterfall-row"
                        key={row.key}
                        type="button"
                        onClick={() =>
                          onJumpToSection(
                            row.key === "reference"
                              ? "estimate-reference"
                              : row.key === "projectAddon"
                                ? "estimate-project"
                                : row.key === "drawing"
                                  ? "estimate-drawing"
                                  : row.key === "site"
                                    ? "estimate-site"
                                    : "estimate-escalation",
                          )
                        }
                      >
                        <div className="waterfall-row__label">
                          <span>{row.label}</span>
                          <strong>{row.delta >= 0 ? "+" : ""}{formatEok(row.delta)}</strong>
                        </div>
                        <div className="waterfall-row__track">
                          <div className="waterfall-row__center" />
                          <span
                            className={
                              row.delta >= 0
                                ? "waterfall-row__bar waterfall-row__bar--positive"
                                : "waterfall-row__bar waterfall-row__bar--negative"
                            }
                            style={{
                              width: `${Math.max(
                                6,
                                (Math.abs(row.delta) / Math.max(waterfallMax, 0.001)) * 50,
                              )}%`,
                            }}
                          />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="empty-state">첫 저장본입니다. 다음 실행부터 증감 워터폴을 보여줍니다.</p>
            )}
          </div>

          <div className="history-list">
            {history.slice(0, 6).map((entry, index) => (
              <article className="history-item" key={entry.id}>
                <div className="history-item__meta">
                  <strong>{index === 0 ? "현재 저장본" : `이전 ${index}차`}</strong>
                  <span>{formatSavedAt(entry.savedAt)}</span>
                </div>
                <div className="history-item__body">
                  <div>
                    <span>{entry.projectName}</span>
                    <small>
                      {entry.referenceProjectName} / {entry.capacityMw.toFixed(1)}MW / {entry.baseYear}
                      {" -> "}
                      {entry.startYear}
                    </small>
                  </div>
                  <strong>{formatEok(entry.grandTotal)}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}
