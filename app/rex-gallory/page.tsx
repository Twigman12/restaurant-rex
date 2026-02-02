"use client"

import { useAuth } from "@/contexts/auth-context"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getCutoffIso, type RexExtractedPreferences } from "@/lib/rex-gallery"
import { mergeConversationsWithRecommendations } from "@/lib/rex-gallery-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Clock, MessageSquare, Sparkles } from "lucide-react"
import Link from "next/link"
import { ChatRestaurantCard } from "@/components/chat-restaurant-card"

type Days = 7 | 14 | 30

type RexConversationRow = {
  id: string
  created_at: string
  user_message: string
  search_key: string
  extracted_preferences: RexExtractedPreferences | null
  rex_conversation_recommendations?: RexConversationRecRow[]
}

type RexConversationRecRow = {
  id: string
  created_at: string
  conversation_id?: string
  restaurant_id: string
  restaurant_name: string | null
  neighborhood: string | null
  borough: string | null
  cuisine_type: string | null
  price_range: number | null
  rating: number | null
  user_ratings_total: number | null
  reason: string | null
}

function prefsBadges(prefs: RexExtractedPreferences | null | undefined): string[] {
  const p = prefs ?? {}
  const out: string[] = []

  if (p.cuisines?.length) out.push(...p.cuisines.map((c) => `Cuisine: ${c}`))
  if (p.neighborhoods?.length) out.push(...p.neighborhoods.map((n) => `Neighborhood: ${n}`))
  if (p.boroughs?.length) out.push(...p.boroughs.map((b) => `Borough: ${b}`))
  if (p.price) out.push(`Price: ${p.price}`)
  if (p.scenario) out.push(`Scenario: ${p.scenario}`)
  if (p.mood) out.push(`Mood: ${p.mood}`)
  if (p.vibe) out.push(`Vibe: ${p.vibe}`)
  if (p.dietary?.length) out.push(...p.dietary.map((d) => `Dietary: ${d}`))
  if (p.other?.length) out.push(...p.other.map((o) => `Other: ${o}`))

  // Keep the header clean
  return out.slice(0, 10)
}

