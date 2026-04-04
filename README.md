# EPC Estimate Builder

E, P, C, ETC 항목을 한 줄씩 추가하면서 총 견적금액을 완성하는 Next.js 기반 EPC 견적 작성 도구입니다.

## 변경 방향

- 기존 참조 프로젝트 비교형 견적 구조를 라인아이템 누적형 구조로 재구성
- 화면은 `상단 요약 + 좌측 분류 트리 + 중앙 내역표 + 우측 입력 패널` 형태
- `ETC` 항목에서 직접비 기준 비율 산정 지원
- 엑셀은 `Summary`, `E_Service`, `P_Procurement`, `C_Construction`, `Etc_Indirect` 시트 구조로 저장/불러오기

## 카테고리 구조

- `E`: service cost 항목
- `P`: 각종 구매자재 및 패키지
- `C`: 기계, 배관, 전기, 계장, 건축, 토목 등 공사비
- `ETC`: 간접비, 세금, 인허가, escalation, contingency, 하자보수 등

## 실행

```bash
npm install
npm run dev
```

배포용 검증:

```bash
npm run build
```

## 엑셀 사용 방식

1. 화면에서 항목을 추가/수정한다.
2. `현재 견적 엑셀`로 파일을 다운로드한다.
3. 엑셀에서 항목을 추가하거나 수정한다.
4. `엑셀 불러오기`로 다시 앱에 반영한다.

## 핵심 파일

- `components/estimate-studio.tsx`
- `components/estimate-analytics.tsx`
- `lib/estimator.ts`
- `lib/excel-import.ts`
- `app/globals.css`
