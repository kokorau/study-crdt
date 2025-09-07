/**
 * Myers差分アルゴリズムの使用例
 */

import { $Patch, $StringDiff, Comparers } from "./Domain/ValueObject";

// ==== 基本的な使用例 ====

// 1. 文字列の比較
function stringExample() {
  const before = "kitten";
  const after = "sitting";
  
  const patch = $StringDiff.createFromDiff(before, after);
  const result = $StringDiff.apply(patch);
  
  console.log("結果:", result); // "sitting"
  console.log("編集距離:", $StringDiff.getEditDistance(before, after)); // 3
}

// 2. 文字列配列の比較
function stringArrayExample() {
  const before = ["hello", "world", "foo"];
  const after = ["hello", "universe", "bar"];
  
  const comparer = Comparers.strict<string>();
  const patch = $Patch.createFromDiff(before, after, comparer);
  const result = $Patch.apply(patch);
  
  console.log("結果:", result); // ["hello", "universe", "bar"]
  console.log("編集距離:", $Patch.getEditDistance(before, after, comparer)); // 2
}

// 3. オブジェクト配列をIDで比較
function objectByIdExample() {
  type User = { id: string; name: string; age: number };
  
  const before: User[] = [
    { id: "1", name: "Alice", age: 25 },
    { id: "2", name: "Bob", age: 30 },
    { id: "3", name: "Charlie", age: 35 }
  ];
  
  const after: User[] = [
    { id: "1", name: "Alice Updated", age: 26 }, // 名前・年齢変更
    { id: "3", name: "Charlie", age: 35 },        // 変更なし
    { id: "4", name: "David", age: 40 }           // 新規追加
  ];
  
  // IDのみで比較（名前や年齢の変更は無視）
  const comparer = Comparers.byField<User, "id">("id");
  const patch = $Patch.createFromDiff(before, after, comparer);
  const result = $Patch.apply(patch);
  
  console.log("結果:", result);
  // 注意: IDが同じ要素は元のオブジェクトが保持される
  // [{ id: "1", name: "Alice", age: 25 }, { id: "3", name: "Charlie", age: 35 }, { id: "4", name: "David", age: 40 }]
}

// 3. オブジェクト配列を深い比較
function deepComparisonExample() {
  type Product = { id: string; name: string; price: number };
  
  const before: Product[] = [
    { id: "1", name: "Apple", price: 100 },
    { id: "2", name: "Banana", price: 80 }
  ];
  
  const after: Product[] = [
    { id: "1", name: "Apple", price: 120 }, // 価格変更
    { id: "2", name: "Banana", price: 80 }  // 変更なし
  ];
  
  // オブジェクト全体で比較（すべてのフィールドが一致する必要がある）
  const comparer = Comparers.deepJson<Product>();
  const patch = $Patch.createFromDiff(before, after, comparer);
  const result = $Patch.apply(patch);
  
  console.log("結果:", result); // 価格変更されたオブジェクトは新しいものに置換される
}

// 4. カスタム比較ロジック
function customComparisonExample() {
  type Task = { 
    id: string; 
    title: string; 
    status: "todo" | "done"; 
    metadata?: any 
  };
  
  const before: Task[] = [
    { id: "1", title: "Buy milk", status: "todo", metadata: { created: "2023-01-01" } },
    { id: "2", title: "Walk dog", status: "done", metadata: { completed: "2023-01-02" } }
  ];
  
  const after: Task[] = [
    { id: "1", title: "Buy milk", status: "done", metadata: { completed: "2023-01-03" } }, // statusとmetadata変更
    { id: "2", title: "Walk dog", status: "done", metadata: { completed: "2023-01-02" } }  // 変更なし
  ];
  
  // IDとtitleのみで比較（statusやmetadataの変更は無視）
  const comparer = Comparers.custom<Task>(
    (a, b) => a.id === b.id && a.title === b.title,
    (item) => `${item.id}:${item.title}`
  );
  
  const patch = $Patch.createFromDiff(before, after, comparer);
  const result = $Patch.apply(patch);
  
  console.log("結果:", result);
  // statusやmetadataの変更は無視されるので、元のオブジェクトが保持される
}

// 5. 混在型配列の比較
function mixedTypeExample() {
  const before: (string | number | { type: string })[] = [
    "text",
    42,
    { type: "object" },
    "another text"
  ];
  
  const after: (string | number | { type: string })[] = [
    "text",
    100, // 数値変更
    { type: "updated" }, // オブジェクト変更
    "another text"
  ];
  
  // 自動判定による比較
  const comparer = Comparers.auto<string | number | { type: string }>();
  const patch = $Patch.createFromDiff(before, after, comparer);
  const result = $Patch.apply(patch);
  
  console.log("結果:", result);
}

// 6. 複数フィールドによる比較
function multiFieldExample() {
  type Person = { 
    firstName: string; 
    lastName: string; 
    age: number;
    email: string;
  };
  
  const before: Person[] = [
    { firstName: "John", lastName: "Doe", age: 30, email: "john@example.com" },
    { firstName: "Jane", lastName: "Smith", age: 25, email: "jane@example.com" }
  ];
  
  const after: Person[] = [
    { firstName: "John", lastName: "Doe", age: 31, email: "john.doe@example.com" }, // 年齢とメール変更
    { firstName: "Jane", lastName: "Smith", age: 25, email: "jane@example.com" }    // 変更なし
  ];
  
  // firstName + lastName で比較（年齢やメールの変更は無視）
  const comparer = Comparers.byFields<Person>("firstName", "lastName");
  const patch = $Patch.createFromDiff(before, after, comparer);
  const result = $Patch.apply(patch);
  
  console.log("結果:", result);
  // 名前が同じなので元のオブジェクトが保持される
}

// ==== 実行例 ====
if (import.meta.main) {
  console.log("=== 文字列の比較 ===");
  stringExample();
  
  console.log("\n=== 文字列配列の比較 ===");
  stringArrayExample();
  
  console.log("\n=== オブジェクト配列をIDで比較 ===");
  objectByIdExample();
  
  console.log("\n=== 深い比較 ===");
  deepComparisonExample();
  
  console.log("\n=== カスタム比較 ===");
  customComparisonExample();
  
  console.log("\n=== 混在型配列 ===");
  mixedTypeExample();
  
  console.log("\n=== 複数フィールド比較 ===");
  multiFieldExample();
}

export {
  stringExample,
  stringArrayExample,
  objectByIdExample,
  deepComparisonExample,
  customComparisonExample,
  mixedTypeExample,
  multiFieldExample
};