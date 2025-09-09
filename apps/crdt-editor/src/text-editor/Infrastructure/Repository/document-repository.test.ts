import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as Y from 'yjs'
import {
  createYjsDocumentRepository,
  createInMemoryDocumentRepository,
  createLocalStorageDocumentRepository,
} from './document-repository'
import { createDocument, addLineToDocument } from '../../Domain/Entity'
import { createDocumentId } from '../../Domain/ValueObject'

// LocalStorage モック
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Document Repository', () => {
  describe('YjsDocumentRepository', () => {
    let repository: ReturnType<typeof createYjsDocumentRepository>

    beforeEach(() => {
      repository = createYjsDocumentRepository()
    })

    it('should create a new document', async () => {
      const result = await repository.create('Test Document')
      
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.title).toBe('Test Document')
        expect(result.value.lines).toEqual([])
        expect(result.value.version).toBe(0)
      }
    })

    it('should save and find document by ID', async () => {
      const doc = createDocument('Test')
      const saveResult = await repository.save(doc)
      
      expect(saveResult.ok).toBe(true)
      
      const foundOption = await repository.findById(doc.id)
      expect(foundOption.some).toBe(true)
      if (foundOption.some) {
        expect(foundOption.value.id).toBe(doc.id)
        expect(foundOption.value.title).toBe('Test')
      }
    })

    it('should return none for non-existent document', async () => {
      const foundOption = await repository.findById(createDocumentId('non-existent'))
      expect(foundOption.some).toBe(false)
    })

    it('should update existing document', async () => {
      const doc = createDocument('Original')
      await repository.save(doc)
      
      const updatedDoc = { ...doc, title: 'Updated' }
      const updateResult = await repository.save(updatedDoc)
      
      expect(updateResult.ok).toBe(true)
      
      const foundOption = await repository.findById(doc.id)
      expect(foundOption.some).toBe(true)
      if (foundOption.some) {
        expect(foundOption.value.title).toBe('Updated')
      }
    })

    it('should delete document', async () => {
      const doc = createDocument('Test')
      await repository.save(doc)
      
      const deleteResult = await repository.delete(doc.id)
      expect(deleteResult.ok).toBe(true)
      
      const foundOption = await repository.findById(doc.id)
      expect(foundOption.some).toBe(false)
    })

    it('should return error when deleting non-existent document', async () => {
      const deleteResult = await repository.delete(createDocumentId('non-existent'))
      
      expect(deleteResult.ok).toBe(false)
      if (!deleteResult.ok) {
        expect(deleteResult.error.message).toContain('Document not found')
      }
    })

    it('should handle document with lines', async () => {
      let doc = createDocument('Test')
      const addResult1 = addLineToDocument(doc, 'Line 1')
      expect(addResult1.ok).toBe(true)
      if (!addResult1.ok) return
      doc = addResult1.value
      
      const addResult2 = addLineToDocument(doc, 'Line 2')
      expect(addResult2.ok).toBe(true)
      if (!addResult2.ok) return
      doc = addResult2.value
      
      await repository.save(doc)
      
      const foundOption = await repository.findById(doc.id)
      expect(foundOption.some).toBe(true)
      if (foundOption.some) {
        expect(foundOption.value.lines).toHaveLength(2)
        expect(foundOption.value.lines[0].content).toBe('Line 1')
        expect(foundOption.value.lines[1].content).toBe('Line 2')
      }
    })

    it('should notify subscribers on changes', async () => {
      const callback = vi.fn()
      const unsubscribe = repository.subscribeToChanges(callback)
      
      const doc = createDocument('Test')
      await repository.save(doc)
      
      // Y.js updates are asynchronous
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).toHaveBeenCalled()
      
      unsubscribe()
    })

    it('should return Yjs document', () => {
      const yjsDoc = repository.getYjsDoc()
      expect(yjsDoc).toBeInstanceOf(Y.Doc)
    })
  })

  describe('InMemoryDocumentRepository', () => {
    let repository: ReturnType<typeof createInMemoryDocumentRepository>

    beforeEach(() => {
      repository = createInMemoryDocumentRepository()
    })

    it('should store documents in memory', async () => {
      const doc = createDocument('Test')
      await repository.save(doc)
      
      const foundOption = await repository.findById(doc.id)
      expect(foundOption.some).toBe(true)
      if (foundOption.some) {
        expect(foundOption.value).toEqual(doc)
      }
    })

    it('should create new document', async () => {
      const result = await repository.create('New Document')
      
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.title).toBe('New Document')
        
        const foundOption = await repository.findById(result.value.id)
        expect(foundOption.some).toBe(true)
      }
    })

    it('should delete document from memory', async () => {
      const doc = createDocument('Test')
      await repository.save(doc)
      
      const deleteResult = await repository.delete(doc.id)
      expect(deleteResult.ok).toBe(true)
      
      const foundOption = await repository.findById(doc.id)
      expect(foundOption.some).toBe(false)
    })

    it('should notify subscribers', async () => {
      const callback = vi.fn()
      const unsubscribe = repository.subscribeToChanges(callback)
      
      const doc = createDocument('Test')
      await repository.save(doc)
      
      expect(callback).toHaveBeenCalledWith(doc)
      
      unsubscribe()
      
      await repository.save({ ...doc, title: 'Updated' })
      expect(callback).toHaveBeenCalledTimes(1) // Should not be called after unsubscribe
    })
  })

  describe('LocalStorageDocumentRepository', () => {
    let repository: ReturnType<typeof createLocalStorageDocumentRepository>

    beforeEach(() => {
      localStorageMock.clear()
      vi.clearAllMocks()
      repository = createLocalStorageDocumentRepository('test-key')
    })

    it('should persist to localStorage', async () => {
      const doc = createDocument('Test')
      await repository.save(doc)
      
      expect(localStorageMock.setItem).toHaveBeenCalled()
      const savedData = localStorageMock.setItem.mock.calls[0][1]
      expect(savedData).toBeDefined()
      expect(typeof savedData).toBe('string')
    })

    it('should load from localStorage on initialization', () => {
      // Create a document and save it
      createDocument('Test')
      const yjsDoc = new Y.Doc()
      const state = Y.encodeStateAsUpdate(yjsDoc)
      localStorageMock.setItem('test-key-2', JSON.stringify(Array.from(state)))
      
      // Create new repository (should load from storage)
      createLocalStorageDocumentRepository('test-key-2')
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key-2')
    })

    it('should handle corrupted localStorage data', () => {
      localStorageMock.setItem('test-key-3', 'invalid-json')
      
      // Should not throw
      expect(() => {
        createLocalStorageDocumentRepository('test-key-3')
      }).not.toThrow()
    })

    it('should save and retrieve document', async () => {
      const doc = createDocument('Persistent')
      await repository.save(doc)
      
      const foundOption = await repository.findById(doc.id)
      expect(foundOption.some).toBe(true)
      if (foundOption.some) {
        expect(foundOption.value.title).toBe('Persistent')
      }
    })

    it('should delete document and update localStorage', async () => {
      const doc = createDocument('ToDelete')
      await repository.save(doc)
      
      vi.clearAllMocks()
      
      const deleteResult = await repository.delete(doc.id)
      expect(deleteResult.ok).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalled()
      
      const foundOption = await repository.findById(doc.id)
      expect(foundOption.some).toBe(false)
    })

    it('should notify subscribers and save to localStorage', async () => {
      const callback = vi.fn()
      repository.subscribeToChanges(callback)
      
      const doc = createDocument('Test')
      await repository.save(doc)
      
      // Wait for async updates
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(callback).toHaveBeenCalled()
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })
})