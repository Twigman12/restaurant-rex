import { describe, it, expect } from "vitest"
import { buildRexSearchKey, getCutoffIso } from "../../lib/rex-gallery"
import { mergeConversationsWithRecommendations } from "../../lib/rex-gallery-client"

describe("rex-gallery utilities", () => {
  it("buildRexSearchKey is stable regardless of order/case/whitespace", () => {
    const a = buildRexSearchKey({
      cuisines: ["Italian", " sushi "],
      neighborhoods: ["SoHo", "  chelsea"],
      boroughs: ["Manhattan"],
      dietary: ["Vegan", "gluten-free"],
      other: ["Outdoor Seating", "  cocktails "],
      scenario: "Date Night",
      price: "$$",
      mood: "Comfort",
      vibe: "Cozy",
    })

    const b = buildRexSearchKey({
      cuisines: ["sushi", "ITALIAN"],
      neighborhoods: ["chelsea", "soho"],
      boroughs: [" manhattan "],
      dietary: ["gluten-free", "vegan"],
      other: ["cocktails", "outdoor seating"],
      scenario: "date night",
      price: "$$",
      mood: "comfort",
      vibe: "cozy",
    })

    expect(a).toEqual(b)
  })

  it("getCutoffIso returns an ISO string roughly days ago", () => {
    const now = new Date("2026-01-31T12:00:00.000Z")
    expect(getCutoffIso(7, now)).toBe("2026-01-24T12:00:00.000Z")
    expect(getCutoffIso(14, now)).toBe("2026-01-17T12:00:00.000Z")
    expect(getCutoffIso(30, now)).toBe("2026-01-01T12:00:00.000Z")
  })

  it("mergeConversationsWithRecommendations attaches recs to the right conversation", () => {
    const conversations = [
      {
        id: "c1",
        created_at: "2026-01-31T00:00:00.000Z",
        user_message: "hi",
        search_key: "k1",
        extracted_preferences: { cuisines: ["sushi"] },
      },
      {
        id: "c2",
        created_at: "2026-01-31T00:01:00.000Z",
        user_message: "hello",
        search_key: "k2",
        extracted_preferences: null,
      },
    ]

    const recommendations = [
      {
        id: "r1",
        created_at: "2026-01-31T00:02:00.000Z",
        conversation_id: "c1",
        restaurant_id: "rest-1",
        restaurant_name: "A",
        neighborhood: null,
        borough: null,
        cuisine_type: null,
        price_range: null,
        rating: null,
        user_ratings_total: null,
        reason: "because",
      },
      {
        id: "r2",
        created_at: "2026-01-31T00:03:00.000Z",
        conversation_id: "c1",
        restaurant_id: "rest-2",
        restaurant_name: "B",
        neighborhood: null,
        borough: null,
        cuisine_type: null,
        price_range: null,
        rating: null,
        user_ratings_total: null,
        reason: null,
      },
    ]

    const merged = mergeConversationsWithRecommendations(conversations as any, recommendations as any)
    expect(merged).toHaveLength(2)
    expect(merged[0].rex_conversation_recommendations).toHaveLength(2)
    expect(merged[0].rex_conversation_recommendations[0]).toMatchObject({ id: "r1", restaurant_id: "rest-1" })
    expect(merged[1].rex_conversation_recommendations).toHaveLength(0)
  })
})

