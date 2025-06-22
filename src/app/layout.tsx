
import type React from "react"
import type { Metadata } from "next"
import { Inter, Source_Code_Pro } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { AuthProvider } from "@/providers/auth-provider"
import { Toaster } from "@/components/ui/toaster"
import { ChatProvider } from "@/providers/chat-provider"
import { ChatLayout } from "@/components/chat-layout"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-source-code-pro",
})

export const metadata: Metadata = {
  title: "Echonym - Anonymous Security Research",
  description: "Anonymous platform for security researchers and hackers",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceCodePro.variable}`}
    >
      <body className="font-sans bg-background">
        <AuthProvider>
          <ChatProvider>
            <Header />
            <main className="container mx-auto py-8 px-4">{children}</main>
            <Toaster />
            <ChatLayout />
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
