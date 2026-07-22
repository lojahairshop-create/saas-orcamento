import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MetalCut Pro | Sistema de Orçamentos Metalúrgicos",
  description: "Cálculos e orçamentos metalúrgicos com corte laser e nesting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} antialiased bg-[#f8f9fc] min-h-screen text-slate-800`}
      >
        {children}
      </body>
    </html>
  );
}
