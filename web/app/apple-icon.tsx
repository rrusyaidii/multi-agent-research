import { ImageResponse } from "next/og";

import { BRAND_COLORS, BOT_ICON_PATHS, BOT_ICON_RECT } from "@/lib/brand-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_COLORS.background,
          borderRadius: 36,
        }}
      >
        <svg
          width="100"
          height="100"
          viewBox="0 0 24 24"
          fill="none"
          stroke={BRAND_COLORS.icon}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {BOT_ICON_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
          <rect {...BOT_ICON_RECT} />
        </svg>
      </div>
    ),
    { ...size },
  );
}
