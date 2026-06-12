import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "千问 Chat",
  description: "QianWen style multimodal AI chat app"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
