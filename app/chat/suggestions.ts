import type { ChatMessage } from "@/lib/types"

const suggestionCategories = {
  initial: [
    "Italian restaurant in SoHo",
    "Vegan food in Brooklyn",
    "Business lunch in Midtown",
    "Late night tacos in East Village",
    "Romantic dinner in West Village",
    "Brunch spot in Williamsburg",
    "Cheap eats in Chinatown",
    "Pizza place in Greenwich Village",
    "Sushi in Midtown",
    "Mexican food in Hell's Kitchen",
  ],
  afterRecommendation: [
    "Something more casual",
    "A cheaper option",
    "Similar but in a different neighborhood",
    "More upscale option",
    "Quieter atmosphere",
    "Something with outdoor seating",
  ],
  afterNoResults: [
    "Italian restaurants anywhere",
    "Casual dining options",
    "Places good for groups",
    "Budget-friendly spots",
    "Upscale restaurants",
    "Family-friendly places",
  ],
} as const

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

type GetChatSuggestionsOptions = {
  count?: number
  /**
   * When false, this is deterministic (safe for SSR/hydration).
   * When true, results are randomized using `rng`.
   */
  randomize?: boolean
  rng?: () => number
}

export function getChatSuggestions(messages: ChatMessage[], opts: GetChatSuggestionsOptions = {}): string[] {
  const count = opts.count ?? 3
  const randomize = opts.randomize ?? false
  const rng = opts.rng ?? Math.random

  // Determine which suggestion pool to use based on conversation context
  let pool: readonly string[] = suggestionCategories.initial

  if (messages.length > 1) {
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant")
    const content = lastAssistantMsg?.content ?? ""

    if (content.includes("couldn't find")) {
      pool = suggestionCategories.afterNoResults
    } else if (
      content.includes("top picks") ||
      content.includes("alternatives") ||
      content.includes("Would you like more details")
    ) {
      pool = suggestionCategories.afterRecommendation
    }
  }

  const chosen = randomize ? shuffle(pool, rng) : [...pool]
  return chosen.slice(0, count)
}

