import * as XLSX from "xlsx";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATEGORY_SHEET_NAMES,
  DEFAULT_META,
  DEFAULT_WORKBOOK,
  buildNextCode,
  calculateWorkbookSummary,
  cloneWorkbook,
  normalizeCategory,
  normalizeItem,
  normalizePercentBase,
  normalizePricingMode,
  type EstimateCategory,
  type EstimateItem,
  type EstimateProjectMeta,
  type EstimateWorkbook,
} from "@/lib/estimator";

type ExcelRow = Record<string, string | number>;

export type WorkbookImportResult = {
  workbook: EstimateWorkbook;
  importedCount: number;
  warnings: string[];
  sheetCounts: Record<string, number>;
};

export type ReferenceWorkbookMeta = {
  fileName: string;
  sheetName: string;
  projectYear: number | null;
  capacityMw: number | null;
  mainLayout: string;
  installationType: string;
  referenceTitle: string;
};

export type ReferenceCatalogItem = {
  id: string;
  epcCategory: EstimateCategory;
  majorCode: string;
  majorName: string;
  subCode: string;
  subName: string;
  itemNumber: string;
  referenceCode: string;
  name: string;
  parentLabel: string;
  unit: string;
  referenceAmount: number;
  rowNumber: number;
  pathLabel: string;
};

export type ReferenceCatalog = {
  meta: ReferenceWorkbookMeta;
  items: ReferenceCatalogItem[];
};

const ITEM_COLUMNS = [
  "Code",
  "Category",
  "Subcategory",
  "Name",
  "Spec",
  "Unit",
  "PricingMode",
  "Qty",
  "UnitPrice",
  "ManualAmount",
  "PercentRate",
  "PercentBase",
  "ReferenceItemId",
  "ReferenceCode",
  "ReferenceLabel",
  "ReferenceAmount",
  "Note",
] as const;

const META_LABELS = {
  projectName: "Project Name",
  clientName: "Client",
  location: "Location",
  estimateNo: "Estimate No",
  currency: "Currency",
  baseYear: "Base Year",
  startYear: "Start Year",
  preparedBy: "Prepared By",
  notes: "Notes",
} satisfies Record<keyof EstimateProjectMeta, string>;

function normalizeNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const cleaned = value.replaceAll(",", "").trim();
    if (!cleaned) return 0;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function cleanCell(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replaceAll("\n", " ").trim();
}

function normalizeHeadingCode(value: unknown) {
  const text = cleanCell(value);
  return text.replaceAll(" ", "");
}

function normalizeHeaderKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(" ", "")
    .replaceAll("_", "");
}

function readCell(record: Record<string, unknown>, aliases: string[]) {
  const entries = Object.entries(record);

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeaderKey(alias);
    const hit = entries.find(([key]) => normalizeHeaderKey(key) === normalizedAlias);
    if (hit) return hit[1];
  }

  return "";
}

function buildItemSheetRows(items: EstimateItem[]) {
  return items.map((item) => ({
    Code: item.code,
    Category: item.category,
    Subcategory: item.subcategory,
    Name: item.name,
    Spec: item.spec,
    Unit: item.unit,
    PricingMode: item.pricingMode,
    Qty: item.qty,
    UnitPrice: item.unitPrice,
    ManualAmount: item.manualAmount,
    PercentRate: item.percentRate,
    PercentBase: item.percentBase,
    ReferenceItemId: item.referenceItemId,
    ReferenceCode: item.referenceCode,
    ReferenceLabel: item.referenceLabel,
    ReferenceAmount: item.referenceAmount,
    Note: item.note,
  }));
}

function buildSummaryRows(workbook: EstimateWorkbook): ExcelRow[] {
  const summary = calculateWorkbookSummary(workbook);

  return [
    { Field: "Project Meta", Value: "" },
    ...Object.entries(META_LABELS).map(([key, label]) => ({
      Field: label,
      Value: String(workbook.meta[key as keyof EstimateProjectMeta] ?? ""),
    })),
    { Field: "", Value: "" },
    { Field: "Category Summary", Value: "" },
    ...CATEGORY_ORDER.map((category) => ({
      Field: CATEGORY_LABELS[category],
      Value: summary.categoryTotals[category],
    })),
    { Field: "Direct EPC", Value: summary.directTotal },
    { Field: "Grand Total", Value: summary.grandTotal },
  ];
}

function parseMeta(rows: unknown[][]) {
  const meta: EstimateProjectMeta = { ...DEFAULT_META };
  const reverseMap = new Map<string, keyof EstimateProjectMeta>();

  for (const [key, label] of Object.entries(META_LABELS)) {
    reverseMap.set(label.toLowerCase(), key as keyof EstimateProjectMeta);
  }

  for (const row of rows) {
    const field = cleanCell(row[0]);
    const value = row[1];
    if (!field) continue;
    const key = reverseMap.get(field.toLowerCase());
    if (!key) continue;

    if (key === "baseYear" || key === "startYear") {
      const parsed = normalizeNumber(value);
      meta[key] = parsed > 0 ? parsed : DEFAULT_META[key];
      continue;
    }

    if (key === "currency") {
      meta.currency = "KRW";
      continue;
    }

    meta[key] = cleanCell(value);
  }

  return meta;
}

