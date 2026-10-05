type ClassValue = string | number | false | null | undefined | ClassValue[] | Record<string, boolean | undefined>

/** Tiny className composer (clsx-compatible subset) to avoid an extra dependency. */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []
  for (const input of inputs) {
    if (!input) continue
    if (typeof input === 'string' || typeof input === 'number') out.push(String(input))
    else if (Array.isArray(input)) {
      const nested = cn(...input)
      if (nested) out.push(nested)
    } else {
      for (const [key, value] of Object.entries(input)) if (value) out.push(key)
    }
  }
  return out.join(' ')
}
