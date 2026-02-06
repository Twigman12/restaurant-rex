export function isAbortError(err: unknown): boolean {
  const anyErr = err as any
  const message: string = anyErr?.message || ""
  const details: string = anyErr?.details || ""
  const name: string = anyErr?.name || ""
  return (
    name === "AbortError" ||
    message.includes("AbortError") ||
    details.includes("AbortError")
  )
}
