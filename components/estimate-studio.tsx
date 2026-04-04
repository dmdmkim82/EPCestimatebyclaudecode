"use client";

import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { DisplayConfig } from "@/components/display-config";
import { EstimateAnalytics } from "@/components/estimate-analytics";
import { SiteHeader } from "@/components/site-header";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATEGORY_SHEET_NAMES,
  CATEGORY_SHORT_LABELS,
  PERCENT_BASE_OPTIONS,
  PRICING_MODE_OPTIONS,
  calculateWorkbookSummary,
  createEmptyItem,
  createSeedWorkbook,
  formatEok,
  formatKrw,
  formatPercent,
  getItemComputedAmount,
  getPercentBaseLabel,
  getSubcategoryOptions,
  normalizeItem,
  type EstimateCategory,
  type EstimateItem,
  type EstimateProjectMeta,
  type EstimateWorkbook,
} from "@/lib/estimator";
import {
  createWorkbookBlob,
  importReferenceWorkbookFile,
  importWorkbookFile,
  type ReferenceCatalog,
} from "@/lib/excel-import";

type FilterCategory = EstimateCategory | "ALL";
type StudioViewMode = "executive" | "field";

type ImportSnapshot = {
  fileName: string;
  importedCount: number;
  warnings: string[];
  sheetCounts: Record<string, number>;
};

type PendingReferenceItem = {
  id: string;
  include: boolean;
  category: EstimateCategory;
  subcategory: string;
  name: string;
  amount: number;
  unit: string;
  referenceCode: string;
  referenceItemId: string;
  referenceLabel: string;
  pathLabel: string;
  rowNumber: number;
};

type PendingReferenceReview = {
  fileName: string;
  projectName: string;
  referenceYear: number | null;
  capacityMw: number | null;
  items: PendingReferenceItem[];
};

type PendingReferenceSummary = {
  includedCount: number;
  totalAmount: number;
  categoryTotals: Record<EstimateCategory, number>;
  warnings: string[];
};

const referenceAmountUnit = 100_000_000;

