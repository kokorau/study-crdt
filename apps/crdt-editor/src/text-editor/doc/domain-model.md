# Text Editor ドメインモデル設計

## 1. ドメイン境界とコンテキスト

### 1.1 境界づけられたコンテキスト

```
┌─────────────────────────────────────────────────────────────┐
│                     Text Editor Context                      │
├───────────────────────────┬─────────────────────────────────┤
│      Core Domain          │      Supporting Domain          │
├───────────────────────────┼─────────────────────────────────┤
│ - Document                │ - Sync Management               │
│ - Line                    │ - Presence Management           │
│ - Text Operations         │ - Persistence                   │
│ - Actor                   │                                 │
└───────────────────────────┴─────────────────────────────────┘
```

### 1.2 ドメイン層の責務

- **ビジネスルールの表現**: テキスト編集のルールと制約
- **状態の管理**: ドキュメントと行の状態
- **操作の定義**: 編集操作の純粋な表現
- **イベントの発行**: ドメインイベントの生成

## 2. 値オブジェクト (Value Objects)

### 2.1 識別子

```typescript
// ブランド型による型安全な識別子
type DocumentId = string & { readonly _brand: 'DocumentId' }
type LineId = string & { readonly _brand: 'LineId' }
type ActorId = string & { readonly _brand: 'ActorId' }

// ファクトリ関数
const createDocumentId = (value: string): DocumentId => value as DocumentId
const createLineId = (value: string): LineId => value as LineId
const createActorId = (value: string): ActorId => value as ActorId

// バリデーション付きファクトリ
const createValidLineId = (value: string): Result<LineId> => {
  if (!value || !value.match(/^[a-zA-Z0-9-]+$/)) {
    return { ok: false, error: new Error('Invalid LineId format') }
  }
  return { ok: true, value: value as LineId }
}
```

### 2.2 基本値

```typescript
// 行の順序
type LineOrder = number & { readonly _brand: 'LineOrder' }

const createLineOrder = (value: number): Result<LineOrder> => {
  if (value < 0) {
    return { ok: false, error: new Error('Order must be non-negative') }
  }
  return { ok: true, value: value as LineOrder }
}

// 行のコンテンツ
type LineContent = string & { readonly _brand: 'LineContent' }

const createLineContent = (value: string): Result<LineContent> => {
  if (value.length > 10000) {
    return { ok: false, error: new Error('Content too long') }
  }
  return { ok: true, value: value as LineContent }
}

// カーソル位置
type CursorOffset = number & { readonly _brand: 'CursorOffset' }

const createCursorOffset = (value: number, maxLength: number): Result<CursorOffset> => {
  if (value < 0 || value > maxLength) {
    return { ok: false, error: new Error('Invalid cursor position') }
  }
  return { ok: true, value: value as CursorOffset }
}
```

### 2.3 複合値オブジェクト

```typescript
// カーソル位置
type CursorPosition = {
  readonly lineId: LineId
  readonly offset: CursorOffset
}

const createCursorPosition = (
  lineId: LineId,
  offset: number,
  maxLength: number
): Result<CursorPosition> => {
  const offsetResult = createCursorOffset(offset, maxLength)
  if (!offsetResult.ok) {
    return { ok: false, error: offsetResult.error }
  }
  return {
    ok: true,
    value: { lineId, offset: offsetResult.value }
  }
}

// 選択範囲
type SelectionRange = {
  readonly start: CursorPosition
  readonly end: CursorPosition
}

const createSelectionRange = (
  start: CursorPosition,
  end: CursorPosition
): Result<SelectionRange> => {
  // 同一行内での選択のみ許可（Phase 1）
  if (start.lineId !== end.lineId) {
    return { ok: false, error: new Error('Cross-line selection not supported') }
  }
  return { ok: true, value: { start, end } }
}
```

## 3. エンティティ (Entities)

### 3.1 Line エンティティ

