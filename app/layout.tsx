import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PlanProvider } from "@/components/PlanProvider";
import { Sidebar, BottomNav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Weaning Planner",
  description: "Legume-free meal planning and batch prep for the twins.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#A6ACA1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <PlanProvider>
          <div className="md:flex md:min-h-screen">
            <Sidebar />
            <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">{children}</main>
          </div>
          <BottomNav />
        </PlanProvider>
      </body>
    </html>
  );
}
