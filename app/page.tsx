"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Utensils, MessageSquare, Star, Search, ArrowRight } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const { user } = useAuth()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Store the query in session storage to be picked up by the chat page
      sessionStorage.setItem("initialChatQuery", searchQuery.trim())
      router.push("/chat")
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-rex-cream">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-rex-black text-rex-cream py-20 md:py-32">
          <div className="container px-4 md:px-6 max-w-5xl">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl rex-logo">
                  <span className="text-rex-red">Restaurant-REX</span>
                </h1>
                <p className="text-2xl font-semibold">Discover Your Perfect NYC Dining Experience</p>
                <p className="mx-auto max-w-[700px] text-rex-cream/80 md:text-xl">
                  Personalized restaurant recommendations based on your preferences and real-life scenarios.
                </p>
              </div>

              {/* Search Input */}
              <form onSubmit={handleSearch} className="w-full max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-rex-black/50" />
                  <Input
                    type="text"
                    placeholder="What are you looking for? (e.g., 'Italian in SoHo')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-12 py-6 rounded-full border-2 border-rex-red bg-white text-rex-black placeholder:text-rex-black/50 focus-visible:ring-rex-red"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-rex-red hover:bg-red-700 text-white rounded-full h-10 w-10"
                    disabled={!searchQuery.trim()}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </form>

              <div className="space-x-4">
                <Button asChild size="lg" className="bg-rex-red hover:bg-red-700 text-white">
                  <Link href="/chat">Get Recommendations</Link>
                </Button>
                {!user && (
                  <Button variant="outline" size="lg" asChild className="border-rex-red text-rex-red hover:bg-rex-red/10">
                    <Link href="/signup">Create Account</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-24 bg-rex-cream">
          <div className="container px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="rounded-full bg-rex-red/10 p-4">
                  <MessageSquare className="h-6 w-6 text-rex-red" />
                </div>
                <h3 className="text-xl font-bold text-rex-black">Intelligent Chatbot</h3>
                <p className="text-rex-black/70">
                  Our AI-powered chatbot understands your preferences and provides tailored restaurant suggestions.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="rounded-full bg-rex-red/10 p-4">
                  <Utensils className="h-6 w-6 text-rex-red" />
                </div>
                <h3 className="text-xl font-bold text-rex-black">Curated NYC Restaurants</h3>
                <p className="text-rex-black/70">
                  Access our database of carefully selected NYC restaurants with detailed information.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="rounded-full bg-rex-red/10 p-4">
                  <Star className="h-6 w-6 text-rex-red" />
                </div>
                <h3 className="text-xl font-bold text-rex-black">Experience Logging</h3>
                <p className="text-rex-black/70">
                  Keep track of your restaurant visits and build your personal dining history.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-rex-black text-rex-cream py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-5xl space-y-12">
              <div className="space-y-4 text-center">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">How It Works</h2>
                <p className="mx-auto max-w-[700px] text-rex-cream/80 md:text-xl">
                  Get personalized restaurant recommendations in just a few simple steps.
                </p>
              </div>
              <div className="grid gap-8 md:grid-cols-3">
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rex-red text-lg font-bold text-white">
                    1
                  </div>
                  <h3 className="text-xl font-bold">Create an Account</h3>
                  <p className="text-rex-cream/80">
                    Sign up to access personalized recommendations and save your preferences.
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rex-red text-lg font-bold text-white">
                    2
                  </div>
                  <h3 className="text-xl font-bold">Chat with REX</h3>
                  <p className="text-rex-cream/80">
                    Tell our chatbot about your dietary needs, location, and the occasion.
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rex-red text-lg font-bold text-white">
                    3
                  </div>
                  <h3 className="text-xl font-bold">Get Recommendations</h3>
                  <p className="text-rex-cream/80">
                    Receive tailored restaurant suggestions with reasons why they're perfect for you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-24 bg-rex-cream">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-6 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-rex-black">
                Ready to Discover Your Next Favorite Restaurant?
              </h2>
              <p className="mx-auto max-w-[600px] text-rex-black/70 md:text-xl">
                Join Restaurant-REX today and never struggle with finding the perfect dining spot again.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" asChild className="bg-rex-red hover:bg-red-700 text-white">
                  <Link href="/chat">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-rex-black text-rex-cream py-6 md:py-8">
        <div className="container flex flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
          <p className="text-center text-sm text-rex-cream/70 md:text-left">
            &copy; {new Date().getFullYear()} Restaurant-REX. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
