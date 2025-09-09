import { describe, it, expect, beforeEach } from 'vitest'
import * as Y from 'yjs'
import {
  createYjsDocumentStructure,
  fromYjsDocument,
  toYjsDocument,
  fromYjsActor,
  toYjsActor,
  fromYjsCursor,
  toYjsCursor,
  fromYjsSelection,
  toYjsSelection,
  addLineToYjs,
  removeLineFromYjs,
  updateYjsText,
  insertTextInYjs,
  deleteTextFromYjs,
} from './yjs-adapter'
import {
  createDocument,
  createLineWithId,
  createActorWithId,
  addLineToDocument,
} from '../../Domain/Entity'
import { createLineId } from '../../Domain/ValueObject'

describe('Yjs Adapter', () => {
  let yjsDoc: Y.Doc
  let yjsStructure: ReturnType<typeof createYjsDocumentStructure>

  beforeEach(() => {
    yjsDoc = new Y.Doc()
    yjsStructure = createYjsDocumentStructure(yjsDoc)
  })

  describe('createYjsDocumentStructure', () => {
    it('should create Yjs document structure', () => {
      expect(yjsStructure.doc).toBe(yjsDoc)
      expect(yjsStructure.lines).toBeInstanceOf(Y.Array)
      expect(yjsStructure.contents).toBeInstanceOf(Y.Map)
      expect(yjsStructure.presence).toBeInstanceOf(Y.Map)
      expect(yjsStructure.metadata).toBeInstanceOf(Y.Map)
    })
  })

  describe('Document conversion', () => {
    describe('toYjsDocument', () => {
      it('should convert domain document to Yjs', () => {
        const doc = createDocument('Test Document')
        const result = toYjsDocument(doc, yjsStructure)
        
        expect(result.ok).toBe(true)
        expect(yjsStructure.metadata.get('title')).toBe('Test Document')
        expect(yjsStructure.metadata.get('id')).toBe(doc.id)
        expect(yjsStructure.metadata.get('version')).toBe(0)
      })

      it('should convert document with lines', () => {
        let doc = createDocument('Test')
        const addResult1 = addLineToDocument(doc, 'Line 1')
        expect(addResult1.ok).toBe(true)
        if (!addResult1.ok) return
        doc = addResult1.value
        
        const addResult2 = addLineToDocument(doc, 'Line 2')
        expect(addResult2.ok).toBe(true)
        if (!addResult2.ok) return
        doc = addResult2.value

        const result = toYjsDocument(doc, yjsStructure)
        expect(result.ok).toBe(true)
        
        expect(yjsStructure.lines.length).toBe(2)
        expect(yjsStructure.lines.get(0).id).toBe(doc.lines[0].id)
        expect(yjsStructure.lines.get(1).id).toBe(doc.lines[1].id)
        
        const content1 = yjsStructure.contents.get(doc.lines[0].id as string)
        const content2 = yjsStructure.contents.get(doc.lines[1].id as string)
        expect(content1?.toString()).toBe('Line 1')
        expect(content2?.toString()).toBe('Line 2')
      })
    })

    describe('fromYjsDocument', () => {
      it('should convert Yjs to domain document', () => {
        // Setup Yjs document
        yjsStructure.metadata.set('id', 'doc-123')
        yjsStructure.metadata.set('title', 'Test Document')
        yjsStructure.metadata.set('version', 1)
        yjsStructure.metadata.set('createdAt', new Date().toISOString())
        yjsStructure.metadata.set('updatedAt', new Date().toISOString())

        const result = fromYjsDocument(yjsStructure)
        
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.id).toBe('doc-123')
          expect(result.value.title).toBe('Test Document')
          expect(result.value.version).toBe(1)
          expect(result.value.lines).toEqual([])
        }
      })

      it('should convert Yjs with lines to domain document', () => {
        // Setup metadata
        yjsStructure.metadata.set('id', 'doc-123')
        yjsStructure.metadata.set('title', 'Test')
        yjsStructure.metadata.set('version', 0)
        yjsStructure.metadata.set('createdAt', new Date().toISOString())
        yjsStructure.metadata.set('updatedAt', new Date().toISOString())

        // Add lines
        yjsStructure.lines.push([
          { id: 'line-1', order: 0 },
          { id: 'line-2', order: 1 },
        ])

        // Add content
        const text1 = new Y.Text()
        text1.insert(0, 'First line')
        yjsStructure.contents.set('line-1', text1)

        const text2 = new Y.Text()
        text2.insert(0, 'Second line')
        yjsStructure.contents.set('line-2', text2)

        const result = fromYjsDocument(yjsStructure)
        
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.lines).toHaveLength(2)
          expect(result.value.lines[0].id).toBe('line-1')
          expect(result.value.lines[0].content).toBe('First line')
          expect(result.value.lines[1].id).toBe('line-2')
          expect(result.value.lines[1].content).toBe('Second line')
        }
      })

      it('should return error when document ID is missing', () => {
        yjsStructure.metadata.set('title', 'Test')
        const result = fromYjsDocument(yjsStructure)
        
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('Document ID not found')
        }
      })

      it('should return error when line content is missing', () => {
        yjsStructure.metadata.set('id', 'doc-123')
        yjsStructure.metadata.set('createdAt', new Date().toISOString())
        yjsStructure.metadata.set('updatedAt', new Date().toISOString())
        yjsStructure.lines.push([{ id: 'line-1', order: 0 }])
        
        const result = fromYjsDocument(yjsStructure)
        
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('Content not found for line')
        }
      })
    })
  })

  describe('Actor conversion', () => {
    it('should convert domain actor to Yjs format', () => {
      const actorResult = createActorWithId('actor-1', 'Alice', '#FF0000')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      const yjsActor = toYjsActor(actorResult.value)
      
      expect(yjsActor.id).toBe('actor-1')
      expect(yjsActor.name).toBe('Alice')
      expect(yjsActor.color).toBe('#FF0000')
      expect(yjsActor.isLocal).toBe(false)
      expect(typeof yjsActor.joinedAt).toBe('number')
      expect(typeof yjsActor.lastSeenAt).toBe('number')
    })

    it('should convert Yjs actor to domain format', () => {
      const yjsActor = {
        id: 'actor-1',
        name: 'Bob',
        color: '#00FF00',
        isLocal: true,
        joinedAt: Date.now(),
        lastSeenAt: Date.now(),
      }

      const result = fromYjsActor(yjsActor)
      
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe('actor-1')
        expect(result.value.name).toBe('Bob')
        expect(result.value.color).toBe('#00FF00')
        expect(result.value.isLocal).toBe(true)
      }
    })
  })

  describe('Cursor conversion', () => {
    it('should convert domain cursor to Yjs format', () => {
      const cursor = {
        lineId: createLineId('line-123'),
        offset: 5 as any,
      }

      const yjsCursor = toYjsCursor(cursor)
      
      expect(yjsCursor.lineId).toBe('line-123')
      expect(yjsCursor.offset).toBe(5)
    })

    it('should convert Yjs cursor to domain format', () => {
      const yjsCursor = {
        lineId: 'line-456',
        offset: 10,
      }

      const cursor = fromYjsCursor(yjsCursor)
      
      expect(cursor.lineId).toBe('line-456')
      expect(cursor.offset).toBe(10)
    })
  })

  describe('Selection conversion', () => {
    it('should convert domain selection to Yjs format', () => {
      const selection = {
        start: {
          lineId: createLineId('line-1'),
          offset: 0 as any,
        },
        end: {
          lineId: createLineId('line-1'),
          offset: 10 as any,
        },
      }

      const yjsSelection = toYjsSelection(selection)
      
      expect(yjsSelection.start.lineId).toBe('line-1')
      expect(yjsSelection.start.offset).toBe(0)
      expect(yjsSelection.end.lineId).toBe('line-1')
      expect(yjsSelection.end.offset).toBe(10)
    })

    it('should convert Yjs selection to domain format', () => {
      const yjsSelection = {
        start: { lineId: 'line-2', offset: 5 },
        end: { lineId: 'line-2', offset: 15 },
      }

      const selection = fromYjsSelection(yjsSelection)
      
      expect(selection.start.lineId).toBe('line-2')
      expect(selection.start.offset).toBe(5)
      expect(selection.end.lineId).toBe('line-2')
      expect(selection.end.offset).toBe(15)
    })
  })

  describe('Line operations', () => {
    describe('addLineToYjs', () => {
      it('should add line to Yjs document', () => {
        const lineResult = createLineWithId('line-1', 'Test line', 0)
        expect(lineResult.ok).toBe(true)
        if (!lineResult.ok) return

        const result = addLineToYjs(yjsStructure, lineResult.value)
        
        expect(result.ok).toBe(true)
        expect(yjsStructure.lines.length).toBe(1)
        expect(yjsStructure.lines.get(0).id).toBe('line-1')
        
        const content = yjsStructure.contents.get('line-1')
        expect(content?.toString()).toBe('Test line')
      })

      it('should add line at specific index', () => {
        const line1Result = createLineWithId('line-1', 'First', 0)
        const line2Result = createLineWithId('line-2', 'Second', 2)
        const line3Result = createLineWithId('line-3', 'Middle', 1)
        
        expect(line1Result.ok).toBe(true)
        expect(line2Result.ok).toBe(true)
        expect(line3Result.ok).toBe(true)
        if (!line1Result.ok || !line2Result.ok || !line3Result.ok) return

        addLineToYjs(yjsStructure, line1Result.value)
        addLineToYjs(yjsStructure, line2Result.value)
        addLineToYjs(yjsStructure, line3Result.value, 1)
        
        expect(yjsStructure.lines.get(0).id).toBe('line-1')
        expect(yjsStructure.lines.get(1).id).toBe('line-3')
        expect(yjsStructure.lines.get(2).id).toBe('line-2')
      })
    })

    describe('removeLineFromYjs', () => {
      it('should remove line from Yjs document', () => {
        const lineResult = createLineWithId('line-1', 'Test', 0)
        expect(lineResult.ok).toBe(true)
        if (!lineResult.ok) return

        addLineToYjs(yjsStructure, lineResult.value)
        expect(yjsStructure.lines.length).toBe(1)
        
        const result = removeLineFromYjs(yjsStructure, createLineId('line-1'))
        
        expect(result.ok).toBe(true)
        expect(yjsStructure.lines.length).toBe(0)
        expect(yjsStructure.contents.has('line-1')).toBe(false)
      })
    })

    describe('updateYjsText', () => {
      it('should update text content', () => {
        const lineResult = createLineWithId('line-1', 'Original', 0)
        expect(lineResult.ok).toBe(true)
        if (!lineResult.ok) return

        addLineToYjs(yjsStructure, lineResult.value)
        
        const result = updateYjsText(yjsStructure, createLineId('line-1'), 'Updated')
        
        expect(result.ok).toBe(true)
        const content = yjsStructure.contents.get('line-1')
        expect(content?.toString()).toBe('Updated')
      })

      it('should return error for non-existent line', () => {
        const result = updateYjsText(yjsStructure, createLineId('non-existent'), 'Text')
        
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain('not found')
        }
      })
    })

    describe('insertTextInYjs', () => {
      it('should insert text at offset', () => {
        const lineResult = createLineWithId('line-1', 'Hello World', 0)
        expect(lineResult.ok).toBe(true)
        if (!lineResult.ok) return

        addLineToYjs(yjsStructure, lineResult.value)
        
        const result = insertTextInYjs(yjsStructure, createLineId('line-1'), 6, 'Beautiful ')
        
        expect(result.ok).toBe(true)
        const content = yjsStructure.contents.get('line-1')
        expect(content?.toString()).toBe('Hello Beautiful World')
      })
    })

    describe('deleteTextFromYjs', () => {
      it('should delete text at offset', () => {
        const lineResult = createLineWithId('line-1', 'Hello Beautiful World', 0)
        expect(lineResult.ok).toBe(true)
        if (!lineResult.ok) return

        addLineToYjs(yjsStructure, lineResult.value)
        
        const result = deleteTextFromYjs(yjsStructure, createLineId('line-1'), 6, 10)
        
        expect(result.ok).toBe(true)
        const content = yjsStructure.contents.get('line-1')
        expect(content?.toString()).toBe('Hello World')
      })
    })
  })
})