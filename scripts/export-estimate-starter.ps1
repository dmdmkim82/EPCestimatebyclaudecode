# export-estimate-starter.ps1
# Supanova 디자인 시스템 기반 Next.js 스타터를 starter-output/my-nextjs-app 에 생성합니다.
# 용도: 새 프로젝트에 디자인 시스템(globals.css, layout, 폰트, display-config)만 이식

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Out  = Join-Path $Root "starter-output\my-nextjs-app"

Write-Host ""
Write-Host ">>> 스타터 생성 시작" -ForegroundColor Cyan
Write-Host "    위치: $Out" -ForegroundColor Gray

# ── 기존 출력 초기화 ────────────────────────────────────────────────
if (Test-Path $Out) { Remove-Item $Out -Recurse -Force }

# ── 디렉토리 생성 ───────────────────────────────────────────────────
foreach ($d in @("app", "components", "public\fonts")) {
  New-Item -ItemType Directory -Path (Join-Path $Out $d) -Force | Out-Null
}

# ── 파일 복사 ───────────────────────────────────────────────────────
# 디자인 시스템 CSS (5500+ 줄 전체)
Copy-Item (Join-Path $Root "app\globals.css") (Join-Path $Out "app\globals.css")
Write-Host "    [복사] app/globals.css" -ForegroundColor Green

# 화면 설정 컴포넌트 (폰트/대비 패널)
Copy-Item (Join-Path $Root "components\display-config.tsx") (Join-Path $Out "components\display-config.tsx")
Write-Host "    [복사] components/display-config.tsx" -ForegroundColor Green

# Pretendard 폰트
$fontSrc = Join-Path $Root "public\fonts\PretendardVariable.woff2"
if (Test-Path $fontSrc) {
  Copy-Item $fontSrc (Join-Path $Out "public\fonts\PretendardVariable.woff2")
  Write-Host "    [복사] public/fonts/PretendardVariable.woff2" -ForegroundColor Green
} else {
  Write-Host "    [주의] 폰트 없음 — https://github.com/orioncactus/pretendard 에서 다운로드 후 public/fonts/ 에 추가" -ForegroundColor Yellow
}

# tsconfig
Copy-Item (Join-Path $Root "tsconfig.json") (Join-Path $Out "tsconfig.json")
Write-Host "    [복사] tsconfig.json" -ForegroundColor Green

# ── 생성: package.json ──────────────────────────────────────────────
@'
{
  "name": "my-nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0"
  }
}
'@ | Set-Content (Join-Path $Out "package.json") -Encoding UTF8
Write-Host "    [생성] package.json" -ForegroundColor Green

# ── 생성: app/layout.tsx ────────────────────────────────────────────
@'
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DisplayConfig } from "@/components/display-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "앱 제목",        // ← 변경
  description: "앱 설명",  // ← 변경
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <meta content="no-referrer" name="referrer" />
      </head>
      <body>
        <span className="site-credit">coding by claude</span>
        {children}
        <DisplayConfig />
      </body>
    </html>
  );
}
'@ | Set-Content (Join-Path $Out "app\layout.tsx") -Encoding UTF8
Write-Host "    [생성] app/layout.tsx" -ForegroundColor Green

# ── 생성: app/page.tsx (보일러플레이트) ────────────────────────────
@'
// ─────────────────────────────────────────────────────────────────
// 이 파일을 원하는 내용으로 교체하세요.
// 아래는 Supanova 디자인 클래스를 사용한 예시입니다.
// ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="page-shell page-shell--studio">

      {/* ── 히어로 ── */}
      <section className="studio-hero studio-hero--mix">
        <div className="studio-hero__copy">
          <span className="section-label">서비스 이름</span>
          <h1 className="section-title">메인 타이틀</h1>
          <p className="section-text">서비스 설명 텍스트</p>
        </div>
        <div className="studio-hero__stats">
          <article className="studio-stat">
            <span>항목 1</span>
            <strong>값 1</strong>
          </article>
          <article className="studio-stat">
            <span>항목 2</span>
            <strong>값 2</strong>
          </article>
          <article className="studio-stat">
            <span>항목 3</span>
            <strong>값 3</strong>
          </article>
        </div>
      </section>

      {/* ── 패널 ── */}
      <div className="estimate-panel">
        <div className="panel-surface">
          <div className="panel-surface__header">
            <span className="control-label">섹션 레이블</span>
            <h3>카드 제목</h3>
          </div>
          <p>내용을 여기에 작성하세요.</p>
        </div>
      </div>

    </main>
  );
}
'@ | Set-Content (Join-Path $Out "app\page.tsx") -Encoding UTF8
Write-Host "    [생성] app/page.tsx" -ForegroundColor Green

# ── 생성: README.md ─────────────────────────────────────────────────
@'
# my-nextjs-app

Supanova 디자인 시스템 기반 Next.js 스타터입니다.

## 시작

```bash
npm install
npm run dev
```

## 가장 먼저 바꿀 것

- `app/layout.tsx` — 앱 제목, 설명, credit 문구
- `app/page.tsx` — 홈 화면 내용 전체 교체

## 디자인 클래스 치트시트

### 레이아웃
| 클래스 | 설명 |
|---|---|
| `.page-shell` | 기본 페이지 컨테이너 |
| `.page-shell--studio` | 스튜디오 배경 (연한 크림) |

### 히어로 섹션
| 클래스 | 설명 |
|---|---|
| `.studio-hero` | 좌(텍스트) / 우(스탯) 2열 그리드 |
| `.studio-hero--mix` | 다크 그라디언트 배경 |
| `.studio-hero__copy` | 좌측 텍스트 영역 |
| `.studio-hero__stats` | 우측 스탯 카드 그리드 |
| `.studio-stat` | 스탯 카드 개별 |

### 타이포그래피
| 클래스 | 설명 |
|---|---|
| `.section-label` | 강조 레이블 (파랑/보라) |
| `.section-title` | 큰 제목 |
| `.section-text` | 본문 텍스트 |
| `.control-label` | 소제목 |

### 카드 / 패널
| 클래스 | 설명 |
|---|---|
| `.estimate-panel` | 메인 패널 (더블 베젤 그림자) |
| `.panel-surface` | 내부 카드 |
| `.panel-surface__header` | 카드 헤더 |
| `.summary-card` | 요약 카드 |
| `.result-main` | 결과 강조 박스 |

### 버튼
| 클래스 | 설명 |
|---|---|
| `.button` | 기본 버튼 |
| `.button--primary` | 파란 강조 버튼 |
| `.button--secondary` | 보조 버튼 |

### 기타
| 클래스 | 설명 |
|---|---|
| `.solution-grid` | 2열 그리드 |
| `.site-credit` | 우상단 크레딧 뱃지 |

## 폰트

`public/fonts/PretendardVariable.woff2` 파일이 필요합니다.
없으면 https://github.com/orioncactus/pretendard 에서 다운로드하세요.
'@ | Set-Content (Join-Path $Out "README.md") -Encoding UTF8
Write-Host "    [생성] README.md" -ForegroundColor Green

# ── 완료 ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host ">>> 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "  cd `"$Out`""
Write-Host "  npm install"
Write-Host "  npm run dev"
Write-Host ""
