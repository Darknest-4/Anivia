import type { ReactNode } from 'react'
import { getSupabase } from '@/providers/AuthProvider'

/** Calls a Supabase RPC; admin RPCs check permissions themselves (has_permission). */
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const client = await getSupabase()
  const { data, error } = await client.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export function Stat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold text-fg">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>}
    </div>
  )
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-fg">{title}</h2>
      {children}
    </section>
  )
}
