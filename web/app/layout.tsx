import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";

import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Research Agent",
  description:
    "Research any topic with a multi-agent pipeline. Search, analyze, and compile structured reports.",
  applicationName: "Research Agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${ibmPlexSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring"
          >
            Skip to main content
          </a>
          <Header />
          <main id="main-content" className="flex flex-1 flex-col">
            {children}
          </main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
