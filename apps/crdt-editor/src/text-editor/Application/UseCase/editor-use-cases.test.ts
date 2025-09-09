import { describe, it, expect, beforeEach } from 'vitest'
import { createEditorUseCases } from './editor-use-cases'
import { createInMemoryDocumentRepository } from '../../Infrastructure/Repository/document-repository'
import { createDocumentId, createLineId, createActorId } from '../../Domain/ValueObject'

describe('Editor Use Cases', () => {
  let repository: ReturnType<typeof createInMemoryDocumentRepository>
  let useCases: ReturnType<typeof createEditorUseCases>
  const actorId = createActorId('test-actor')

  beforeEach(() => {
    repository = createInMemoryDocumentRepository()
    useCases = createEditorUseCases(repository)
  })

  describe('createDocument', () => {
    it('should create a new document', async () => {
      const result = await useCases.createDocument({
        title: 'New Document',
        actorId,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.title).toBe('New Document')
        expect(result.value.lines).toEqual([])
        expect(result.value.version).toBe(0)
      }
    })

    it('should create document with default title', async () => {
      const result = await useCases.createDocument({ actorId })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.title).toBe('Untitled')
      }
    })
  })

  describe('addLine', () => {
    let document: any

    beforeEach(async () => {
      const createResult = await useCases.createDocument({
        title: 'Test Doc',
        actorId,
      })
      expect(createResult.ok).toBe(true)
      if (createResult.ok) {
        document = createResult.value
      }
    })

    it('should add a line to document', async () => {
      const result = await useCases.addLine({
        documentId: document.id,
        content: 'First line',
        actorId,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines).toHaveLength(1)
        expect(result.value.lines[0].content).toBe('First line')
      }
    })

    it('should add line after specified line', async () => {
      // Add first line
      const result1 = await useCases.addLine({
        documentId: document.id,
        content: 'Line 1',
        actorId,
      })
      expect(result1.ok).toBe(true)
      if (!result1.ok) return

      // Add third line
      const result2 = await useCases.addLine({
        documentId: document.id,
        content: 'Line 3',
        actorId,
      })
      expect(result2.ok).toBe(true)
      if (!result2.ok) return

      // Insert second line after first
      const result3 = await useCases.addLine({
        documentId: document.id,
        content: 'Line 2',
        afterLineId: result1.value.lines[0].id,
        actorId,
      })

      expect(result3.ok).toBe(true)
      if (result3.ok) {
        expect(result3.value.lines).toHaveLength(3)
        expect(result3.value.lines[0].content).toBe('Line 1')
        expect(result3.value.lines[1].content).toBe('Line 2')
        expect(result3.value.lines[2].content).toBe('Line 3')
      }
    })

    it('should return error for non-existent document', async () => {
      const result = await useCases.addLine({
        documentId: createDocumentId('non-existent'),
        content: 'Line',
        actorId,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Document not found')
      }
    })
  })

  describe('removeLine', () => {
    let document: any

    beforeEach(async () => {
      const createResult = await useCases.createDocument({
        title: 'Test Doc',
        actorId,
      })
      expect(createResult.ok).toBe(true)
      if (!createResult.ok) return

      const addResult = await useCases.addLine({
        documentId: createResult.value.id,
        content: 'Line to remove',
        actorId,
      })
      expect(addResult.ok).toBe(true)
      if (addResult.ok) {
        document = addResult.value
      }
    })

    it('should remove a line from document', async () => {
      const lineId = document.lines[0].id
      const result = await useCases.removeLine({
        documentId: document.id,
        lineId,
        actorId,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines).toHaveLength(0)
      }
    })

    it('should return error for non-existent line', async () => {
      const result = await useCases.removeLine({
        documentId: document.id,
        lineId: createLineId('non-existent'),
        actorId,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Line not found')
      }
    })
  })

  describe('updateLineContent', () => {
    let document: any

    beforeEach(async () => {
      const createResult = await useCases.createDocument({
        title: 'Test Doc',
        actorId,
      })
      expect(createResult.ok).toBe(true)
      if (!createResult.ok) return

      const addResult = await useCases.addLine({
        documentId: createResult.value.id,
        content: 'Original content',
        actorId,
      })
      expect(addResult.ok).toBe(true)
      if (addResult.ok) {
        document = addResult.value
      }
    })

    it('should update line content', async () => {
      const lineId = document.lines[0].id
      const result = await useCases.updateLineContent({
        documentId: document.id,
        lineId,
        content: 'Updated content',
        actorId,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines[0].content).toBe('Updated content')
      }
    })
  })

  describe('insertText', () => {
    let document: any

    beforeEach(async () => {
      const createResult = await useCases.createDocument({
        title: 'Test Doc',
        actorId,
      })
      expect(createResult.ok).toBe(true)
      if (!createResult.ok) return

      const addResult = await useCases.addLine({
        documentId: createResult.value.id,
        content: 'Hello World',
        actorId,
      })
      expect(addResult.ok).toBe(true)
      if (addResult.ok) {
        document = addResult.value
      }
    })

    it('should insert text at offset', async () => {
      const lineId = document.lines[0].id
      const result = await useCases.insertText({
        documentId: document.id,
        lineId,
        offset: 6,
        text: 'Beautiful ',
        actorId,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines[0].content).toBe('Hello Beautiful World')
      }
    })

    it('should insert text at beginning', async () => {
      const lineId = document.lines[0].id
      const result = await useCases.insertText({
        documentId: document.id,
        lineId,
        offset: 0,
        text: 'Say ',
        actorId,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines[0].content).toBe('Say Hello World')
      }
    })
  })

  describe('deleteText', () => {
    let document: any

    beforeEach(async () => {
      const createResult = await useCases.createDocument({
        title: 'Test Doc',
        actorId,
      })
      expect(createResult.ok).toBe(true)
      if (!createResult.ok) return

      const addResult = await useCases.addLine({
        documentId: createResult.value.id,
        content: 'Hello Beautiful World',
        actorId,
      })
      expect(addResult.ok).toBe(true)
      if (addResult.ok) {
        document = addResult.value
      }
    })

    it('should delete text at offset', async () => {
      const lineId = document.lines[0].id
      const result = await useCases.deleteText({
        documentId: document.id,
        lineId,
        offset: 6,
        length: 10,
        actorId,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines[0].content).toBe('Hello World')
      }
    })
  })

  describe('splitLineAtOffset', () => {
    let document: any

    beforeEach(async () => {
      const createResult = await useCases.createDocument({
        title: 'Test Doc',
        actorId,
      })
      expect(createResult.ok).toBe(true)
      if (!createResult.ok) return

      const addResult = await useCases.addLine({
        documentId: createResult.value.id,
        content: 'Hello World',
        actorId,
      })
      expect(addResult.ok).toBe(true)
      if (addResult.ok) {
        document = addResult.value
      }
    })

    it('should split line at offset', async () => {
      const lineId = document.lines[0].id
      const result = await useCases.splitLineAtOffset({
        documentId: document.id,
        lineId,
        offset: 6,
        actorId,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines).toHaveLength(2)
        expect(result.value.lines[0].content).toBe('Hello ')
        expect(result.value.lines[1].content).toBe('World')
      }
    })

    it('should return error for non-existent line', async () => {
      const result = await useCases.splitLineAtOffset({
        documentId: document.id,
        lineId: createLineId('non-existent'),
        offset: 5,
        actorId,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Line not found')
      }
    })
  })

  describe('mergeLines', () => {
    let document: any

    beforeEach(async () => {
      const createResult = await useCases.createDocument({
        title: 'Test Doc',
        actorId,
      })
      expect(createResult.ok).toBe(true)
      if (!createResult.ok) return

      const addResult1 = await useCases.addLine({
        documentId: createResult.value.id,
        content: 'Hello ',
        actorId,
      })
      expect(addResult1.ok).toBe(true)
      if (!addResult1.ok) return

      const addResult2 = await useCases.addLine({
        documentId: addResult1.value.id,
        content: 'World',
        actorId,
      })
      expect(addResult2.ok).toBe(true)
      if (addResult2.ok) {
        document = addResult2.value
      }
    })

    it('should merge two lines', async () => {
      const firstLineId = document.lines[0].id
      const secondLineId = document.lines[1].id
      
      const result = await useCases.mergeLines({
        documentId: document.id,
        firstLineId,
        secondLineId,
        actorId,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.lines).toHaveLength(1)
        expect(result.value.lines[0].content).toBe('Hello World')
      }
    })

    it('should return error for non-existent lines', async () => {
      const result = await useCases.mergeLines({
        documentId: document.id,
        firstLineId: createLineId('non-existent'),
        secondLineId: document.lines[1].id,
        actorId,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Line not found')
      }
    })
  })

  describe('getDocument', () => {
    it('should get existing document', async () => {
      const createResult = await useCases.createDocument({
        title: 'Test Doc',
        actorId,
      })
      expect(createResult.ok).toBe(true)
      if (!createResult.ok) return

      const result = await useCases.getDocument(createResult.value.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe(createResult.value.id)
        expect(result.value.title).toBe('Test Doc')
      }
    })

    it('should return error for non-existent document', async () => {
      const result = await useCases.getDocument(createDocumentId('non-existent'))

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Document not found')
      }
    })
  })
})