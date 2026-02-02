"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { MessageSquare, Star, User, LogOut, LogIn, UserPlus, Home, GalleryVerticalEnd } from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  authRequired?: boolean
  isAction?: boolean
}

export function AppSidebar() { 
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/chat", label: "Chat", icon: MessageSquare, authRequired: true },
    { href: "/rex-gallory", label: "Rex Gallory", icon: GalleryVerticalEnd, authRequired: true },
    { href: "/experiences", label: "Experiences", icon: Star, authRequired: true },
    { href: "/profile", label: "Profile", icon: User, authRequired: true },
    { href: "#", label: "Sign Out", icon: LogOut, authRequired: true, isAction: true },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-rex-red/20 bg-rex-black p-4 text-rex-cream sm:flex">
      {/* Sidebar Content */}
      <div className="flex h-full flex-col">
        {/* Logo/Header */}
        <div className="mb-6 flex h-14 items-center px-2">
          <Link 
            href="/" 
            className="text-2xl font-bold text-rex-red rex-logo rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-rex-black"
          >
            Restaurant-REX
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            if (item.authRequired && !user) return null

            const Icon = item.icon
            const isActive = pathname === item.href && !item.isAction

            if (item.isAction) {
              if (item.label === "Sign Out") {
                return (
                  <Button
                    key={item.label}
                    variant="ghost"
                    className="w-full justify-start rounded-md px-3 py-2 text-rex-cream hover:bg-rex-red/20 hover:text-rex-cream text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-rex-black transition-transform duration-150 ease-in-out hover:scale-[1.03]"
                    onClick={() => signOut()}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Button>
                )
              }
              return null;
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors text-rex-cream transition-transform duration-150 ease-in-out",
                  isActive
                    ? "bg-rex-red text-white"
                    : "hover:bg-rex-red/20 hover:text-rex-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-rex-black hover:scale-[1.03]"
                )}
              >
                <Icon className="mr-3 h-5 w-5" /> 
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer/Auth Section - Only for logged-out users now */}
        <div className="mt-auto space-y-2">
          {!user && (
            <>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start rounded-md px-3 py-2 text-rex-cream hover:bg-rex-red/20 hover:text-rex-cream text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-rex-black transition-transform duration-150 ease-in-out hover:scale-[1.03]"
              >
                <Link href="/login">
                  <LogIn className="mr-3 h-5 w-5" />
                  Sign In
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start rounded-md px-3 py-2 text-rex-cream hover:bg-rex-red/20 hover:text-rex-cream text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-rex-black transition-transform duration-150 ease-in-out hover:scale-[1.03]"
              >
                <Link href="/signup">
                  <UserPlus className="mr-3 h-5 w-5" />
                  Create Account
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
} 