import "./globals.css";
import type { Metadata } from "next";
import { Rubik, Space_Grotesk } from "next/font/google";
import { ResponsibleGamingNotice } from "@/components/ResponsibleGamingNotice";
import { ConfirmProvider } from "@/components/ConfirmDialog";

const ui = Rubik({ subsets: ["latin"], variable: "--font-ui" });
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Bolão CEMEP",
  description: "Bolão de placares da empresa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${ui.variable} ${display.variable}`}>
      <body className="font-ui bg-canvas text-white antialiased">
        <ConfirmProvider>
          {children}
          <ResponsibleGamingNotice />
        </ConfirmProvider>
      </body>
    </html>
  );
}
