import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
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
              Search · Analyze · Report
            </span>
          </div>
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}