export default function RexGalloryPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const supabase = useMemo(() => createClientSupabaseClient(), [])

  const [days, setDays] = useState<Days>(7)
  const [isLoading, setIsLoading] = useState(false)
  const [rows, setRows] = useState<RexConversationRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push("/login")
  }, [authLoading, user, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return
      setIsLoading(true)
      setError(null)
      try {
        const cutoff = getCutoffIso(days)

        // Fetch in two steps (conversations -> recommendations) to avoid slow/fragile embedded joins.
        const { data: conversations, error: convoErr } = await supabase
          .from("rex_conversations")
          .select("id, created_at, user_message, search_key, extracted_preferences")
          .eq("user_id", user.id)
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false })
          .limit(200)

        if (convoErr) throw convoErr

        const convoRows = ((conversations as any) ?? []) as RexConversationRow[]
        if (convoRows.length === 0) {
          setRows([])
          return
        }

        const conversationIds = convoRows.map((c) => c.id)
        const { data: recommendations, error: recErr } = await supabase
          .from("rex_conversation_recommendations")
          .select(
            "id, created_at, conversation_id, restaurant_id, restaurant_name, neighborhood, borough, cuisine_type, price_range, rating, user_ratings_total, reason"
          )
          .eq("user_id", user.id)
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })

        if (recErr) throw recErr

        const merged = mergeConversationsWithRecommendations<RexExtractedPreferences>(
          convoRows.map(({ rex_conversation_recommendations: _recs, ...rest }) => rest),
          (((recommendations as any) ?? []) as RexConversationRecRow[]).map((r) => ({
            ...r,
            conversation_id: r.conversation_id ?? "",
          }))
        ) as unknown as RexConversationRow[]

        setRows(merged)
      } catch (e: any) {
        setError(e?.message ?? "Failed to load Rex Gallory.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, supabase, days])

  const grouped = useMemo(() => {
    const map = new Map<string, RexConversationRow[]>()
    for (const r of rows) {
      const k = r.search_key || "unknown"
      const arr = map.get(k) ?? []
      arr.push(r)
      map.set(k, arr)
    }
    return Array.from(map.entries()).map(([searchKey, conversations]) => ({
      searchKey,
      conversations,
      latestCreatedAt: conversations[0]?.created_at ?? "",
    }))
  }, [rows])

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-rex-cream">
        <Loader2 className="h-8 w-8 animate-spin text-rex-red" />
      </div>
    )
  }

  return (
    <div className="bg-rex-cream min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-rex-black">Rex Gallory</h1>
            <p className="text-rex-black/70 text-sm mt-1">
              Your Rex conversations grouped by what you were searching for — limited to the past{" "}
              <span className="font-semibold">{days} days</span>.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={days === 7 ? "default" : "outline"}
              className={days === 7 ? "bg-rex-red hover:bg-red-700" : "border-rex-red text-rex-red hover:bg-rex-red/10"}
              onClick={() => setDays(7)}
            >
              7 days
            </Button>
            <Button
              type="button"
              variant={days === 14 ? "default" : "outline"}
              className={days === 14 ? "bg-rex-red hover:bg-red-700" : "border-rex-red text-rex-red hover:bg-rex-red/10"}
              onClick={() => setDays(14)}
            >
              14 days
            </Button>
            <Button
              type="button"
              variant={days === 30 ? "default" : "outline"}
              className={days === 30 ? "bg-rex-red hover:bg-red-700" : "border-rex-red text-rex-red hover:bg-rex-red/10"}
              onClick={() => setDays(30)}
            >
              30 days
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-rex-black">Couldn’t load Rex Gallory</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-rex-black/70">
              <p className="mb-2">{error}</p>
              <p className="text-xs text-rex-black/60">
                If this is your first time using it, make sure you ran the SQL migration `migrations/002_rex_gallery.sql`
                in Supabase, then chat with Rex to generate new recommendations.
              </p>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-rex-black/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : grouped.length === 0 ? (
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-rex-black">No recommendations in the past {days} days</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-rex-black/70">
              <p className="mb-3">Go chat with Rex and ask for recommendations — they’ll show up here automatically.</p>
              <Button asChild className="bg-rex-red hover:bg-red-700 text-white">
                <Link href="/chat">Open Chat</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map((g) => {
              const latest = g.conversations[0]
              const badges = prefsBadges(latest?.extracted_preferences)

              return (
                <Card key={g.searchKey} className="border-none shadow-md overflow-hidden">
                  <CardHeader className="bg-rex-black text-rex-cream">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-rex-red" />
                          <span className="truncate">Search group</span>
                        </CardTitle>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {badges.length ? (
                            badges.map((b) => (
                              <Badge key={b} className="bg-rex-red text-white border border-rex-red/40">
                                {b}
                              </Badge>
                            ))
                          ) : (
                            <Badge className="bg-rex-cream/10 text-rex-cream border border-rex-cream/20">
                              (No extracted variables)
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-rex-cream/70 flex-shrink-0">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(g.latestCreatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4 bg-white">
                    {g.conversations.slice(0, 3).map((c) => {
                      const recs = c.rex_conversation_recommendations ?? []
                      return (
                        <div key={c.id} className="space-y-3">
                          <div className="text-sm text-rex-black/80">
                            <span className="font-semibold">You:</span> {c.user_message}
                          </div>

                          {recs.length > 0 ? (
                            <div className="grid gap-3 md:grid-cols-2">
                              {recs.map((r) => (
                                <div key={r.id} className="flex">
                                  <ChatRestaurantCard
                                    showActions={true}
                                    restaurant={{
                                      id: r.restaurant_id,
                                      name: r.restaurant_name ?? "Unknown",
                                      cuisine_type: r.cuisine_type ?? "Restaurant",
                                      address: "N/A",
                                      neighborhood: r.neighborhood ?? "Unknown",
                                      borough: r.borough ?? "Unknown",
                                      price_range: r.price_range ?? null,
                                      dietary_options: null,
                                      description: null,
                                      image_url: null,
                                      popular_items: null,
                                      vibe: null,
                                      scenario_tags: null,
                                      latitude: null,
                                      longitude: null,
                                      opening_hours: null,
                                      rating: r.rating ?? null,
                                      user_ratings_total: r.user_ratings_total ?? null,
                                      matching_score: null,
                                      created_at: r.created_at,
                                      updated_at: r.created_at,
                                      reason: r.reason ?? "",
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-rex-black/60 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-rex-red" />
                              No saved recommendation rows for this conversation.
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

