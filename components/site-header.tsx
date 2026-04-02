"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/estimate", label: "\uACAC\uC801\uC0B0\uCD9C" },
  { href: "/economics", label: "\uACBD\uC81C\uC131" },
  { href: "/b2b", label: "B2B \uC81C\uC548" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-header__brand" href="/estimate">
          <span>{"\uC5F0\uB8CC\uC804\uC9C0 EPC"}</span>
          <em>Studio</em>
        </Link>

        <nav className="site-header__nav" aria-label="Primary">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || (item.href === "/estimate" && pathname === "/");

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

        <Link className="site-header__cta" href="/estimate">
          <span className="button__stack">
            <strong>{"\uACAC\uC801\uC0B0\uCD9C"}</strong>
          </span>
        </Link>
      </div>
    </header>
  );
}
