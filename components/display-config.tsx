"use client";

import { useEffect, useMemo, useState } from "react";

type FontScale = "compact" | "default" | "large";
type ContrastMode = "soft" | "balanced" | "strong";

const fontOptions: Array<{ value: FontScale; label: string }> = [
  { value: "compact", label: "작게" },
  { value: "default", label: "기본" },
  { value: "large", label: "크게" },
];

const contrastOptions: Array<{ value: ContrastMode; label: string }> = [
  { value: "soft", label: "부드럽게" },
  { value: "balanced", label: "균형" },
  { value: "strong", label: "선명하게" },
];

function applyDisplayConfig(fontScale: FontScale, contrastMode: ContrastMode) {
  const root = document.documentElement;
  root.dataset.fontScale = fontScale;
  root.dataset.contrast = contrastMode;
}

export function DisplayConfig() {
  const [open, setOpen] = useState(false);
  const [fontScale, setFontScale] = useState<FontScale>("default");
  const [contrastMode, setContrastMode] = useState<ContrastMode>("balanced");

  useEffect(() => {
    applyDisplayConfig("default", "balanced");
  }, []);

  useEffect(() => {
    applyDisplayConfig(fontScale, contrastMode);
  }, [fontScale, contrastMode]);

  const summary = useMemo(() => {
    const font = fontOptions.find((option) => option.value === fontScale)?.label ?? "기본";
    const contrast =
      contrastOptions.find((option) => option.value === contrastMode)?.label ?? "균형";
    return `${font} / ${contrast}`;
  }, [contrastMode, fontScale]);

  return (
    <div className={`display-config${open ? " display-config--open" : ""}`}>
      <button
        aria-expanded={open}
        className="display-config__trigger"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span>화면 설정</span>
        <small>{summary}</small>
      </button>

      {open ? (
        <div className="display-config__panel" role="dialog" aria-label="화면 설정">
          <div className="display-config__section">
            <strong>폰트 크기</strong>
            <div className="display-config__options">
              {fontOptions.map((option) => (
                <button
                  key={option.value}
                  className={
                    fontScale === option.value
                      ? "display-config__option display-config__option--active"
                      : "display-config__option"
                  }
                  type="button"
                  onClick={() => setFontScale(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="display-config__section">
            <strong>글자 대비</strong>
            <div className="display-config__options">
              {contrastOptions.map((option) => (
                <button
                  key={option.value}
                  className={
                    contrastMode === option.value
                      ? "display-config__option display-config__option--active"
                      : "display-config__option"
                  }
                  type="button"
                  onClick={() => setContrastMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="display-config__reset"
            type="button"
            onClick={() => {
              setFontScale("default");
              setContrastMode("balanced");
            }}
          >
            기본값으로 되돌리기
          </button>
        </div>
      ) : null}
    </div>
  );
}
