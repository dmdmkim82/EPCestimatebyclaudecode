import { NextResponse } from "next/server";

/**
 * GET /api/prices
 *
 * 서버 사이드에서 외부 공개 시세 API를 조회합니다.
 * 업로드 파일 데이터는 전혀 포함되지 않습니다.
 * 하루 1회 캐시 (s-maxage=86400) — revalidate 1시간.
 *
 * 데이터 소스:
 *  - HRC 철강  : Yahoo Finance (HRC=F)  → 국제 열연강판 선물 (USD/short ton)
 *  - 구리       : Yahoo Finance (HG=F)   → 국제 구리 선물 (USD/lb)
 *  - 환율       : Frankfurter API        → USD/KRW
 */

type YahooResult = {
  chart: {
    result?: Array<{
      meta: {
        regularMarketPrice: number;
        currency: string;
        symbol: string;
      };
    }>;
    error?: unknown;
  };
};

async function fetchYahoo(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as YahooResult;
    const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" && Number.isFinite(price) ? price : null;
  } catch {
    return null;
  }
}

async function fetchFxRate(): Promise<number | null> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=KRW", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: { KRW?: number } };
    const rate = json.rates?.KRW;
    return typeof rate === "number" && Number.isFinite(rate) ? rate : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const [hrcUsd, copperUsdLb, krwPerUsd] = await Promise.all([
    fetchYahoo("HRC=F"),   // HRC Steel 선물 USD/short ton
    fetchYahoo("HG=F"),    // Copper 선물 USD/lb
    fetchFxRate(),          // USD/KRW
  ]);

  // 환산 (국제가 → 원화)
  const fx = krwPerUsd ?? null;

  // HRC: USD/short ton → 원/t  (1 short ton = 0.9072 t)
  const hrcKrwPerTon =
    hrcUsd !== null && fx !== null
      ? Math.round((hrcUsd / 0.9072) * fx)
      : null;

  // 구리: USD/lb → 원/t  (1 t = 2204.62 lb)
  const copperKrwPerTon =
    copperUsdLb !== null && fx !== null
      ? Math.round(copperUsdLb * 2204.62 * fx)
      : null;

  const data = {
    updatedAt: new Date().toISOString().slice(0, 10),
    fx: fx ? Math.round(fx) : null,
    hrcKrwPerTon,
    copperKrwPerTon,
  };

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
