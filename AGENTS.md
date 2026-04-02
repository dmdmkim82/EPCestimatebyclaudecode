# SOFC Estimate Studio

이 저장소는 SOFC EPC 견적산출, 경제성 분석, B2B 제안 화면을 포함한 Next.js 프로젝트입니다.

## 목적

- 계산 로직은 로컬 함수로 결정론적으로 동작해야 합니다.
- 엑셀 참조값은 즉시 반영하지 않고 검수 흐름을 거쳐야 합니다.
- UI보다 계산 근거와 입력 검증을 우선합니다.

## 작업 원칙

1. `specs/` 문서를 먼저 확인합니다.
2. 계산 공식, 엑셀 해석 규칙, 검수 흐름을 바꿀 때는 코드보다 먼저 해당 문서를 갱신합니다.
3. `lib/estimator.ts`는 견적 계산의 단일 기준입니다.
4. `lib/excel-import.ts`는 참조 워크북 해석과 검수 요약의 단일 기준입니다.
5. `components/estimate-studio.tsx`는 입력/검수/결과 화면 조합을 담당하며, 계산식을 직접 다시 구현하지 않습니다.
6. 시장 전광판은 `경제성` 페이지에만 둡니다. `견적산출` 페이지에는 넣지 않습니다.
7. 한국어 UI를 우선합니다. 불필요한 영어 레이블은 추가하지 않습니다.

## 변경 전 체크

- 이번 변경이 아래 중 어디에 속하는지 먼저 판단합니다.
  - Cost DB 규칙
  - 참조 워크북 업로드/검수
  - 견적 계산 공식
  - 경제성 분석
  - B2B 제안 화면
- 계산 또는 파싱 로직 변경이면 `specs/`의 해당 문서를 먼저 수정합니다.

## 변경 후 체크

- `npm run build` 통과
- 숫자 표기 단위 확인
  - 금액: `억원`
  - 비율: `%`
  - 용량: `MW`
- `/estimate`에는 전광판이 없어야 함
- `/economics`에는 전광판이 보여야 함
- 참조 워크북 업로드 시 검수 모달이 먼저 떠야 함

## 핵심 파일

- `app/estimate/page.tsx`
- `app/economics/page.tsx`
- `app/b2b/page.tsx`
- `components/estimate-studio.tsx`
- `components/economics-studio.tsx`
- `components/b2b-lead-page.tsx`
- `lib/estimator.ts`
- `lib/excel-import.ts`
- `lib/economics.ts`

## 문서 기준

- `specs/cost-db-rules.md`
- `specs/reference-workbook-inspection.md`
- `specs/estimate-calculation-rules.md`
- `specs/change-checklist.md`

## 이슈 관리 기준

- 버그는 `.github/ISSUE_TEMPLATE/bug-report.md`를 사용합니다.
- 기능 변경 요청은 `.github/ISSUE_TEMPLATE/change-request.md`를 사용합니다.
- 작업 시작 전 `specs/change-checklist.md`를 기준으로 누락 항목을 먼저 확인합니다.
