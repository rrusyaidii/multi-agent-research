"use client";

import { Menu } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { SECTION_NAV } from "@/lib/nav-links";

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 md:hidden"
            aria-label="Open menu"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg">Navigation</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {SECTION_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-3 transition-colors hover:bg-muted"
            >
              <span className="block text-sm font-medium">{link.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {link.description}
              </span>
            </Link>
          ))}
        </nav>
        <Separator className="mx-4" />
        <p className="px-4 text-xs text-muted-foreground">
          Jump to a section on this page
        </p>
      </SheetContent>
    </Sheet>
  );
}
