import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "GTM 3-Column Diff Dashboard",
  description: "Compare GTM GA4 tags across three containers."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <GoogleAnalytics gaId="G-2S4YMYG4B2" />
      </body>
    </html>
  );
}
