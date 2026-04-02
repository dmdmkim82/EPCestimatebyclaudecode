"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    href: "/estimate",
    label: "견적산출",
    sublabel: "Cost Estimate",
    icon: "solar:calculator-minimalistic-bold",
  },
  {
    href: "/economics",
    label: "경제성",
    sublabel: "Economics",
    icon: "solar:chart-2-bold",
  },
  {
    href: "/b2b",
    label: "B2B 제안",
    sublabel: "Proposal",
    icon: "solar:document-text-bold",
  },
];

export function SiteSidebar() {
  const pathname = usePathname();

  return (
    <aside className="site-sidebar">
      <div className="site-sidebar__top">
        <Link className="site-sidebar__brand" href="/estimate">
          <span className="site-sidebar__brand-icon">
            <span className="iconify" data-icon="solar:bolt-bold" />
          </span>
          <span className="site-sidebar__brand-text">
            <strong>{"연료전지 EPC"}</strong>
            <em>{"Studio"}</em>
          </span>
        </Link>
      </div>

      <nav className="site-sidebar__nav" aria-label="Primary">
        <p className="site-sidebar__section-label">{"메뉴"}</p>
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/estimate" && pathname === "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`site-sidebar__nav-item${isActive ? " site-sidebar__nav-item--active" : ""}`}
            >
              <span className="site-sidebar__nav-icon">
                <span className="iconify" data-icon={item.icon} />
              </span>
              <span className="site-sidebar__nav-text">
                <strong>{item.label}</strong>
                <small>{item.sublabel}</small>
              </span>
              {isActive && <span className="site-sidebar__nav-pip" aria-hidden />}
            </Link>
          );
        })}
      </nav>

      <div className="site-sidebar__divider" />

      <div className="site-sidebar__footer">
        <div className="site-sidebar__meta">
          <span className="site-sidebar__version-badge">{"v2.0"}</span>
          <span className="site-sidebar__meta-text">{"내부 검토용"}</span>
        </div>
        <p className="site-sidebar__meta-sub">{"SOFC EPC Studio"}</p>
      </div>
    </aside>
  );
}
