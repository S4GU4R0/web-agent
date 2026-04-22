import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { DbInitializer } from "@/components/DbInitializer";
import { PWAProvider } from "@/components/PWAProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Web Agent",
  description: "Your offline-first AI assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground overflow-hidden">
        <PWAProvider>
          <ServiceWorkerRegister />
          <DbInitializer />
          <div className="flex h-screen w-full">
            <Sidebar />
            <main className="flex-1 relative overflow-hidden">
              {children}
            </main>
          </div>
        </PWAProvider>
      </body>
    </html>
  );
}
