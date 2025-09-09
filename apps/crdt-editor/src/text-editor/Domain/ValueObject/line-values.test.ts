import { describe, it, expect } from 'vitest'
import {
  createLineOrder,
  createLineContent,
  createCursorOffset,
  incrementOrder,
  averageOrder,
  compareOrder,
  getContentLength,
  isEmptyContent,
  insertTextToContent,
  deleteTextFromContent,
  sliceContent,
  moveCursor,
  clampCursor,
} from './line-values'

describe('Line Value Objects', () => {
  describe('LineOrder', () => {
    describe('createLineOrder', () => {
      it('should create valid line order', () => {
        const result = createLineOrder(100)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(100)
        }
      })

      it('should accept zero', () => {
        const result = createLineOrder(0)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(0)
        }
      })

      it('should reject negative numbers', () => {
        const result = createLineOrder(-1)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('non-negative')
        }
      })

      it('should reject non-finite numbers', () => {
        const result = createLineOrder(Infinity)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('finite')
        }
      })

      it('should reject NaN', () => {
        const result = createLineOrder(NaN)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('finite')
        }
      })
    })

    describe('incrementOrder', () => {
      it('should increment order by 1 by default', () => {
        const order = 100 as any
        const result = incrementOrder(order)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(101)
        }
      })

      it('should increment order by specified delta', () => {
        const order = 100 as any
        const result = incrementOrder(order, 10)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(110)
        }
      })
    })

    describe('averageOrder', () => {
      it('should calculate average of two orders', () => {
        const order1 = 100 as any
        const order2 = 200 as any
        const result = averageOrder(order1, order2)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(150)
        }
      })
    })

    describe('compareOrder', () => {
      it('should return negative for smaller order', () => {
        const order1 = 100 as any
        const order2 = 200 as any
        expect(compareOrder(order1, order2)).toBeLessThan(0)
      })

      it('should return positive for larger order', () => {
        const order1 = 200 as any
        const order2 = 100 as any
        expect(compareOrder(order1, order2)).toBeGreaterThan(0)
      })

      it('should return zero for equal orders', () => {
        const order1 = 100 as any
        const order2 = 100 as any
        expect(compareOrder(order1, order2)).toBe(0)
      })
    })
  })

  describe('LineContent', () => {
    describe('createLineContent', () => {
      it('should create valid content', () => {
        const result = createLineContent('Hello World')
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe('Hello World')
        }
      })

      it('should accept empty string', () => {
        const result = createLineContent('')
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe('')
        }
      })

      it('should reject content exceeding max length', () => {
        const longContent = 'a'.repeat(10001)
        const result = createLineContent(longContent)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('too long')
        }
      })
    })

    describe('content operations', () => {
      const content = 'Hello World' as any

      it('should get content length', () => {
        expect(getContentLength(content)).toBe(11)
      })

      it('should check if content is empty', () => {
        const emptyContent = '' as any
        expect(isEmptyContent(emptyContent)).toBe(true)
        expect(isEmptyContent(content)).toBe(false)
      })

      it('should insert text into content', () => {
        const offset = 6 as any
        const result = insertTextToContent(content, offset, 'Beautiful ')
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe('Hello Beautiful World')
        }
      })

      it('should delete text from content', () => {
        const offset = 5 as any
        const result = deleteTextFromContent(content, offset, 6)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe('Hello')
        }
      })

      it('should slice content', () => {
        const start = 0 as any
        const end = 5 as any
        const result = sliceContent(content, start, end)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe('Hello')
        }
      })

      it('should reject invalid insert offset', () => {
        const offset = 20 as any
        const result = insertTextToContent(content, offset, 'test')
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('exceeds')
        }
      })

      it('should reject invalid delete range', () => {
        const offset = 5 as any
        const result = deleteTextFromContent(content, offset, 20)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('exceeds')
        }
      })
    })
  })

  describe('CursorOffset', () => {
    describe('createCursorOffset', () => {
      it('should create valid cursor offset', () => {
        const result = createCursorOffset(5, 10)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(5)
        }
      })

      it('should accept zero offset', () => {
        const result = createCursorOffset(0, 10)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(0)
        }
      })

      it('should accept offset at max length', () => {
        const result = createCursorOffset(10, 10)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(10)
        }
      })

      it('should reject negative offset', () => {
        const result = createCursorOffset(-1, 10)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('non-negative')
        }
      })

      it('should reject offset exceeding max length', () => {
        const result = createCursorOffset(11, 10)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('exceeds')
        }
      })

      it('should reject non-integer offset', () => {
        const result = createCursorOffset(5.5, 10)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('integer')
        }
      })
    })

    describe('cursor operations', () => {
      it('should move cursor forward', () => {
        const offset = 5 as any
        const result = moveCursor(offset, 3, 10)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(8)
        }
      })

      it('should move cursor backward', () => {
        const offset = 5 as any
        const result = moveCursor(offset, -2, 10)
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value).toBe(3)
        }
      })

      it('should reject movement beyond bounds', () => {
        const offset = 8 as any
        const result = moveCursor(offset, 5, 10)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('exceeds')
        }
      })

      it('should clamp cursor to max length', () => {
        const offset = 15 as any
        const clamped = clampCursor(offset, 10)
        expect(clamped).toBe(10)
      })

      it('should not clamp cursor within bounds', () => {
        const offset = 5 as any
        const clamped = clampCursor(offset, 10)
        expect(clamped).toBe(5)
      })
    })
  })
})