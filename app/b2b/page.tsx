import { B2BLeadPage } from "@/components/b2b-lead-page";

export default function B2BPage() {
  return (
    <main className="page-shell page-shell--studio page-shell--b2b">
      <section className="studio-hero studio-hero--mix">
        <div className="studio-hero__copy">
          <span className="section-label">B2B {"\uC81C\uC548"}</span>
          <h1 className="section-title">
            <span className="title-ko">{"\uC601\uC5C5 \uCD08\uC548 \uC791\uC131"}</span>
          </h1>
        </div>

        <div className="studio-hero__stats">
          <article className="studio-stat">
            <span>{"\uC785\uB825"}</span>
            <strong>{"\uC8FC\uC18C / \uBA74\uC801 / \uACBD\uACC4 \uC88C\uD45C"}</strong>
          </article>
          <article className="studio-stat">
            <span>{"\uC0B0\uCD9C"}</span>
            <strong>{"\uAD8C\uC7A5 \uADDC\uBAA8 / EPC \uAE08\uC561"}</strong>
          </article>
          <article className="studio-stat">
            <span>{"\uCD9C\uB825"}</span>
            <strong>{"\uC81C\uC548 \uCD08\uC548"}</strong>
          </article>
        </div>
      </section>

      <B2BLeadPage />
    </main>
  );
}
