"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import {
  EstimateAnalytics,
  type EstimateHistorySnapshot,
} from "@/components/estimate-analytics";
import {
  inspectReferenceWorkbook,
  summarizeReferenceWorkbookInspection,
  type ReferenceWorkbookInspection,
} from "@/lib/excel-import";
import {
  DEFAULT_UNCERTAINTY_PROFILE,
  DEFAULT_INPUT,
  DEFAULT_REFERENCE_DATABASE,
  DEFAULT_REFERENCE_PROJECT,
  PROJECT_OPTIONS,
  SITE_SURVEY_OPTIONS,
  buildEstimateFingerprint,
  buildKwBenchmark,
  calculateEstimate,
  formatEok,
  formatPercent,
  getEscalationBreakdown,
  runMonteCarloEstimate,
  type EstimateInput,
  type EstimateUncertaintyProfile,
  type LayoutPreview,
  type MonteCarloSummary,
  type ProjectType,
  type ReferenceProject,
  type RiskFinding,
} from "@/lib/estimator";

const HISTORY_LIMIT = 20;

const copy = {
  refWorkbookDesc: "기준 워크북을 불러오고 목표 프로젝트 기준으로 바로 환산합니다.",
  importing: "워크북을 불러오는 중...",
  uploadWorkbook: "기준 워크북 업로드",
  localParse: "Excel 파일을 브라우저에서 바로 읽습니다.",
  uploadTrustTitle: "파일 처리 안내",
  uploadTrustPrimary: "업로드된 파일은 브라우저에서만 처리되며 외부로 전송되지 않습니다.",
  uploadTrustSecondary:
    "지도와 참고 시세만 브라우저가 외부 원문을 직접 참조합니다. 업로드 파일 내용은 포함되지 않습니다.",
  uploadTrustTertiary:
    "내부 검토 시에는 확장 프로그램이 없는 시크릿 모드 사용을 권장합니다.",
  uploadTrustQuaternary: "민감한 작업 후에는 브라우저를 완전히 종료하세요.",
  eok: "억원",
  basis: "기준으로",
  resultTail: "를 반영한 결과입니다.",
  preEsc: "연도 보정 전",
  startYearBasis: "착공연도 기준",
  coreBasis: "기준값 + 타입 + 도면 차이",
  siteAdder: "현장 / 계통 가산",
  drawingReflect: "도면 차이 반영",
  importFailed: "워크북을 읽지 못했습니다. 항목명과 금액 열을 확인한 뒤 다시 시도하세요.",
  refDb: "기준 데이터",
  estimateTitle: "견적산출 화면",
  project: "프로젝트",
  projectProfile: "목표 프로젝트 조건",
  projectName: "프로젝트명",
  siteName: "현장명",
  capacity: "용량 (MW)",
  siteAddress: "현장 주소 / 지도 검색어",
  latitude: "위도",
  longitude: "경도",
  escalation: "물가상승",
  escalationTitle: "가격연도와 상업 조건",
  escalationNote: "물가상승 기준 메모",
  priceYear: "가격 기준연도",
  startYear: "착공연도",
  serviceEsc: "서비스 물가상승 (%)",
  procurementEsc: "조달 물가상승 (%)",
  constructionEsc: "시공 물가상승 (%)",
  margin: "목표 마진 (%)",
  warrantyRate: "하자보수 (%)",
  siteReview: "현장 검토",
  siteReviewTitle: "부지와 유틸리티 범위",
  drawingReview: "도면 검토",
  drawingReviewTitle: "기준 도면과 목표 도면 차이",
  referenceDrawing: "기준 도면",
  targetDrawing: "목표 도면",
  noFile: "선택된 파일 없음",
  civilChange: "토목 변경 (%)",
  electricalChange: "전기 변경 (%)",
  mechanicalChange: "기계 변경 (%)",
  controlChange: "제어 / 계장 변경 (%)",
  quote: "견적 결과",
  riskGrade: "리스크 등급",
  referenceDelta: "기준 대비 차이",
  economicsPage: "경제성 페이지",
  openEconomics: "경제성 화면 열기",
  scaledReference: "용량 환산 기준금액",
  escalatedReference: "물가상승 반영 기준금액",
  coreSubtotal: "핵심 EPC 소계",
  siteAdditions: "현장 가산",
  warranty: "하자보수",
  drawingAdders: "도면 차이 가산",
  warrantyBasis: "공사비 기준 하자보수율 적용",
  categorySplit: "항목 구분",
  categorySplitTitle: "S / P / C 기준 물가상승 반영 금액",
  riskEnvelope: "리스크 범위",
  riskEnvelopeTitle: "시나리오 총액",
  bidStrategy: "입찰 전략",
  bidStrategyTitle: "마진 전략 비교",
  referenceComparison: "기준 비교",
  referenceComparisonTitle: "선택한 기준 프로젝트와 비교",
  referenceOriginal: "기준 원본",
  referenceEscalated: "기준 보정 후",
  currentQuote: "현재 견적",
  delta: "차이율",
  referenceNote: "기준 메모",
  riskReview: "리스크 검토",
  riskReviewTitle: "상업 및 기술 리스크",
  noRisk: "현재 입력값 기준으로 주요 리스크 신호는 없습니다.",
  impact: "예상 영향",
  estimateBasis: "산출 근거",
  estimateBasisTitle: "현재 금액이 나온 이유",
  economics: "경제성",
  economicsTitle: "견적과 경제성을 분리해 검토합니다.",
  separatedWorkflow: "분리된 흐름",
  separatedWorkflowDesc: "견적산출 페이지는 EPC 범위, 리스크, 배치 검토에 집중합니다.",
  economicsInputs: "경제성 입력값",
  economicsInputsDesc: "주기기 금액, 판매단가, 연료비, 차입, 세금 가정을 수동 입력합니다.",
  economicsOutputs: "경제성 결과값",
  economicsOutputsDesc: "LCOE, 프로젝트 IRR, 자기자본 IRR, DSCR, 회수기간을 확인합니다.",
  openEconomicsStudio: "경제성 화면 열기",
  openEconomicsMetrics: "LCOE / 프로젝트 IRR / 자기자본 IRR",
  mapContext: "지도 기준 검토",
  mapContextTitle: "위치 기반 현장 검토 프레임",
  mapPreviewTitle: "현장 위치 미리보기",
  mapExternalNote:
    "지도는 브라우저가 외부 지도를 직접 불러옵니다. 업로드 파일 내용은 지도 호출에 포함되지 않습니다.",
  mapEmpty: "주소 또는 좌표를 입력하면 브라우저에서 현장 위치를 바로 확인할 수 있습니다.",
  virtualLayout: "가상 배치",
  virtualLayoutTitle: "예상 플랜트 배치",
  estimatedLandUse: "예상 필요 면적",
  layoutNote: "배치 메모",
  breakdown: "세부 내역",
  breakdownTitle: "기준, 도면, 현장 가산 항목",
  item: "항목",
  kind: "구분",
  category: "카테고리",
  base: "기준금액",
  escalated: "반영금액",
  basisCol: "근거",
  note: "비고",
  uploadedWorkbook: "업로드한 워크북",
  builtInReference: "기본 기준 프로젝트",
  remove: "삭제",
  defaultTag: "기본값",
  reviewImport: "업로드 검수",
  reviewImportTitle: "참조 워크북 확인 후 반영",
  reviewImportDesc:
    "엑셀 파싱 결과를 먼저 확인한 뒤 기준 데이터로 추가합니다. 이름, 연도, 용량은 여기서 바로 수정할 수 있습니다.",
  parsedTotal: "파싱 총액",
  parsedItems: "파싱 항목 수",
  parsedSheets: "읽은 시트 수",
  reviewName: "기준 프로젝트명",
  reviewYear: "기준연도",
  reviewCapacity: "기준 용량 (MW)",
  categorySubtotal: "카테고리 소계",
  warnings: "검토 메모",
  noWarnings: "자동 검토 경고 없음",
  removePending: "제외",
  reviewItems: "항목 검수",
  reviewItemsDesc: "항목명, 카테고리, 금액을 수정하거나 제외할 수 있습니다.",
  reviewAmount: "금액 (억원)",
  reviewCategoryCode: "카테고리",
  reviewCode: "코드",
  reviewItemNote: "비고",
  cancelReview: "취소",
  confirmReview: "검수 후 반영",
  importReady: "반영 대기",
  escalationSnapshot: "복리 반영 요약",
  escalationApplied: "연도차 복리 적용 결과",
  escalationNone: "기준연도와 착공연도가 같아 물가상승이 추가되지 않습니다.",
  escalationFormula: "계산식",
};

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function severityClass(severity: RiskFinding["severity"]) {
  if (severity === "HIGH") return "risk-chip risk-chip--high";
  if (severity === "MEDIUM") return "risk-chip risk-chip--medium";
  return "risk-chip risk-chip--low";
}

