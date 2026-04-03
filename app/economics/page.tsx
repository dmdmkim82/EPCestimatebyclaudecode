import { EconomicsStudio } from "@/components/economics-studio";
import { MarketBoard } from "@/components/market-board";

export default function EconomicsPage() {
  return (
    <main className="page-shell page-shell--studio page-shell--economics">
      <MarketBoard />

      <section className="studio-hero studio-hero--mix studio-hero--compact">
        <div className="studio-hero__copy">
          <span className="section-label">{"경제성"}</span>
          <h1 className="section-title--sm">{"투자지표 검토"}</h1>
        </div>

        <div className="studio-hero__stats studio-hero__stats--row">
          <article className="studio-stat studio-stat--sm">
            <span>{"핵심 지표"}</span>
            <strong>{"LCOE · IRR"}</strong>
          </article>
          <article className="studio-stat studio-stat--sm">
            <span>{"차입 안정성"}</span>
            <strong>{"DSCR"}</strong>
          </article>
          <article className="studio-stat studio-stat--sm">
            <span>{"민감도"}</span>
            <strong>{"토네이도"}</strong>
          </article>
        </div>
      </section>

      <EconomicsStudio />
    </main>
  );
}
