# Text Editor コーディング規約

## 基本方針

### 1. 関数型プログラミング (FP) の原則

#### 1.1 純粋関数の使用
- 副作用を持たない関数を基本とする
- 同じ入力に対して常に同じ出力を返す
- 外部の状態を変更しない

```typescript
// Good
const addLine = (lines: readonly Line[], newLine: Line): readonly Line[] => 
  [...lines, newLine]

// Bad
const addLine = (lines: Line[], newLine: Line): void => {
  lines.push(newLine) // 副作用がある
}
```

#### 1.2 イミュータビリティ
- データは不変として扱う
- 配列やオブジェクトの変更は新しいインスタンスを返す
- `readonly`修飾子を積極的に使用

```typescript
// Good
type Line = {
  readonly id: string
  readonly content: string
  readonly order: number
}

// Bad
type Line = {
  id: string
  content: string
  order: number
}
```

#### 1.3 関数の合成
- 小さな関数を組み合わせて複雑な処理を構築
- パイプラインパターンの活用

```typescript
// Good
import { pipe } from '../utils/fp'

const processLines = pipe(
  filterEmptyLines,
  sortByOrder,
  assignNewIds
)
```

### 2. ディレクトリ構造とDDD

```
src/text-editor/
├── Domain/           # ドメインロジック
│   ├── ValueObject/  # 値オブジェクト
│   ├── Entity/       # エンティティ（IDを持つ）
│   ├── Service/      # ドメインサービス
│   └── Event/        # ドメインイベント
├── Application/      # アプリケーションロジック
│   ├── UseCase/      # ユースケース
│   ├── Service/      # アプリケーションサービス
│   └── Port/         # インターフェース定義
├── Infrastructure/   # 外部との接続
│   ├── Yjs/         # Yjs実装
│   ├── WebRTC/      # WebRTC実装
│   └── Repository/  # リポジトリ実装
└── utils/           # ユーティリティ関数
    └── fp.ts        # FPヘルパー
```

### 3. 命名規則

#### 3.1 関数名
- 動詞で始める（処理を表す）
- キャメルケース使用
- 純粋関数は動作を明確に表現

```typescript
// Good
const createLine = (content: string): Line => ...
const updateLineContent = (line: Line, content: string): Line => ...
const findLineById = (lines: readonly Line[], id: string): Line | undefined => ...

// Bad
const line = (content: string): Line => ...
const lineUpdate = (line: Line, content: string): Line => ...
```

#### 3.2 型名
- パスカルケース使用
- 具体的で意味のある名前

```typescript
// Good
type LineId = string
type LineContent = string
type LineOrder = number

// Bad
type Id = string
type Content = string
```

#### 3.3 ファイル名
- ケバブケース使用
- 役割を明確に表現

```
// Good
create-line.ts
update-line-content.ts
line-repository.ts

// Bad
createLine.ts
LineUpdate.ts
```

### 4. 型定義

#### 4.1 型エイリアスの使用
- プリミティブ型にも意味のある名前を付ける
- ブランド型の活用

```typescript
// ブランド型の例
type LineId = string & { readonly _brand: 'LineId' }
type ActorId = string & { readonly _brand: 'ActorId' }

const createLineId = (value: string): LineId => value as LineId
const createActorId = (value: string): ActorId => value as ActorId
```

#### 4.2 Union型とDiscriminated Union
- 状態の表現にUnion型を活用

```typescript
type EditorState = 
  | { readonly type: 'idle' }
  | { readonly type: 'editing'; readonly lineId: LineId }
  | { readonly type: 'syncing'; readonly progress: number }
  | { readonly type: 'error'; readonly message: string }
```

### 5. エラーハンドリング

#### 5.1 Result型パターン
- 例外を投げずにResult型で表現

```typescript
type Result<T, E = Error> = 
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

const parseLine = (input: string): Result<Line> => {
  if (!input) {
    return { ok: false, error: new Error('Empty input') }
  }
  return { ok: true, value: createLine(input) }
}
```

#### 5.2 Option型パターン
- null/undefinedの代わりにOption型を使用

```typescript
type Option<T> = 
  | { readonly some: true; readonly value: T }
  | { readonly some: false }

const findLine = (lines: readonly Line[], id: LineId): Option<Line> => {
  const line = lines.find(l => l.id === id)
  return line 
    ? { some: true, value: line }
    : { some: false }
}
```

### 6. 副作用の管理

#### 6.1 副作用の分離
- 副作用を持つ処理はInfrastructure層に隔離
- ドメインロジックは純粋に保つ

```typescript
// Domain層（純粋）
const calculateDiff = (before: Document, after: Document): Diff => ...

// Infrastructure層（副作用あり）
const syncWithYjs = async (diff: Diff, doc: Y.Doc): Promise<void> => {
  // Yjsへの反映（副作用）
}
```

#### 6.2 依存性注入
- 外部依存はインターフェースで抽象化
- 実装は注入する

```typescript
// Port（インターフェース）
type SyncPort = {
  readonly sync: (diff: Diff) => Promise<Result<void>>
}

// UseCase（ポートを使用）
const createSyncUseCase = (port: SyncPort) => 
  async (diff: Diff): Promise<Result<void>> => 
    port.sync(diff)
```

### 7. テスタビリティ

#### 7.1 テストしやすい設計
- 純粋関数は単体テストが容易
- 副作用は分離してモック可能に

```typescript
// テストしやすい純粋関数
describe('addLine', () => {
  it('should add a new line to the end', () => {
    const lines = [createLine('line1')]
    const newLine = createLine('line2')
    const result = addLine(lines, newLine)
    expect(result).toHaveLength(2)
    expect(result[1]).toBe(newLine)
  })
})
```

### 8. Yjs統合の原則

#### 8.1 Yjsの型は境界に留める
- ドメイン層にYjsの型を漏らさない
- アダプターパターンで変換

```typescript
// Infrastructure層
const toYjsArray = (lines: readonly Line[]): Y.Array<any> => ...
const fromYjsArray = (yArray: Y.Array<any>): readonly Line[] => ...

// Domain層はYjsを知らない
const processLines = (lines: readonly Line[]): readonly Line[] => ...
```

### 9. パフォーマンス考慮事項

#### 9.1 遅延評価
- 必要になるまで計算を遅延

```typescript
// 遅延評価の例
const createLazyDiff = (before: Document, after: Document) => ({
  calculate: () => calculateDiff(before, after)
})
```

#### 9.2 メモ化
- 計算コストの高い純粋関数はメモ化

```typescript
import { memoize } from '../utils/fp'

const calculateExpensiveDiff = memoize(
  (before: Document, after: Document) => ...
)
```

### 10. コードレビューチェックリスト

- [ ] 関数は純粋か（副作用がないか）
- [ ] データはイミュータブルか
- [ ] 型は適切に定義されているか
- [ ] エラーハンドリングは適切か
- [ ] 副作用は適切に分離されているか
- [ ] テストは書きやすい設計か
- [ ] 命名は明確で一貫性があるか
- [ ] Yjsの型がドメイン層に漏れていないか