function buildFileStem(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPendingReferenceReview(
  fileName: string,
  catalog: ReferenceCatalog,
): PendingReferenceReview {
  return {
    fileName,
    projectName: catalog.meta.referenceTitle || buildFileStem(fileName),
    referenceYear: catalog.meta.projectYear,
    capacityMw: catalog.meta.capacityMw,
    items: catalog.items.map((item) => ({
      id: item.id,
      include: true,
      category: item.epcCategory,
      subcategory:
        item.subName || item.majorName || getSubcategoryOptions(item.epcCategory)[0] || "",
      name: item.name,
      amount: item.referenceAmount,
      unit: item.unit || "식",
      referenceCode: item.referenceCode,
      referenceItemId: item.id,
      referenceLabel: item.pathLabel,
      pathLabel: item.pathLabel,
      rowNumber: item.rowNumber,
    })),
  };
}

function summarizePendingReference(review: PendingReferenceReview): PendingReferenceSummary {
  const categoryTotals: Record<EstimateCategory, number> = {
    E: 0,
    P: 0,
    C: 0,
    ETC: 0,
  };

  const includedItems = review.items.filter((item) => item.include);
  for (const item of includedItems) {
    categoryTotals[item.category] += item.amount;
  }

  const totalAmount = includedItems.reduce((sum, item) => sum + item.amount, 0);
  const warnings: string[] = [];

  if (!review.referenceYear) {
    warnings.push("기준연도를 찾지 못해 적용 전에 연도를 확인해 주세요.");
  }

  if (!review.capacityMw) {
    warnings.push("기준용량을 찾지 못해 용량 비교는 별도 확인이 필요합니다.");
  }

  if (includedItems.length < 5) {
    warnings.push("검수 대상 항목 수가 적습니다. 합계행만 읽힌 것은 아닌지 확인해 주세요.");
  }

  if (totalAmount > 0 && totalAmount < 30 * referenceAmountUnit) {
    warnings.push("파싱 총액이 30억원 미만입니다. 단위나 금액 열을 다시 검토해 주세요.");
  }

  if (totalAmount > 2_000 * referenceAmountUnit) {
    warnings.push("파싱 총액이 2,000억원을 초과합니다. 원 단위가 중복 환산되지 않았는지 확인해 주세요.");
  }

  const directCategories: EstimateCategory[] = ["E", "P", "C"];
  const dominant = directCategories
    .map((category) => ({
      category,
      share: totalAmount > 0 ? categoryTotals[category] / totalAmount : 0,
    }))
    .sort((left, right) => right.share - left.share)[0];

  if (dominant && dominant.share >= 0.85) {
    warnings.push(
      `${CATEGORY_SHORT_LABELS[dominant.category]} 비중이 85% 이상입니다. 카테고리 분류가 맞는지 확인해 주세요.`,
    );
  }

  const emptyCategories = directCategories.filter((category) => categoryTotals[category] === 0);
  if (emptyCategories.length > 0) {
    warnings.push(
      `${emptyCategories.map((category) => CATEGORY_SHORT_LABELS[category]).join(", ")} 항목이 없습니다.`,
    );
  }

  return {
    includedCount: includedItems.length,
    totalAmount,
    categoryTotals,
    warnings,
  };
}

export function EstimateStudio() {
  const [workbook, setWorkbook] = useState<EstimateWorkbook>(() => createSeedWorkbook());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<StudioViewMode>("executive");
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("ALL");
  const [activeSubcategory, setActiveSubcategory] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [importSnapshot, setImportSnapshot] = useState<ImportSnapshot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingReference, setPendingReference] = useState<PendingReferenceReview | null>(null);
  const [isWorkbookImporting, setIsWorkbookImporting] = useState(false);
  const [isReferenceImporting, setIsReferenceImporting] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const workbookImportRef = useRef<HTMLInputElement | null>(null);
  const referenceImportRef = useRef<HTMLInputElement | null>(null);
  const deferredKeyword = useDeferredValue(searchKeyword.trim().toLowerCase());

  const summary = calculateWorkbookSummary(workbook);
  const selectedItem = workbook.items.find((item) => item.id === selectedItemId) ?? null;
  const pendingReferenceSummary = pendingReference
    ? summarizePendingReference(pendingReference)
    : null;

  const matchesFilter = (item: EstimateItem) => {
    if (activeCategory !== "ALL" && item.category !== activeCategory) return false;
    if (activeSubcategory && item.subcategory !== activeSubcategory) return false;

    if (!deferredKeyword) return true;

    const target = [
      item.code,
      item.name,
      item.spec,
      item.note,
      item.referenceCode,
      item.referenceLabel,
    ]
      .join(" ")
      .toLowerCase();

    return target.includes(deferredKeyword);
  };

  const visibleItems = workbook.items.filter(matchesFilter);
  const visibleTotal = summary.resolvedItems
    .filter(matchesFilter)
    .reduce((sum, item) => sum + item.amount, 0);
  const referencedCount = workbook.items.filter((item) => item.referenceItemId).length;
  const topItem = summary.topItems[0] ?? null;
  const dominantCategory =
    summary.categorySummaries
      .filter((category) => category.count > 0)
      .sort((left, right) => right.total - left.total)[0] ?? null;
  const activeWarningCount =
    (importSnapshot?.warnings.length ?? 0) + (pendingReferenceSummary?.warnings.length ?? 0);
  const activeFilterLabel =
    activeCategory === "ALL"
      ? "전체 항목"
      : activeSubcategory
        ? `${CATEGORY_SHORT_LABELS[activeCategory]} / ${activeSubcategory}`
        : CATEGORY_LABELS[activeCategory];
  const activeFilterDescription =
    activeCategory === "ALL"
      ? "전체 카테고리와 하위 항목을 한 번에 검토합니다."
      : CATEGORY_DESCRIPTIONS[activeCategory];
  const editorSubcategoryOptions = selectedItem
    ? getSubcategoryOptions(selectedItem.category)
    : [];
  const editorCategory =
    activeCategory === "ALL" ? selectedItem?.category ?? "E" : activeCategory;
  const isBusy = isWorkbookImporting || isReferenceImporting || isTransitionPending;
  const viewModes: Array<{
    value: StudioViewMode;
    label: string;
    description: string;
  }> = [
    {
      value: "executive",
      label: "임원 보고형",
      description: "핵심 지표, 결정 포인트, 검수 상태를 먼저 보여줍니다.",
    },
    {
      value: "field",
      label: "현장 견적 실무형",
      description: "분류 트리, 내역표, 편집 패널을 중심으로 바로 작업합니다.",
    },
  ];
  const heroContent =
    viewMode === "executive"
      ? {
          eyebrow: "임원 보고형",
          title: "총 견적과 결정 포인트를 빠르게 공유하는 SOFC EPC 보고 화면",
          body:
            "최종 금액, 카테고리 비중, 최대 항목, 검수 상태를 먼저 보여주고 세부 내역은 뒤에서 뒷받침하는 구성을 제공합니다.",
          guides: [
            "의사결정자에게 필요한 숫자를 먼저 배치합니다.",
            "검수 여부와 참조 연결 상태를 같이 보여 신뢰도를 높입니다.",
            "필요하면 현장 견적 실무형으로 바로 전환해 세부 편집을 이어갈 수 있습니다.",
          ],
        }
      : {
          eyebrow: "현장 견적 실무형",
          title: "분류 트리와 편집 패널을 동시에 보는 SOFC EPC 견적 작업 화면",
          body:
            "카테고리별 항목을 빠르게 추가하고, 수량·단가·비율을 수정하면서 계산 결과를 즉시 확인하는 실무 중심 구성을 제공합니다.",
          guides: [
            "분류 트리, 내역표, 편집 패널을 한 화면에 유지합니다.",
            "참조 워크북 검수 후 반영 흐름을 끊지 않고 이어갑니다.",
            "같은 계산 엔진을 그대로 사용해 보고형 숫자와 실무형 숫자가 항상 일치합니다.",
          ],
        };
  const executiveSummaryCards = [
    {
      label: "총 견적",
      value: formatEok(summary.grandTotal),
      sub: `직접 EPC ${formatEok(summary.directTotal)} + ETC ${formatEok(summary.etcTotal)}`,
      strong: true,
    },
    {
      label: "최대 카테고리",
      value: dominantCategory ? CATEGORY_SHORT_LABELS[dominantCategory.category] : "대기",
      sub: dominantCategory
        ? `${formatEok(dominantCategory.total)} / ${formatPercent(dominantCategory.shareOfGrandTotal * 100)}`
        : "항목 입력 후 자동 계산",
    },
    {
      label: "참조 추적",
      value: `${referencedCount}개`,
      sub: pendingReference
        ? `${pendingReferenceSummary?.includedCount ?? 0}개 항목 검수 대기`
        : "검수 후 반영된 기준 항목 수",
    },
    {
      label: "검수 상태",
      value:
        pendingReference
          ? "검수 진행 중"
          : activeWarningCount > 0
            ? `검토 메모 ${activeWarningCount}건`
            : "검수 이상 없음",
      sub: importSnapshot
        ? `${importSnapshot.fileName} 기준 최근 불러오기 완료`
        : "참조 워크북 업로드 시 검수 흐름 시작",
    },
  ];
  const executiveMessages = [
    `${workbook.meta.projectName || "프로젝트명 미입력"} / ${workbook.meta.clientName || "발주처 미입력"}`,
    `${workbook.meta.baseYear}년 기준, ${workbook.meta.startYear}년 착수 조건`,
    dominantCategory
      ? `${CATEGORY_LABELS[dominantCategory.category]} 비중이 현재 가장 큽니다.`
      : "카테고리 비중은 항목 입력 후 자동 계산됩니다.",
    topItem ? `최대 금액 항목은 ${topItem.name}입니다.` : "최대 금액 항목은 아직 없습니다.",
  ];
  const executiveReadiness = [
    {
      label: "검수 상태",
      value:
        pendingReference
          ? "검수 모달 진행 중"
          : activeWarningCount > 0
            ? `검토 메모 ${activeWarningCount}건`
            : "반영 가능한 상태",
    },
    {
      label: "참조 연결",
      value: `${referencedCount}개 항목`,
    },
    {
      label: "프로젝트 번호",
      value: workbook.meta.estimateNo || "미입력",
    },
    {
      label: "작성 책임",
      value: workbook.meta.preparedBy || "미입력",
    },
  ];

  useEffect(() => {
    if (!selectedItemId && workbook.items[0]) {
      setSelectedItemId(workbook.items[0].id);
      return;
    }

    if (selectedItemId && !workbook.items.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(workbook.items[0]?.id ?? null);
    }
  }, [selectedItemId, workbook.items]);

  const updateMetaField = <K extends keyof EstimateProjectMeta>(
    key: K,
    value: EstimateProjectMeta[K],
  ) => {
    setWorkbook((current) => ({
      ...current,
      meta: {
        ...current.meta,
        [key]: value,
      },
    }));
  };

  const updateItem = (
    itemId: string,
    updater: (item: EstimateItem) => Partial<EstimateItem>,
  ) => {
    setWorkbook((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? normalizeItem({ ...item, ...updater(item) }, current.items) : item,
      ),
    }));
  };

  const addItem = (category: EstimateCategory = editorCategory) => {
    let nextId: string | null = null;

    setWorkbook((current) => {
      const nextItem = createEmptyItem(category, current.items);
      nextId = nextItem.id;

      return {
        ...current,
        items: [...current.items, nextItem],
      };
    });

    setActiveCategory(category);
    setActiveSubcategory("");
    setSelectedItemId(nextId);
    setNotice(`${CATEGORY_SHORT_LABELS[category]} 항목 편집을 시작했습니다.`);
    setError(null);
  };

  const duplicateSelectedItem = () => {
    if (!selectedItem) return;

    let nextId: string | null = null;

    setWorkbook((current) => {
      const duplicated = normalizeItem(
        {
          ...selectedItem,
          id: "",
          code: "",
          name: selectedItem.name ? `${selectedItem.name} 복사본` : "",
        },
        current.items,
      );

      nextId = duplicated.id;

      return {
        ...current,
        items: [...current.items, duplicated],
      };
    });

    setSelectedItemId(nextId);
    setNotice("선택 항목을 복사했습니다.");
    setError(null);
  };

  const removeSelectedItem = () => {
    if (!selectedItem) return;

    setWorkbook((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== selectedItem.id),
    }));

    setNotice(`${selectedItem.code} 항목을 삭제했습니다.`);
    setError(null);
  };

  const handleDownloadWorkbook = () => {
    const blob = createWorkbookBlob(workbook);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${workbook.meta.projectName || "estimate"}-${workbook.meta.estimateNo || "draft"}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("현재 견적서를 엑셀로 저장했습니다.");
    setError(null);
  };

  const handleWorkbookImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsWorkbookImporting(true);
    setNotice(null);
    setError(null);

    try {
      const result = await importWorkbookFile(file);

      startTransition(() => {
        setWorkbook(result.workbook);
        setSelectedItemId(result.workbook.items[0]?.id ?? null);
        setActiveCategory("ALL");
        setActiveSubcategory("");
        setImportSnapshot({
          fileName: file.name,
          importedCount: result.importedCount,
          warnings: result.warnings,
          sheetCounts: result.sheetCounts,
        });
      });

      setNotice(`${file.name}에서 ${result.importedCount}개 항목을 불러왔습니다.`);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "엑셀 파일을 읽는 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setIsWorkbookImporting(false);
    }
  };

  const handleReferenceImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsReferenceImporting(true);
    setNotice(null);
    setError(null);

    try {
      const catalog = await importReferenceWorkbookFile(file);
      setPendingReference(buildPendingReferenceReview(file.name, catalog));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "참조 워크북을 읽는 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setIsReferenceImporting(false);
    }
  };

  const confirmPendingReference = () => {
    if (!pendingReference) return;

    const includedItems = pendingReference.items.filter((item) => item.include);
    if (includedItems.length === 0) {
      setError("반영할 참조 항목이 없습니다. 최소 1개 이상 선택해 주세요.");
      return;
    }

    let firstCreatedId: string | null = null;

    setWorkbook((current) => {
      const appendedItems: EstimateItem[] = [];
      const referenceNote = [
        pendingReference.projectName,
        pendingReference.referenceYear ? `${pendingReference.referenceYear}년` : null,
        pendingReference.capacityMw ? `${pendingReference.capacityMw}MW` : null,
      ]
        .filter(Boolean)
        .join(" / ");

      for (const item of includedItems) {
        const nextItem = normalizeItem(
          {
            id: "",
            code: "",
            category: item.category,
            subcategory:
              item.subcategory || getSubcategoryOptions(item.category)[0] || item.category,
            name: item.name,
            spec: item.pathLabel,
            unit: item.unit,
            pricingMode: "MANUAL",
            manualAmount: item.amount,
            note: [referenceNote, item.pathLabel].filter(Boolean).join(" · "),
            referenceItemId: item.referenceItemId,
            referenceCode: item.referenceCode,
            referenceLabel: item.referenceLabel,
            referenceAmount: item.amount,
          },
          [...current.items, ...appendedItems],
        );

        firstCreatedId ??= nextItem.id;
        appendedItems.push(nextItem);
      }

      const nextNotes = [
        current.meta.notes,
        `${pendingReference.projectName} 기준 항목을 검수 후 반영`,
      ]
        .filter(Boolean)
        .join("\n");

      return {
        ...current,
        meta: {
          ...current.meta,
          baseYear:
            current.items.length === 0 && pendingReference.referenceYear
              ? pendingReference.referenceYear
              : current.meta.baseYear,
          notes: nextNotes,
        },
        items: [...current.items, ...appendedItems],
      };
    });

    setPendingReference(null);
    setSelectedItemId(firstCreatedId);
    setActiveCategory("ALL");
    setActiveSubcategory("");
    setNotice(`${includedItems.length}개 참조 항목을 검수 후 반영했습니다.`);
    setError(null);
  };

  const summaryCards = [
    {
      label: "총 견적",
      value: formatEok(summary.grandTotal),
      sub: `직접 EPC ${formatEok(summary.directTotal)} + ETC ${formatEok(summary.etcTotal)}`,
      strong: true,
    },
    {
      label: "직접 EPC",
      value: formatEok(summary.directTotal),
      sub: `E ${formatEok(summary.categoryTotals.E)} / P ${formatEok(summary.categoryTotals.P)} / C ${formatEok(summary.categoryTotals.C)}`,
    },
    {
      label: "ETC / 간접",
      value: formatEok(summary.etcTotal),
      sub: "비율 항목과 고정금액을 포함합니다.",
    },
    {
      label: "현재 보기",
      value: formatEok(visibleTotal),
      sub: `${visibleItems.length}개 항목이 필터에 포함됩니다.`,
    },
    {
      label: "참조 연결",
      value: `${referencedCount}개`,
      sub: "검수 후 반영된 기준 항목 수입니다.",
    },
    {
      label: "최대 항목",
      value: topItem ? formatEok(topItem.amount) : "없음",
      sub: topItem ? topItem.name : "아직 입력된 항목이 없습니다.",
    },
  ];
  const deliveryPillars = [
    {
      label: "설계 기준",
      title: "설계 기준 정리",
      detail: "대분류, 세부분류, 기준연도와 참조 경로를 한 흐름으로 연결합니다.",
    },
    {
      label: "조달 준비",
      title: "조달 준비도",
      detail: "자재·패키지 항목을 코드와 기준금액까지 함께 추적합니다.",
    },
    {
      label: "시공 반영",
      title: "시공 통제",
      detail: "현장 시공성 검토를 직접비와 간접비 구분 안에서 유지합니다.",
    },
    {
      label: "검수 게이트",
      title: "검수 통과",
      detail: "참조 워크북은 수정 가능한 검수 모달을 통과해야만 반영됩니다.",
    },
  ];
  const controlNotes = [
    `품질 기준: 계산은 단일 엔진에서만 수행`,
    `참조 연결: ${referencedCount}개 항목 추적 중`,
    topItem ? `최대 항목: ${topItem.name}` : "최대 항목: 입력 대기",
  ];

  return (
    <>
      <div className="estimate-studio">
        <SiteHeader />

        <section className="panel estimate-hero">
          <div className="estimate-hero__copy">
            <span className="eyebrow">{heroContent.eyebrow}</span>
            <h1>{heroContent.title}</h1>
            <p>{heroContent.body}</p>
            <ul className="guide-list">
              {heroContent.guides.map((guide) => (
                <li key={guide}>{guide}</li>
              ))}
            </ul>
          </div>

          <div className="estimate-actions">
            <button
              className="button button--primary"
              type="button"
              onClick={() => (viewMode === "executive" ? setViewMode("field") : addItem())}
            >
              {viewMode === "executive" ? "현장 견적 실무형으로 전환" : "새 항목 추가"}
            </button>
            <button
              className="button button--secondary"
              disabled={isBusy}
              type="button"
              onClick={handleDownloadWorkbook}
            >
              현재 견적 엑셀
            </button>
            <button
              className="button button--ghost"
              disabled={isBusy}
              type="button"
              onClick={() => workbookImportRef.current?.click()}
            >
              {isWorkbookImporting ? "엑셀 불러오는 중..." : "견적 엑셀 불러오기"}
            </button>
            <button
              className="button button--secondary"
              disabled={isBusy}
              type="button"
              onClick={() => referenceImportRef.current?.click()}
            >
              {isReferenceImporting ? "참조 워크북 읽는 중..." : "참조 워크북 업로드"}
            </button>

            <DisplayConfig />

            <div className="preview-card estimate-hero__preview">
              <span>현재 상태</span>
              <strong>{summaryCards[0].value}</strong>
              <p>{summaryCards[0].sub}</p>
              <small>
                {workbook.meta.projectName || "프로젝트명 미입력"} · {workbook.meta.estimateNo}
              </small>
            </div>

            <div className="insight-card estimate-hero__control-card">
              <span>프로젝트 통제 원칙</span>
              <strong>품질, 검수, 추적성을 우선합니다.</strong>
              {controlNotes.map((note) => (
                <small key={note}>{note}</small>
              ))}
            </div>
          </div>
        </section>

        <section className="panel mode-panel">
          <div className="panel__header">
            <div>
              <span className="panel__eyebrow">화면 모드 선택</span>
              <h2>{viewMode === "executive" ? "임원 보고형 보기" : "현장 견적 실무형 보기"}</h2>
            </div>
            <span className="panel-chip panel-chip--soft">숫자는 동일, 보기만 전환</span>
          </div>

          <div className="mode-switch">
            {viewModes.map((mode) => (
              <button
                key={mode.value}
                aria-pressed={viewMode === mode.value}
                className={
                  viewMode === mode.value ? "mode-option mode-option--active" : "mode-option"
                }
                type="button"
                onClick={() => setViewMode(mode.value)}
              >
                <span>{mode.label}</span>
                <strong>
                  {mode.value === "executive" ? "임원 공유 대시보드" : "실무 입력 작업 화면"}
                </strong>
                <small>{mode.description}</small>
              </button>
            ))}
          </div>
        </section>

        <div className={viewMode === "executive" ? "view-shell" : "view-shell view-shell--hidden"}>
          <section className="summary-strip summary-strip--executive">
            {executiveSummaryCards.map((card) => (
              <article
                key={card.label}
                className={card.strong ? "summary-card summary-card--strong" : "summary-card"}
              >
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.sub}</small>
              </article>
            ))}
          </section>

          <section className="report-grid">
            <article className="panel report-panel report-panel--wide">
              <div className="panel__header">
                <div>
                  <span className="panel__eyebrow">보고 핵심</span>
                  <h2>보고 핵심 메시지</h2>
                </div>
                <span className="panel-chip">{formatEok(summary.grandTotal)}</span>
              </div>

              <div className="report-message-list">
                {executiveMessages.map((message) => (
                  <article className="report-message" key={message}>
                    <strong>{message}</strong>
                  </article>
                ))}
              </div>
            </article>

            <article className="panel report-panel">
              <div className="panel__header">
                <div>
                  <span className="panel__eyebrow">검토 준비</span>
                  <h2>검수와 준비 상태</h2>
                </div>
              </div>

              <div className="report-readiness">
                {executiveReadiness.map((item) => (
                  <div className="report-readiness__row" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel report-panel report-panel--wide">
              <div className="panel__header">
                <div>
                  <span className="panel__eyebrow">주요 원가</span>
                  <h2>핵심 원가 항목</h2>
                </div>
                <span className="panel-chip panel-chip--soft">
                  상위 {Math.min(summary.topItems.length, 5)}개
                </span>
              </div>

              <div className="table-wrap">
                <table className="estimate-table estimate-table--compact">
                  <thead>
                    <tr>
                      <th>항목</th>
                      <th>카테고리</th>
                      <th>기준</th>
                      <th>금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topItems.length === 0 ? (
                      <tr>
                        <td className="empty-cell" colSpan={4}>
                          보고용 핵심 항목은 입력 후 자동으로 정리됩니다.
                        </td>
                      </tr>
                    ) : (
                      summary.topItems.slice(0, 5).map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="cell-stack">
                              <strong>{item.name}</strong>
                              <small>{item.code}</small>
                            </div>
                          </td>
                          <td>{CATEGORY_SHORT_LABELS[item.category]}</td>
                          <td>
                            {item.pricingMode === "PERCENT"
                              ? getPercentBaseLabel(item.percentBase)
                              : item.subcategory}
                          </td>
                          <td className="amount-cell">{formatEok(item.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel report-panel">
              <div className="panel__header">
                <div>
                  <span className="panel__eyebrow">프로젝트 정보</span>
                  <h2>프로젝트 개요</h2>
                </div>
              </div>

              <div className="report-readiness">
                <div className="report-readiness__row">
                  <span>프로젝트</span>
                  <strong>{workbook.meta.projectName || "미입력"}</strong>
                </div>
                <div className="report-readiness__row">
                  <span>발주처</span>
                  <strong>{workbook.meta.clientName || "미입력"}</strong>
                </div>
                <div className="report-readiness__row">
                  <span>현장 위치</span>
                  <strong>{workbook.meta.location || "미입력"}</strong>
                </div>
                <div className="report-readiness__row">
                  <span>작성자</span>
                  <strong>{workbook.meta.preparedBy || "미입력"}</strong>
                </div>
              </div>
            </article>
          </section>

          <EstimateAnalytics summary={summary} />
        </div>

        <div className={viewMode === "field" ? "view-shell" : "view-shell view-shell--hidden"}>
          <section className="delivery-strip">
            {deliveryPillars.map((pillar) => (
              <article className="delivery-card" key={pillar.title}>
                <span>{pillar.label}</span>
                <strong>{pillar.title}</strong>
                <p>{pillar.detail}</p>
              </article>
            ))}
          </section>

          <section className="summary-strip">
            {summaryCards.map((card) => (
              <article
                key={card.label}
                className={card.strong ? "summary-card summary-card--strong" : "summary-card"}
              >
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.sub}</small>
              </article>
            ))}
          </section>

          <section className="project-grid">
            <article className="panel project-panel">
              <div className="panel__header">
                <div>
                  <span className="panel__eyebrow">프로젝트 메타</span>
                  <h2>견적 기본 정보</h2>
                </div>
                <span className="panel-chip panel-chip--soft">KRW 기준</span>
              </div>

            <div className="meta-grid">
              <label className="field">
                <span>프로젝트명</span>
                <input
                  type="text"
                  value={workbook.meta.projectName}
                  onChange={(event) => updateMetaField("projectName", event.target.value)}
                />
              </label>
              <label className="field">
                <span>발주처</span>
                <input
                  type="text"
                  value={workbook.meta.clientName}
                  onChange={(event) => updateMetaField("clientName", event.target.value)}
                />
              </label>
              <label className="field">
                <span>현장 위치</span>
                <input
                  type="text"
                  value={workbook.meta.location}
                  onChange={(event) => updateMetaField("location", event.target.value)}
                />
              </label>
            </div>

            <div className="meta-grid">
              <label className="field">
                <span>견적 번호</span>
                <input
                  type="text"
                  value={workbook.meta.estimateNo}
                  onChange={(event) => updateMetaField("estimateNo", event.target.value)}
                />
              </label>
              <label className="field">
                <span>기준연도</span>
                <input
                  type="number"
                  min="2020"
                  max="2045"
                  value={workbook.meta.baseYear}
                  onChange={(event) =>
                    updateMetaField("baseYear", Number(event.target.value) || workbook.meta.baseYear)
                  }
                />
              </label>
              <label className="field">
                <span>착수연도</span>
                <input
                  type="number"
                  min="2020"
                  max="2045"
                  value={workbook.meta.startYear}
                  onChange={(event) =>
                    updateMetaField("startYear", Number(event.target.value) || workbook.meta.startYear)
                  }
                />
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>작성자</span>
                <input
                  type="text"
                  value={workbook.meta.preparedBy}
                  onChange={(event) => updateMetaField("preparedBy", event.target.value)}
                />
              </label>
              <label className="field">
                <span>비고</span>
                <textarea
                  rows={4}
                  value={workbook.meta.notes}
                  onChange={(event) => updateMetaField("notes", event.target.value)}
                />
              </label>
            </div>
          </article>

          <article className="panel info-panel">
            <div className="panel__header">
              <div>
                <span className="panel__eyebrow">검수 상태</span>
                <h2>로컬 처리와 업로드 흐름</h2>
              </div>
              <span className="panel-chip">외부 전송 없음</span>
            </div>

            <p className="info-panel__notice">
              업로드 파일은 브라우저에서만 읽고 계산합니다. 참조 워크북은 즉시 반영하지 않고
              검수 모달을 거친 뒤 현재 견적에 추가됩니다. 안전한 데이터 경계와 검수 우선 흐름을
              유지하는 것이 이 화면의 기본 원칙입니다.
            </p>

            {notice ? (
              <div className="preview-card">
                <span>최근 작업</span>
                <strong>{notice}</strong>
              </div>
            ) : null}

            {error ? (
              <div className="insight-card insight-card--danger">
                <span>확인 필요</span>
                <strong>{error}</strong>
              </div>
            ) : null}

            {importSnapshot ? (
              <div className="preview-card">
                <span>마지막 불러오기</span>
                <strong>{importSnapshot.fileName}</strong>
                <small>{importSnapshot.importedCount.toLocaleString("ko-KR")}개 항목 반영</small>
                <small>
                  {CATEGORY_ORDER.map((category) => {
                    const sheetName = CATEGORY_SHEET_NAMES[category];
                    return `${sheetName} ${importSnapshot.sheetCounts[sheetName] ?? 0}개`;
                  }).join(" · ")}
                </small>
              </div>
            ) : null}

            <ul className="guide-list">
              <li>금액 요약은 `억원`, 상세 금액은 `원` 기준으로 표시합니다.</li>
              <li>참조 코드와 원본 경로는 각 항목에 함께 보관됩니다.</li>
              <li>새로고침하면 현재 세션 상태는 초기화됩니다.</li>
              {importSnapshot?.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="workspace-grid">
          <aside className="panel sidebar-panel">
            <div className="panel__header">
              <div>
                <span className="panel__eyebrow">분류 트리</span>
                <h2>카테고리별 내역</h2>
              </div>
              <span className="panel-chip panel-chip--soft">{workbook.items.length}개</span>
            </div>

            <button
              className={activeCategory === "ALL" ? "tree-root tree-root--active" : "tree-root"}
              type="button"
              onClick={() => {
                setActiveCategory("ALL");
                setActiveSubcategory("");
              }}
            >
              <div>
                <strong>전체 내역</strong>
                <small>직접 EPC와 ETC를 한 화면에서 검토합니다.</small>
              </div>
              <span className="panel-chip">{formatEok(summary.grandTotal)}</span>
            </button>

            <div className="tree-stack">
              {summary.categorySummaries.map((category) => (
                <div className="tree-section" key={category.category}>
                  <button
                    className={
                      activeCategory === category.category && !activeSubcategory
                        ? "tree-node tree-node--active"
                        : "tree-node"
                    }
                    type="button"
                    onClick={() => {
                      setActiveCategory(category.category);
                      setActiveSubcategory("");
                    }}
                  >
                    <div>
                      <strong>{CATEGORY_LABELS[category.category]}</strong>
                      <small>{CATEGORY_DESCRIPTIONS[category.category]}</small>
                    </div>
                    <span className="panel-chip">{formatEok(category.total)}</span>
                  </button>

                  {category.subcategories.length > 0 ? (
                    <div className="tree-children">
                      {category.subcategories.map((subcategory) => (
                        <button
                          key={`${category.category}-${subcategory.name}`}
                          className={
                            activeCategory === category.category &&
                            activeSubcategory === subcategory.name
                              ? "tree-leaf tree-leaf--active"
                              : "tree-leaf"
                          }
                          type="button"
                          onClick={() => {
                            setActiveCategory(category.category);
                            setActiveSubcategory(subcategory.name);
                          }}
                        >
                          <div>
                            <strong>{subcategory.name}</strong>
                            <small>{subcategory.count}개 항목</small>
                          </div>
                          <span>{formatEok(subcategory.total)}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </aside>

          <article className="panel table-panel">
            <div className="panel__header">
              <div>
                <span className="panel__eyebrow">견적 테이블</span>
                <h2>{activeFilterLabel}</h2>
                <p className="info-panel__notice">{activeFilterDescription}</p>
              </div>
              <div className="panel__metrics">
                <span className="panel-chip">{formatEok(visibleTotal)}</span>
                <span className="panel-chip panel-chip--soft">{visibleItems.length}개</span>
              </div>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>항목 검색</span>
                <input
                  placeholder="코드, 항목명, 비고, 참조코드 검색"
                  type="search"
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                />
              </label>
            </div>

            <div className="table-wrap">
              <table className="estimate-table">
                <thead>
                  <tr>
                    <th>코드</th>
                    <th>항목</th>
                    <th>산정방식</th>
                    <th>수량 / 비율</th>
                    <th>단가 / 기준</th>
                    <th>계산금액</th>
                    <th>참조</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.length === 0 ? (
                    <tr>
                      <td className="empty-cell" colSpan={7}>
                        현재 필터에 맞는 항목이 없습니다. 새 항목을 추가하거나 필터를 변경해 주세요.
                      </td>
                    </tr>
                  ) : (
                    visibleItems.map((item) => {
                      const computedAmount = getItemComputedAmount(item, summary);
                      const pricingLabel =
                        PRICING_MODE_OPTIONS.find((option) => option.value === item.pricingMode)
                          ?.label ?? item.pricingMode;

                      return (
                        <tr
                          key={item.id}
                          aria-selected={selectedItemId === item.id}
                          className={selectedItemId === item.id ? "is-selected" : undefined}
                          onClick={() => setSelectedItemId(item.id)}
                        >
                          <td>
                            <div className="cell-stack">
                              <strong>{item.code}</strong>
                              <small>
                                {CATEGORY_SHORT_LABELS[item.category]} · {item.subcategory}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div className="cell-stack">
                              <strong>{item.name || "항목명 미입력"}</strong>
                              <small>{item.spec || item.note || "-"}</small>
                            </div>
                          </td>
                          <td>
                            <div className="cell-stack">
                              <strong>{pricingLabel}</strong>
                              <small>
                                {item.pricingMode === "PERCENT"
                                  ? getPercentBaseLabel(item.percentBase)
                                  : item.unit || "-"}
                              </small>
                            </div>
                          </td>
                          <td>
                            {item.pricingMode === "UNIT"
                              ? item.qty.toLocaleString("ko-KR")
                              : item.pricingMode === "PERCENT"
                                ? formatPercent(item.percentRate, 2)
                                : "-"}
                          </td>
                          <td className="amount-cell">
                            {item.pricingMode === "UNIT"
                              ? formatKrw(item.unitPrice)
                              : item.pricingMode === "MANUAL"
                                ? formatKrw(item.manualAmount)
                                : getPercentBaseLabel(item.percentBase)}
                          </td>
                          <td className="amount-cell">{formatKrw(computedAmount)}</td>
                          <td>
                            <div className="cell-stack">
                              <strong>{item.referenceCode || "직접 입력"}</strong>
                              <small>{item.referenceLabel || "-"}</small>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel editor-panel">
            <div className="panel__header">
              <div>
                <span className="panel__eyebrow">편집 패널</span>
                <h2>{selectedItem ? `${selectedItem.code} 상세 편집` : "새 항목 준비"}</h2>
              </div>
              <div className="panel__metrics">
                <span className="panel-chip">{CATEGORY_SHORT_LABELS[editorCategory]}</span>
                <span className="panel-chip panel-chip--soft">
                  {selectedItem ? formatEok(getItemComputedAmount(selectedItem, summary)) : "0.0 억원"}
                </span>
              </div>
            </div>

            <div className="editor-actions">
              <button className="button button--primary" type="button" onClick={() => addItem()}>
                같은 분류 항목 추가
              </button>
              <button
                className="button button--secondary"
                disabled={!selectedItem}
                type="button"
                onClick={duplicateSelectedItem}
              >
                선택 항목 복사
              </button>
              <button
                className="button button--ghost"
                type="button"
                onClick={() => addItem(activeCategory === "ALL" ? "E" : activeCategory)}
              >
                새 카테고리 행 추가
              </button>
              <button
                className="button button--danger"
                disabled={!selectedItem}
                type="button"
                onClick={removeSelectedItem}
              >
                선택 항목 삭제
              </button>
            </div>

            {selectedItem ? (
              <>
                <div className="editor-form">
                  <div className="field-grid">
                    <label className="field">
                      <span>카테고리</span>
                      <select
                        value={selectedItem.category}
                        onChange={(event) => {
                          const nextCategory = event.target.value as EstimateCategory;
                          updateItem(selectedItem.id, (item) => ({
                            category: nextCategory,
                            subcategory:
                              getSubcategoryOptions(nextCategory).includes(item.subcategory)
                                ? item.subcategory
                                : getSubcategoryOptions(nextCategory)[0] || item.subcategory,
                            pricingMode:
                              nextCategory === "ETC"
                                ? "PERCENT"
                                : item.pricingMode === "PERCENT"
                                  ? "UNIT"
                                  : item.pricingMode,
                            unit:
                              nextCategory === "ETC"
                                ? "%"
                                : item.pricingMode === "PERCENT"
                                  ? "식"
                                  : item.unit,
                          }));
                        }}
                      >
                        {CATEGORY_ORDER.map((category) => (
                          <option key={category} value={category}>
                            {CATEGORY_LABELS[category]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>세부분류</span>
                      <select
                        value={selectedItem.subcategory}
                        onChange={(event) =>
                          updateItem(selectedItem.id, () => ({
                            subcategory: event.target.value,
                          }))
                        }
                      >
                        {[
                          ...new Set(
                            [selectedItem.subcategory, ...editorSubcategoryOptions].filter(Boolean),
                          ),
                        ].map((subcategory) => (
                          <option key={subcategory} value={subcategory}>
                            {subcategory}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="field-grid">
                    <label className="field">
                      <span>항목명</span>
                      <input
                        type="text"
                        value={selectedItem.name}
                        onChange={(event) =>
                          updateItem(selectedItem.id, () => ({ name: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>규격 / 설명</span>
                      <input
                        type="text"
                        value={selectedItem.spec}
                        onChange={(event) =>
                          updateItem(selectedItem.id, () => ({ spec: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="field-grid">
                    <label className="field">
                      <span>산정방식</span>
                      <select
                        value={selectedItem.pricingMode}
                        onChange={(event) => {
                          const nextMode = event.target.value as EstimateItem["pricingMode"];
                          updateItem(selectedItem.id, () => ({
                            pricingMode: nextMode,
                            unit: nextMode === "PERCENT" ? "%" : selectedItem.unit || "식",
                          }));
                        }}
                      >
                        {PRICING_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>단위</span>
                      <input
                        disabled={selectedItem.pricingMode === "PERCENT"}
                        type="text"
                        value={selectedItem.pricingMode === "PERCENT" ? "%" : selectedItem.unit}
                        onChange={(event) =>
                          updateItem(selectedItem.id, () => ({ unit: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  {selectedItem.pricingMode === "UNIT" ? (
                    <div className="field-grid">
                      <label className="field">
                        <span>수량</span>
                        <input
                          min="0"
                          step="0.01"
                          type="number"
                          value={selectedItem.qty}
                          onChange={(event) =>
                            updateItem(selectedItem.id, () => ({ qty: Number(event.target.value) }))
                          }
                        />
                      </label>
                      <label className="field">
                        <span>단가 (원)</span>
                        <input
                          min="0"
                          step="1"
                          type="number"
                          value={selectedItem.unitPrice}
                          onChange={(event) =>
                            updateItem(selectedItem.id, () => ({
                              unitPrice: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {selectedItem.pricingMode === "MANUAL" ? (
                    <div className="field-grid">
                      <label className="field">
                        <span>직접 입력 금액 (원)</span>
                        <input
                          min="0"
                          step="1"
                          type="number"
                          value={selectedItem.manualAmount}
                          onChange={(event) =>
                            updateItem(selectedItem.id, () => ({
                              manualAmount: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {selectedItem.pricingMode === "PERCENT" ? (
                    <div className="field-grid">
                      <label className="field">
                        <span>비율 (%)</span>
                        <input
                          min="0"
                          step="0.1"
                          type="number"
                          value={selectedItem.percentRate}
                          onChange={(event) =>
                            updateItem(selectedItem.id, () => ({
                              percentRate: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label className="field">
                        <span>기준금액</span>
                        <select
                          value={selectedItem.percentBase}
                          onChange={(event) =>
                            updateItem(selectedItem.id, () => ({
                              percentBase: event.target.value as EstimateItem["percentBase"],
                            }))
                          }
                        >
                          {PERCENT_BASE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}

                  <label className="field">
                    <span>비고</span>
                    <textarea
                      rows={4}
                      value={selectedItem.note}
                      onChange={(event) =>
                        updateItem(selectedItem.id, () => ({ note: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="preview-card">
                  <span>즉시 계산 결과</span>
                  <strong>{formatEok(getItemComputedAmount(selectedItem, summary))}</strong>
                  <small>{formatKrw(getItemComputedAmount(selectedItem, summary))}</small>
                  <small>
                    {selectedItem.pricingMode === "PERCENT"
                      ? `${formatPercent(selectedItem.percentRate, 2)} / ${getPercentBaseLabel(selectedItem.percentBase)}`
                      : selectedItem.pricingMode === "UNIT"
                        ? `${selectedItem.qty.toLocaleString("ko-KR")} × ${formatKrw(selectedItem.unitPrice)}`
                        : "직접 입력 금액"}
                  </small>
                </div>

                {selectedItem.referenceItemId ? (
                  <div className="insight-card">
                    <span>참조 연결</span>
                    <strong>{selectedItem.referenceCode || "참조코드 없음"}</strong>
                    <small>{selectedItem.referenceLabel || "-"}</small>
                    <small>
                      기준금액 {selectedItem.referenceAmount > 0 ? formatEok(selectedItem.referenceAmount) : "-"}
                    </small>
                  </div>
                ) : null}

                {selectedItem.pricingMode === "PERCENT" && selectedItem.category !== "ETC" ? (
                  <div className="insight-card insight-card--danger">
                    <span>검토 메모</span>
                    <strong>비율 산정은 ETC 항목에서 쓰는 편이 안전합니다.</strong>
                    <small>직접비 항목은 수량 x 단가 또는 직접입력 방식을 권장합니다.</small>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty-cell">
                선택된 항목이 없습니다. 왼쪽 테이블에서 항목을 고르거나 새 항목을 추가해 주세요.
              </div>
            )}
          </article>
        </section>

        <EstimateAnalytics summary={summary} />
        </div>
      </div>

      <input
        ref={workbookImportRef}
        accept=".xlsx,.xls,.csv"
        className="sr-only"
        type="file"
        onChange={handleWorkbookImport}
      />
      <input
        ref={referenceImportRef}
        accept=".xlsx,.xls"
        className="sr-only"
        type="file"
        onChange={handleReferenceImport}
      />

      {pendingReference && pendingReferenceSummary ? (
        <div className="review-modal" role="presentation">
          <button
            aria-label="참조 워크북 검수 취소"
            className="review-modal__backdrop"
            type="button"
            onClick={() => setPendingReference(null)}
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
                <span className="panel__eyebrow">참조 워크북 검수</span>
                <h3 id="reference-review-title">업로드 내용을 확인한 뒤 반영합니다.</h3>
                <p id="reference-review-description">
                  파일명, 기준연도, 기준용량, 항목별 카테고리와 금액을 수정한 후 현재 견적에
                  반영해 주세요.
                </p>
              </div>
              <span className="panel-chip">{pendingReferenceSummary.includedCount}개 반영 예정</span>
            </div>

            <div className="review-modal__body">
              <div className="field-grid review-modal__meta">
                <label className="field">
                  <span>파일명</span>
                  <input readOnly type="text" value={pendingReference.fileName} />
                </label>
                <label className="field">
                  <span>기준 프로젝트명</span>
                  <input
                    type="text"
                    value={pendingReference.projectName}
                    onChange={(event) =>
                      setPendingReference((current) =>
                        current
                          ? {
                              ...current,
                              projectName: event.target.value,
                            }
                          : current,
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>기준연도</span>
                  <input
                    placeholder="예: 2026"
                    type="number"
                    value={pendingReference.referenceYear ?? ""}
                    onChange={(event) =>
                      setPendingReference((current) =>
                        current
                          ? {
                              ...current,
                              referenceYear: parseOptionalNumber(event.target.value),
                            }
                          : current,
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>기준용량 (MW)</span>
                  <input
                    placeholder="예: 15"
                    step="0.1"
                    type="number"
                    value={pendingReference.capacityMw ?? ""}
                    onChange={(event) =>
                      setPendingReference((current) =>
                        current
                          ? {
                              ...current,
                              capacityMw: parseOptionalNumber(event.target.value),
                            }
                          : current,
                      )
                    }
                  />
                </label>
              </div>

              <div className="summary-strip review-modal__summary">
                <article className="summary-card summary-card--strong">
                  <span>파싱 총액</span>
                  <strong>{formatEok(pendingReferenceSummary.totalAmount)}</strong>
                  <small>{pendingReferenceSummary.includedCount}개 항목 기준</small>
                </article>
                <article className="summary-card">
                  <span>E 소계</span>
                  <strong>{formatEok(pendingReferenceSummary.categoryTotals.E)}</strong>
                  <small>Service Cost</small>
                </article>
                <article className="summary-card">
                  <span>P 소계</span>
                  <strong>{formatEok(pendingReferenceSummary.categoryTotals.P)}</strong>
                  <small>Procurement</small>
                </article>
                <article className="summary-card">
                  <span>C 소계</span>
                  <strong>{formatEok(pendingReferenceSummary.categoryTotals.C)}</strong>
                  <small>Construction</small>
                </article>
              </div>

              {pendingReferenceSummary.warnings.length > 0 ? (
                <ul className="guide-list">
                  {pendingReferenceSummary.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="info-panel__notice">자동 검토 경고 없이 반영 가능한 상태입니다.</p>
              )}

              <div className="table-wrap">
                <table className="estimate-table">
                  <thead>
                    <tr>
                      <th>반영</th>
                      <th>행</th>
                      <th>항목명</th>
                      <th>카테고리</th>
                      <th>금액 (억원)</th>
                      <th>원본 경로</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReference.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            checked={item.include}
                            type="checkbox"
                            onChange={(event) =>
                              setPendingReference((current) =>
                                current
                                  ? {
                                      ...current,
                                      items: current.items.map((candidate) =>
                                        candidate.id === item.id
                                          ? {
                                              ...candidate,
                                              include: event.target.checked,
                                            }
                                          : candidate,
                                      ),
                                    }
                                  : current,
                              )
                            }
                          />
                        </td>
                        <td>{item.rowNumber}</td>
                        <td>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(event) =>
                              setPendingReference((current) =>
                                current
                                  ? {
                                      ...current,
                                      items: current.items.map((candidate) =>
                                        candidate.id === item.id
                                          ? {
                                              ...candidate,
                                              name: event.target.value,
                                            }
                                          : candidate,
                                      ),
                                    }
                                  : current,
                              )
                            }
                          />
                        </td>
                        <td>
                          <select
                            value={item.category}
                            onChange={(event) =>
                              setPendingReference((current) =>
                                current
                                  ? {
                                      ...current,
                                      items: current.items.map((candidate) =>
                                        candidate.id === item.id
                                          ? {
                                              ...candidate,
                                              category: event.target.value as EstimateCategory,
                                              subcategory:
                                                getSubcategoryOptions(event.target.value as EstimateCategory)[0] ||
                                                candidate.subcategory,
                                            }
                                          : candidate,
                                      ),
                                    }
                                  : current,
                              )
                            }
                          >
                            {CATEGORY_ORDER.map((category) => (
                              <option key={category} value={category}>
                                {CATEGORY_SHORT_LABELS[category]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            min="0"
                            step="0.0001"
                            type="number"
                            value={Number((item.amount / referenceAmountUnit).toFixed(4))}
                            onChange={(event) =>
                              setPendingReference((current) =>
                                current
                                  ? {
                                      ...current,
                                      items: current.items.map((candidate) =>
                                        candidate.id === item.id
                                          ? {
                                              ...candidate,
                                              amount:
                                                (Number(event.target.value) || 0) * referenceAmountUnit,
                                            }
                                          : candidate,
                                      ),
                                    }
                                  : current,
                              )
                            }
                          />
                        </td>
                        <td>
                          <div className="cell-stack">
                            <strong>{item.referenceCode || "-"}</strong>
                            <small>{item.pathLabel}</small>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="review-modal__footer">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setPendingReference(null)}
              >
                취소
              </button>
              <button className="button button--primary" type="button" onClick={confirmPendingReference}>
                검수 후 반영
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
