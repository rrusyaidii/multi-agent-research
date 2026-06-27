import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SECTION_NAV } from "@/lib/nav-links";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Research Agent home"
        >
          <BrandMark />
          <div className="leading-tight">
            <span className="block font-serif text-base font-semibold tracking-tight sm:text-lg">
              Research Agent
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Multi-agent report generator
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {SECTION_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              title={link.description}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