function parseItemRows(
  rows: Record<string, unknown>[],
  category: EstimateCategory,
  existingItems: EstimateItem[],
  warnings: string[],
) {
  const parsed: EstimateItem[] = [];

  for (const row of rows) {
    const name = cleanCell(readCell(row, ["Name", "Item", "항목", "품명"]));
    const spec = cleanCell(readCell(row, ["Spec", "규격"]));
    const explicitCategory = readCell(row, ["Category", "대분류", "Category Code"]);
    const normalizedCategory = explicitCategory ? normalizeCategory(explicitCategory) : category;

    if (!name && !spec) continue;

    const qty = readCell(row, ["Qty", "Quantity", "수량"]);
    const unitPrice = readCell(row, ["UnitPrice", "Rate", "단가"]);
    const manualAmount = readCell(row, ["ManualAmount", "Amount", "금액"]);
    const percentRate = readCell(row, ["PercentRate", "RatePct", "요율", "비율"]);
    const pricingMode = normalizePricingMode(
      normalizedCategory,
      readCell(row, ["PricingMode", "산정방식"]),
      qty,
      unitPrice,
      manualAmount,
      percentRate,
    );

    const item = normalizeItem(
      {
        id: "",
        code:
          cleanCell(readCell(row, ["Code", "코드"])) ||
          buildNextCode(normalizedCategory, [...existingItems, ...parsed]),
        category: normalizedCategory,
        subcategory: cleanCell(readCell(row, ["Subcategory", "공종", "세부분류"])),
        name,
        spec,
        unit: cleanCell(readCell(row, ["Unit", "단위"])),
        pricingMode,
        qty,
        unitPrice,
        manualAmount,
        percentRate,
        percentBase: normalizePercentBase(readCell(row, ["PercentBase", "Base", "기준금액"])),
        note: cleanCell(readCell(row, ["Note", "Remarks", "비고"])),
        referenceItemId: cleanCell(readCell(row, ["ReferenceItemId", "Reference Id"])),
        referenceCode: cleanCell(readCell(row, ["ReferenceCode", "Ref Code"])),
        referenceLabel: cleanCell(readCell(row, ["ReferenceLabel", "Reference"])),
        referenceAmount: readCell(row, ["ReferenceAmount", "Ref Amount"]),
      },
      [...existingItems, ...parsed],
    );

    if (item.pricingMode === "PERCENT" && normalizedCategory !== "ETC") {
      warnings.push(
        `${item.code} ${item.name}: 비율 방식은 ETC 항목 기준으로 설계되어 있어 직접비 항목은 금액을 다시 검토해 주세요.`,
      );
    }

    parsed.push(item);
  }

  return parsed;
}

function parseSheetCounts(items: EstimateItem[]) {
  return CATEGORY_ORDER.reduce<Record<string, number>>((accumulator, category) => {
    accumulator[CATEGORY_SHEET_NAMES[category]] = items.filter((item) => item.category === category).length;
    return accumulator;
  }, {});
}

function mapReferenceCategory(majorCode: string, majorName: string): EstimateCategory {
  const label = `${majorCode} ${majorName}`.toUpperCase();

  if (label.includes("SERVICE COST") || majorName.includes("용역비")) return "E";
  if (label.includes("PROCUREMENT")) return "P";
  if (label.includes("TAX") || label.includes("OTHER")) return "ETC";
  return "C";
}

function isMajorHeading(code: string, title: string) {
  if (!code || !title) return false;
  if (title.toUpperCase().includes("TOTAL")) return false;
  return /^[0-9]+(\.[0-9]+)?\.?$/.test(code);
}

function isSubHeading(code: string, title: string) {
  if (!code || !title) return false;
  if (title.toUpperCase().includes("TOTAL")) return false;
  return /^[0-9]+(\.[0-9]+)+\.?$/.test(code);
}

function isSummaryLabel(value: string) {
  const normalized = value.toUpperCase().replaceAll(" ", "");
  return normalized === "SUBTOTAL" || normalized === "TOTAL" || normalized.includes("SUBTOTAL");
}

function buildReferenceMeta(file: File, sheetName: string, rows: unknown[][]): ReferenceWorkbookMeta {
  return {
    fileName: file.name,
    sheetName,
    projectYear: normalizeNumber(rows[1]?.[6]) || null,
    capacityMw: normalizeNumber(rows[2]?.[6]) || null,
    mainLayout: cleanCell(rows[3]?.[6]),
    installationType: cleanCell(rows[4]?.[6]),
    referenceTitle: cleanCell(rows[5]?.[6]),
  };
}

