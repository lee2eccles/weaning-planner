import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PlanProvider } from "@/components/PlanProvider";
import { Sidebar, BottomNav } from "@/components/Nav";
import { OfflineReady } from "@/components/OfflineReady";

export const metadata: Metadata = {
  title: "Weaning Planner",
  description: "Legume-free meal planning and batch prep for the twins.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Weaning", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF8F5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <PlanProvider>
          <OfflineReady />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-40 focus:rounded-lg focus:bg-blush focus:px-4 focus:py-2.5 focus:font-medium focus:text-ink"
          >
            Skip to content
          </a>
          <div className="md:flex md:min-h-screen">
            <Sidebar />
            <main id="main" className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
              {children}
            </main>
          </div>
          <BottomNav />
        </PlanProvider>
      </body>
    </html>
  );
}
