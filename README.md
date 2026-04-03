# SOFC Estimate Studio

SOFC EPC 견적산출만 다루는 내부 검토용 Next.js 도구입니다.

현재 버전은 보안 경계를 단순하게 유지하기 위해 `견적산출` 페이지만 제공합니다.
경제성, B2B 제안, 외부 시세판, 지도 임베드 기능은 제거했습니다.

## 핵심 원칙

### 1. 결정론적 계산

견적산출은 외부 서비스나 LLM 응답에 의존하지 않습니다.

- 견적 계산 엔진: `lib/estimator.ts`
- 참조 워크북 파싱/검수: `lib/excel-import.ts`
- 견적 화면 조합: `components/estimate-studio.tsx`

같은 참조 워크북과 같은 입력값이면 항상 같은 결과가 나와야 합니다.

### 2. 업로드 파일은 브라우저에서만 처리

현재 버전은 `엑셀 업로드 -> 브라우저 메모리 파싱 -> 검수 모달 -> 로컬 계산 -> 화면 표시` 흐름으로 동작합니다.

- 업로드 파일은 `file.arrayBuffer()`로 브라우저 메모리에서 읽습니다.
- 앱 코드가 업로드 파일을 외부 서버로 전송하지 않습니다.
- 검수 모달 확인 전에는 기준 데이터에 반영하지 않습니다.
- 숨겨진 시트와 셀 메모는 계산에 자동 반영하지 않고 경고로만 표시합니다.

### 3. 외부 호출 없는 견적산출 경로

보안 강화를 위해 현재 견적산출 경로에서는 외부 호출을 두지 않습니다.

- 외부 AI API 호출 없음
- 외부 DB 호출 없음
- 외부 로그/분석 전송 없음
- 외부 CDN 스크립트 호출 없음
- 외부 지도 임베드 없음
- 외부 시세 API 호출 없음

`app`, `components`, `lib` 기준으로 견적산출에 필요한 로컬 코드만 사용합니다.

## 보안 및 데이터 처리

### 데이터 경계

- 사용자 선택 파일: 브라우저 메모리에서만 읽음
- 계산 중간값: React 상태와 함수 내부 값으로만 유지
- 결과 화면: 현재 세션 DOM에만 렌더링
- 브라우저 저장소: 사용하지 않음
- 새로고침 후 상태: 유지되지 않음

현재는 `localStorage`, `sessionStorage`, `indexedDB`를 사용하지 않도록 구성되어 있습니다.
따라서 새로고침하면 업로드한 참조 엑셀, 계산 이력, 화면 상태가 초기화됩니다.

### 업로드 처리 순서

1. 사용자가 브라우저에서 `.xlsx`, `.xls`, `.csv` 파일을 선택
2. 브라우저가 `File` 객체를 메모리로 전달
3. `lib/excel-import.ts`에서 `file.arrayBuffer()`로 읽음
4. `xlsx` 라이브러리로 앱 런타임 안에서 파싱
5. 검수 모달에서 프로젝트명, 기준연도, 기준용량, 항목, 카테고리, 금액을 확인
6. 사용자가 확정한 구조화 데이터만 계산 엔진에 전달

### 리퍼러 정책

`app/layout.tsx`에는 `referrer=no-referrer`를 유지합니다.
현재 버전은 외부 리소스를 호출하지 않지만, 내부 경로 정보 노출을 줄이기 위한 기본 보안 설정으로 유지합니다.

## 페이지 구성

| 경로 | 목적 | 주요 컴포넌트 |
| --- | --- | --- |
| `/estimate` | 기준 프로젝트 기반 EPC 견적산출 | `EstimateStudio` |
| `/` | `/estimate`로 이동 | App Router redirect |

## 핵심 파일

- `app/estimate/page.tsx`
- `components/estimate-studio.tsx`
- `components/estimate-analytics.tsx`
- `lib/estimator.ts`
- `lib/excel-import.ts`
- `specs/change-checklist.md`
- `specs/estimate-calculation-rules.md`
- `specs/reference-workbook-inspection.md`

## 운영 권장 사항

- 업로드 대상 원본 엑셀은 프로젝트 폴더 밖에서 선택
- 프로젝트 폴더에는 소스코드만 유지
- Git 커밋 전 `git status`로 민감 파일 포함 여부 확인
- 내부 검토 시에는 확장 프로그램이 없는 시크릿 모드 사용
- 민감 검토 후에는 브라우저 프로세스를 완전히 종료

## 검증 기준

- `npm run build` 통과
- `/estimate` 정상 렌더링
- 업로드 후 검수 모달이 먼저 표시됨
- 금액 단위는 `억원`, 비율은 `%`, 용량은 `MW`
- 견적산출 경로에서 외부 호출이 없어야 함
