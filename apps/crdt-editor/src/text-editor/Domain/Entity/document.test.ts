import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createDocument,
  createDocumentWithId,
  updateDocumentTitle,
  addLineToDocument,
  removeLineFromDocument,
  updateLineInDocument,
  reorderLineInDocument,
  updateMultipleLinesInDocument,
  getDocumentLineCount,
  getDocumentCharCount,
  findLineById,
  getLineByIndex,
  getFirstLine,
  getLastLine,
  isDocumentEmpty,
  validateDocument,
} from './document'
import { createLineId } from '../ValueObject'
import { updateLineContent } from './line'

// モックUUID生成
vi.mock('../../utils/fp', async () => {
  const actual = await vi.importActual('../../utils/fp')
  let uuidCounter = 0
  return {
    ...actual,
    generateUUID: vi.fn(() => `test-uuid-${++uuidCounter}`),
    timestamp: vi.fn(() => new Date('2024-01-01T00:00:00.000Z')),
  }
})

describe('Document Aggregate', () => {
  describe('createDocument', () => {
    it('should create a new document with default title', () => {
      const doc = createDocument()
      expect(doc.id).toMatch(/^test-uuid-/)
      expect(doc.title).toBe('Untitled')
      expect(doc.lines).toEqual([])
      expect(doc.version).toBe(0)
      expect(doc.createdAt).toEqual(new Date('2024-01-01T00:00:00.000Z'))
      expect(doc.updatedAt).toEqual(new Date('2024-01-01T00:00:00.000Z'))
    })

    it('should create document with specified title', () => {
      const doc = createDocument('My Document')
      expect(doc.title).toBe('My Document')
    })
  })

  describe('createDocumentWithId', () => {
    it('should create document with specified ID', () => {
      const doc = createDocumentWithId('custom-doc-id', 'My Document')
      expect(doc.id).toBe('custom-doc-id')
      expect(doc.title).toBe('My Document')
    })
  })

  describe('updateDocumentTitle', () => {
    it('should update document title', () => {
      const doc = createDocument('Original')
      const result = updateDocumentTitle(doc, 'Updated Title')
      
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.title).toBe('Updated Title')
        expect(result.value.version).toBe(1)
        expect(result.value.id).toBe(doc.id)
      }
    })

    it('should reject empty title', () => {
      const doc = createDocument()
      const result = updateDocumentTitle(doc, '')
      
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid title')
      }
    })

    it('should reject title exceeding max length', () => {
      const doc = createDocument()
      const longTitle = 'a'.repeat(256)
      const result = updateDocumentTitle(doc, longTitle)
      
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid title')
      }
    })
  })

  describe('addLineToDocument', () => {
    it('should add first line to empty document', () => {
      const doc = createDocument()
      const result = addLineToDocument(doc, 'First line')
      
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines).toHaveLength(1)
        expect(result.value.lines[0].content).toBe('First line')
        expect(result.value.lines[0].order).toBe(1000)
        expect(result.value.version).toBe(1)
      }
    })

    it('should add line after existing lines', () => {
      const doc = createDocument()
      const result1 = addLineToDocument(doc, 'First line')
      expect(result1.ok).toBe(true)
      if (!result1.ok) return

      const result2 = addLineToDocument(result1.value, 'Second line')
      expect(result2.ok).toBe(true)
      if (result2.ok) {
        expect(result2.value.lines).toHaveLength(2)
        expect(result2.value.lines[1].content).toBe('Second line')
        expect(result2.value.lines[1].order).toBe(2000)
      }
    })

    it('should add line after specified line', () => {
      const doc = createDocument()
      const result1 = addLineToDocument(doc, 'First line')
      expect(result1.ok).toBe(true)
      if (!result1.ok) return

      const result2 = addLineToDocument(result1.value, 'Third line')
      expect(result2.ok).toBe(true)
      if (!result2.ok) return

      const firstLineId = result1.value.lines[0].id
      const result3 = addLineToDocument(result2.value, 'Second line', firstLineId)
      expect(result3.ok).toBe(true)
      if (result3.ok) {
        expect(result3.value.lines).toHaveLength(3)
        // Lines should be sorted by order
        expect(result3.value.lines[0].content).toBe('First line')
        expect(result3.value.lines[1].content).toBe('Second line')
        expect(result3.value.lines[2].content).toBe('Third line')
      }
    })

    it('should reject adding line when max lines reached', () => {
      const doc = createDocument()
      // Mock a document with max lines
      const docWithMaxLines = {
        ...doc,
        lines: new Array(10000).fill(null).map((_, i) => ({
          id: createLineId(`line-${i}`),
          content: `Line ${i}` as any,
          order: i as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      }
      
      const result = addLineToDocument(docWithMaxLines, 'One more line')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('maximum number of lines')
      }
    })
  })

  describe('removeLineFromDocument', () => {
    it('should remove line from document', () => {
      const doc = createDocument()
      const result1 = addLineToDocument(doc, 'Line 1')
      const result2 = result1.ok ? addLineToDocument(result1.value, 'Line 2') : result1
      const result3 = result2.ok ? addLineToDocument(result2.value, 'Line 3') : result2
      
      expect(result3.ok).toBe(true)
      if (!result3.ok) return

      const lineToRemove = result3.value.lines[1].id
      const result = removeLineFromDocument(result3.value, lineToRemove)
      
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines).toHaveLength(2)
        expect(result.value.lines[0].content).toBe('Line 1')
        expect(result.value.lines[1].content).toBe('Line 3')
        expect(result.value.version).toBe(4)
      }
    })

    it('should return error when line not found', () => {
      const doc = createDocument()
      const result = removeLineFromDocument(doc, createLineId('non-existent'))
      
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Line not found')
      }
    })
  })

  describe('updateLineInDocument', () => {
    it('should update line content in document', () => {
      const doc = createDocument()
      const result1 = addLineToDocument(doc, 'Original content')
      expect(result1.ok).toBe(true)
      if (!result1.ok) return

      const lineId = result1.value.lines[0].id
      const result = updateLineInDocument(
        result1.value,
        lineId,
        line => updateLineContent(line, 'Updated content')
      )
      
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines[0].content).toBe('Updated content')
        expect(result.value.version).toBe(2)
      }
    })

    it('should return error when line not found', () => {
      const doc = createDocument()
      const result = updateLineInDocument(
        doc,
        createLineId('non-existent'),
        line => updateLineContent(line, 'New content')
      )
      
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Line not found')
      }
    })

    it('should propagate updater errors', () => {
      const doc = createDocument()
      const result1 = addLineToDocument(doc, 'Content')
      expect(result1.ok).toBe(true)
      if (!result1.ok) return

      const lineId = result1.value.lines[0].id
      const longContent = 'a'.repeat(10001)
      const result = updateLineInDocument(
        result1.value,
        lineId,
        line => updateLineContent(line, longContent)
      )
      
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('too long')
      }
    })
  })

  describe('reorderLineInDocument', () => {
    it('should reorder line to new position', () => {
      const doc = createDocument()
      let currentDoc = doc
      
      // Add three lines
      for (let i = 1; i <= 3; i++) {
        const result = addLineToDocument(currentDoc, `Line ${i}`)
        expect(result.ok).toBe(true)
        if (result.ok) currentDoc = result.value
      }
      
      // Move first line to position 2 (index 1)
      const lineToMove = currentDoc.lines[0].id
      const result = reorderLineInDocument(currentDoc, lineToMove, 2)
      
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines[0].content).toBe('Line 2')
        expect(result.value.lines[1].content).toBe('Line 3')
        expect(result.value.lines[2].content).toBe('Line 1')
        expect(result.value.version).toBe(4)
      }
    })

    it('should return error for invalid target index', () => {
      const doc = createDocument()
      const result1 = addLineToDocument(doc, 'Line 1')
      expect(result1.ok).toBe(true)
      if (!result1.ok) return

      const lineId = result1.value.lines[0].id
      const result = reorderLineInDocument(result1.value, lineId, -1)
      
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Invalid target index')
      }
    })

    it('should return error when line not found', () => {
      const doc = createDocument()
      const result = reorderLineInDocument(doc, createLineId('non-existent'), 0)
      
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Line not found')
      }
    })
  })

  describe('updateMultipleLinesInDocument', () => {
    it('should update multiple lines in one operation', () => {
      const doc = createDocument()
      let currentDoc = doc
      
      // Add three lines
      for (let i = 1; i <= 3; i++) {
        const result = addLineToDocument(currentDoc, `Line ${i}`)
        expect(result.ok).toBe(true)
        if (result.ok) currentDoc = result.value
      }
      
      const updates = [
        {
          lineId: currentDoc.lines[0].id,
          updater: (line: any) => updateLineContent(line, 'Updated Line 1'),
        },
        {
          lineId: currentDoc.lines[2].id,
          updater: (line: any) => updateLineContent(line, 'Updated Line 3'),
        },
      ]
      
      const result = updateMultipleLinesInDocument(currentDoc, updates)
      
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines[0].content).toBe('Updated Line 1')
        expect(result.value.lines[1].content).toBe('Line 2')
        expect(result.value.lines[2].content).toBe('Updated Line 3')
        expect(result.value.version).toBe(4)
      }
    })

    it('should return error if any line not found', () => {
      const doc = createDocument()
      const result1 = addLineToDocument(doc, 'Line 1')
      expect(result1.ok).toBe(true)
      if (!result1.ok) return

      const updates = [
        {
          lineId: result1.value.lines[0].id,
          updater: (line: any) => updateLineContent(line, 'Updated'),
        },
        {
          lineId: createLineId('non-existent'),
          updater: (line: any) => updateLineContent(line, 'Updated'),
        },
      ]
      
      const result = updateMultipleLinesInDocument(result1.value, updates)
      
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('not found')
      }
    })
  })

  describe('Document information getters', () => {
    let testDoc: any
    
    beforeEach(() => {
      const doc = createDocument()
      let currentDoc = doc
      
      // Add test lines
      const lines = ['Hello', 'World', 'Test']
      for (const content of lines) {
        const result = addLineToDocument(currentDoc, content)
        if (result.ok) currentDoc = result.value
      }
      
      testDoc = currentDoc
    })

    it('should get document line count', () => {
      expect(getDocumentLineCount(testDoc)).toBe(3)
    })

    it('should get document character count', () => {
      expect(getDocumentCharCount(testDoc)).toBe(14) // Hello(5) + World(5) + Test(4)
    })

    it('should find line by ID', () => {
      const line = findLineById(testDoc, testDoc.lines[1].id)
      expect(line).toBeDefined()
      expect(line?.content).toBe('World')
    })

    it('should return undefined for non-existent line ID', () => {
      const line = findLineById(testDoc, createLineId('non-existent'))
      expect(line).toBeUndefined()
    })

    it('should get line by index', () => {
      const line = getLineByIndex(testDoc, 1)
      expect(line).toBeDefined()
      expect(line?.content).toBe('World')
    })

    it('should return undefined for invalid index', () => {
      expect(getLineByIndex(testDoc, -1)).toBeUndefined()
      expect(getLineByIndex(testDoc, 10)).toBeUndefined()
    })

    it('should get first line', () => {
      const line = getFirstLine(testDoc)
      expect(line).toBeDefined()
      expect(line?.content).toBe('Hello')
    })

    it('should get last line', () => {
      const line = getLastLine(testDoc)
      expect(line).toBeDefined()
      expect(line?.content).toBe('Test')
    })

    it('should return undefined for empty document', () => {
      const emptyDoc = createDocument()
      expect(getFirstLine(emptyDoc)).toBeUndefined()
      expect(getLastLine(emptyDoc)).toBeUndefined()
    })
  })

  describe('isDocumentEmpty', () => {
    it('should return true for document with no lines', () => {
      const doc = createDocument()
      expect(isDocumentEmpty(doc)).toBe(true)
    })

    it('should return true for document with single empty line', () => {
      const doc = createDocument()
      const result = addLineToDocument(doc, '')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(isDocumentEmpty(result.value)).toBe(true)
      }
    })

    it('should return false for document with content', () => {
      const doc = createDocument()
      const result = addLineToDocument(doc, 'Content')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(isDocumentEmpty(result.value)).toBe(false)
      }
    })

    it('should return false for document with multiple lines', () => {
      const doc = createDocument()
      const result1 = addLineToDocument(doc, '')
      const result2 = result1.ok ? addLineToDocument(result1.value, 'Content') : result1
      expect(result2.ok).toBe(true)
      if (result2.ok) {
        expect(isDocumentEmpty(result2.value)).toBe(false)
      }
    })
  })

  describe('validateDocument', () => {
    it('should validate correct document object', () => {
      const doc = createDocument()
      expect(validateDocument(doc)).toBe(true)
    })

    it('should reject invalid objects', () => {
      expect(validateDocument(null)).toBe(false)
      expect(validateDocument(undefined)).toBe(false)
      expect(validateDocument({})).toBe(false)
      expect(validateDocument({ id: 'test' })).toBe(false)
      expect(validateDocument({
        id: 'test',
        title: 'Test',
        lines: 'not-array',
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })).toBe(false)
      expect(validateDocument({
        id: 'test',
        title: 'Test',
        lines: [],
        version: 'not-number',
        createdAt: new Date(),
        updatedAt: new Date(),
      })).toBe(false)
    })

    it('should validate document with all correct properties', () => {
      const validDoc = {
        id: 'test-id',
        title: 'Test Document',
        lines: [],
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(validateDocument(validDoc)).toBe(true)
    })
  })
})