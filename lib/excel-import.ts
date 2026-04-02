import { read, utils } from "xlsx";
import {
  DEFAULT_REFERENCE_PROJECT,
  inferCostCategoryFromText,
  type CostCategory,
  type ReferenceProject,
  type ReferenceProjectItem,
} from "@/lib/estimator";

type ParsedRow = {
  name: string;
  category: CostCategory;
  amountEok: number;
  note?: string;
};

export type ReferenceWorkbookInspection = {
  fileName: string;
  sheetCount: number;
  itemCount: number;
  categoryTotals: Record<CostCategory, number>;
  warnings: string[];
  project: ReferenceProject;
};

const HEADER_KEYWORDS = {
  name: ["item", "name", "description", "품명", "항목", "내역", "공종", "내용", "scope"],
  category: ["category", "type", "분류", "구분", "대분류", "spc", "s/p/c"],
  amount: ["amount", "cost", "price", "금액", "합계", "공사비", "원", "억원", "total", "epc"],
  note: ["note", "remark", "비고", "사유", "근거", "comment"],
};

const SECTION_CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: CostCategory }> = [
  { pattern: /service cost/i, category: "S" },
  { pattern: /procurement cost/i, category: "P" },
  { pattern: /construction cost|construction works/i, category: "C" },
];

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function parseNumeric(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const text = normalizeText(value);
  if (!text) return null;

  const normalized = text
    .replace(/,/g, "")
    .replace(/원/g, "")
    .replace(/krw/gi, "")
    .replace(/\(([^)]+)\)/g, "-$1")
    .replace(/[^\d.-]/g, "");

  if (!normalized || normalized === "-" || normalized === ".") return null;

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function chooseHeaderRow(rows: unknown[][]) {
  let bestIndex = 0;
  let bestScore = -1;

  rows.slice(0, 12).forEach((row, index) => {
    const normalizedRow = row.map(normalizeHeader);
    const joinedRow = normalizedRow.join(" ");
    const score = normalizedRow.reduce((sum, cell) => {
      if (!cell) return sum;

      let hit = 0;
      if (HEADER_KEYWORDS.name.some((keyword) => cell.includes(keyword))) hit += 2;
      if (HEADER_KEYWORDS.category.some((keyword) => cell.includes(keyword))) hit += 2;
      if (HEADER_KEYWORDS.amount.some((keyword) => cell.includes(keyword))) hit += 3;
      if (HEADER_KEYWORDS.note.some((keyword) => cell.includes(keyword))) hit += 1;
      return sum + hit;
    }, 0);
    const nextRow = rows[index + 1]?.map(normalizeHeader) ?? [];
    const nextJoined = nextRow.join(" ");
    const mergedHeaderBonus =
      /description|item|name|품명|항목|내역|공종|내용/.test(joinedRow) &&
      /q'?ty|qty|u\/p|unit|amount|price|cost|금액|원|억원/.test(nextJoined)
        ? 6
        : 0;
    const sectionPenalty = /(service cost|procurement cost|construction cost|construction works|sub total|subtotal|total)/.test(
      joinedRow,
    )
      ? 4
      : 0;
    const topRowBonus = Math.max(0, 4 - index);
    const finalScore = score + mergedHeaderBonus + topRowBonus - sectionPenalty;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function findColumn(headers: string[], bucket: keyof typeof HEADER_KEYWORDS) {
  return headers.findIndex((header) =>
    HEADER_KEYWORDS[bucket].some((keyword) => header.includes(keyword)),
  );
}

function findFallbackTextColumn(rows: unknown[][], startIndex: number) {
  return findFallbackTextColumnWithin(rows, startIndex);
}

function isMeaningfulNameToken(text: string) {
  if (!text || parseNumeric(text) !== null) return false;
  if (/^\d+([.)]|\.\d+)*$/.test(text.replace(/\s+/g, ""))) return false;
  if (
    /^(sub\s*total|subtotal|total|service cost|procurement cost|construction cost|construction works|site management service|pmt|eng)$/i.test(
      text,
    )
  ) {
    return false;
  }

  return true;
}

function scoreMeaningfulText(text: string) {
  if (!isMeaningfulNameToken(text)) return 0;
  return Math.min(text.length, 40) + 8;
}

function findFallbackTextColumnWithin(rows: unknown[][], startIndex: number, maxColumn?: number) {
  const maxCols = Math.max(...rows.slice(startIndex, startIndex + 12).map((row) => row.length), 0);
  let bestColumn = 0;
  let bestScore = -1;
  const endColumn = typeof maxColumn === "number" ? Math.min(maxCols, maxColumn) : maxCols;

  for (let column = 0; column < endColumn; column += 1) {
    const score = rows.slice(startIndex, startIndex + 120).reduce((sum, row) => {
      const text = normalizeText(row[column]);
      return sum + scoreMeaningfulText(text);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  }

  return bestColumn;
}

function findFallbackAmountColumn(rows: unknown[][], startIndex: number) {
  const maxCols = Math.max(...rows.slice(startIndex, startIndex + 12).map((row) => row.length), 0);
  let bestColumn = 0;
  let bestScore = -1;

  for (let column = 0; column < maxCols; column += 1) {
    const score = rows.slice(startIndex, startIndex + 18).reduce((sum, row) => {
      const value = parseNumeric(row[column]);
      return sum + (value === null ? 0 : 1);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  }

  return bestColumn;
}

function extractSheetUnitHint(rows: unknown[][]) {
  const sample = rows
    .slice(0, 12)
    .flat()
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  if (/(억원|eok|100m)/i.test(sample)) return "억원";
  if (/(백만원|million)/i.test(sample)) return "백만원";
  if (/(천원)/i.test(sample)) return "천원";
  if (/(원|krw)/i.test(sample)) return "원";
  return "";
}

function detectSectionCategory(row: unknown[]) {
  const joined = row.map(normalizeText).filter(Boolean).join(" ");
  const matched = SECTION_CATEGORY_PATTERNS.find(({ pattern }) => pattern.test(joined));
  return matched?.category ?? null;
}

function resolveNameColumn(
  rows: unknown[][],
  headers: string[],
  startIndex: number,
  amountColumn: number,
  categoryColumn: number,
) {
  const explicitNameColumn = findColumn(headers, "name");
  const structuralBoundary = [findColumn(headers, "category"), amountColumn]
    .filter((value) => value >= 0)
    .reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);
  const boundedFallbackColumn = findFallbackTextColumnWithin(
    rows,
    startIndex,
    Number.isFinite(structuralBoundary) ? structuralBoundary : undefined,
  );

  if (explicitNameColumn < 0) return boundedFallbackColumn;

  const explicitScore = rows
    .slice(startIndex, startIndex + 120)
    .reduce((sum, row) => sum + scoreMeaningfulText(normalizeText(row[explicitNameColumn])), 0);
  const fallbackScore = rows
    .slice(startIndex, startIndex + 120)
    .reduce((sum, row) => sum + scoreMeaningfulText(normalizeText(row[boundedFallbackColumn])), 0);

  if (
    boundedFallbackColumn !== explicitNameColumn &&
    (explicitScore === 0 || fallbackScore > explicitScore * 1.15)
  ) {
    return boundedFallbackColumn;
  }

  return explicitNameColumn;
}

function parseExplicitCategory(value: unknown) {
  const text = normalizeText(value).toUpperCase();
  if (text === "S") return "S" as const;
  if (text === "P") return "P" as const;
  if (text === "C") return "C" as const;
  return null;
}

function extractStructuredName(row: unknown[], boundaryColumn: number) {
  const candidates = row
    .slice(0, boundaryColumn)
    .map(normalizeText)
    .filter(isMeaningfulNameToken);

  if (candidates.length === 0) return "";
  return candidates[candidates.length - 1];
}

function isSectionRow(row: unknown[], amountColumn: number) {
  const joined = row.map(normalizeText).filter(Boolean).join(" ");
  const hasAmount = amountColumn >= 0 ? parseNumeric(row[amountColumn]) !== null : false;
  const nonEmptyCount = row.map(normalizeText).filter(Boolean).length;
  return !hasAmount && nonEmptyCount <= 3 && Boolean(detectSectionCategory([joined]));
}

function convertAmountToEok(rawAmount: number, context: string) {
  const magnitude = Math.abs(rawAmount);

  if (/(억원|eok|100m)/i.test(context)) return magnitude;
  if (/(백만원|million)/i.test(context)) return magnitude / 100;
  if (/(천원)/i.test(context)) return magnitude / 100_000;
  if (/(원|krw)/i.test(context) && magnitude >= 1_000_000) return magnitude / 100_000_000;
  if (magnitude >= 100_000_000) return magnitude / 100_000_000;
  if (magnitude >= 10_000) return magnitude / 100;
  return magnitude;
}

function getVisibleSheetNames(workbook: ReturnType<typeof read>) {
  const sheetMeta = workbook.Workbook?.Sheets ?? [];

  return workbook.SheetNames.filter((sheetName, index) => {
    const hiddenFlag = sheetMeta[index]?.Hidden;
    return hiddenFlag !== 1 && hiddenFlag !== 2;
  });
}

function getHiddenSheetNames(workbook: ReturnType<typeof read>) {
  const sheetMeta = workbook.Workbook?.Sheets ?? [];

  return workbook.SheetNames.filter((sheetName, index) => {
    const hiddenFlag = sheetMeta[index]?.Hidden;
    return hiddenFlag === 1 || hiddenFlag === 2;
  });
}

function countSheetComments(sheet: unknown) {
  if (!sheet || typeof sheet !== "object") return 0;

  return Object.entries(sheet as Record<string, unknown>).reduce((sum, [cell, value]) => {
    if (cell.startsWith("!")) return sum;
    if (!value || typeof value !== "object") return sum;

    const comments = (value as { c?: unknown[] }).c;
    return sum + (Array.isArray(comments) ? comments.length : 0);
  }, 0);
}

function extractWorkbookCorpus(
  fileName: string,
  rowsBySheet: Array<{ sheetName: string; rows: unknown[][] }>,
) {
  const texts = [fileName];

  rowsBySheet.forEach(({ sheetName, rows }) => {
    texts.push(sheetName);
    rows.slice(0, 20).forEach((row) => {
      row.forEach((cell) => {
        const text = normalizeText(cell);
        if (text) texts.push(text);
      });
    });
  });

  return texts.join(" ");
}

function parseSheetRows(sheetName: string, rows: unknown[][]) {
  if (rows.length === 0) return [] as ParsedRow[];

  const headerRowIndex = chooseHeaderRow(rows);
  const headers = rows[headerRowIndex].map(normalizeHeader);
  const dataStart = headerRowIndex + 1;
  const sheetUnitHint = extractSheetUnitHint(rows);
  const amountColumn =
    findColumn(headers, "amount") >= 0
      ? findColumn(headers, "amount")
      : findFallbackAmountColumn(rows, dataStart);
  const categoryColumn = findColumn(headers, "category");
  const noteColumn = findColumn(headers, "note");
  const uomColumn = headers.findIndex((header) => /uom|unit/.test(header));
  const nameColumn = resolveNameColumn(rows, headers, dataStart, amountColumn, categoryColumn);
  const amountHeader = headers[amountColumn] ?? "";
  let currentCategory: CostCategory | null = null;

  const parsed = rows
    .slice(dataStart)
    .map((row) => {
      const sectionCategory = detectSectionCategory(row);
      if (sectionCategory && isSectionRow(row, amountColumn)) {
        currentCategory = sectionCategory;
        return null;
      }

      const name =
        uomColumn >= 0 ? extractStructuredName(row, uomColumn) : normalizeText(row[nameColumn]);
      const rawAmount = parseNumeric(row[amountColumn]);
      const note = noteColumn >= 0 ? normalizeText(row[noteColumn]) : "";
      const categoryText =
        categoryColumn >= 0 ? normalizeText(row[categoryColumn]) : `${name} ${note}`;

      if (!name || rawAmount === null || rawAmount === 0) return null;

      const loweredName = name.toLowerCase();
      if (/(total|subtotal|합계|총계)/i.test(loweredName)) return null;

      return {
        name,
        category:
          parseExplicitCategory(categoryColumn >= 0 ? row[categoryColumn] : "") ??
          (categoryColumn >= 0 && normalizeText(row[categoryColumn])
            ? inferCostCategoryFromText(categoryText)
            : currentCategory ?? inferCostCategoryFromText(categoryText)),
        amountEok: convertAmountToEok(
          rawAmount,
          `${sheetUnitHint} ${amountHeader} ${note} ${sheetName}`,
        ),
        note: [sheetName, note].filter(Boolean).join(" / "),
      };
    })
    .filter(Boolean) as ParsedRow[];

  return parsed;
}

function createReferenceProjectId(fileName: string) {
  const normalized = fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `ref-${normalized || "project"}-${Date.now().toString(36)}`;
}

function collectInspectionWarnings(project: ReferenceProject) {
  const warnings: string[] = [];
  const categoryTotals = project.items.reduce<Record<CostCategory, number>>(
    (acc, item) => {
      acc[item.category] += item.amountEok;
      return acc;
    },
    { S: 0, P: 0, C: 0 },
  );
  const totalEok = project.items.reduce((sum, item) => sum + item.amountEok, 0);

  if (project.items.length < 5) {
    warnings.push("파싱된 항목 수가 적습니다. 합계행만 읽힌 것은 아닌지 확인하세요.");
  }

  if (totalEok < 30) {
    warnings.push("총액이 30억원 미만입니다. 금액 열이나 단위 해석을 다시 확인하세요.");
  } else if (totalEok > 2_000) {
    warnings.push("총액이 2,000억원을 초과합니다. 원 단위가 중복 환산된 것은 아닌지 확인하세요.");
  }

  const dominantCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  if (dominantCategory && dominantCategory[1] / Math.max(totalEok, 0.01) >= 0.85) {
    warnings.push(
      `${dominantCategory[0]} 비중이 85% 이상입니다. 카테고리 추론 또는 금액 열 선택이 맞는지 점검하세요.`,
    );
  }

  const emptyCategories = Object.entries(categoryTotals)
    .filter(([, amount]) => amount === 0)
    .map(([category]) => category);
  if (emptyCategories.length > 0) {
    warnings.push(`${emptyCategories.join(", ")} 항목이 없습니다. 분류 기준을 확인하세요.`);
  }

  return {
    warnings,
    categoryTotals: {
      S: Number(categoryTotals.S.toFixed(2)),
      P: Number(categoryTotals.P.toFixed(2)),
      C: Number(categoryTotals.C.toFixed(2)),
    },
    totalEok: Number(totalEok.toFixed(2)),
  };
}

export function summarizeReferenceWorkbookInspection(
  project: ReferenceProject,
  meta: {
    fileName: string;
    sheetCount: number;
    extraWarnings?: string[];
  },
): ReferenceWorkbookInspection {
  const summary = collectInspectionWarnings(project);

  return {
    fileName: meta.fileName,
    sheetCount: meta.sheetCount,
    itemCount: project.items.length,
    categoryTotals: summary.categoryTotals,
    warnings: [...(meta.extraWarnings ?? []), ...summary.warnings],
    project: {
      ...project,
      totalEok: summary.totalEok,
    },
  };
}

export async function inspectReferenceWorkbook(
  file: File,
): Promise<ReferenceWorkbookInspection> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, {
    type: "array",
    dense: true,
    cellDates: false,
  });

  const visibleSheetNames = getVisibleSheetNames(workbook);
  const hiddenSheetNames = getHiddenSheetNames(workbook);
  const commentCount = visibleSheetNames.reduce((sum, sheetName) => {
    return sum + countSheetComments(workbook.Sheets[sheetName]);
  }, 0);

  const rowsBySheet = visibleSheetNames.map((sheetName) => ({
    sheetName,
    rows: utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }) as unknown[][],
  }));

  const items = rowsBySheet.flatMap(({ sheetName, rows }) => parseSheetRows(sheetName, rows));

  if (items.length === 0) {
    throw new Error("업로드한 워크북에서 항목별 금액 행을 찾지 못했습니다.");
  }

  const filteredItems = items
    .filter((item) => item.amountEok > 0)
    .map<ReferenceProjectItem>((item, index) => ({
      code: `${item.category}-${String(index + 1).padStart(3, "0")}`,
      name: item.name,
      category: item.category,
      amountEok: Number(item.amountEok.toFixed(4)),
      note: item.note,
    }));

  const corpus = extractWorkbookCorpus(file.name, rowsBySheet);
  const capacityMatch = corpus.match(/(\d+(?:\.\d+)?)\s*mw/i);
  const yearMatch = corpus.match(/20\d{2}/);
  const fallbackName = file.name.replace(/\.[^.]+$/, "");
  const extraWarnings: string[] = [];

  if (hiddenSheetNames.length > 0) {
    extraWarnings.push(
      `숨겨진 시트 ${hiddenSheetNames.length}개는 계산에서 제외했습니다: ${hiddenSheetNames.join(", ")}`,
    );
  }

  if (commentCount > 0) {
    extraWarnings.push(
      `셀 메모/주석 ${commentCount}건은 계산에 반영하지 않았습니다. 필요한 경우 시트 원본을 별도로 확인하세요.`,
    );
  }

  if (!yearMatch) {
    extraWarnings.push(
      `기준연도를 파일에서 찾지 못해 기본값 ${DEFAULT_REFERENCE_PROJECT.referenceYear}년을 사용합니다.`,
    );
  }

  if (!capacityMatch) {
    extraWarnings.push(
      `기준 용량을 파일에서 찾지 못해 기본값 ${DEFAULT_REFERENCE_PROJECT.referenceCapacityMw}MW를 사용합니다.`,
    );
  }

  const project: ReferenceProject = {
    id: createReferenceProjectId(file.name),
    name: fallbackName,
    source: "excel-upload",
    sourceFileName: file.name,
    referenceYear: yearMatch ? Number(yearMatch[0]) : DEFAULT_REFERENCE_PROJECT.referenceYear,
    referenceCapacityMw: capacityMatch
      ? Number(capacityMatch[1])
      : DEFAULT_REFERENCE_PROJECT.referenceCapacityMw,
    totalEok: 0,
    items: filteredItems,
    notes: [
      `${file.name} 파일에서 가져온 기준서입니다.`,
      `${rowsBySheet.length}개 표시 시트를 스캔했습니다.`,
      "연도와 용량은 워크북 텍스트에서 추정했으므로 적용 전 다시 확인하세요.",
    ],
  };

  // 원본 워크북 객체 참조를 지워 세션 메모리에 불필요하게 남지 않도록 정리합니다.
  Object.keys(workbook.Sheets).forEach((sheetName) => {
    delete workbook.Sheets[sheetName];
  });
  workbook.SheetNames.length = 0;
  if (workbook.Workbook?.Sheets) {
    workbook.Workbook.Sheets.length = 0;
  }

  return summarizeReferenceWorkbookInspection(project, {
    fileName: file.name,
    sheetCount: rowsBySheet.length,
    extraWarnings,
  });
}

export async function importReferenceWorkbook(file: File): Promise<ReferenceProject> {
  const inspection = await inspectReferenceWorkbook(file);
  return inspection.project;
}
