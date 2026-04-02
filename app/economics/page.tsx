import { EconomicsStudio } from "@/components/economics-studio";
import { MarketBoard } from "@/components/market-board";

export default function EconomicsPage() {
  return (
    <main className="page-shell page-shell--studio page-shell--economics">
      <MarketBoard />

      <section className="studio-hero studio-hero--mix">
        <div className="studio-hero__copy">
          <span className="section-label">{"\uACBD\uC81C\uC131"}</span>
          <h1 className="section-title">
            <span className="title-ko">{"\uD22C\uC790\uC9C0\uD45C \uAC80\uD1A0"}</span>
          </h1>
        </div>

        <div className="studio-hero__stats">
          <article className="studio-stat">
            <span>{"\uD575\uC2EC \uC9C0\uD45C"}</span>
            <strong>LCOE / Project IRR / Equity IRR</strong>
          </article>
          <article className="studio-stat">
            <span>{"\uCC28\uC785 \uC548\uC815\uC131"}</span>
            <strong>{"\uCD5C\uC18C DSCR / \uD3C9\uADE0 DSCR"}</strong>
          </article>
          <article className="studio-stat">
            <span>{"\uBBFC\uAC10\uB3C4"}</span>
            <strong>{"\uD1A0\uB124\uC774\uB3C4 \uCC28\uD2B8"}</strong>
          </article>
        </div>
      </section>

      <EconomicsStudio />
    </main>
  );
}
