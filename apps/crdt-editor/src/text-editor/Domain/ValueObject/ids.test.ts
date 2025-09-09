import { describe, it, expect } from 'vitest'
import {
  createDocumentId,
  createLineId,
  createActorId,
  createValidDocumentId,
  createValidLineId,
  createValidActorId,
  createUUIDDocumentId,
  createUUIDLineId,
  createUUIDActorId,
  isEqualDocumentId,
  isEqualLineId,
  isEqualActorId,
} from './ids'

describe('ID Value Objects', () => {
  describe('Factory functions without validation', () => {
    it('should create DocumentId from string', () => {
      const id = createDocumentId('doc-123')
      expect(id).toBe('doc-123')
    })

    it('should create LineId from string', () => {
      const id = createLineId('line-456')
      expect(id).toBe('line-456')
    })

    it('should create ActorId from string', () => {
      const id = createActorId('actor-789')
      expect(id).toBe('actor-789')
    })
  })

  describe('Validated factory functions', () => {
    describe('createValidDocumentId', () => {
      it('should accept valid ID format', () => {
        const result = createValidDocumentId('doc-123_ABC')
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe('doc-123_ABC')
        }
      })

      it('should reject empty string', () => {
        const result = createValidDocumentId('')
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('cannot be empty')
        }
      })

      it('should reject invalid characters', () => {
        const result = createValidDocumentId('doc@123')
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('Invalid')
        }
      })
    })

    describe('createValidLineId', () => {
      it('should accept valid ID format', () => {
        const result = createValidLineId('line-123')
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe('line-123')
        }
      })

      it('should reject empty string', () => {
        const result = createValidLineId('')
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('cannot be empty')
        }
      })
    })

    describe('createValidActorId', () => {
      it('should accept valid ID format', () => {
        const result = createValidActorId('actor_123')
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe('actor_123')
        }
      })

      it('should reject invalid format', () => {
        const result = createValidActorId('actor#123')
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('Invalid')
        }
      })
    })
  })

  describe('UUID validation', () => {
    const validUUID = 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d'
    const invalidUUID = 'not-a-uuid'

    describe('createUUIDDocumentId', () => {
      it('should accept valid UUID', () => {
        const result = createUUIDDocumentId(validUUID)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(validUUID)
        }
      })

      it('should reject invalid UUID', () => {
        const result = createUUIDDocumentId(invalidUUID)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('Invalid UUID')
        }
      })
    })

    describe('createUUIDLineId', () => {
      it('should accept valid UUID', () => {
        const result = createUUIDLineId(validUUID)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(validUUID)
        }
      })

      it('should reject invalid UUID', () => {
        const result = createUUIDLineId(invalidUUID)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('Invalid UUID')
        }
      })
    })

    describe('createUUIDActorId', () => {
      it('should accept valid UUID', () => {
        const result = createUUIDActorId(validUUID)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(validUUID)
        }
      })

      it('should reject non-UUID format', () => {
        const result = createUUIDActorId('123')
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('Invalid UUID')
        }
      })
    })
  })

  describe('ID comparison helpers', () => {
    it('should correctly compare equal DocumentIds', () => {
      const id1 = createDocumentId('doc-123')
      const id2 = createDocumentId('doc-123')
      expect(isEqualDocumentId(id1, id2)).toBe(true)
    })

    it('should correctly compare different DocumentIds', () => {
      const id1 = createDocumentId('doc-123')
      const id2 = createDocumentId('doc-456')
      expect(isEqualDocumentId(id1, id2)).toBe(false)
    })

    it('should correctly compare equal LineIds', () => {
      const id1 = createLineId('line-123')
      const id2 = createLineId('line-123')
      expect(isEqualLineId(id1, id2)).toBe(true)
    })

    it('should correctly compare different LineIds', () => {
      const id1 = createLineId('line-123')
      const id2 = createLineId('line-456')
      expect(isEqualLineId(id1, id2)).toBe(false)
    })

    it('should correctly compare equal ActorIds', () => {
      const id1 = createActorId('actor-123')
      const id2 = createActorId('actor-123')
      expect(isEqualActorId(id1, id2)).toBe(true)
    })

    it('should correctly compare different ActorIds', () => {
      const id1 = createActorId('actor-123')
      const id2 = createActorId('actor-456')
      expect(isEqualActorId(id1, id2)).toBe(false)
    })
  })
})