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

export type PricesApiResponse = {
  updatedAt: string;
  fx: number | null;
  hrcKrwPerTon: number | null;
  copperKrwPerTon: number | null;
};

/**
 * EPC 공사 대표 품목 — 기본값 (자동 조회 전 초기 상태)
 *
 * 자동 조회 (하루 1회):
 *   - 국제 HRC 철강 (Yahoo Finance HRC=F → 원화 환산, 참고용)
 *   - 국제 구리    (Yahoo Finance HG=F  → 원화 환산, 참고용)
 *   - 환율 USD/KRW (Frankfurter)
 *
 * 수동 참조 (KPRC 직접 확인):
 *   - 철근 HD19, 레미콘 25-240-12, 강관 φ50A, 건설노임
 */
export const DEFAULT_MARKET_BOARD: MarketBoardItem[] = [
  {
    id: "hrc",
    title: "HRC 철강",
    subtitle: "국제선물 · 원/t 환산",
    value: "-",
    unit: "원/t",
    changeText: "조회 중",
    changeDirection: "flat",
    cadence: "일간",
    updatedAt: "Yahoo Finance",
    sourceLabel: "Yahoo HRC=F",
    sourceUrl: "https://finance.yahoo.com/quote/HRC=F/",
    points: [98, 99, 100, 101, 102, 101, 100, 99],
    live: false,
  },
  {
    id: "copper",
    title: "구리",
    subtitle: "국제선물 · 원/t 환산",
    value: "-",
    unit: "원/t",
    changeText: "조회 중",
    changeDirection: "flat",
    cadence: "일간",
    updatedAt: "Yahoo Finance",
    sourceLabel: "Yahoo HG=F",
    sourceUrl: "https://finance.yahoo.com/quote/HG=F/",
    points: [101, 101, 100, 100, 99, 99, 100, 100],
    live: false,
  },
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
    points: [99, 100, 100, 101, 101, 100, 99, 99],
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
    points: [100, 100, 101, 101, 101, 100, 100, 100],
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
    points: [99, 100, 100, 101, 101, 101, 102, 102],
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
    points: [100, 101, 100, 100, 99, 100, 101, 101],
    live: false,
  },
];
