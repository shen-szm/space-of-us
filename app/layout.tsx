import type { Metadata } from "next";
import "./globals.css";
import ThemeController from "@/components/ThemeController";

export const metadata: Metadata = {
  title: "Space of us",
  description: "沈先生和张小姐的专属情侣空间。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
