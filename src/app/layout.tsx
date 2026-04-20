import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DbInitializer } from "@/components/DbInitializer";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Web Agent",
  description: "Next-generation AI agent platform",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <head>
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
      </head>
      <body className={`${inter.className} h-full bg-black text-white antialiased`}>
        <DbInitializer />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
