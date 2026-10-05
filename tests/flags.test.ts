import { describe, expect, it } from 'vitest'
import { bucket, evaluateFlag, type FeatureFlag } from '@/services/platform/flags'

const flag = (over: Partial<FeatureFlag>): FeatureFlag => ({ key: 'x', enabled: true, description: '', rollout: 100, audience: 'all', payload: {}, ...over })
const guest = { signedIn: false, staff: false, visitor: '00000000-0000-4000-8000-000000000000' }

describe('feature flags', () => {
  it('falls back to built-in defaults when the flag is unknown', () => {
    expect(evaluateFlag('trailers', [], guest)).toBe(true)
    expect(evaluateFlag('maintenance_mode', [], guest)).toBe(false)
    expect(evaluateFlag('does_not_exist', [], guest)).toBe(false)
  })

  it('respects enabled and audience', () => {
    expect(evaluateFlag('x', [flag({ enabled: false })], guest)).toBe(false)
    expect(evaluateFlag('x', [flag({ audience: 'signed_in' })], guest)).toBe(false)
    expect(evaluateFlag('x', [flag({ audience: 'signed_in' })], { ...guest, signedIn: true })).toBe(true)
    expect(evaluateFlag('x', [flag({ audience: 'staff' })], { ...guest, signedIn: true })).toBe(false)
    expect(evaluateFlag('x', [flag({ audience: 'staff' })], { ...guest, staff: true })).toBe(true)
  })

  it('rolls out to a stable percentage of visitors', () => {
    const flags = [flag({ rollout: 30 })]
    let on = 0
    for (let i = 0; i < 2000; i++) if (evaluateFlag('x', flags, { ...guest, visitor: `v-${i}` })) on++
    expect(on / 2000).toBeGreaterThan(0.24)
    expect(on / 2000).toBeLessThan(0.36)
    expect(evaluateFlag('x', flags, guest)).toBe(evaluateFlag('x', flags, guest))
    expect(evaluateFlag('x', [flag({ rollout: 0 })], { ...guest, staff: true })).toBe(true)
    expect(bucket('a')).toBeGreaterThanOrEqual(0)
    expect(bucket('a')).toBeLessThan(100)
  })
})