function gradeClass(grade: "LOW" | "MEDIUM" | "HIGH") {
  if (grade === "HIGH") return "result-grade result-grade--high";
  if (grade === "MEDIUM") return "result-grade result-grade--medium";
  return "result-grade result-grade--low";
}

function LayoutCanvas({ layout }: { layout: LayoutPreview }) {
  const scale = 92;
  const maxX = Math.max(...layout.blocks.map((block) => block.x + block.w), 0) + 0.5;
  const maxY = Math.max(...layout.blocks.map((block) => block.y + block.h), 0) + 0.5;
  const width = Math.max(640, maxX * scale);
  const height = Math.max(320, maxY * scale);

  return (
    <svg
      className="layout-canvas"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="연료전지 플랜트 가상 배치 미리보기"
    >
      <defs>
        <pattern id="layout-grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
          <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="rgba(17,17,17,0.07)" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#layout-grid)" rx="28" />
      {layout.blocks.map((block) => {
        const x = block.x * scale;
        const y = block.y * scale;
        const w = block.w * scale;
        const h = block.h * scale;
        const className =
          block.kind === "module"
            ? "layout-canvas__block layout-canvas__block--module"
            : block.kind === "aux"
              ? "layout-canvas__block layout-canvas__block--aux"
              : "layout-canvas__block layout-canvas__block--grid";

        return (
          <g key={block.id}>
            <rect className={className} x={x} y={y} width={w} height={h} rx="18" />
            <text
              x={x + w / 2}
              y={y + h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="layout-canvas__label"
            >
              {block.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function EstimateStudio() {
  const [input, setInput] = useState<EstimateInput>(DEFAULT_INPUT);
  const [uploadedReferences, setUploadedReferences] = useState<ReferenceProject[]>([]);
  const [historySnapshots, setHistorySnapshots] = useState<EstimateHistorySnapshot[]>([]);
  const [pendingImports, setPendingImports] = useState<ReferenceWorkbookInspection[]>([]);
  const [selectedReferenceId, setSelectedReferenceId] = useState(
    DEFAULT_REFERENCE_PROJECT.id,
  );
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<"internal" | "buyer">("internal");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [uncertaintyProfile, setUncertaintyProfile] = useState<EstimateUncertaintyProfile>(
    DEFAULT_UNCERTAINTY_PROFILE,
  );
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloSummary>(() =>
    runMonteCarloEstimate(
      calculateEstimate(DEFAULT_INPUT, DEFAULT_REFERENCE_PROJECT),
      DEFAULT_INPUT,
      DEFAULT_REFERENCE_PROJECT,
      10_000,
      DEFAULT_UNCERTAINTY_PROFILE,
    ),
  );

  const referenceProjects = [...DEFAULT_REFERENCE_DATABASE, ...uploadedReferences];
  const selectedReference =
    referenceProjects.find((project) => project.id === selectedReferenceId) ??
    DEFAULT_REFERENCE_PROJECT;
  const result = calculateEstimate(input, selectedReference);
  const benchmark = buildKwBenchmark(result, input);
  const estimateSignature = buildEstimateFingerprint(input, selectedReference);
  const currentHistoryEntry: EstimateHistorySnapshot = {
    id: "current",
    signature: estimateSignature,
    savedAt: new Date().toISOString(),
    projectName: input.projectName,
    referenceProjectName: selectedReference.name,
    capacityMw: input.capacityMw,
    baseYear: input.baseYear,
    startYear: input.startYear,
    riskGrade: result.riskGrade,
    escalatedReferenceTotalEok: result.escalatedReferenceTotalEok,
    projectAddonSubtotal: result.projectAddonSubtotal,
    drawingSubtotal: result.drawingSubtotal,
    siteSubtotal: result.siteSubtotal,
    marginEffect: result.marginEffect,
    warranty: result.warranty,
    constructionQuote: result.constructionQuote,
    grandTotal: result.grandTotal,
  };
  const escalationRows = getEscalationBreakdown(
    input.baseYear,
    input.startYear,
    input.inflation,
  );
  const isBuyerMode = viewMode === "buyer";
  const hasCoordinates =
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude) &&
    (Math.abs(input.latitude) > 0.0001 || Math.abs(input.longitude) > 0.0001);
  const hasAddress = input.siteAddress.trim().length > 0;
  const mapQuery = hasCoordinates
    ? `${input.latitude},${input.longitude}`
    : hasAddress
      ? input.siteAddress.trim()
      : "";
  const mapEmbedUrl = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`
    : null;
  const selectedProjectOption =
    PROJECT_OPTIONS.find((option) => option.id === input.projectType) ?? PROJECT_OPTIONS[0];
  const summaryCards = [
    {
      label: copy.scaledReference,
      value: formatEok(result.scaledReferenceTotalEok),
      sub: copy.preEsc,
    },
    {
      label: copy.escalatedReference,
      value: formatEok(result.escalatedReferenceTotalEok),
      sub: copy.startYearBasis,
    },
    {
      label: copy.coreSubtotal,
      value: formatEok(result.costSubtotal),
      sub: copy.coreBasis,
    },
    {
      label: copy.siteAdditions,
      value: formatEok(result.siteSubtotal),
      sub: copy.siteAdder,
    },
    {
      label: copy.warranty,
      value: formatEok(result.warranty),
      sub: `${formatPercent(input.warrantyRate)} ${copy.warrantyBasis}`,
    },
    {
      label: copy.drawingAdders,
      value: formatEok(result.drawingSubtotal),
      sub: copy.drawingReflect,
    },
  ];
  const visibleSummaryCards = isBuyerMode ? summaryCards.slice(1, 5) : summaryCards;
  const buyerHighlights = [
    `${selectedProjectOption.label} 기준으로 ${input.capacityMw.toFixed(1)}MW 규모를 검토했습니다.`,
    `기준 프로젝트 ${selectedReference.name} (${selectedReference.referenceCapacityMw.toFixed(1)}MW / ${selectedReference.referenceYear})를 참조했습니다.`,
    `${input.baseYear}년 기준 금액을 ${input.startYear}년 착공 조건으로 보정했습니다.`,
    `현장 가산 ${formatEok(result.siteSubtotal)} 및 도면 차이 ${formatEok(result.drawingSubtotal)}를 반영했습니다.`,
  ];
  const buyerConditions = [
    `현장: ${input.siteName || input.projectName}`,
    `주소: ${input.siteAddress}`,
    `목표 마진: ${formatPercent(input.marginRate)}`,
    `하자보수: ${formatPercent(input.warrantyRate)}`,
  ];
  const buyerFindings = result.findings.slice(0, 3);
  const buyerBasis = result.basis.slice(0, 4);
  const previousHistoryEntry =
    historySnapshots[0]?.signature === estimateSignature
      ? historySnapshots[1] ?? null
      : historySnapshots[0] ?? null;

  useEffect(() => {
    setMonteCarlo(
      runMonteCarloEstimate(result, input, selectedReference, 10_000, uncertaintyProfile),
    );
  }, [estimateSignature, uncertaintyProfile]);

  useEffect(() => {
    const entry: EstimateHistorySnapshot = {
      id: `${Date.now()}-${Math.round(result.grandTotal * 100)}`,
      signature: estimateSignature,
      savedAt: new Date().toISOString(),
      projectName: input.projectName,
      referenceProjectName: selectedReference.name,
      capacityMw: input.capacityMw,
      baseYear: input.baseYear,
      startYear: input.startYear,
      escalatedReferenceTotalEok: result.escalatedReferenceTotalEok,
      projectAddonSubtotal: result.projectAddonSubtotal,
      drawingSubtotal: result.drawingSubtotal,
      siteSubtotal: result.siteSubtotal,
      marginEffect: result.marginEffect,
      warranty: result.warranty,
      grandTotal: result.grandTotal,
      constructionQuote: result.constructionQuote,
      riskGrade: result.riskGrade,
    };

    setHistorySnapshots((current) => {
      if (current[0]?.signature === estimateSignature) {
        return current;
      }

      const next = [entry, ...current.filter((item) => item.signature !== estimateSignature)].slice(
        0,
        HISTORY_LIMIT,
      );
      return next;
    });
  }, [
    estimateSignature,
    input.baseYear,
    input.capacityMw,
    input.projectName,
    input.startYear,
    result.constructionQuote,
    result.drawingSubtotal,
    result.escalatedReferenceTotalEok,
    result.grandTotal,
    result.marginEffect,
    result.projectAddonSubtotal,
    result.riskGrade,
    result.siteSubtotal,
    result.warranty,
    selectedReference.name,
  ]);

  const setField = <K extends keyof EstimateInput,>(key: K, value: EstimateInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const setSiteSurvey = (id: string, quantity: number) => {
    setInput((current) => ({
      ...current,
      siteSurvey: { ...current.siteSurvey, [id]: Math.max(0, quantity) },
    }));
  };

  const setInflationField = <K extends keyof EstimateInput["inflation"],>(
    key: K,
    value: EstimateInput["inflation"][K],
  ) => {
    setInput((current) => ({
      ...current,
      inflation: { ...current.inflation, [key]: value },
    }));
  };

  const setDrawingField = <K extends keyof EstimateInput["drawingChange"],>(
    key: K,
    value: EstimateInput["drawingChange"][K],
  ) => {
    setInput((current) => ({
      ...current,
      drawingChange: { ...current.drawingChange, [key]: value },
    }));
  };

  const selectReference = (projectId: string) => {
    const project =
      referenceProjects.find((item) => item.id === projectId) ?? DEFAULT_REFERENCE_PROJECT;
    setSelectedReferenceId(projectId);
    setInput((current) => ({ ...current, baseYear: project.referenceYear }));
  };

  const removeReference = (projectId: string) => {
    setUploadedReferences((current) => current.filter((project) => project.id !== projectId));
    if (selectedReferenceId === projectId) {
      setSelectedReferenceId(DEFAULT_REFERENCE_PROJECT.id);
      setInput((current) => ({ ...current, baseYear: DEFAULT_REFERENCE_PROJECT.referenceYear }));
    }
  };

  const updatePendingProjectField = (
    projectId: string,
    key: "name" | "referenceYear" | "referenceCapacityMw",
    value: string | number,
  ) => {
    setPendingImports((current) =>
      current.map((inspection) =>
        inspection.project.id === projectId
          ? summarizeReferenceWorkbookInspection(
              {
                ...inspection.project,
                [key]: value,
              },
              {
                fileName: inspection.fileName,
                sheetCount: inspection.sheetCount,
              },
            )
          : inspection,
      ),
    );
  };

  const updatePendingItemField = (
    projectId: string,
    itemCode: string,
    key: "name" | "category" | "amountEok",
    value: string | number,
  ) => {
    setPendingImports((current) =>
      current.map((inspection) => {
        if (inspection.project.id !== projectId) return inspection;

        return summarizeReferenceWorkbookInspection(
          {
            ...inspection.project,
            items: inspection.project.items.map((item) =>
              item.code === itemCode
                ? {
                    ...item,
                    [key]: value,
                  }
                : item,
            ),
          },
          {
            fileName: inspection.fileName,
            sheetCount: inspection.sheetCount,
          },
        );
      }),
    );
  };

  const removePendingItem = (projectId: string, itemCode: string) => {
    setPendingImports((current) =>
      current.flatMap((inspection) => {
        if (inspection.project.id !== projectId) return inspection;

        const nextItems = inspection.project.items.filter((item) => item.code !== itemCode);
        if (nextItems.length === 0) return [];

        return summarizeReferenceWorkbookInspection(
          {
            ...inspection.project,
            items: nextItems,
          },
          {
            fileName: inspection.fileName,
            sheetCount: inspection.sheetCount,
          },
        );
      }),
    );
  };

  const removePendingImport = (projectId: string) => {
    setPendingImports((current) =>
      current.filter((inspection) => inspection.project.id !== projectId),
    );
  };

  const cancelPendingImports = () => {
    setPendingImports([]);
  };

  const clearHistorySnapshots = () => {
    setHistorySnapshots([]);
  };

  const jumpToInputSection = (sectionId: string) => {
    if (isInputCollapsed) {
      setIsInputCollapsed(false);
    }

    window.setTimeout(() => {
      const target = document.getElementById(sectionId);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, isInputCollapsed ? 180 : 20);
  };

  const setUncertaintyField = (key: keyof EstimateUncertaintyProfile, value: number) => {
    setUncertaintyProfile((current) => ({
      ...current,
      [key]: clampNumber(value, 0, 50),
    }));
  };

  const resetUncertaintyProfile = () => {
    setUncertaintyProfile(DEFAULT_UNCERTAINTY_PROFILE);
  };

  const confirmPendingImports = () => {
    if (pendingImports.length === 0) return;

    const importedProjects = pendingImports.map((inspection) => inspection.project);
    setUploadedReferences((current) => [...importedProjects, ...current]);
    setSelectedReferenceId(importedProjects[0].id);
    setInput((current) => ({ ...current, baseYear: importedProjects[0].referenceYear }));
    setPendingImports([]);
  };

  const handleReferenceImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setImportError(null);
    setIsImporting(true);

    try {
      const inspections: ReferenceWorkbookInspection[] = [];
      const failures: string[] = [];

      for (const file of files) {
        try {
          inspections.push(await inspectReferenceWorkbook(file));
        } catch (error) {
          failures.push(
            `${file.name}: ${error instanceof Error ? error.message : copy.importFailed}`,
          );
        }
      }

      if (inspections.length > 0) {
        setPendingImports(inspections);
      }

      if (failures.length > 0) {
        setImportError(failures.join(" / "));
      }
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className={isBuyerMode ? "estimate-shell estimate-shell--buyer" : "estimate-shell"}>
      <div className="estimate-toolbar">
        <div className="estimate-toolbar__group">
          <div>
            <span className="control-label">화면 보기</span>
            <strong>견적산출 작업 화면</strong>
          </div>
          <div className="estimate-toggle" role="tablist" aria-label="견적 보기 모드">
            <button
              aria-selected={!isBuyerMode}
              className={
                !isBuyerMode
                  ? "estimate-toggle__button estimate-toggle__button--active"
                  : "estimate-toggle__button"
              }
              type="button"
              onClick={() => setViewMode("internal")}
            >
              내부 검토
            </button>
            <button
              aria-selected={isBuyerMode}
              className={
                isBuyerMode
                  ? "estimate-toggle__button estimate-toggle__button--active"
                  : "estimate-toggle__button"
              }
              type="button"
              onClick={() => setViewMode("buyer")}
            >
              바이어 제출
            </button>
          </div>
        </div>

        <div className="estimate-toolbar__facts">
          <span className="tag">{selectedReference.name}</span>
          <span className="tag">{input.capacityMw.toFixed(1)}MW</span>
          <span className="tag">
            {input.baseYear}
            {" -> "}
            {input.startYear}
          </span>
          <span className="tag">{selectedProjectOption.label}</span>
          <span
            className={
              result.riskGrade === "HIGH"
                ? "workflow-badge workflow-badge--review"
                : result.riskGrade === "LOW"
                  ? "workflow-badge workflow-badge--approved"
                  : "workflow-badge workflow-badge--draft"
            }
          >
            {result.riskGrade === "HIGH"
              ? "검토 필요"
              : result.riskGrade === "LOW"
                ? "저위험 확인"
                : "작성 중"}
          </span>
        </div>

        <div className="estimate-toolbar__actions">
          <button
            className="estimate-toolbar__button"
            type="button"
            onClick={() => setIsInputCollapsed((current) => !current)}
          >
            {isInputCollapsed ? "입력 펼치기" : "입력 접기"}
          </button>
          {isBuyerMode ? (
            <button
              className="estimate-toolbar__button estimate-toolbar__button--primary"
              type="button"
              onClick={() => window.print()}
            >
              보고용 인쇄
            </button>
          ) : null}
        </div>
      </div>

      {isInputCollapsed ? (
        <div className="estimate-collapsed-note">
          입력 패널을 접은 상태입니다. 상단의 `입력 펼치기` 버튼으로 다시 열 수 있습니다.
        </div>
      ) : null}

      <div
        className={
          isInputCollapsed ? "estimate-layout estimate-layout--collapsed" : "estimate-layout"
        }
      >
        {!isInputCollapsed ? (
        <aside className="estimate-panel estimate-panel--sticky">
          <div className="control-group" id="estimate-reference">
            <div className="control-header">
              <span className="control-label">{copy.refDb}</span>
              <h2>{copy.estimateTitle}</h2>
              <p>{copy.refWorkbookDesc}</p>
            </div>

            <label className="upload-zone">
              <input
                accept=".xlsx,.xls,.csv"
                className="upload-zone__input"
                multiple
                type="file"
                onChange={handleReferenceImport}
              />
              <span>{isImporting ? copy.importing : copy.uploadWorkbook}</span>
              <small>{copy.localParse}</small>
              </label>

              {importError ? <p className="feedback feedback--error">{importError}</p> : null}

              <div className="upload-trust" role="note" aria-label={copy.uploadTrustTitle}>
                <strong>{copy.uploadTrustTitle}</strong>
                <p>{copy.uploadTrustPrimary}</p>
                <p>{copy.uploadTrustSecondary}</p>
                <p>{copy.uploadTrustTertiary}</p>
                <p>{copy.uploadTrustQuaternary}</p>
              </div>

              <div className="reference-library">
                {referenceProjects.map((project) => (
                <article
                  key={project.id}
                  className={
                    project.id === selectedReferenceId
                      ? "reference-card reference-card--active"
                      : "reference-card"
                  }
                >
                  <button
                    className="reference-card__select"
                    type="button"
                    onClick={() => selectReference(project.id)}
                  >
                    <div>
                      <strong>{project.name}</strong>
                      <span>
                        {project.referenceCapacityMw.toFixed(1)}MW / {project.referenceYear}
                      </span>
                    </div>
                    <strong>{formatEok(project.totalEok)}</strong>
                  </button>
                  <div className="reference-card__meta">
                    <span>
                      {project.source === "excel-upload"
                        ? project.sourceFileName ?? copy.uploadedWorkbook
                        : copy.builtInReference}
                    </span>
                    {project.source === "excel-upload" ? (
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => removeReference(project.id)}
                      >
                        {copy.remove}
                      </button>
                    ) : (
                      <span className="tag">{copy.defaultTag}</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="control-group" id="estimate-project">
            <div className="control-header control-header--compact">
              <span className="control-label">{copy.project}</span>
              <h3>{copy.projectProfile}</h3>
            </div>
            <div className="field-grid field-grid--two">
              <label className="field field--full">
                <span>{copy.projectName}</span>
                <input
                  type="text"
                  value={input.projectName}
                  onChange={(event) => setField("projectName", event.target.value)}
                />
              </label>
              <label className="field">
                <span>{copy.siteName}</span>
                <input
                  type="text"
                  value={input.siteName}
                  onChange={(event) => setField("siteName", event.target.value)}
                />
              </label>
              <label className="field">
                <span>{copy.capacity}</span>
                <input
                  type="number"
                  min="0.1"
                  max="300"
                  step="0.1"
                  value={input.capacityMw}
                  onChange={(event) =>
                    setField(
                      "capacityMw",
                      clampNumber(Number(event.target.value), 0.1, 300),
                    )
                  }
                />
              </label>
              <label className="field field--full">
                <span>{copy.siteAddress}</span>
                <input
                  type="text"
                  value={input.siteAddress}
                  onChange={(event) => setField("siteAddress", event.target.value)}
                />
              </label>
              <label className="field">
                <span>{copy.latitude}</span>
                <input
                  type="number"
                  min="-90"
                  max="90"
                  step="0.0001"
                  value={input.latitude}
                  onChange={(event) =>
                    setField(
                      "latitude",
                      clampNumber(Number(event.target.value), -90, 90),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{copy.longitude}</span>
                <input
                  type="number"
                  min="-180"
                  max="180"
                  step="0.0001"
                  value={input.longitude}
                  onChange={(event) =>
                    setField(
                      "longitude",
                      clampNumber(Number(event.target.value), -180, 180),
                    )
                  }
                />
              </label>
            </div>

            <div className="segmented">
              {PROJECT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={
                    option.id === input.projectType
                      ? "segmented__button segmented__button--active"
                      : "segmented__button"
                  }
                  type="button"
                  onClick={() => setField("projectType", option.id as ProjectType)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="control-group" id="estimate-escalation">
            <div className="control-header control-header--compact">
              <span className="control-label">{copy.escalation}</span>
              <h3>{copy.escalationTitle}</h3>
            </div>
            <div className="field-grid field-grid--two">
              <label className="field field--full">
                <span>{copy.escalationNote}</span>
                <input
                  type="text"
                  value={input.inflation.sourceLabel}
                  onChange={(event) =>
                    setInflationField("sourceLabel", event.target.value)
                  }
                />
              </label>
              <label className="field">
                <span>{copy.priceYear}</span>
                <input
                  type="number"
                  min="2020"
                  max="2040"
                  step="1"
                  value={input.baseYear}
                  onChange={(event) =>
                    setField(
                      "baseYear",
                      clampNumber(Number(event.target.value), 2020, 2040),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{copy.startYear}</span>
                <input
                  type="number"
                  min="2024"
                  max="2045"
                  step="1"
                  value={input.startYear}
                  onChange={(event) =>
                    setField(
                      "startYear",
                      clampNumber(Number(event.target.value), 2024, 2045),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{copy.serviceEsc}</span>
                <input
                  type="number"
                  min="0"
                  max="15"
                  step="0.1"
                  value={input.inflation.serviceRate}
                  onChange={(event) =>
                    setInflationField(
                      "serviceRate",
                      clampNumber(Number(event.target.value), 0, 15),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{copy.procurementEsc}</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={input.inflation.procurementRate}
                  onChange={(event) =>
                    setInflationField(
                      "procurementRate",
                      clampNumber(Number(event.target.value), 0, 20),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{copy.constructionEsc}</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={input.inflation.constructionRate}
                  onChange={(event) =>
                    setInflationField(
                      "constructionRate",
                      clampNumber(Number(event.target.value), 0, 20),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{copy.margin}</span>
                <input
                  type="number"
                  min="0"
                  max="49.9"
                  step="0.1"
                  value={input.marginRate}
                  onChange={(event) =>
                    setField(
                      "marginRate",
                      clampNumber(Number(event.target.value), 0, 49.9),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{copy.warrantyRate}</span>
                <input
                  type="number"
                  min="0"
                  max="8"
                  step="0.1"
                  value={input.warrantyRate}
                  onChange={(event) =>
                    setField(
                      "warrantyRate",
                      clampNumber(Number(event.target.value), 0, 8),
                    )
                  }
                />
              </label>
            </div>

            <div className="escalation-review">
              <div className="escalation-review__header">
                <div>
                  <strong>{copy.escalationSnapshot}</strong>
                  <span>{copy.escalationApplied}</span>
                </div>
                <span className="tag">
                  {result.years === 0 ? "0년" : `${result.years}년 반영`}
                </span>
              </div>
              {result.years === 0 ? (
                <p className="empty-state">{copy.escalationNone}</p>
              ) : null}
              <div className="escalation-review__list">
                {escalationRows.map((row) => (
                  <article className="escalation-review__row" key={row.category}>
                    <div>
                      <strong>{row.label}</strong>
                      <span>연 {formatPercent(row.annualRatePct)}</span>
                    </div>
                    <div className="escalation-review__meta">
                      <strong>x{row.multiplier.toFixed(4)}</strong>
                      <span>{formatPercent(row.compoundedPct, 2)}</span>
                    </div>
                    <small>
                      {copy.escalationFormula}: (1 + {formatPercent(row.annualRatePct)})^{row.years}
                    </small>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="control-group" id="estimate-site">
            <div className="control-header control-header--compact">
              <span className="control-label">{copy.siteReview}</span>
              <h3>{copy.siteReviewTitle}</h3>
            </div>
            <div className="site-list">
              {SITE_SURVEY_OPTIONS.map((item) => (
                <label className="site-row" key={item.id}>
                  <div className="site-row__meta">
                    <strong>{item.label}</strong>
                    <span>
                      {item.unitPriceEokPerUnit.toFixed(3)}{copy.eok} / {item.unit}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={input.siteSurvey[item.id] ?? 0}
                    onChange={(event) =>
                      setSiteSurvey(
                        item.id,
                        clampNumber(Number(event.target.value), 0, 9999),
                      )
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="control-group" id="estimate-drawing">
            <div className="control-header control-header--compact">
              <span className="control-label">{copy.drawingReview}</span>
              <h3>{copy.drawingReviewTitle}</h3>
            </div>
            <div className="field-grid field-grid--two">
              <label className="upload-compact">
                <span>{copy.referenceDrawing}</span>
                <input
                  accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
                  type="file"
                  onChange={(event) =>
                    setDrawingField(
                      "referenceDrawingName",
                      event.target.files?.[0]?.name ?? "",
                    )
                  }
                />
                <small>{input.drawingChange.referenceDrawingName || copy.noFile}</small>
              </label>
              <label className="upload-compact">
                <span>{copy.targetDrawing}</span>
                <input
                  accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
                  type="file"
                  onChange={(event) =>
                    setDrawingField(
                      "targetDrawingName",
                      event.target.files?.[0]?.name ?? "",
                    )
                  }
                />
                <small>{input.drawingChange.targetDrawingName || copy.noFile}</small>
              </label>
              <label className="field">
                <span>{copy.civilChange}</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={input.drawingChange.civilPct}
                  onChange={(event) =>
                    setDrawingField(
                      "civilPct",
                      clampNumber(Number(event.target.value), 0, 50),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{copy.electricalChange}</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={input.drawingChange.electricalPct}
                  onChange={(event) =>
                    setDrawingField(
                      "electricalPct",
                      clampNumber(Number(event.target.value), 0, 50),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{copy.mechanicalChange}</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={input.drawingChange.mechanicalPct}
                  onChange={(event) =>
                    setDrawingField(
                      "mechanicalPct",
                      clampNumber(Number(event.target.value), 0, 50),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{copy.controlChange}</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={input.drawingChange.controlPct}
                  onChange={(event) =>
                    setDrawingField(
                      "controlPct",
                      clampNumber(Number(event.target.value), 0, 50),
                    )
                  }
                />
              </label>
            </div>
          </div>

        </aside>
        ) : null}

        <section className={isBuyerMode ? "estimate-results estimate-results--buyer" : "estimate-results"}>
          <div className="result-main">
            <div className="result-main__copy">
              <span className="control-label">{copy.quote}</span>
              <h2>{formatEok(result.grandTotal)}</h2>
              <p>
                <strong>{selectedReference.name}</strong> {copy.basis}{" "}
                {input.capacityMw.toFixed(1)}MW, {input.baseYear}
                {" -> "}
                {input.startYear}
                {copy.resultTail}
              </p>
            </div>
            <div className="result-main__meta">
              <div>
                <span>{copy.riskGrade}</span>
                <strong className={gradeClass(result.riskGrade)}>{result.riskGrade}</strong>
              </div>
              <div>
                <span>{copy.referenceDelta}</span>
                <strong>
                  {result.referenceDeltaEok >= 0 ? "+" : ""}
                  {formatEok(result.referenceDeltaEok)}
                </strong>
              </div>
              <div>
                <span>{copy.economicsPage}</span>
                <strong>
                  <Link className="text-link" href="/economics">
                    {copy.openEconomics}
                  </Link>
                </strong>
              </div>
            </div>
          </div>

          {isBuyerMode ? (
            <article className="panel-surface buyer-report">
              <div className="panel-surface__header buyer-report__header">
                <div>
                  <span className="control-label">견적 요약</span>
                  <h3>바이어 제출용 보고</h3>
                </div>
                <span className="buyer-report__badge">{selectedProjectOption.label}</span>
              </div>
              <div className="buyer-report__grid">
                <article className="buyer-report__item">
                  <span>프로젝트</span>
                  <strong>{input.projectName}</strong>
                  <small>
                    {input.siteName} · {input.capacityMw.toFixed(1)}MW
                  </small>
                </article>
                <article className="buyer-report__item">
                  <span>제출 견적</span>
                  <strong>{formatEok(result.grandTotal)}</strong>
                  <small>하자보수 {formatPercent(input.warrantyRate)} 포함</small>
                </article>
                <article className="buyer-report__item">
                  <span>기준 프로젝트</span>
                  <strong>{selectedReference.name}</strong>
                  <small>
                    {selectedReference.referenceCapacityMw.toFixed(1)}MW /{" "}
                    {selectedReference.referenceYear}
                  </small>
                </article>
                <article className="buyer-report__item">
                  <span>리스크 등급</span>
                  <strong className={gradeClass(result.riskGrade)}>{result.riskGrade}</strong>
                  <small>기준 대비 {formatPercent(result.referenceDeltaPct)}</small>
                </article>
              </div>
              <div className="buyer-report__panels">
                <article className="buyer-report__panel">
                  <strong>주요 반영 범위</strong>
                  <ul className="buyer-report__list">
                    {buyerHighlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
                <article className="buyer-report__panel">
                  <strong>제출 메모</strong>
                  <ul className="buyer-report__list">
                    {buyerBasis.map((point) => (
                      <li key={point.title}>
                        <span>{point.title}</span>
                        <small>{point.detail}</small>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            </article>
          ) : null}

          <div className={isBuyerMode ? "summary-grid summary-grid--wide summary-grid--buyer" : "summary-grid summary-grid--wide"}>
            {visibleSummaryCards.map((card) => (
              <article className="summary-card" key={card.label}>
                <span className="summary-card__label">{card.label}</span>
                <strong>{card.value}</strong>
                <span className="summary-card__sub">{card.sub}</span>
              </article>
            ))}
          </div>

          {isBuyerMode ? (
            <div className="buyer-grid">
              <article className="panel-surface">
                <div className="panel-surface__header">
                  <span className="control-label">제출 조건</span>
                  <h3>기준 및 상업 조건</h3>
                </div>
                <div className="detail-list">
                  {buyerConditions.map((item) => (
                    <div className="detail-list__row" key={item}>
                      <strong>{item.split(":")[0]}</strong>
                      <span>{item.split(":").slice(1).join(":").trim()}</span>
                    </div>
                  ))}
                  <div className="detail-list__row">
                    <strong>적용 물가상승</strong>
                    <span>
                      서비스 {formatPercent(input.inflation.serviceRate)} / 조달{" "}
                      {formatPercent(input.inflation.procurementRate)} / 시공{" "}
                      {formatPercent(input.inflation.constructionRate)}
                    </span>
                  </div>
                </div>
              </article>

              <article className="panel-surface">
                <div className="panel-surface__header">
                  <span className="control-label">리스크 검토</span>
                  <h3>제출 시 유의사항</h3>
                </div>
                {buyerFindings.length === 0 ? (
                  <p className="empty-state">현재 기준으로 즉시 보고를 막는 주요 이슈는 없습니다.</p>
                ) : (
                  <div className="risk-list">
                    {buyerFindings.map((finding) => (
                      <article className="risk-item" key={finding.title}>
                        <div className="risk-item__header">
                          <strong>{finding.title}</strong>
                          <span className={severityClass(finding.severity)}>
                            {finding.severity}
                          </span>
                        </div>
                        <p>{finding.reason}</p>
                        <div className="risk-item__footer">
                          <span>{copy.impact} {formatEok(finding.impactEok)}</span>
                          <span>{finding.mitigation}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </article>

              <article className="panel-surface">
                <div className="panel-surface__header">
                  <span className="control-label">참조 비교</span>
                  <h3>기준 프로젝트 대비 위치</h3>
                </div>
                <div className="key-metric-grid key-metric-grid--buyer">
                  <div className="key-metric">
                    <span>{copy.referenceOriginal}</span>
                    <strong>{formatEok(result.referenceTotalEok)}</strong>
                  </div>
                  <div className="key-metric">
                    <span>{copy.referenceEscalated}</span>
                    <strong>{formatEok(result.escalatedReferenceTotalEok)}</strong>
                  </div>
                  <div className="key-metric">
                    <span>{copy.currentQuote}</span>
                    <strong>{formatEok(result.grandTotal)}</strong>
                  </div>
                  <div className="key-metric">
                    <span>{copy.delta}</span>
                    <strong>{formatPercent(result.referenceDeltaPct)}</strong>
                  </div>
                </div>
              </article>
            </div>
          ) : (
          <>
          <div className="insight-grid">
            <article className="panel-surface">
              <div className="panel-surface__header">
                <span className="control-label">{copy.categorySplit}</span>
                <h3>{copy.categorySplitTitle}</h3>
              </div>
              <div className="metric-list">
                <div className="metric-row">
                  <span>서비스</span>
                  <strong>{formatEok(result.categoryTotals.S)}</strong>
                </div>
                <div className="metric-row">
                  <span>조달</span>
                  <strong>{formatEok(result.categoryTotals.P)}</strong>
                </div>
                <div className="metric-row">
                  <span>시공</span>
                  <strong>{formatEok(result.categoryTotals.C)}</strong>
                </div>
              </div>
            </article>

            <article className="panel-surface">
              <div className="panel-surface__header">
                <span className="control-label">{copy.riskEnvelope}</span>
                <h3>{copy.riskEnvelopeTitle}</h3>
              </div>
              <div className="metric-list">
                {result.scenarios.map((row) => (
                  <div className="metric-row" key={row.label}>
                    <span>{row.label}</span>
                    <strong>{formatEok(row.total)}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-surface">
              <div className="panel-surface__header">
                <span className="control-label">{copy.bidStrategy}</span>
                <h3>{copy.bidStrategyTitle}</h3>
              </div>
              <div className="metric-list">
                {result.strategies.map((row) => (
                  <div className="metric-row" key={row.label}>
                    <span>{row.label}</span>
                    <strong>{formatEok(row.total)}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <EstimateAnalytics
            benchmark={benchmark}
            currentEntry={currentHistoryEntry}
            history={historySnapshots}
            monteCarlo={monteCarlo}
            onChangeUncertainty={setUncertaintyField}
            onClearHistory={clearHistorySnapshots}
            onJumpToSection={jumpToInputSection}
            onResetUncertainty={resetUncertaintyProfile}
            previousEntry={previousHistoryEntry}
            uncertaintyProfile={uncertaintyProfile}
          />

          <div className="comparison-grid">
            <article className="panel-surface">
              <div className="panel-surface__header">
                <span className="control-label">{copy.referenceComparison}</span>
                <h3>{copy.referenceComparisonTitle}</h3>
              </div>
              <div className="key-metric-grid">
                <div className="key-metric">
                  <span>{copy.referenceOriginal}</span>
                  <strong>{formatEok(result.referenceTotalEok)}</strong>
                </div>
                <div className="key-metric">
                  <span>{copy.referenceEscalated}</span>
                  <strong>{formatEok(result.escalatedReferenceTotalEok)}</strong>
                </div>
                <div className="key-metric">
                  <span>{copy.currentQuote}</span>
                  <strong>{formatEok(result.grandTotal)}</strong>
                </div>
                <div className="key-metric">
                  <span>{copy.delta}</span>
                  <strong>{formatPercent(result.referenceDeltaPct)}</strong>
                </div>
              </div>
              <div className="detail-list">
                {selectedReference.notes.map((note, index) => (
                  <div className="detail-list__row" key={`${selectedReference.id}-${index}`}>
                    <strong>{copy.referenceNote} {index + 1}</strong>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-surface">
              <div className="panel-surface__header">
                <span className="control-label">{copy.riskReview}</span>
                <h3>{copy.riskReviewTitle}</h3>
              </div>
              {result.findings.length === 0 ? (
                <p className="empty-state">{copy.noRisk}</p>
              ) : (
                <div className="risk-list">
                  {result.findings.map((finding) => (
                    <article className="risk-item" key={finding.title}>
                      <div className="risk-item__header">
                        <strong>{finding.title}</strong>
                        <span className={severityClass(finding.severity)}>{finding.severity}</span>
                      </div>
                      <p>{finding.reason}</p>
                      <div className="risk-item__footer">
                        <span>{copy.impact} {formatEok(finding.impactEok)}</span>
                        <span>{finding.mitigation}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="panel-surface">
              <div className="panel-surface__header">
                <span className="control-label">{copy.estimateBasis}</span>
                <h3>{copy.estimateBasisTitle}</h3>
              </div>
              <div className="detail-list">
                {result.basis.map((point) => (
                  <div className="detail-list__row" key={point.title}>
                    <strong>{point.title}</strong>
                    <span>{point.detail}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-surface">
              <div className="panel-surface__header">
                <span className="control-label">{copy.economics}</span>
                <h3>{copy.economicsTitle}</h3>
              </div>
              <div className="detail-list">
                <div className="detail-list__row">
                  <strong>{copy.separatedWorkflow}</strong>
                  <span>{copy.separatedWorkflowDesc}</span>
                </div>
                <div className="detail-list__row">
                  <strong>{copy.economicsInputs}</strong>
                  <span>{copy.economicsInputsDesc}</span>
                </div>
                <div className="detail-list__row">
                  <strong>{copy.economicsOutputs}</strong>
                  <span>{copy.economicsOutputsDesc}</span>
                </div>
              </div>
              <Link
                className="button button--secondary button--secondary-light economics-link"
                href="/economics"
              >
                <span className="button__stack">
                  <strong>{copy.openEconomicsStudio}</strong>
                  <small>{copy.openEconomicsMetrics}</small>
                </span>
              </Link>
            </article>

            <article className="panel-surface">
              <div className="panel-surface__header">
                <span className="control-label">{copy.mapContext}</span>
                <h3>{copy.mapContextTitle}</h3>
              </div>
              {mapEmbedUrl ? (
                <div className="map-frame">
                  <iframe
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    src={mapEmbedUrl}
                    title={copy.mapPreviewTitle}
                  />
                </div>
              ) : (
                <div className="map-frame map-frame--placeholder">
                  <p>{copy.mapEmpty}</p>
                </div>
              )}
              <p className="map-frame__note">{copy.mapExternalNote}</p>
              <div className="detail-list">
                <div className="detail-list__row">
                  <strong>현장명</strong>
                  <span>{input.siteName}</span>
                </div>
                <div className="detail-list__row">
                  <strong>주소</strong>
                  <span>{input.siteAddress}</span>
                </div>
                <div className="detail-list__row">
                  <strong>좌표</strong>
                  <span>
                    {input.latitude.toFixed(4)}, {input.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
              <div className="tag-row">
                <span className="tag">브라우저 직접 조회</span>
                <span className="tag">{input.siteName}</span>
                <span className="tag">{input.siteAddress}</span>
              </div>
            </article>

            <article className="panel-surface">
              <div className="panel-surface__header">
                <span className="control-label">{copy.virtualLayout}</span>
                <h3>{copy.virtualLayoutTitle}</h3>
              </div>
              <LayoutCanvas layout={result.layout} />
              <div className="detail-list">
                <div className="detail-list__row">
                  <strong>{copy.estimatedLandUse}</strong>
                  <span>{result.layout.estimatedLandM2.toLocaleString("en-US")} m2</span>
                </div>
                {result.layout.notes.map((note, index) => (
                  <div className="detail-list__row" key={`layout-note-${index}`}>
                    <strong>{copy.layoutNote} {index + 1}</strong>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <article className="panel-surface">
            <div className="panel-surface__header">
              <span className="control-label">{copy.breakdown}</span>
              <h3>{copy.breakdownTitle}</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{copy.item}</th>
                    <th>{copy.kind}</th>
                    <th>{copy.category}</th>
                    <th>{copy.base}</th>
                    <th>{copy.escalated}</th>
                    <th>{copy.basisCol}</th>
                    <th>{copy.note}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.costItems.concat(result.siteItems).map((item) => (
                    <tr key={item.code}>
                      <td>{item.name}</td>
                      <td>{item.kind}</td>
                      <td>{item.category}</td>
                      <td>{formatEok(item.amountEok)}</td>
                      <td>{formatEok(item.adjustedAmountEok)}</td>
                      <td>{item.basis ?? "-"}</td>
                      <td>{item.note ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          </>
          )}
        </section>
      </div>

      {pendingImports.length > 0 ? (
        <div className="review-modal" role="presentation">
          <button
            aria-label={copy.cancelReview}
            className="review-modal__backdrop"
            type="button"
            onClick={cancelPendingImports}
          />
          <div
            aria-describedby="reference-review-description"
            aria-labelledby="reference-review-title"
            aria-modal="true"
            className="review-modal__panel"
            role="dialog"
          >
            <div className="review-modal__header">
              <div>
                <span className="control-label">{copy.reviewImport}</span>
                <h3 id="reference-review-title">{copy.reviewImportTitle}</h3>
                <p id="reference-review-description">{copy.reviewImportDesc}</p>
              </div>
              <span className="tag">
                {pendingImports.length}개 {copy.importReady}
              </span>
            </div>

            <div className="review-modal__body">
              {pendingImports.map((inspection) => (
                <article className="import-review-card" key={inspection.project.id}>
                  <div className="import-review-card__header">
                    <div>
                      <strong>{inspection.fileName}</strong>
                      <span>{inspection.project.sourceFileName ?? inspection.fileName}</span>
                    </div>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => removePendingImport(inspection.project.id)}
                    >
                      {copy.removePending}
                    </button>
                  </div>

                  <div className="field-grid field-grid--two">
                    <label className="field field--full">
                      <span>{copy.reviewName}</span>
                      <input
                        type="text"
                        value={inspection.project.name}
                        onChange={(event) =>
                          updatePendingProjectField(
                            inspection.project.id,
                            "name",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                    <label className="field">
                      <span>{copy.reviewYear}</span>
                      <input
                        type="number"
                        min="2020"
                        max="2045"
                        step="1"
                        value={inspection.project.referenceYear}
                        onChange={(event) =>
                          updatePendingProjectField(
                            inspection.project.id,
                            "referenceYear",
                            clampNumber(Number(event.target.value), 2020, 2045),
                          )
                        }
                      />
                    </label>
                    <label className="field">
                      <span>{copy.reviewCapacity}</span>
                      <input
                        type="number"
                        min="0.1"
                        max="300"
                        step="0.1"
                        value={inspection.project.referenceCapacityMw}
                        onChange={(event) =>
                          updatePendingProjectField(
                            inspection.project.id,
                            "referenceCapacityMw",
                            clampNumber(Number(event.target.value), 0.1, 300),
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="summary-grid">
                    <article className="summary-card">
                      <span className="summary-card__label">{copy.parsedTotal}</span>
                      <strong>{formatEok(inspection.project.totalEok)}</strong>
                    </article>
                    <article className="summary-card">
                      <span className="summary-card__label">{copy.parsedItems}</span>
                      <strong>{inspection.itemCount.toLocaleString("en-US")}개</strong>
                    </article>
                    <article className="summary-card">
                      <span className="summary-card__label">{copy.parsedSheets}</span>
                      <strong>{inspection.sheetCount.toLocaleString("en-US")}개</strong>
                    </article>
                  </div>

                  <div className="import-review-card__split">
                    <span className="summary-card__label">{copy.categorySubtotal}</span>
                    <div className="tag-row">
                      <span className="tag">S {formatEok(inspection.categoryTotals.S)}</span>
                      <span className="tag">P {formatEok(inspection.categoryTotals.P)}</span>
                      <span className="tag">C {formatEok(inspection.categoryTotals.C)}</span>
                    </div>
                  </div>

                  <div className="import-review-card__split">
                    <span className="summary-card__label">{copy.reviewItems}</span>
                    <span className="field-hint">{copy.reviewItemsDesc}</span>
                    <div className="table-wrap import-review-table-wrap">
                      <table className="import-review-table">
                        <thead>
                          <tr>
                            <th>{copy.reviewCode}</th>
                            <th>{copy.item}</th>
                            <th>{copy.reviewCategoryCode}</th>
                            <th>{copy.reviewAmount}</th>
                            <th>{copy.reviewItemNote}</th>
                            <th>{copy.removePending}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inspection.project.items.map((item) => (
                            <tr key={`${inspection.project.id}-${item.code}`}>
                              <td>{item.code}</td>
                              <td>
                                <input
                                  className="table-input"
                                  type="text"
                                  value={item.name}
                                  onChange={(event) =>
                                    updatePendingItemField(
                                      inspection.project.id,
                                      item.code,
                                      "name",
                                      event.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <select
                                  className="table-input"
                                  value={item.category}
                                  onChange={(event) =>
                                    updatePendingItemField(
                                      inspection.project.id,
                                      item.code,
                                      "category",
                                      event.target.value,
                                    )
                                  }
                                >
                                  <option value="S">S</option>
                                  <option value="P">P</option>
                                  <option value="C">C</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  className="table-input"
                                  type="number"
                                  min="0"
                                  step="0.0001"
                                  value={item.amountEok}
                                  onChange={(event) =>
                                    updatePendingItemField(
                                      inspection.project.id,
                                      item.code,
                                      "amountEok",
                                      clampNumber(Number(event.target.value), 0, 999999),
                                    )
                                  }
                                />
                              </td>
                              <td>{item.note ?? "-"}</td>
                              <td>
                                <button
                                  className="text-button"
                                  type="button"
                                  onClick={() => removePendingItem(inspection.project.id, item.code)}
                                >
                                  {copy.removePending}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="detail-list">
                    <div className="detail-list__row">
                      <strong>{copy.warnings}</strong>
                      <span>
                        {inspection.warnings.length > 0 ? (
                          inspection.warnings.join(" / ")
                        ) : (
                          copy.noWarnings
                        )}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="review-modal__footer">
              <button className="button button--secondary" type="button" onClick={cancelPendingImports}>
                {copy.cancelReview}
              </button>
              <button className="button button--primary" type="button" onClick={confirmPendingImports}>
                {copy.confirmReview}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
