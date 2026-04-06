// export-html-starter.mjs
// globals.css 전체를 인라인으로 포함한 단일 HTML 스타터를 생성합니다.
// 출력: starter-output/starter.html

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "starter-output");
const outFile = resolve(outDir, "starter.html");

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// globals.css 읽기
let css = readFileSync(resolve(root, "app/globals.css"), "utf8");

// 폰트를 Base64로 인라인 처리
const fontPath = resolve(root, "public/fonts/PretendardVariable.woff2");
if (existsSync(fontPath)) {
  const fontBase64 = readFileSync(fontPath).toString("base64");
  css = css.replace(
    /url\("\/fonts\/PretendardVariable\.woff2"\)/g,
    `url('data:font/woff2;base64,${fontBase64}')`
  );
  console.log("  [폰트] Base64 인라인 완료");
} else {
  console.warn("  [주의] 폰트 파일 없음 — Noto Sans KR CDN으로 대체");
}

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>앱 제목</title>
  <meta name="referrer" content="no-referrer" />
  <style>
${css}
  </style>
</head>
<body data-font-scale="default" data-contrast="balanced">

  <!-- 우상단 크레딧 -->
  <span class="site-credit">coding by claude</span>

  <!-- 페이지 -->
  <main class="page-shell page-shell--studio">

    <!-- 히어로 섹션 -->
    <section class="studio-hero studio-hero--mix">
      <div class="studio-hero__copy">
        <span class="section-label">서비스 이름</span>
        <h1 class="section-title">메인 타이틀을<br>입력하세요</h1>
        <p class="section-text">서비스 설명 텍스트를 여기에 입력합니다.</p>
        <div style="display:flex;gap:12px;margin-top:28px">
          <button class="button button--primary" type="button">주요 액션</button>
          <button class="button button--secondary" type="button">보조 액션</button>
        </div>
      </div>
      <div class="studio-hero__stats">
        <article class="studio-stat">
          <span>항목 1</span>
          <strong>값 1</strong>
        </article>
        <article class="studio-stat">
          <span>항목 2</span>
          <strong>값 2</strong>
        </article>
        <article class="studio-stat">
          <span>항목 3</span>
          <strong>값 3</strong>
        </article>
      </div>
    </section>

    <!-- 패널 -->
    <div class="estimate-panel">
      <div class="panel-surface">
        <div class="panel-surface__header">
          <span class="control-label">섹션 레이블</span>
          <h3>카드 제목</h3>
        </div>
        <p class="section-text">내용을 여기에 작성하세요.</p>
      </div>
      <div class="panel-surface">
        <div class="panel-surface__header">
          <span class="control-label">두 번째 카드</span>
          <h3>다른 섹션</h3>
        </div>
        <div class="summary-card">
          <span>요약 항목</span>
          <strong class="result-main">결과값</strong>
        </div>
      </div>
    </div>

    <!-- 2열 그리드 -->
    <div class="solution-grid" style="margin-top:24px">
      <div class="panel-surface">
        <div class="panel-surface__header">
          <span class="control-label">좌측</span>
          <h3>그리드 카드 1</h3>
        </div>
        <p class="section-text">내용</p>
      </div>
      <div class="panel-surface">
        <div class="panel-surface__header">
          <span class="control-label">우측</span>
          <h3>그리드 카드 2</h3>
        </div>
        <p class="section-text">내용</p>
      </div>
    </div>

  </main>

  <!-- 화면 설정 패널 -->
  <div class="display-config" id="dc">
    <button class="display-config__trigger" onclick="toggleDC()" type="button">
      <span>화면 설정</span>
      <small id="dc-summary">기본 / 균형</small>
    </button>
    <div class="display-config__panel" id="dc-panel" style="display:none">
      <div class="display-config__section">
        <strong>폰트 크기</strong>
        <div class="display-config__options">
          <button class="display-config__option" onclick="setFont('compact')" type="button">작게</button>
          <button class="display-config__option display-config__option--active" onclick="setFont('default')" type="button">기본</button>
          <button class="display-config__option" onclick="setFont('large')" type="button">크게</button>
        </div>
      </div>
      <div class="display-config__section">
        <strong>글자 대비</strong>
        <div class="display-config__options">
          <button class="display-config__option" onclick="setContrast('soft')" type="button">부드럽게</button>
          <button class="display-config__option display-config__option--active" onclick="setContrast('balanced')" type="button">균형</button>
          <button class="display-config__option" onclick="setContrast('strong')" type="button">선명하게</button>
        </div>
      </div>
      <button class="display-config__reset" onclick="resetDC()" type="button">기본값으로 되돌리기</button>
    </div>
  </div>

  <script>
    var _f = 'default', _c = 'balanced';
    var labels = { compact:'작게', default:'기본', large:'크게', soft:'부드럽게', balanced:'균형', strong:'선명하게' };

    function toggleDC() {
      var p = document.getElementById('dc-panel');
      p.style.display = p.style.display === 'none' ? 'block' : 'none';
    }
    function setFont(v) {
      _f = v; document.documentElement.dataset.fontScale = v; sync();
    }
    function setContrast(v) {
      _c = v; document.documentElement.dataset.contrast = v; sync();
    }
    function resetDC() { setFont('default'); setContrast('balanced'); }
    function sync() {
      document.getElementById('dc-summary').textContent = labels[_f] + ' / ' + labels[_c];
      document.querySelectorAll('.display-config__option').forEach(function(b) {
        var t = b.textContent.trim();
        b.classList.toggle('display-config__option--active', t === labels[_f] || t === labels[_c]);
      });
    }
  </script>

</body>
</html>`;

writeFileSync(outFile, html, "utf8");

const sizeKB = Math.round(Buffer.byteLength(html, "utf8") / 1024);
console.log(`\n>>> 완료!`);
console.log(`    파일: ${outFile}`);
console.log(`    크기: ${sizeKB} KB\n`);
