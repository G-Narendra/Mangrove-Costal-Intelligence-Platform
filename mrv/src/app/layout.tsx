import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { AppProviders } from "@/components/providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  title: "Coastal Sentinel | Blue Carbon MRV Platform",
  description: "AI-driven Spatio-Temporal MRV platform for UAE Mangrove Blue Carbon intelligence, biomass prediction, and carbon credit verification.",
  openGraph: {
    title: "Coastal Sentinel — Blue Carbon MRV Platform",
    description: "Automated satellite-driven Spatio-Temporal Graph Neural Network MRV for UAE Mangroves",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-body antialiased bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}

