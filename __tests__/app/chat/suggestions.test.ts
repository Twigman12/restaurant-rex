import { describe, expect, it } from "vitest"

import { getChatSuggestions } from "@/app/chat/suggestions"
import type { ChatMessage } from "@/lib/types"

describe("getChatSuggestions", () => {
  it("is deterministic when randomize=false (SSR-safe)", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: "Hello" }, // initial greeting only
    ]

    const a = getChatSuggestions(messages, { randomize: false })
    const b = getChatSuggestions(messages, { randomize: false })

    expect(a).toEqual(b)
    expect(a.length).toBe(3)
  })

  it("can be randomized deterministically with a seeded rng", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: "Hello" },
      { role: "user", content: "Vegan food" },
    ]

    // Always returns 0 => deterministic shuffle outcome
    const rng = () => 0
    const a = getChatSuggestions(messages, { randomize: true, rng })
    const b = getChatSuggestions(messages, { randomize: true, rng })

    expect(a).toEqual(b)
    expect(a.length).toBe(3)
  })
})

