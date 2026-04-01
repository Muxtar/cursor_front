import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayoutProvider } from "@/contexts/AppLayoutContext";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chat App",
  description: "WhatsApp-like chat application",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster position="top-center" richColors closeButton duration={3000} />
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              {/*
               * AppLayoutProvider + AuthenticatedLayout live here at the root so
               * AppLayout (and the Sidebar inside it) is mounted ONCE and persists
               * across all page navigations — no re-fetch, no flash.
               */}
              <AppLayoutProvider>
                <AuthenticatedLayout>
                  {children}
                </AuthenticatedLayout>
              </AppLayoutProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


