"use client"

import { useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import Link from "next/link"
import { SideMenu } from "@/components/side-menu"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <div className="flex h-screen bg-background">
          <AppSidebar />

          <div className="flex flex-1 flex-col overflow-hidden sm:ml-64">
            <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 sm:hidden">
              <Link href="/" className="text-xl font-bold text-rex-red rex-logo">
                Restaurant-REX
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
        <SideMenu isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  )
} 