export async function importReferenceWorkbookFile(file: File): Promise<ReferenceCatalog> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const meta = buildReferenceMeta(file, sheetName, rows);
  const items: ReferenceCatalogItem[] = [];

  let currentMajor: { code: string; name: string; epcCategory: EstimateCategory } | null = null;
  let currentSub: { code: string; name: string } | null = null;
  let currentParent: { itemNumber: string; code: string; name: string } | null = null;

  for (let index = 7; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const col0 = normalizeHeadingCode(row[0]);
    const col1 = normalizeHeadingCode(row[1]);
    const col2 = cleanCell(row[2]);
    const col3 = cleanCell(row[3]);
    const col4 = cleanCell(row[4]);
    const col5 = cleanCell(row[5]);
    const amount = normalizeNumber(row[8]);

    if (isMajorHeading(col0, col1)) {
      currentMajor = {
        code: col0,
        name: cleanCell(row[1]),
        epcCategory: mapReferenceCategory(col0, cleanCell(row[1])),
      };
      currentSub = null;
      currentParent = null;
      continue;
    }

    if (isSubHeading(col1, col2)) {
      currentSub = {
        code: col1,
        name: cleanCell(row[2]),
      };
      currentParent = null;
      continue;
    }

    if (!currentMajor) continue;
    if (isSummaryLabel(col2) || isSummaryLabel(col3) || isSummaryLabel(col4)) {
      currentParent = null;
      continue;
    }

    const startsNewParent = /^[0-9]+\)$/.test(col2);

    if (startsNewParent) {
      currentParent = {
        itemNumber: col2,
        code: col3,
        name: col4 || col3,
      };
    }

    const name = col4 || col3;
    if (!name) continue;

    const referenceCode = col3 || currentParent?.code || "";
    const parentLabel =
      currentParent && currentParent.name !== name ? currentParent.name : "";
    const pathParts = [
      currentMajor.name,
      currentSub?.name || "",
      parentLabel,
      name,
    ].filter(Boolean);

    items.push({
      id: `ref-${index + 1}`,
      epcCategory: currentMajor.epcCategory,
      majorCode: currentMajor.code,
      majorName: currentMajor.name,
      subCode: currentSub?.code || "",
      subName: currentSub?.name || "",
      itemNumber: startsNewParent ? col2 : currentParent?.itemNumber || "",
      referenceCode,
      name,
      parentLabel,
      unit: col5,
      referenceAmount: amount,
      rowNumber: index + 1,
      pathLabel: pathParts.join(" > "),
    });
  }

  return {
    meta,
    items,
  };
}

export function createWorkbookBuffer(workbook: EstimateWorkbook) {
  const nextWorkbook = XLSX.utils.book_new();
  const snapshot = cloneWorkbook(workbook);

  const summarySheet = XLSX.utils.json_to_sheet(buildSummaryRows(snapshot));
  XLSX.utils.book_append_sheet(nextWorkbook, summarySheet, "Summary");

  for (const category of CATEGORY_ORDER) {
    const sheetRows = buildItemSheetRows(snapshot.items.filter((item) => item.category === category));
    const sheet =
      sheetRows.length > 0
        ? XLSX.utils.json_to_sheet(sheetRows, { header: [...ITEM_COLUMNS] })
        : XLSX.utils.json_to_sheet([], { header: [...ITEM_COLUMNS] });
    XLSX.utils.book_append_sheet(nextWorkbook, sheet, CATEGORY_SHEET_NAMES[category]);
  }

  return XLSX.write(nextWorkbook, { bookType: "xlsx", type: "array" });
}

export function createWorkbookBlob(workbook: EstimateWorkbook) {
  return new Blob([createWorkbookBuffer(workbook)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function importWorkbookFile(file: File): Promise<WorkbookImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const warnings: string[] = [];
  let meta: EstimateProjectMeta = { ...DEFAULT_META };
  const items: EstimateItem[] = [];
  let hasStructuredSheet = false;

  const summarySheet = workbook.Sheets.Summary;
  if (summarySheet) {
    const summaryRows = XLSX.utils.sheet_to_json<unknown[]>(summarySheet, {
      header: 1,
      blankrows: false,
      raw: false,
    });
    meta = parseMeta(summaryRows);
  } else {
    warnings.push("Summary 시트가 없어 기본 프로젝트 메타를 사용했습니다.");
  }

  for (const category of CATEGORY_ORDER) {
    const sheetName = CATEGORY_SHEET_NAMES[category];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    hasStructuredSheet = true;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });
    items.push(...parseItemRows(rows, category, items, warnings));
  }

  const usedDefaultWorkbook = !(items.length > 0 || summarySheet || hasStructuredSheet);
  const nextWorkbook: EstimateWorkbook = usedDefaultWorkbook
    ? cloneWorkbook(DEFAULT_WORKBOOK)
    : {
        meta,
        items,
      };

  if (items.length === 0) {
    warnings.push(
      usedDefaultWorkbook
        ? "가져온 항목이 없어 기본 빈 견적서를 유지합니다."
        : "가져온 항목이 없어 빈 견적서로 불러왔습니다.",
    );
  }

  return {
    workbook: nextWorkbook,
    importedCount: nextWorkbook.items.length,
    warnings,
    sheetCounts: parseSheetCounts(nextWorkbook.items),
  };
}
