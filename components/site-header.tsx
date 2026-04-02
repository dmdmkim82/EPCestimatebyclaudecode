"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/estimate", label: "견적산출" },
  { href: "/economics", label: "경제성" },
  { href: "/b2b", label: "B2B 제안" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-header__brand" href="/estimate">
          <span>{"연료전지 EPC"}</span>
          <em>{"Studio"}</em>
        </Link>

        <nav className="site-header__nav" aria-label="Primary">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/estimate" && pathname === "/");

            return (
              <Link
                key={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`site-header__nav-item${isActive ? " site-header__nav-item--active" : ""}`}
                href={item.href}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
