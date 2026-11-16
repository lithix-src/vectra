import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VECTRA — Enterprise AI Intelligence & Advisory OS",
  description:
    "Multi-tenant Enterprise AI Intelligence, Variant Comparison Matrix, Associative Knowledge Graph, and Boardroom Readout OS engineered for Erik.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#090D14] text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
