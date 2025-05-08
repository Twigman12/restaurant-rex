"use client"

import type React from "react"
import { Dispatch, SetStateAction } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { MessageSquare, Star, User, LogOut, LogIn, UserPlus, Home, Search } from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  authRequired?: boolean
}

type SideMenuProps = {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

export function SideMenu({ isOpen, setIsOpen }: SideMenuProps) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      href: "/",
      label: "Home",
      icon: <Home className="h-5 w-5 mr-2" />,
    },
    {
      href: "/chat",
      label: "Get Recommendations",
      icon: <MessageSquare className="h-5 w-5 mr-2" />,
      authRequired: true,
    },
    {
      href: "/restaurants",
      label: "Browse Restaurants",
      icon: <Search className="h-5 w-5 mr-2" />,
    },
    {
      href: "/experiences",
      label: "My Experiences",
      icon: <Star className="h-5 w-5 mr-2" />,
      authRequired: true,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="h-5 w-5 mr-2" />,
      authRequired: true,
    },
  ]

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent 
        side="left" 
        className="bg-rex-black text-rex-cream border-r border-rex-red/20 w-64 p-4"
      >
        <SheetHeader className="mb-6">
          <Link 
            href="/" 
            onClick={handleClose} 
            className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-rex-black"
          >
            <SheetTitle className="text-rex-red text-2xl font-bold rex-logo">Restaurant-REX</SheetTitle>
          </Link>
        </SheetHeader>
        <div className="flex flex-col justify-between h-[calc(100%-6rem)]">
          <nav className="space-y-2">
            {navItems.map((item) => {
              if (item.authRequired && !user && item.href !== '/profile') return null
              if (item.href === '/profile' && !user) return null;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleClose}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors text-rex-cream transition-transform duration-150 ease-in-out",
                    pathname === item.href 
                      ? "bg-rex-red text-white" 
                      : "hover:bg-rex-red/20 hover:text-rex-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-rex-black hover:scale-[1.03]",
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto space-y-2">
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={handleClose}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors text-rex-cream transition-transform duration-150 ease-in-out",
                    pathname === "/profile" 
                      ? "bg-rex-red text-white" 
                      : "hover:bg-rex-red/20 hover:text-rex-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-rex-black hover:scale-[1.03]",
                  )}
                >
                  <User className="h-5 w-5 mr-2" />
                  Profile
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-md px-3 py-2 text-rex-cream hover:bg-rex-red/20 hover:text-rex-cream text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-rex-black transition-transform duration-150 ease-in-out hover:scale-[1.03]"
                  onClick={() => {
                    signOut()
                    handleClose()
                  }}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-start rounded-md px-3 py-2 text-rex-cream hover:bg-rex-red/20 hover:text-rex-cream text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-rex-black transition-transform duration-150 ease-in-out hover:scale-[1.03]"
                  onClick={handleClose}
                >
                  <Link href="/login">
                    <LogIn className="h-5 w-5 mr-2" />
                    Sign In
                  </Link>
                </Button>
                <Button 
                  asChild 
                  className="w-full justify-start rex-button text-sm font-medium" 
                  onClick={handleClose}
                >
                  <Link href="/signup">
                    <UserPlus className="h-5 w-5 mr-2" />
                    Create Account
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
