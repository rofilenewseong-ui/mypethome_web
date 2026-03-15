import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthHydrator from "@/components/AuthHydrator";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import DevInspectorLoader from "@/components/dev/DevInspectorLoader";
import ToastContainer from "@/components/ui/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";
import OfflineBanner from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: "My Pet Home - PetHolo",
  description: "반려동물 추모 홀로그램 서비스",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "My Pet Home",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F5F1EA",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AuthHydrator />
        <ServiceWorkerRegister />
        <AnalyticsProvider />
        <DevInspectorLoader />
        <OfflineBanner />
        <ToastContainer />
        <ErrorBoundary>
          <div className="mobile-frame">
            {children}
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
