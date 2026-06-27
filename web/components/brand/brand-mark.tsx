import { FlaskConical } from "lucide-react";

import { BRAND_COLORS } from "@/lib/brand-icon";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: { container: "size-7", icon: "size-3.5" },
  md: { container: "size-9", icon: "size-4.5" },
  lg: { container: "size-11", icon: "size-5" },
} as const;

interface BrandMarkProps {
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function BrandMark({ size = "md", className }: BrandMarkProps) {
  const sizes = sizeClasses[size];

  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-lg", sizes.container, className)}
      style={{
        backgroundColor: BRAND_COLORS.background,
        color: BRAND_COLORS.icon,
      }}
    >
      <FlaskConical className={sizes.icon} aria-hidden />
    </span>
  );
}
