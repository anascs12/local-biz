import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { DatasetProvider } from "@/context/DatasetContext";

export const metadata: Metadata = {
  title: "LocalBiz AI — Turn your business data into better decisions.",
  description:
    "Upload the sales file you already keep and get a working business intelligence dashboard, product-level intelligence, and an AI analyst grounded in your real numbers.",
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : undefined,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DatasetProvider>{children}</DatasetProvider>
      </body>
    </html>
  );
}
