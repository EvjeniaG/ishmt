import { Suspense } from "react";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { ScrollToTop } from "@/components/navigation/scroll-to-top";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ISHMT - Regjistri Digjital i Ashensorëve",
  description:
    "Platforma zyrtare kombëtare e regjistrimit të ashensorëve - Inspektorati Shtetëror i Mbikeqyrjes së Tregut",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq">
      <body className={`${sans.variable} font-sans antialiased`}>
        <AuthSessionProvider>
          <Suspense fallback={null}>
            <ScrollToTop />
          </Suspense>
          <div className="flex h-dvh flex-col overflow-hidden">
            <div data-scroll-root className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
            <SiteFooter />
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
