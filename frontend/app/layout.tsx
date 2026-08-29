import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SentinelOps — AI Incident Intelligence",
  description:
    "Enterprise-grade AI-powered incident management platform with autonomous self-healing, predictive forecasting, and real-time blast-radius mapping.",
  keywords: ["incident management", "SRE", "AI", "LangGraph", "DevOps"],
  authors: [{ name: "SentinelOps" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`} suppressHydrationWarning>
      <body className="gradient-mesh min-h-screen font-sans antialiased text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
