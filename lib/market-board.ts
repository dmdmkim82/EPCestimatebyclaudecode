export type TrendDirection = "up" | "down" | "flat";

export type MarketBoardItem = {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  unit: string;
  monthLabel: string;
  monthText: string;
  monthDirection: TrendDirection;
  yearLabel: string;
  yearText: string;
  yearDirection: TrendDirection;
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

export const DEFAULT_MARKET_BOARD: MarketBoardItem[] = [
  {
    id: "construction-materials",
    title: "건설자재",
    subtitle: "브라우저 참조 링크",
    value: "-",
    unit: "참조",
    monthLabel: "1개월 대비",
    monthText: "참조 링크",
    monthDirection: "flat",
    yearLabel: "1년 대비",
    yearText: "참조 링크",
    yearDirection: "flat",
    cadence: "수동",
    updatedAt: "브라우저 참조",
    sourceLabel: "국가통계포털",
    sourceUrl:
      "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1J15001&conn_path=I2",
    points: takeLast([98, 99, 99, 100, 100, 101, 101, 101], 24),
    live: false,
  },
  {
    id: "steel",
    title: "철강",
    subtitle: "브라우저 참조 링크",
    value: "-",
    unit: "참조",
    monthLabel: "1개월 대비",
    monthText: "참조 링크",
    monthDirection: "flat",
    yearLabel: "1년 대비",
    yearText: "참조 링크",
    yearDirection: "flat",
    cadence: "수동",
    updatedAt: "브라우저 참조",
    sourceLabel: "Trading Economics",
    sourceUrl: "https://tradingeconomics.com/commodity/steel",
    points: takeLast([102, 102, 101, 101, 101, 100, 100, 100], 24),
    live: false,
  },
  {
    id: "concrete",
    title: "레미콘",
    subtitle: "브라우저 참조 링크",
    value: "-",
    unit: "참조",
    monthLabel: "1개월 대비",
    monthText: "참조 링크",
    monthDirection: "flat",
    yearLabel: "1년 대비",
    yearText: "참조 링크",
    yearDirection: "flat",
    cadence: "수동",
    updatedAt: "브라우저 참조",
    sourceLabel: "KOSIS",
    sourceUrl:
      "https://kosis.kr/statHtml/statHtml.do?orgId=116&tblId=DT_MLTM_2079&conn_path=I2",
    points: takeLast([100, 100, 101, 101, 100, 100, 99, 99], 24),
    live: false,
  },
  {
    id: "copper",
    title: "구리",
    subtitle: "브라우저 참조 링크",
    value: "-",
    unit: "참조",
    monthLabel: "1개월 대비",
    monthText: "참조 링크",
    monthDirection: "flat",
    yearLabel: "1년 대비",
    yearText: "참조 링크",
    yearDirection: "flat",
    cadence: "수동",
    updatedAt: "브라우저 참조",
    sourceLabel: "Stooq",
    sourceUrl: "https://stooq.com/q/?s=hg.f",
    points: takeLast([101, 100, 100, 99, 99, 100, 100, 101], 24),
    live: false,
  },
  {
    id: "fx",
    title: "환율",
    subtitle: "USD / KRW",
    value: "-",
    unit: "원",
    monthLabel: "1개월 대비",
    monthText: "조회 중",
    monthDirection: "flat",
    yearLabel: "1년 대비",
    yearText: "조회 중",
    yearDirection: "flat",
    cadence: "일간",
    updatedAt: "브라우저 직접 조회",
    sourceLabel: "Frankfurter",
    sourceUrl: "https://www.frankfurter.app/",
    points: takeLast([100, 101, 100, 100, 99, 100, 101, 101], 24),
    live: false,
  },
];