```typescript
type Line = {
  readonly id: LineId
  readonly content: LineContent
  readonly order: LineOrder
  readonly createdAt: Date
  readonly updatedAt: Date
}

// Line操作関数（純粋関数）
const createLine = (
  content: string,
  order: number
): Result<Line> => {
  const contentResult = createLineContent(content)
  const orderResult = createLineOrder(order)
  
  if (!contentResult.ok) return contentResult
  if (!orderResult.ok) return orderResult
  
  const now = new Date()
  return {
    ok: true,
    value: {
      id: createLineId(generateUUID()),
      content: contentResult.value,
      order: orderResult.value,
      createdAt: now,
      updatedAt: now
    }
  }
}

const updateLineContent = (
  line: Line,
  newContent: string
): Result<Line> => {
  const contentResult = createLineContent(newContent)
  if (!contentResult.ok) return contentResult
  
  return {
    ok: true,
    value: {
      ...line,
      content: contentResult.value,
      updatedAt: new Date()
    }
  }
}

const insertTextInLine = (
  line: Line,
  offset: number,
  text: string
): Result<Line> => {
  const currentContent = line.content as string
  const newContent = 
    currentContent.slice(0, offset) + 
    text + 
    currentContent.slice(offset)
  
  return updateLineContent(line, newContent)
}

const deleteTextFromLine = (
  line: Line,
  offset: number,
  length: number
): Result<Line> => {
  const currentContent = line.content as string
  const newContent = 
    currentContent.slice(0, offset) + 
    currentContent.slice(offset + length)
  
  return updateLineContent(line, newContent)
}
```

### 3.2 Actor エンティティ

```typescript
type ActorColor = string & { readonly _brand: 'ActorColor' }

type Actor = {
  readonly id: ActorId
  readonly name: string
  readonly color: ActorColor
  readonly isLocal: boolean
  readonly joinedAt: Date
}

const createActor = (
  name: string,
  color: string,
  isLocal: boolean = false
): Result<Actor> => {
  if (!name || name.length > 50) {
    return { ok: false, error: new Error('Invalid actor name') }
  }
  
  if (!color.match(/^#[0-9A-F]{6}$/i)) {
    return { ok: false, error: new Error('Invalid color format') }
  }
  
  return {
    ok: true,
    value: {
      id: createActorId(generateUUID()),
      name,
      color: color as ActorColor,
      isLocal,
      joinedAt: new Date()
    }
  }
}
```

## 4. 集約 (Aggregate)

### 4.1 Document 集約

```typescript
type Document = {
  readonly id: DocumentId
  readonly title: string
  readonly lines: readonly Line[]
  readonly version: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

// Document操作関数
const createDocument = (title: string): Document => ({
  id: createDocumentId(generateUUID()),
  title,
  lines: [],
  version: 0,
  createdAt: new Date(),
  updatedAt: new Date()
})

const addLineToDocument = (
  document: Document,
  content: string,
  afterLineId?: LineId
): Result<Document> => {
  const order = calculateNewLineOrder(document.lines, afterLineId)
  const lineResult = createLine(content, order)
  
  if (!lineResult.ok) return lineResult
  
  return {
    ok: true,
    value: {
      ...document,
      lines: [...document.lines, lineResult.value],
      version: document.version + 1,
      updatedAt: new Date()
    }
  }
}

const removeLineFromDocument = (
  document: Document,
  lineId: LineId
): Result<Document> => {
  const filteredLines = document.lines.filter(l => l.id !== lineId)
  
  if (filteredLines.length === document.lines.length) {
    return { ok: false, error: new Error('Line not found') }
  }
  
  return {
    ok: true,
    value: {
      ...document,
      lines: filteredLines,
      version: document.version + 1,
      updatedAt: new Date()
    }
  }
}

const updateLineInDocument = (
  document: Document,
  lineId: LineId,
  updater: (line: Line) => Result<Line>
): Result<Document> => {
  const line = document.lines.find(l => l.id === lineId)
  if (!line) {
    return { ok: false, error: new Error('Line not found') }
  }
  
  const updatedLineResult = updater(line)
  if (!updatedLineResult.ok) return updatedLineResult
  
  const updatedLines = document.lines.map(l =>
    l.id === lineId ? updatedLineResult.value : l
  )
  
  return {
    ok: true,
    value: {
      ...document,
      lines: updatedLines,
      version: document.version + 1,
      updatedAt: new Date()
    }
  }
}

const reorderLinesInDocument = (
  document: Document,
  lineId: LineId,
  newOrder: number
): Result<Document> => {
  const lineIndex = document.lines.findIndex(l => l.id === lineId)
  if (lineIndex === -1) {
    return { ok: false, error: new Error('Line not found') }
  }
  
  const reorderedLines = reorderLines(document.lines, lineIndex, newOrder)
  
  return {
    ok: true,
    value: {
      ...document,
      lines: reorderedLines,
      version: document.version + 1,
      updatedAt: new Date()
    }
  }
}
```

