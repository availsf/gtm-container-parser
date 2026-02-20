import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
