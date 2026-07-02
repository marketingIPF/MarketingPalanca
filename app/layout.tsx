import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NavBar from "@/components/layout/NavBar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "RK Marketing Hub",
  description: "Gestión de contenido y grabaciones · RK Palanca Fontestad",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.variable} min-h-screen bg-[#F9FAFB] font-sans antialiased`}>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
