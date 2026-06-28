import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  number: number;
  title: string;
  icon: LucideIcon;
  className?: string;
  trailing?: React.ReactNode;
}

export function SectionHeader({
  number,
  title,
  icon: Icon,
  className,
  trailing,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
        <h2 className="text-base font-semibold text-primary">
          {number}. {title}
        </h2>
      </div>
      {trailing}
    </div>
  );
}