## 5. ドメインサービス

### 5.1 行順序管理サービス

```typescript
// 行の順序を計算するドメインサービス
const calculateNewLineOrder = (
  lines: readonly Line[],
  afterLineId?: LineId
): number => {
  if (!afterLineId || lines.length === 0) {
    return lines.length
  }
  
  const afterLineIndex = lines.findIndex(l => l.id === afterLineId)
  if (afterLineIndex === -1) {
    return lines.length
  }
  
  const afterLine = lines[afterLineIndex]
  const nextLine = lines[afterLineIndex + 1]
  
  if (!nextLine) {
    return afterLine.order + 1
  }
  
  // 2つの行の間の順序値を計算（小数点を使用）
  return (afterLine.order + nextLine.order) / 2
}

const reorderLines = (
  lines: readonly Line[],
  fromIndex: number,
  toOrder: number
): readonly Line[] => {
  const sortedLines = [...lines].sort((a, b) => a.order - b.order)
  const [movedLine] = sortedLines.splice(fromIndex, 1)
  
  // 新しい順序で再配置
  const updatedLine = { ...movedLine, order: toOrder as LineOrder }
  const result = [...sortedLines]
  
  // 適切な位置に挿入
  const insertIndex = result.findIndex(l => l.order > toOrder)
  if (insertIndex === -1) {
    result.push(updatedLine)
  } else {
    result.splice(insertIndex, 0, updatedLine)
  }
  
  // 順序値を正規化（0から始まる整数に）
  return result.map((line, index) => ({
    ...line,
    order: index as LineOrder
  }))
}
```

### 5.2 テキスト操作サービス

```typescript
// テキスト操作の変換と合成
type TextOperation = 
  | { readonly type: 'insert'; readonly offset: number; readonly text: string }
  | { readonly type: 'delete'; readonly offset: number; readonly length: number }

const applyTextOperation = (
  content: string,
  operation: TextOperation
): Result<string> => {
  switch (operation.type) {
    case 'insert':
      if (operation.offset < 0 || operation.offset > content.length) {
        return { ok: false, error: new Error('Invalid offset') }
      }
      return {
        ok: true,
        value: content.slice(0, operation.offset) + 
               operation.text + 
               content.slice(operation.offset)
      }
    
    case 'delete':
      if (operation.offset < 0 || 
          operation.offset + operation.length > content.length) {
        return { ok: false, error: new Error('Invalid range') }
      }
      return {
        ok: true,
        value: content.slice(0, operation.offset) + 
               content.slice(operation.offset + operation.length)
      }
  }
}

const composeTextOperations = (
  op1: TextOperation,
  op2: TextOperation
): TextOperation[] => {
  // 操作の合成ロジック（OT: Operational Transformation）
  // 簡略化のため、順次適用として実装
  return [op1, op2]
}
```

## 6. ドメインイベント

### 6.1 イベント定義

