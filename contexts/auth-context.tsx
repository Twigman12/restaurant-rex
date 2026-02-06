"use client"

import type React from "react"

import { createClientSupabaseClient } from "@/lib/supabase"
import type { Session, User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { createContext, useContext, useEffect, useState } from "react"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function isInvalidRefreshTokenError(err: unknown): boolean {
  const anyErr = err as any
  const message: string = anyErr?.message || anyErr?.error_description || ""
  const status: number | undefined = anyErr?.status
  const code: string | undefined = anyErr?.code

  // Supabase commonly returns 400 invalid_grant for refresh token failures.
  if (status === 400 && (code === "invalid_grant" || code === "refresh_token_not_found")) return true

  const normalized = message.toLowerCase()
  return (
    normalized.includes("invalid refresh token") ||
    normalized.includes("refresh token not found") ||
    normalized.includes("invalid_grant") ||
    normalized.includes("token refresh failed")
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const getSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          // If the stored refresh token is invalid/stale, clear local auth and bounce to login.
          if (isInvalidRefreshTokenError(error)) {
            try {
              await supabase.auth.signOut({ scope: "local" })
            } catch {}
            setSession(null)
            setUser(null)
            router.replace("/login")
            return
          }

          console.error("Error getting session:", error)
        }

        setSession(session)
        setUser(session?.user ?? null)
      } catch (err: any) {
        // Handle invalid refresh token by clearing auth state
        if (isInvalidRefreshTokenError(err)) {
          try {
            await supabase.auth.signOut({ scope: "local" })
          } catch {}
          setSession(null)
          setUser(null)
          router.replace("/login")
        } else {
          console.error("Unexpected error fetching session:", err)
        }
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESH_FAILED") {
        try {
          await supabase.auth.signOut({ scope: "local" })
        } catch {}
        setSession(null)
        setUser(null)
        setIsLoading(false)
        router.replace("/login")
        return
      }

      if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        setSession(null)
        setUser(null)
        setIsLoading(false)
        router.replace("/login")
        return
      }

      if (!session) {
        // Avoid aggressive logout on transient null sessions (e.g. initial load).
        setIsLoading(false)
        return
      }

      setSession(session)
      setUser(session.user ?? null)
      setIsLoading(false)
      router.refresh()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  // Update the signIn method to properly throw the error
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    router.push("/")
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
