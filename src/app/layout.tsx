import type { Metadata, Viewport } from "next";
import { Playfair_Display, Karla } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Ember Lounge — Shisha Bar",
    template: "%s · Ember Lounge",
  },
  description:
    "Premium shisha lounge. Browse the flavour menu, order to your table, or pre-order for pickup and delivery.",
};

export const viewport: Viewport = {
  themeColor: "#0c0a09",
  // Never block zoom — pinch-zoom is an accessibility requirement.
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${karla.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
