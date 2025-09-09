import { describe, it, expect, vi } from 'vitest'
import {
  createLine,
  createLineWithId,
  updateLineContent,
  updateLineOrder,
  insertTextInLine,
  deleteTextFromLine,
  splitLine,
  mergeLine,
  getLineLength,
  isLineEmpty,
  getLineText,
  isEqualLine,
  compareLineByOrder,
  copyLineWithNewId,
  validateLine,
} from './line'

// モックUUID生成
vi.mock('../../utils/fp', async () => {
  const actual = await vi.importActual('../../utils/fp')
  return {
    ...actual,
    generateUUID: vi.fn(() => 'test-uuid-123'),
    timestamp: vi.fn(() => new Date('2024-01-01T00:00:00.000Z')),
  }
})

describe('Line Entity', () => {
  describe('createLine', () => {
    it('should create a new line with generated ID', () => {
      const result = createLine('Hello World', 100)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe('test-uuid-123')
        expect(result.value.content).toBe('Hello World')
        expect(result.value.order).toBe(100)
        expect(result.value.createdAt).toEqual(new Date('2024-01-01T00:00:00.000Z'))
        expect(result.value.updatedAt).toEqual(new Date('2024-01-01T00:00:00.000Z'))
      }
    })

    it('should reject invalid content', () => {
      const longContent = 'a'.repeat(10001)
      const result = createLine(longContent, 100)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('too long')
      }
    })

    it('should reject invalid order', () => {
      const result = createLine('Hello', -1)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('non-negative')
      }
    })
  })

  describe('createLineWithId', () => {
    it('should create a line with specified ID', () => {
      const result = createLineWithId('custom-id', 'Hello', 100)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe('custom-id')
        expect(result.value.content).toBe('Hello')
      }
    })
  })

  describe('updateLineContent', () => {
    it('should update line content', () => {
      const lineResult = createLine('Original', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const result = updateLineContent(lineResult.value, 'Updated')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.content).toBe('Updated')
        expect(result.value.id).toBe(lineResult.value.id)
        expect(result.value.order).toBe(lineResult.value.order)
      }
    })

    it('should reject invalid content', () => {
      const lineResult = createLine('Original', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const longContent = 'a'.repeat(10001)
      const result = updateLineContent(lineResult.value, longContent)
      expect(result.ok).toBe(false)
    })
  })

  describe('updateLineOrder', () => {
    it('should update line order', () => {
      const lineResult = createLine('Hello', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const result = updateLineOrder(lineResult.value, 200)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.order).toBe(200)
        expect(result.value.content).toBe(lineResult.value.content)
      }
    })
  })

  describe('insertTextInLine', () => {
    it('should insert text at beginning', () => {
      const lineResult = createLine('World', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const result = insertTextInLine(lineResult.value, 0, 'Hello ')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.content).toBe('Hello World')
      }
    })

    it('should insert text in middle', () => {
      const lineResult = createLine('Hello World', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const result = insertTextInLine(lineResult.value, 6, 'Beautiful ')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.content).toBe('Hello Beautiful World')
      }
    })

    it('should insert text at end', () => {
      const lineResult = createLine('Hello', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const result = insertTextInLine(lineResult.value, 5, ' World')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.content).toBe('Hello World')
      }
    })

    it('should reject invalid offset', () => {
      const lineResult = createLine('Hello', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const result = insertTextInLine(lineResult.value, 10, 'World')
      expect(result.ok).toBe(false)
    })
  })

  describe('deleteTextFromLine', () => {
    it('should delete text from beginning', () => {
      const lineResult = createLine('Hello World', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const result = deleteTextFromLine(lineResult.value, 0, 6)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.content).toBe('World')
      }
    })

    it('should delete text from middle', () => {
      const lineResult = createLine('Hello Beautiful World', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const result = deleteTextFromLine(lineResult.value, 6, 10)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.content).toBe('Hello World')
      }
    })

    it('should delete text from end', () => {
      const lineResult = createLine('Hello World', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const result = deleteTextFromLine(lineResult.value, 5, 6)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.content).toBe('Hello')
      }
    })
  })

  describe('splitLine', () => {
    it('should split line at specified offset', () => {
      const lineResult = createLine('Hello World', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const result = splitLine(lineResult.value, 6)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.before.content).toBe('Hello ')
        expect(result.value.after.content).toBe('World')
        expect(result.value.after.order).toBe(100.5)
      }
    })

    it('should split at beginning', () => {
      const lineResult = createLine('Hello World', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const result = splitLine(lineResult.value, 0)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.before.content).toBe('')
        expect(result.value.after.content).toBe('Hello World')
      }
    })

    it('should split at end', () => {
      const lineResult = createLine('Hello World', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      const result = splitLine(lineResult.value, 11)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.before.content).toBe('Hello World')
        expect(result.value.after.content).toBe('')
      }
    })
  })

  describe('mergeLine', () => {
    it('should merge two lines', () => {
      const line1Result = createLine('Hello ', 100)
      const line2Result = createLine('World', 200)
      expect(line1Result.ok).toBe(true)
      expect(line2Result.ok).toBe(true)
      if (!line1Result.ok || !line2Result.ok) return

      const result = mergeLine(line1Result.value, line2Result.value)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.content).toBe('Hello World')
        expect(result.value.id).toBe(line1Result.value.id)
        expect(result.value.order).toBe(line1Result.value.order)
      }
    })
  })

  describe('Line information getters', () => {
    it('should get line length', () => {
      const lineResult = createLine('Hello World', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      expect(getLineLength(lineResult.value)).toBe(11)
    })

    it('should check if line is empty', () => {
      const emptyLineResult = createLine('', 100)
      const nonEmptyLineResult = createLine('Hello', 100)
      expect(emptyLineResult.ok).toBe(true)
      expect(nonEmptyLineResult.ok).toBe(true)
      if (!emptyLineResult.ok || !nonEmptyLineResult.ok) return

      expect(isLineEmpty(emptyLineResult.value)).toBe(true)
      expect(isLineEmpty(nonEmptyLineResult.value)).toBe(false)
    })

    it('should get line text', () => {
      const lineResult = createLine('Hello World', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      expect(getLineText(lineResult.value)).toBe('Hello World')
    })
  })

  describe('Line comparison', () => {
    it('should check line equality', () => {
      const line1Result = createLineWithId('id-1', 'Hello', 100)
      const line2Result = createLineWithId('id-1', 'World', 200)
      const line3Result = createLineWithId('id-2', 'Hello', 100)
      
      expect(line1Result.ok).toBe(true)
      expect(line2Result.ok).toBe(true)
      expect(line3Result.ok).toBe(true)
      if (!line1Result.ok || !line2Result.ok || !line3Result.ok) return

      expect(isEqualLine(line1Result.value, line2Result.value)).toBe(true)
      expect(isEqualLine(line1Result.value, line3Result.value)).toBe(false)
    })

    it('should compare lines by order', () => {
      const line1Result = createLine('First', 100)
      const line2Result = createLine('Second', 200)
      expect(line1Result.ok).toBe(true)
      expect(line2Result.ok).toBe(true)
      if (!line1Result.ok || !line2Result.ok) return

      expect(compareLineByOrder(line1Result.value, line2Result.value)).toBeLessThan(0)
      expect(compareLineByOrder(line2Result.value, line1Result.value)).toBeGreaterThan(0)
      expect(compareLineByOrder(line1Result.value, line1Result.value)).toBe(0)
    })
  })

  describe('copyLineWithNewId', () => {
    it('should copy line with new ID', () => {
      const originalResult = createLineWithId('original-id', 'Hello', 100)
      expect(originalResult.ok).toBe(true)
      if (!originalResult.ok) return

      const copy = copyLineWithNewId(originalResult.value)
      expect(copy.id).toBe('test-uuid-123')
      expect(copy.id).not.toBe(originalResult.value.id)
      expect(copy.content).toBe(originalResult.value.content)
      expect(copy.order).toBe(originalResult.value.order)
    })
  })

  describe('validateLine', () => {
    it('should validate correct line object', () => {
      const lineResult = createLine('Hello', 100)
      expect(lineResult.ok).toBe(true)
      if (!lineResult.ok) return

      expect(validateLine(lineResult.value)).toBe(true)
    })

    it('should reject invalid objects', () => {
      expect(validateLine(null)).toBe(false)
      expect(validateLine(undefined)).toBe(false)
      expect(validateLine({})).toBe(false)
      expect(validateLine({ id: 'test' })).toBe(false)
      expect(validateLine({
        id: 'test',
        content: 'hello',
        order: 100,
        createdAt: 'not-a-date',
        updatedAt: new Date(),
      })).toBe(false)
    })
  })
})