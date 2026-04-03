export type TrendDirection = "up" | "down" | "flat";

export type MarketBoardItem = {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  unit: string;
  changeText: string;
  changeDirection: TrendDirection;
  cadence: string;
  updatedAt: string;
  sourceLabel: string;
  sourceUrl?: string;
  points: number[];
  live: boolean;
};

function takeLast<T>(items: T[], count: number) {
  return items.slice(Math.max(items.length - count, 0));
}

/**
 * EPC 공사 대표 품목 — 한국물가정보(KPRC) 기준
 * 단가는 브라우저에서 KPRC 직접 조회 후 수동 확인 (AI 추정값 미사용)
 */
export const DEFAULT_MARKET_BOARD: MarketBoardItem[] = [
  {
    id: "rebar",
    title: "철근",
    subtitle: "HD19 · 원/t",
    value: "-",
    unit: "원/t",
    changeText: "KPRC 참조",
    changeDirection: "flat",
    cadence: "월간",
    updatedAt: "KPRC",
    sourceLabel: "KPRC 철강",
    sourceUrl: "https://kprc.or.kr/main.do?menuID=100000",
    points: takeLast([98, 99, 100, 101, 102, 101, 100, 99], 8),
    live: false,
  },
  {
    id: "hbeam",
    title: "H형강",
    subtitle: "200×200 · 원/t",
    value: "-",
    unit: "원/t",
    changeText: "KPRC 참조",
    changeDirection: "flat",
    cadence: "월간",
    updatedAt: "KPRC",
    sourceLabel: "KPRC 형강",
    sourceUrl: "https://kprc.or.kr/main.do?menuID=100000",
    points: takeLast([101, 101, 100, 100, 99, 99, 100, 100], 8),
    live: false,
  },
  {
    id: "remicon",
    title: "레미콘",
    subtitle: "25-240-12 · 원/㎥",
    value: "-",
    unit: "원/㎥",
    changeText: "KPRC 참조",
    changeDirection: "flat",
    cadence: "월간",
    updatedAt: "KPRC",
    sourceLabel: "KPRC 레미콘",
    sourceUrl: "https://kprc.or.kr/main.do?menuID=100000",
    points: takeLast([99, 100, 100, 101, 101, 101, 100, 100], 8),
    live: false,
  },
  {
    id: "pipe",
    title: "강관",
    subtitle: "배관용 φ50A · 원/m",
    value: "-",
    unit: "원/m",
    changeText: "KPRC 참조",
    changeDirection: "flat",
    cadence: "월간",
    updatedAt: "KPRC",
    sourceLabel: "KPRC 배관",
    sourceUrl: "https://kprc.or.kr/main.do?menuID=100000",
    points: takeLast([100, 100, 101, 101, 100, 99, 99, 100], 8),
    live: false,
  },
  {
    id: "labor",
    title: "건설노임",
    subtitle: "보통인부 · 원/일",
    value: "-",
    unit: "원/일",
    changeText: "KPRC 참조",
    changeDirection: "flat",
    cadence: "분기",
    updatedAt: "KPRC",
    sourceLabel: "KPRC 노임",
    sourceUrl: "https://kprc.or.kr/main.do?menuID=100000",
    points: takeLast([99, 99, 100, 100, 101, 101, 101, 102], 8),
    live: false,
  },
  {
    id: "fx",
    title: "환율",
    subtitle: "USD / KRW",
    value: "-",
    unit: "원",
    changeText: "조회 중",
    changeDirection: "flat",
    cadence: "일간",
    updatedAt: "Frankfurter",
    sourceLabel: "Frankfurter API",
    sourceUrl: "https://www.frankfurter.app/",
    points: takeLast([100, 101, 100, 100, 99, 100, 101, 101], 8),
    live: false,
  },
];
