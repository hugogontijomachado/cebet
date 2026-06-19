import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bolão CEMEP",
  description: "Bolão de placares da empresa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
