"use client";

import { useEffect, useState } from "react";
import { DEFAULT_MARKET_BOARD, type MarketBoardItem, type TrendDirection } from "@/lib/market-board";

function buildSparklinePath(points: number[]) {
  if (points.length < 2) return "";
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  return points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shiftDate(base: Date, months: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatPct(cur: number, prev: number) {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0)
    return { text: "-", direction: "flat" as TrendDirection };
  const pct = ((cur - prev) / prev) * 100;
  return {
    text: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`,
    direction: (pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat") as TrendDirection,
  };
}

async function fetchFx(date?: Date) {
  const path = date ? toIsoDate(date) : "latest";
  const res = await fetch(`https://api.frankfurter.app/${path}?from=USD&to=KRW`, { cache: "no-store" });
  if (!res.ok) throw new Error(`FX ${res.status}`);
  const json = (await res.json()) as { date?: string; rates?: Record<string, number> };
  const rate = json.rates?.KRW;
  if (!rate) throw new Error("no KRW");
  return { rate, date: json.date ?? toIsoDate(date ?? new Date()) };
}

export function MarketBoard() {
  const [items, setItems] = useState<MarketBoardItem[]>(DEFAULT_MARKET_BOARD);

  useEffect(() => {
    let cancelled = false;
    async function loadFx() {
      try {
        const today = new Date();
        const monthAgo = shiftDate(today, -1);
        const sparkDates = Array.from({ length: 8 }, (_, i) => shiftDate(today, i - 7));
        const [cur, prev, ...sparks] = await Promise.all([
          fetchFx(),
          fetchFx(monthAgo),
          ...sparkDates.map(fetchFx),
        ]);
        if (cancelled) return;
        const { text, direction } = formatPct(cur.rate, prev.rate);
        setItems((prev) =>
          prev.map((item) =>
            item.id !== "fx"
              ? item
              : {
                  ...item,
                  value: cur.rate.toLocaleString("ko-KR", { maximumFractionDigits: 0 }),
                  changeText: text,
                  changeDirection: direction,
                  updatedAt: cur.date,
                  points: sparks.map((s) => s.rate),
                  live: true,
                },
          ),
        );
      } catch { /* fallback */ }
    }
    loadFx();
    return () => { cancelled = true; };
  }, []);

  return (
    <section aria-label="건설비 전광판" className="market-board">
      <div className="market-board__inner">

        {/* 헤더 */}
        <div className="mb-header">
          <span className="mb-eyebrow">
            건설비 전광판
            <small>KPRC · 브라우저 직접 참조</small>
          </span>
          <span className="mb-badge">파일 데이터 미포함</span>
        </div>

        {/* 카드 그리드 */}
        <div className="mb-grid">
          {items.map((item) => (
            <article className="mb-card" key={item.id}>

              {/* 상단: 품목 + 상태 뱃지 */}
              <div className="mb-card__head">
                <div>
                  <span className="mb-card__title">{item.title}</span>
                  <span className="mb-card__sub">{item.subtitle}</span>
                </div>
                <span className={`mb-card__badge ${item.live ? "mb-card__badge--live" : ""}`}>
                  {item.live ? "Live" : "참조"}
                </span>
              </div>

              {/* 가격 */}
              <div className="mb-card__price">
                <strong>{item.value}</strong>
              </div>

              {/* 변동 */}
              <div className={`mb-card__change mb-card__change--${item.changeDirection}`}>
                {item.changeText}
              </div>

              {/* 스파크라인 */}
              <div aria-hidden="true" className="mb-card__spark">
                <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path className="mb-spark-track" d="M 0 50 L 100 50" />
                  {buildSparklinePath(item.points) && (
                    <path className="mb-spark-line" d={buildSparklinePath(item.points)} />
                  )}
                </svg>
              </div>

              {/* 출처 */}
              <div className="mb-card__foot">
                <span>{item.cadence}</span>
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} rel="noreferrer" target="_blank">
                    {item.sourceLabel} ↗
                  </a>
                ) : (
                  <span>{item.sourceLabel}</span>
                )}
              </div>

            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
