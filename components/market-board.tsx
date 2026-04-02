"use client";

import { useEffect, useState } from "react";
import { DEFAULT_MARKET_BOARD, type MarketBoardItem, type TrendDirection } from "@/lib/market-board";

const copy = {
  title: "건설비 전광판",
  subtitle: "브라우저 참조 보드",
  note: "브라우저 직접 조회",
  note2: "파일 데이터 제외",
  live: "실시간 반영",
  fallback: "브라우저 참조",
  source: "출처",
  open: "열기",
};

function buildSparklinePath(points: number[]) {
  if (points.length < 2) return "";

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((value, index) => {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function shiftDate(base: Date, months: number) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatPct(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return { text: "참조 링크", direction: "flat" as TrendDirection };
  }

  const pct = ((current - previous) / previous) * 100;
  const direction: TrendDirection = pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat";
  const sign = pct > 0 ? "+" : "";

  return {
    text: `${sign}${pct.toFixed(1)}%`,
    direction,
  };
}

async function fetchFxRate(date?: Date) {
  const path = date ? toIsoDate(date) : "latest";
  const response = await fetch(`https://api.frankfurter.app/${path}?from=USD&to=KRW`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`FX request failed: ${response.status}`);
  }

  const json = (await response.json()) as { amount?: number; date?: string; rates?: Record<string, number> };
  const rate = json.rates?.KRW;
  if (!rate || !Number.isFinite(rate)) {
    throw new Error("FX rate missing");
  }

  return {
    rate,
    date: json.date ?? toIsoDate(date ?? new Date()),
  };
}

export function MarketBoard() {
  const [items, setItems] = useState<MarketBoardItem[]>(DEFAULT_MARKET_BOARD);

  useEffect(() => {
    let cancelled = false;

    async function loadFx() {
      try {
        const today = new Date();
        const monthAgo = shiftDate(today, -1);
        const yearAgo = shiftDate(today, -12);
        const sparkDates = Array.from({ length: 8 }, (_, index) =>
          shiftDate(today, index - 7),
        );

        const [current, month, year, ...sparkValues] = await Promise.all([
          fetchFxRate(),
          fetchFxRate(monthAgo),
          fetchFxRate(yearAgo),
          ...sparkDates.map((date) => fetchFxRate(date)),
        ]);

        if (cancelled) return;

        const monthChange = formatPct(current.rate, month.rate);
        const yearChange = formatPct(current.rate, year.rate);

        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id !== "fx"
              ? item
              : {
                  ...item,
                  value: current.rate.toLocaleString("ko-KR", {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 2,
                  }),
                  monthText: monthChange.text,
                  monthDirection: monthChange.direction,
                  yearText: yearChange.text,
                  yearDirection: yearChange.direction,
                  updatedAt: current.date,
                  points: sparkValues.map((entry) => entry.rate),
                  live: true,
                },
          ),
        );
      } catch {
        if (cancelled) return;
      }
    }

    loadFx();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label={copy.title} className="market-board">
      <div className="market-board__inner">
        <div className="market-board__meta">
          <div>
            <span className="market-board__eyebrow">
              {copy.title}
              <small>{copy.subtitle}</small>
            </span>
          </div>
          <div className="market-board__chips">
            <span className="market-board__chip">{copy.note}</span>
            <span className="market-board__chip market-board__chip--ghost">{copy.note2}</span>
          </div>
        </div>

        <div className="market-board__grid">
          {items.map((item) => {
            const sparklinePath = buildSparklinePath(item.points);

            return (
              <article className="market-card" key={item.id}>
                <div className="market-card__top">
                  <div>
                    <span className="market-card__label">{item.title}</span>
                    <strong className="market-card__subtitle">{item.subtitle}</strong>
                  </div>
                  <span
                    className={`market-card__status ${
                      item.live ? "market-card__status--live" : "market-card__status--fallback"
                    }`}
                  >
                    {item.live ? copy.live : copy.fallback}
                  </span>
                </div>

                <div className="market-card__price">
                  <strong>{item.value}</strong>
                  <span>{item.unit}</span>
                </div>

                <div className="market-card__compare-grid">
                  <div className="market-compare">
                    <span>{item.monthLabel}</span>
                    <strong
                      className={`market-compare__value market-compare__value--${item.monthDirection}`}
                    >
                      {item.monthText}
                    </strong>
                  </div>
                  <div className="market-compare">
                    <span>{item.yearLabel}</span>
                    <strong
                      className={`market-compare__value market-compare__value--${item.yearDirection}`}
                    >
                      {item.yearText}
                    </strong>
                  </div>
                </div>

                <div aria-hidden="true" className="market-card__sparkline">
                  <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path className="market-card__sparkline-track" d="M 0 50 L 100 50" />
                    {sparklinePath ? (
                      <path className="market-card__sparkline-line" d={sparklinePath} />
                    ) : null}
                  </svg>
                </div>

                <div className="market-card__footer">
                  <span>{`${item.cadence} / ${item.updatedAt}`}</span>
                  <div className="market-card__links">
                    {item.sourceUrl ? (
                      <a href={item.sourceUrl} rel="noreferrer" target="_blank">
                        <span className="market-card__source">
                          {copy.source}
                          <small>{item.sourceLabel}</small>
                        </span>
                        <small>{copy.open}</small>
                      </a>
                    ) : (
                      <span className="market-card__source">
                        {copy.source}
                        <small>{item.sourceLabel}</small>
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
