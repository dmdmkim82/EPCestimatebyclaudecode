"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_MARKET_BOARD,
  type MarketBoardItem,
  type PricesApiResponse,
  type TrendDirection,
} from "@/lib/market-board";

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

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function pctChange(cur: number, prev: number): { text: string; direction: TrendDirection } {
  if (!prev) return { text: "-", direction: "flat" };
  const pct = ((cur - prev) / prev) * 100;
  return {
    text: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`,
    direction: pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat",
  };
}

async function fetchPrices(): Promise<PricesApiResponse | null> {
  try {
    const res = await fetch("/api/prices", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PricesApiResponse;
  } catch {
    return null;
  }
}

/** 간단한 환율 직접 조회 (하루 1회 per 마운트) */
async function fetchFxHistory() {
  const today = new Date();
  function shift(months: number) {
    const d = new Date(today);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }
  async function rate(date: string): Promise<number | null> {
    try {
      const res = await fetch(
        `https://api.frankfurter.app/${date}?from=USD&to=KRW`,
        { cache: "no-store" },
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { rates?: { KRW?: number } };
      return json.rates?.KRW ?? null;
    } catch {
      return null;
    }
  }
  const monthAgo = shift(-1);
  const sparkDates = Array.from({ length: 8 }, (_, i) =>
    shift(i - 7),
  );
  const [cur, prev, ...sparks] = await Promise.all([
    rate("latest"),
    rate(monthAgo),
    ...sparkDates.map(rate),
  ]);
  return { cur, prev, sparks };
}

export function MarketBoard() {
  const [items, setItems] = useState<MarketBoardItem[]>(DEFAULT_MARKET_BOARD);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1) 서버 API에서 HRC·구리·환율 가져오기 (하루 캐시)
      const [prices, fxHistory] = await Promise.all([
        fetchPrices(),
        fetchFxHistory(),
      ]);
      if (cancelled) return;

      setItems((prev) =>
        prev.map((item) => {
          // HRC 철강
          if (item.id === "hrc" && prices?.hrcKrwPerTon) {
            return {
              ...item,
              value: fmt(prices.hrcKrwPerTon),
              changeText: "국제선물 참고",
              changeDirection: "flat" as TrendDirection,
              updatedAt: prices.updatedAt,
              live: true,
            };
          }
          // 구리
          if (item.id === "copper" && prices?.copperKrwPerTon) {
            return {
              ...item,
              value: fmt(prices.copperKrwPerTon),
              changeText: "국제선물 참고",
              changeDirection: "flat" as TrendDirection,
              updatedAt: prices.updatedAt,
              live: true,
            };
          }
          // 환율
          if (item.id === "fx") {
            const cur = fxHistory.cur ?? prices?.fx ?? null;
            const prev = fxHistory.prev;
            if (!cur) return item;
            const change = prev ? pctChange(cur, prev) : { text: "-", direction: "flat" as TrendDirection };
            return {
              ...item,
              value: fmt(Math.round(cur)),
              changeText: change.text,
              changeDirection: change.direction,
              updatedAt: new Date().toISOString().slice(0, 10),
              points: fxHistory.sparks
                .filter((r): r is number => r !== null),
              live: true,
            };
          }
          return item;
        }),
      );
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <section aria-label="건설비 전광판" className="market-board">
      <div className="market-board__inner">
        <div className="mb-header">
          <span className="mb-eyebrow">
            건설비 전광판
            <small>KPRC · Yahoo Finance · Frankfurter — 하루 1회 갱신</small>
          </span>
          <span className="mb-badge">파일 데이터 미포함</span>
        </div>

        <div className="mb-grid">
          {items.map((item) => {
            const sparkPath = buildSparklinePath(item.points);
            return (
              <article className="mb-card" key={item.id}>
                <div className="mb-card__head">
                  <div>
                    <span className="mb-card__title">{item.title}</span>
                    <span className="mb-card__sub">{item.subtitle}</span>
                  </div>
                  <span className={`mb-card__badge ${item.live ? "mb-card__badge--live" : ""}`}>
                    {item.live ? "Live" : "참조"}
                  </span>
                </div>

                <div className="mb-card__price">
                  <strong>{item.value === "-" ? "—" : item.value}</strong>
                </div>

                <div className={`mb-card__change mb-card__change--${item.changeDirection}`}>
                  {item.changeText}
                </div>

                <div aria-hidden="true" className="mb-card__spark">
                  <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path className="mb-spark-track" d="M 0 50 L 100 50" />
                    {sparkPath && <path className="mb-spark-line" d={sparkPath} />}
                  </svg>
                </div>

                <div className="mb-card__foot">
                  <span>{item.cadence} · {item.updatedAt}</span>
                  {item.sourceUrl ? (
                    <a href={item.sourceUrl} rel="noreferrer" target="_blank">
                      {item.sourceLabel} ↗
                    </a>
                  ) : (
                    <span>{item.sourceLabel}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
