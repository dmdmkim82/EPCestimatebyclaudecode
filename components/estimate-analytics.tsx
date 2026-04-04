"use client";

import {
  formatEok,
  formatKrw,
  formatPercent,
  type EstimateSummary,
} from "@/lib/estimator";

type EstimateAnalyticsProps = {
  summary: EstimateSummary;
};

export function EstimateAnalytics({ summary }: EstimateAnalyticsProps) {
  return (
    <section className="analytics-panel">
      <article className="analytics-card">
        <div className="analytics-card__header">
          <span>카테고리 구성비</span>
          <strong>{formatEok(summary.grandTotal)}</strong>
        </div>
        <div className="analytics-stack">
          {summary.categorySummaries.map((category) => (
            <div className="analytics-row" key={category.category}>
              <div>
                <strong>{category.label}</strong>
                <small>{category.count}개 항목</small>
              </div>
              <div className="analytics-row__value">
                <span>{formatEok(category.total)}</span>
                <small>{formatPercent(category.shareOfGrandTotal * 100, 1)}</small>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="analytics-card">
        <div className="analytics-card__header">
          <span>상위 금액 항목</span>
          <strong>{formatKrw(summary.directTotal)}</strong>
        </div>
        {summary.topItems.length === 0 ? (
          <div className="analytics-stack">
            <div className="analytics-row">
              <div>
                <strong>아직 입력된 항목이 없습니다.</strong>
                <small>새 항목을 추가하면 여기에서 상위 금액 순서를 바로 확인할 수 있습니다.</small>
              </div>
            </div>
          </div>
        ) : (
          <div className="analytics-stack">
            {summary.topItems.map((item) => (
              <div className="analytics-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.code} · {item.subcategory}
                  </small>
                </div>
                <div className="analytics-row__value">
                  <span>{formatKrw(item.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
