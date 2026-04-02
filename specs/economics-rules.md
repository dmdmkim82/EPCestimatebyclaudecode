# 경제성 분석 규칙

## 목적

경제성 페이지에서 사용하는 투자비, 운영비, 차입 구조, 민감도 계산 규칙을 고정합니다.

## 최상위 원칙

### 1. 결정론적 계산

경제성 계산은 로컬 함수로만 처리합니다.

- 같은 입력이면 항상 같은 결과가 나와야 합니다.
- 외부 AI나 외부 최적화 도구에 의존하지 않습니다.

### 2. 입력 중심 검토

경제성은 사용자가 확정한 수치만 사용합니다.

- 주기기 금액
- EPC 가산
- 판매단가
- 연료비
- 용량계수
- 차입 조건
- 스택 교체 주기 및 교체비

## 입력값

- 프로젝트명
- 용량(MW)
- 주기기 금액(억원/MW)
- EPC 가산(%)
- 판매단가(원/kWh)
- 연료비(원/kWh)
- 용량계수(%)
- 연간 성능 저하(%)
- 고정 O&M(%/년)
- 스택 적립비(%/년)
- 스택 교체 주기(년)
- 스택 교체비(원/kW)
- 할인율(%)
- 사업기간(년)
- 차입비율(%)
- 차입금리(%)
- 차입기간(년)
- 법인세율(%)

## 계산 순서

### 1. 총 투자비

- `mainEquipmentCapexEok = capacityMw × mainEquipmentCostEokPerMw`
- `epcAdderEok = mainEquipmentCapexEok × epcAdderPct`
- `totalCapexEok = mainEquipmentCapexEok + epcAdderEok`

### 2. 차입/자기자본

- `debtAmountEok = totalCapexEok × debtRatioPct`
- `equityAmountEok = totalCapexEok - debtAmountEok`

### 3. 연간 발전량

- `generationMWh = capacityMw × 8760 × capacityFactor × degradationFactor`

### 4. 운영비

연간 운영비는 아래 세 항목을 합산합니다.

- 연료비
- 고정 O&M + 스택 적립비
- 스택 교체 시점의 일시 반영 비용

### 5. 스택 교체비

스택 교체비는 `원/kW` 입력을 기준으로 주기 도래 연도에 일시 반영합니다.

- `stackReplacementEventEok = capacityMw × 1000 × stackReplacementCostKrwPerKw / 100,000,000`
- `year % stackReplacementCycleYears === 0` 인 연도에만 반영
- 교체비가 `0`이면 스택 교체 이벤트가 없는 것으로 처리

### 6. 현금흐름

- 매출
- 운영비
- EBITDA
- 프로젝트 현금흐름
- 차입 원리금 상환
- DSCR
- 자기자본 현금흐름

## 결과 지표

- 총 투자비
- LCOE
- Project IRR
- Equity IRR
- 최소/평균 DSCR
- Project/Equity Payback
- 연간 현금흐름 표

## 민감도 분석

민감도는 토네이도 차트로 표시합니다.

- 주기기 금액
- 판매단가
- 연료비
- 용량계수

## 격자 분석

판매단가와 연료비를 동시에 흔드는 2차원 격자 분석을 제공합니다.

- 행: 연료비
- 열: 판매단가
- 셀 값: Project IRR

참고:

- LCOE는 판매단가에 영향을 받지 않으므로, 의사결정용 격자 분석은 Project IRR 기준으로 표시합니다.

## 변경 시 주의사항

- 계산식 변경 전 이 문서를 먼저 수정합니다.
- `경제성` 페이지 UI는 수식 재구현 없이 `lib/economics.ts` 결과만 렌더링해야 합니다.
