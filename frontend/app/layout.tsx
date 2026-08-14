import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import NovaAppLayout from "../components/NovaAppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import GlobalLanguage from "@/components/GlobalLanguage";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NOVA ERP",
  description: "Next Optimized Workflow Automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-white">
  <ThemeProvider>
    <GlobalLanguage />
    <NovaAppLayout>
      {children}
    </NovaAppLayout>
  </ThemeProvider>
</body>
    </html>
  );
}
