// Sample test to verify Vitest setup
import { describe, it, expect } from 'vitest'

describe('Vitest Setup', () => {
    it('should run basic tests', () => {
        expect(true).toBe(true)
    })

    it('should handle arithmetic', () => {
        expect(2 + 2).toBe(4)
    })
})
