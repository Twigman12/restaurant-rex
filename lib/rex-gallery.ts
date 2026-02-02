export type RexExtractedPreferences = {
  cuisines?: string[]
  neighborhoods?: string[]
  boroughs?: string[]
  dietary?: string[]
  scenario?: string
  price?: string // "$" | "$$" | "$$$" | "$$$$"
  mood?: string
  vibe?: string
  other?: string[]
}

function normalizeList(xs: string[] | undefined): string[] {
  return (xs ?? [])
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .sort()
}

function normalizeScalar(x: string | undefined): string | null {
  const v = (x ?? "").trim().toLowerCase()
  return v ? v : null
}

export function buildRexSearchKey(prefs: RexExtractedPreferences | null | undefined): string {
  const p = prefs ?? {}

  const cuisines = normalizeList(p.cuisines)
  const neighborhoods = normalizeList(p.neighborhoods)
  const boroughs = normalizeList(p.boroughs)
  const dietary = normalizeList(p.dietary)
  const other = normalizeList(p.other)
  const scenario = normalizeScalar(p.scenario)
  const price = normalizeScalar(p.price)
  const mood = normalizeScalar(p.mood)
  const vibe = normalizeScalar(p.vibe)

  // Stable key used for grouping in rex-gallory
  return [
    `cuisines=${cuisines.join(",")}`,
    `neighborhoods=${neighborhoods.join(",")}`,
    `boroughs=${boroughs.join(",")}`,
    `price=${price ?? ""}`,
    `scenario=${scenario ?? ""}`,
    `mood=${mood ?? ""}`,
    `vibe=${vibe ?? ""}`,
    `dietary=${dietary.join(",")}`,
    `other=${other.join(",")}`,
  ].join("|")
}

export function getCutoffIso(days: 7 | 14 | 30, now = new Date()): string {
  const ms = days * 24 * 60 * 60 * 1000
  return new Date(now.getTime() - ms).toISOString()
}

