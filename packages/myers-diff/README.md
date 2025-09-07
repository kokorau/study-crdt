# @study-crdt/myers-diff

汎用Myers差分アルゴリズム実装 - 文字列と配列の両方に対応

## 🚀 特徴

- **汎用対応**: 文字列、配列、オブジェクト配列など任意の型に対応
- **柔軟な比較**: ID比較、深い比較、カスタム比較戦略
- **型安全**: TypeScriptの型システムを完全活用
- **高性能**: LCSベースの最適化されたアルゴリズム
- **既存互換**: 既存の文字列APIとの互換性を維持

## 📦 インストール

```bash
pnpm install @study-crdt/myers-diff
```

## 🔧 使用方法

### 基本的な使い方

```typescript
import { $StringDiff, $Patch, Comparers } from '@study-crdt/myers-diff';

// 文字列の差分
const stringPatch = $StringDiff.createFromDiff("kitten", "sitting");
const result = $StringDiff.apply(stringPatch); // "sitting"

// 配列の差分
const arrayPatch = $Patch.createFromDiff(
  ["a", "b", "c"],
  ["a", "x", "c"], 
  Comparers.strict<string>()
);
```

### オブジェクト配列の差分

```typescript
type User = { id: string; name: string; age: number };

const before: User[] = [
  { id: "1", name: "Alice", age: 25 },
  { id: "2", name: "Bob", age: 30 }
];

const after: User[] = [
  { id: "1", name: "Alice Updated", age: 26 }, // 名前・年齢変更
  { id: "3", name: "Charlie", age: 35 }        // 新規追加
];

// IDのみで比較（名前・年齢の変更は無視）
const patch = $Patch.createFromDiff(
  before, 
  after, 
  Comparers.byField("id")
);
```

### 比較戦略

```typescript
// プリミティブ値の厳密比較
Comparers.strict<string>()

// オブジェクトの特定フィールドで比較
Comparers.byField<User, "id">("id")

// 複数フィールドで比較
Comparers.byFields<Person>("firstName", "lastName")

// 深い比較（全フィールド）
Comparers.deepJson<Product>()

// カスタム比較
Comparers.custom<Task>(
  (a, b) => a.id === b.id && a.title === b.title,
  (item) => `${item.id}:${item.title}`
)

// 自動判定
Comparers.auto<any>()
```

## 🚀 基本コンセプト

```typescript
// 文字列の差分計算
import { $StringDiff } from '@study-crdt/myers-diff';
const patch = $StringDiff.createFromDiff("abc", "axc");

// 配列の差分計算
import { $Patch, Comparers } from '@study-crdt/myers-diff';
const patch = $Patch.createFromDiff(array1, array2, comparer);
```

## 📖 API リファレンス

### 文字列用API

- `$StringDiff.createFromDiff(before: string, after: string)` - 差分作成
- `$StringDiff.apply(patch: StringPatch)` - パッチ適用
- `$StringDiff.getEditDistance(before: string, after: string)` - 編集距離計算

### 配列用API

- `$Patch.createFromDiff<T>(before: T[], after: T[], comparer)` - 差分作成
- `$Patch.apply<T>(patch: Patch<T>)` - パッチ適用
- `$Patch.getEditDistance<T>(before: T[], after: T[], comparer)` - 編集距離計算

### 比較戦略

- `Comparers.strict<T>()` - 厳密等価比較
- `Comparers.byField<T, K>(field: K)` - フィールド比較
- `Comparers.byFields<T>(...fields)` - 複数フィールド比較
- `Comparers.deepJson<T>()` - JSON深い比較
- `Comparers.custom<T>(equalsFn, hashFn?)` - カスタム比較
- `Comparers.auto<T>()` - 自動判定比較

## 🧪 テスト

```bash
pnpm test
```

## 📄 ライセンス

ISC