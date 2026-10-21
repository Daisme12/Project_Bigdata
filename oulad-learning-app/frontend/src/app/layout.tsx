import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Phân tích Học tập & Cá nhân hóa Lộ trình Sinh viên (OULAD)",
  description:
    "Hệ thống Phân tích Học tập (Learning Analytics), Phân cụm K-Means, Dự báo Rủi ro và Cá nhân hóa Lộ trình Học tập trên bộ dữ liệu OULAD.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {/* Menu Hamburger nổi hoàn toàn, không chiếm cột cố định bên trái */}
        <Sidebar />
        <main className="w-full min-h-screen pt-16 px-4 pb-8 md:px-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}
