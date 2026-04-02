"use client";

import { useState } from "react";
import { buildB2BLeadProposal, type B2BLeadInput } from "@/lib/b2b-proposal";
import { formatEok, formatPercent } from "@/lib/estimator";

const DEFAULT_FORM: B2BLeadInput = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  siteAddress: "",
  areaSource: "google",
  boundaryText: "",
  widthM: 0,
  depthM: 0,
  landUseFactorPct: 70,
  preferredStartYear: 2027,
};

const copy = {
  input: "B2B 입력",
  siteQuick: "부지 기반 빠른 제안",
  siteQuickDesc: "주소와 면적만 넣으면 1차 제안 금액을 계산합니다.",
  googleCoords: "측정 좌표를 붙여 넣습니다.",
  cadastralCoords: "지적도 경계 좌표를 붙여 넣습니다.",
  manualDims: "가로 x 세로로 계산합니다.",
  hint: "구글 지도 또는 지적도 좌표를 그대로 붙여 넣으세요.",
  calcProposal: "제안 계산",
  calcFallback: "좌표가 없으면 가로 x 세로 기준으로 계산합니다.",
  emptyTitle: "부지 정보를 넣고 바로 1차 제안을 계산하세요.",
  emptyDesc: "영업 초기 단계에서 면적, 권장 용량, 예비 EPC 금액을 빠르게 확인합니다.",
  grossSitePrefix: "총 부지",
  basis: "기준으로",
  stdProposal: "표준 9.9MW 제안을 권장합니다.",
  scaleProposal: "면적 기준으로 규모를 권장합니다.",
  grossArea: "총 면적",
  usableArea: "유효 면적",
  risk: "리스크",
  quickSales: "초기 영업 검토용 금액",
  areaSizing: "면적과 용량 판단",
  salesMemo: "영업 메모",
  company: "회사명",
  contact: "담당자명",
  email: "이메일",
  phone: "전화번호",
  siteAddress: "부지 주소",
  boundary: "경계 좌표 (한 줄에 lat,lng)",
  width: "가로 (m)",
  depth: "세로 (m)",
  landUse: "유효 부지 비율 (%)",
  startYear: "희망 착공연도",
  quickProposal: "빠른 제안",
  leadProposal: "제안 결과",
  proposalBasis: "제안 기준",
  requestSummary: "요청 요약",
  grossSiteArea: "총 부지 면적",
  usableSiteArea: "유효 부지 면적",
  recommendedCapacity: "권장 용량",
  preliminaryQuote: "예비 EPC 금액",
  utilizationApplied: "유효 비율 적용",
  standardCap: "표준 제안은 9.9MW 상한 적용",
  areaBased: "면적 기준 권장 용량",
  noteLabel: "메모",
  boundaryPoints: "경계 좌표 수",
  boundaryDetected: "개 좌표를 읽었습니다.",
  boundaryRequired: "경계 좌표 또는 가로/세로 값이 필요합니다.",
  siteAddressRequired: "부지 주소를 입력해야 합니다.",
};

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function B2BLeadPage() {
  const [form, setForm] = useState<B2BLeadInput>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof buildB2BLeadProposal> | null>(null);

  const setField = <K extends keyof B2BLeadInput,>(key: K, value: B2BLeadInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCalculate = () => {
    if (!form.boundaryText.trim() && !(form.widthM > 0 && form.depthM > 0)) {
      setError(copy.boundaryRequired);
      return;
    }

    if (!form.siteAddress.trim()) {
      setError(copy.siteAddressRequired);
      return;
    }

    setError(null);
    setResult(buildB2BLeadProposal(form));
  };

  const leadSummary = result
    ? [
        `회사명: ${form.companyName || "-"}`,
        `담당자: ${form.contactName || "-"} / ${form.email || "-"} / ${form.phone || "-"}`,
        `부지: ${form.siteAddress}`,
        `총 면적: ${result.areaSqm.toLocaleString("en-US")} m2 (${result.areaPyeong.toLocaleString("en-US")} 평)`,
        `유효 면적: ${result.usableAreaSqm.toLocaleString("en-US")} m2`,
        `권장 용량: ${result.recommendedCapacityMw.toFixed(1)} MW`,
        `예비 EPC 금액: ${formatEok(result.estimate.grandTotal)}`,
        `리스크 등급: ${result.estimate.riskGrade}`,
      ].join("\n")
    : "";

  return (
    <div className="b2b-layout">
      <aside className="estimate-panel b2b-panel">
        <div className="control-group">
          <div className="control-header">
            <span className="control-label">{copy.input}</span>
            <h2>{copy.siteQuick}</h2>
            <p>{copy.siteQuickDesc}</p>
          </div>

          <div className="segmented">
            <button
              className={
                form.areaSource === "google"
                  ? "segmented__button segmented__button--active"
                  : "segmented__button"
              }
              type="button"
              onClick={() => setField("areaSource", "google")}
            >
              <strong>구글 지도</strong>
              <span>{copy.googleCoords}</span>
            </button>
            <button
              className={
                form.areaSource === "cadastral"
                  ? "segmented__button segmented__button--active"
                  : "segmented__button"
              }
              type="button"
              onClick={() => setField("areaSource", "cadastral")}
            >
              <strong>지적도 좌표</strong>
              <span>{copy.cadastralCoords}</span>
            </button>
            <button
              className={
                form.areaSource === "manual"
                  ? "segmented__button segmented__button--active"
                  : "segmented__button"
              }
              type="button"
              onClick={() => setField("areaSource", "manual")}
            >
              <strong>수동 입력</strong>
              <span>{copy.manualDims}</span>
            </button>
          </div>
        </div>

        <div className="control-group">
          <div className="field-grid field-grid--two">
            <label className="field">
              <span>{copy.company}</span>
              <input
                type="text"
                value={form.companyName}
                onChange={(event) => setField("companyName", event.target.value)}
              />
            </label>
            <label className="field">
              <span>{copy.contact}</span>
              <input
                type="text"
                value={form.contactName}
                onChange={(event) => setField("contactName", event.target.value)}
              />
            </label>
            <label className="field">
              <span>{copy.email}</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
              />
            </label>
            <label className="field">
              <span>{copy.phone}</span>
              <input
                type="text"
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
              />
            </label>
            <label className="field field--full">
              <span>{copy.siteAddress}</span>
              <input
                type="text"
                value={form.siteAddress}
                onChange={(event) => setField("siteAddress", event.target.value)}
              />
            </label>
            <label className="field field--full">
              <span>{copy.boundary}</span>
              <textarea
                className="field__textarea"
                placeholder={
                  "37.402100,127.108300\n37.402100,127.109100\n37.401500,127.109100\n37.401500,127.108300"
                }
                value={form.boundaryText}
                onChange={(event) => setField("boundaryText", event.target.value)}
              />
              <small className="field-hint">{copy.hint}</small>
            </label>
            <label className="field">
              <span>{copy.width}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.widthM}
                onChange={(event) =>
                  setField("widthM", clampNumber(Number(event.target.value), 0, 10000))
                }
              />
            </label>
            <label className="field">
              <span>{copy.depth}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.depthM}
                onChange={(event) =>
                  setField("depthM", clampNumber(Number(event.target.value), 0, 10000))
                }
              />
            </label>
            <label className="field">
              <span>{copy.landUse}</span>
              <input
                type="number"
                min="30"
                max="95"
                step="1"
                value={form.landUseFactorPct}
                onChange={(event) =>
                  setField("landUseFactorPct", clampNumber(Number(event.target.value), 30, 95))
                }
              />
            </label>
            <label className="field">
              <span>{copy.startYear}</span>
              <input
                type="number"
                min="2025"
                max="2040"
                step="1"
                value={form.preferredStartYear}
                onChange={(event) =>
                  setField(
                    "preferredStartYear",
                    clampNumber(Number(event.target.value), 2025, 2040),
                  )
                }
              />
            </label>
          </div>

          {error ? <p className="feedback feedback--error">{error}</p> : null}

          <div className="proposal-actions">
            <button className="button button--primary" type="button" onClick={handleCalculate}>
              {copy.calcProposal}
            </button>
            <p>{copy.calcFallback}</p>
          </div>
        </div>
      </aside>

      <section className="estimate-results">
        {!result ? (
          <article className="panel-surface b2b-empty">
            <span className="control-label">{copy.quickProposal}</span>
            <h3>{copy.emptyTitle}</h3>
            <p>{copy.emptyDesc}</p>
          </article>
        ) : (
          <>
            <div className="result-main">
              <div className="result-main__copy">
                <span className="control-label">{copy.leadProposal}</span>
                <h2>{formatEok(result.estimate.grandTotal)}</h2>
                <p>
                  {copy.grossSitePrefix} {result.areaSqm.toLocaleString("en-US")} m2 {copy.basis}{" "}
                  <strong>{result.recommendedCapacityMw.toFixed(1)}MW</strong>{" "}
                  {result.isStandardProposal ? copy.stdProposal : copy.scaleProposal}
                </p>
              </div>
              <div className="result-main__meta">
                <div>
                  <span>{copy.grossArea}</span>
                  <strong>{result.areaSqm.toLocaleString("en-US")} m2</strong>
                </div>
                <div>
                  <span>{copy.usableArea}</span>
                  <strong>{result.usableAreaSqm.toLocaleString("en-US")} m2</strong>
                </div>
                <div>
                  <span>{copy.risk}</span>
                  <strong>{result.estimate.riskGrade}</strong>
                </div>
              </div>
            </div>

            <div className="summary-grid summary-grid--wide">
              <article className="summary-card">
                <span className="summary-card__label">{copy.grossSiteArea}</span>
                <strong>{result.areaSqm.toLocaleString("en-US")} m2</strong>
                <span className="summary-card__sub">
                  {result.areaPyeong.toLocaleString("en-US")} 평
                </span>
              </article>
              <article className="summary-card">
                <span className="summary-card__label">{copy.usableSiteArea}</span>
                <strong>{result.usableAreaSqm.toLocaleString("en-US")} m2</strong>
                <span className="summary-card__sub">
                  {formatPercent(form.landUseFactorPct)} {copy.utilizationApplied}
                </span>
              </article>
              <article className="summary-card">
                <span className="summary-card__label">{copy.recommendedCapacity}</span>
                <strong>{result.recommendedCapacityMw.toFixed(1)} MW</strong>
                <span className="summary-card__sub">
                  {result.isStandardProposal ? copy.standardCap : copy.areaBased}
                </span>
              </article>
              <article className="summary-card">
                <span className="summary-card__label">{copy.preliminaryQuote}</span>
                <strong>{formatEok(result.estimate.grandTotal)}</strong>
                <span className="summary-card__sub">{copy.quickSales}</span>
              </article>
            </div>

            <div className="comparison-grid">
              <article className="panel-surface">
                <div className="panel-surface__header">
                  <span className="control-label">{copy.proposalBasis}</span>
                  <h3>{copy.areaSizing}</h3>
                </div>
                <div className="detail-list">
                  {result.notes.map((note, index) => (
                    <div className="detail-list__row" key={`note-${index}`}>
                      <strong>{copy.noteLabel} {index + 1}</strong>
                      <span>{note}</span>
                    </div>
                  ))}
                  <div className="detail-list__row">
                    <strong>{copy.boundaryPoints}</strong>
                    <span>
                      {result.boundaryPoints.length}
                      {copy.boundaryDetected}
                    </span>
                  </div>
                </div>
              </article>

              <article className="panel-surface">
                <div className="panel-surface__header">
                  <span className="control-label">{copy.requestSummary}</span>
                  <h3>{copy.salesMemo}</h3>
                </div>
                <textarea className="summary-textarea" readOnly value={leadSummary} />
              </article>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
