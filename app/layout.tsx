import type { Metadata } from "next";
import "./globals.css";
import ThemeController from "@/components/ThemeController";

export const metadata: Metadata = {
  title: "Space of us",
  description: "\u6c88\u5148\u751f\u548c\u5f20\u5c0f\u59d0\u7684\u4e13\u5c5e\u60c5\u4fa3\u7a7a\u95f4\u3002",
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
