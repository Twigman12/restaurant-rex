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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signUp } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await signUp(email, password, fullName)
      setIsSuccess(true)
      toast({
        title: "Success",
        description: "Account created! Please check your email to confirm your registration.",
      })
    } catch (error: any) {
      console.error("Signup error:", error)
      setError(error.message || "Failed to create account. Please try again.")
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md rex-card">
          <CardHeader className="p-6 text-center">
            <CardTitle className="text-2xl font-semibold rex-logo">Email Confirmation Required</CardTitle>
            <CardDescription className="pt-1">
              Your account has been created successfully!
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Alert variant="default" className="border-green-500/50 text-green-700 dark:border-green-400/50 dark:text-green-300 [&>svg]:text-green-500 dark:[&>svg]:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                We&apos;ve sent a confirmation email to <strong className="font-medium">{email}</strong>. Please check your inbox and click the link to activate your account.
              </AlertDescription>
            </Alert>
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>If you don&apos;t see the email, please check your spam folder.</p>
              <p>You won&apos;t be able to log in until you confirm your email address.</p>
            </div>
          </CardContent>
          <CardFooter className="p-6 border-t border-border">
            <Button asChild className="w-full rex-button">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md rex-card">
        <CardHeader className="p-6 text-center">
          <CardTitle className="text-2xl font-semibold rex-logo">Sign up</CardTitle>
          <CardDescription className="pt-1">
            Create an account to get personalized recommendations
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
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
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
                minLength={6}
              />
              <p className="text-xs text-muted-foreground pt-1">Password must be at least 6 characters long.</p>
            </div>
          </CardContent>
          <CardFooter className="p-6 border-t border-border flex flex-col space-y-4">
            <Button type="submit" className="w-full rex-button" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
