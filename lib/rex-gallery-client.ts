export type RexConversationBaseRow = {
  id: string
  created_at: string
  user_message: string
  search_key: string
  extracted_preferences: unknown | null
}

export type RexConversationRecommendationRow = {
  id: string
  created_at: string
  conversation_id: string
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

export type RexConversationWithRecsRow<TPrefs = unknown> = Omit<RexConversationBaseRow, "extracted_preferences"> & {
  extracted_preferences: TPrefs | null
  rex_conversation_recommendations: Omit<RexConversationRecommendationRow, "conversation_id">[]
}

export function mergeConversationsWithRecommendations<TPrefs = unknown>(
  conversations: Array<Omit<RexConversationWithRecsRow<TPrefs>, "rex_conversation_recommendations">>,
  recommendations: RexConversationRecommendationRow[]
): RexConversationWithRecsRow<TPrefs>[] {
  const byConversationId = new Map<string, Omit<RexConversationRecommendationRow, "conversation_id">[]>()
  for (const r of recommendations) {
    const arr = byConversationId.get(r.conversation_id) ?? []
    // strip conversation_id to match embedded shape used by the UI
    const { conversation_id: _conversationId, ...rest } = r
    arr.push(rest)
    byConversationId.set(r.conversation_id, arr)
  }

  return conversations.map((c) => ({
    ...c,
    rex_conversation_recommendations: byConversationId.get(c.id) ?? [],
  }))
}

