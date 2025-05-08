"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false)
  const { signIn } = useAuth()
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setIsEmailNotConfirmed(false)

    try {
      await signIn(email, password)
    } catch (error: any) {
      console.error("Login error:", error)

      if (error.message === "Email not confirmed") {
        setIsEmailNotConfirmed(true)
      } else {
        setError(error.message || "Failed to sign in. Please check your credentials.")
      }

      toast({
        title: "Error",
        description: error.message || "Failed to sign in. Please check your credentials.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }

    setIsResendingEmail(true)

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Confirmation email has been resent. Please check your inbox.",
      })
    } catch (error: any) {
      console.error("Error resending confirmation:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to resend confirmation email.",
        variant: "destructive",
      })
    } finally {
      setIsResendingEmail(false)
    }
  }

  return (
    <>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md rex-card">
          <CardHeader className="p-6 text-center">
            <CardTitle className="text-2xl font-semibold rex-logo">Log in</CardTitle>
            <CardDescription className="pt-1">
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isEmailNotConfirmed && (
                <Alert variant="default" className="border-yellow-500/50 text-yellow-700 dark:border-yellow-400/50 dark:text-yellow-300 [&>svg]:text-yellow-500 dark:[&>svg]:text-yellow-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your email has not been confirmed. Please check your inbox.
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-1 text-primary font-medium hover:underline"
                      onClick={handleResendConfirmation}
                      disabled={isResendingEmail}
                    >
                      {isResendingEmail ? <Loader2 className="inline h-3 w-3 mr-1 animate-spin"/> : null}
                      {isResendingEmail ? "Sending..." : "Resend confirmation"}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="p-6 border-t border-border flex flex-col space-y-4">
              <Button type="submit" className="w-full rex-button" disabled={isLoading}>
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                 {isLoading ? "Logging in..." : "Log in"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  )
}