```typescript
// ベースイベント型
type DomainEventBase = {
  readonly occurredAt: Date
  readonly actorId: ActorId
  readonly version: number
}

// 具体的なイベント
type LineAddedEvent = DomainEventBase & {
  readonly type: 'line-added'
  readonly documentId: DocumentId
  readonly line: Line
  readonly afterLineId?: LineId
}

type LineDeletedEvent = DomainEventBase & {
  readonly type: 'line-deleted'
  readonly documentId: DocumentId
  readonly lineId: LineId
}

type TextInsertedEvent = DomainEventBase & {
  readonly type: 'text-inserted'
  readonly documentId: DocumentId
  readonly lineId: LineId
  readonly offset: number
  readonly text: string
}

type TextDeletedEvent = DomainEventBase & {
  readonly type: 'text-deleted'
  readonly documentId: DocumentId
  readonly lineId: LineId
  readonly offset: number
  readonly length: number
}

type LineReorderedEvent = DomainEventBase & {
  readonly type: 'line-reordered'
  readonly documentId: DocumentId
  readonly lineId: LineId
  readonly fromOrder: LineOrder
  readonly toOrder: LineOrder
}

// Union型でまとめる
type DomainEvent = 
  | LineAddedEvent
  | LineDeletedEvent
  | TextInsertedEvent
  | TextDeletedEvent
  | LineReorderedEvent
```

### 6.2 イベント生成

```typescript
const createDomainEvent = <T extends DomainEvent['type']>(
  type: T,
  actorId: ActorId,
  payload: Omit<Extract<DomainEvent, { type: T }>, 'type' | 'occurredAt' | 'actorId' | 'version'>
): Extract<DomainEvent, { type: T }> => {
  return {
    type,
    occurredAt: new Date(),
    actorId,
    version: 1,
    ...payload
  } as Extract<DomainEvent, { type: T }>
}
```

## 7. リポジトリインターフェース

```typescript
// ドメイン層で定義するインターフェース（実装はInfra層）
type DocumentRepository = {
  readonly findById: (id: DocumentId) => Promise<Option<Document>>
  readonly save: (document: Document) => Promise<Result<void>>
  readonly delete: (id: DocumentId) => Promise<Result<void>>
}

type ActorRepository = {
  readonly findById: (id: ActorId) => Promise<Option<Actor>>
  readonly findAll: () => Promise<readonly Actor[]>
  readonly save: (actor: Actor) => Promise<Result<void>>
  readonly delete: (id: ActorId) => Promise<Result<void>>
}
```

## 8. ドメイン不変条件

### 8.1 ビジネスルール

1. **行の一意性**: 同一ドキュメント内でLineIdは一意
2. **順序の連続性**: 行の順序は連続的（ギャップは許容）
3. **コンテンツ長制限**: 1行あたり最大10,000文字
4. **ドキュメントサイズ**: 最大10,000行
5. **アクター名**: 1-50文字
6. **同時編集数**: 最大10アクター

### 8.2 整合性境界

- Document集約が整合性境界
- 行の追加・削除・並び替えはDocument経由
- アクター情報は別の整合性境界

## 9. ユーティリティ関数

```typescript
// UUID生成（実装は省略）
declare const generateUUID: () => string

// Result型
type Result<T, E = Error> = 
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

// Option型
type Option<T> = 
  | { readonly some: true; readonly value: T }
  | { readonly some: false }

// パイプライン関数
const pipe = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduce((acc, fn) => fn(acc), value)

// 関数合成
const compose = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduceRight((acc, fn) => fn(acc), value)
```

## 10. 今後の拡張ポイント

### Phase 2で追加予定
- 複数行選択のサポート
- リッチテキスト属性（太字、斜体など）
- ブロックタイプ（見出し、リストなど）
- コメント機能
- バージョン履歴

### Phase 3で追加予定
- アクセス権限管理
- 共同編集の競合解決戦略のカスタマイズ
- プラグインシステム
- マクロ・テンプレート機能