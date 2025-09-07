import { describe, it, expect } from "bun:test";
import { $Patch, $Span } from "./Span";
import { Comparers } from "./Comparer";

describe("Span", () => {
  describe("文字列配列の比較", () => {
    const comparer = Comparers.strict<string>();

    it("基本的な挿入・削除・保持", () => {
      const before = ["a", "b", "c"];
      const after = ["a", "x", "c"];
      
      const patch = $Patch.createFromDiff(before, after, comparer);
      const result = $Patch.apply(patch);
      
      expect(result).toEqual(after);
      
      // 編集距離が最小であることを確認（1つの置換 = 削除1 + 挿入1 = 距離2）
      const editDistance = $Patch.getEditDistance(before, after, comparer);
      expect(editDistance).toBe(2);
    });

    it("要素の追加", () => {
      const before = ["a", "b"];
      const after = ["a", "b", "c", "d"];
      
      const patch = $Patch.createFromDiff(before, after, comparer);
      const result = $Patch.apply(patch);
      
      expect(result).toEqual(after);
    });

    it("要素の削除", () => {
      const before = ["a", "b", "c", "d"];
      const after = ["a", "d"];
      
      const patch = $Patch.createFromDiff(before, after, comparer);
      const result = $Patch.apply(patch);
      
      expect(result).toEqual(after);
    });
  });

  describe("オブジェクト配列の比較", () => {
    type User = { id: string; name: string; age: number };

    it("IDによる比較", () => {
      const comparer = Comparers.byField<User>("id");
      
      const before: User[] = [
        { id: "1", name: "Alice", age: 25 },
        { id: "2", name: "Bob", age: 30 },
      ];
      
      const after: User[] = [
        { id: "1", name: "Alice Updated", age: 26 }, // 名前と年齢変更、IDは同じ
        { id: "3", name: "Charlie", age: 35 },        // 新規追加
      ];
      
      const patch = $Patch.createFromDiff(before, after, comparer);
      const result = $Patch.apply(patch);
      
      // IDが同じなので最初の要素は保持される（元のオブジェクトが残る）
      expect(result[0]).toEqual({ id: "1", name: "Alice", age: 25 });
      expect(result[1]).toEqual({ id: "3", name: "Charlie", age: 35 });
    });

    it("深い比較（オブジェクト全体）", () => {
      const comparer = Comparers.deepJson<User>();
      
      const before: User[] = [
        { id: "1", name: "Alice", age: 25 },
        { id: "2", name: "Bob", age: 30 },
      ];
      
      const after: User[] = [
        { id: "1", name: "Alice", age: 26 }, // 年齢変更
        { id: "2", name: "Bob", age: 30 },   // 変更なし
      ];
      
      const patch = $Patch.createFromDiff(before, after, comparer);
      const result = $Patch.apply(patch);
      
      expect(result).toEqual(after);
      // 年齢が変更されたので、削除＋挿入になる
      expect(patch.spans.some(span => $Span.isDelete(span))).toBe(true);
      expect(patch.spans.some(span => $Span.isInsert(span))).toBe(true);
    });
  });

  describe("混在配列の比較", () => {
    it("数値と文字列の混在", () => {
      const comparer = Comparers.auto<string | number>();
      
      const before = ["a", 1, "b", 2];
      const after = ["a", 1, "c", 3];
      
      const patch = $Patch.createFromDiff(before, after, comparer);
      const result = $Patch.apply(patch);
      
      expect(result).toEqual(after);
    });
  });

  describe("カスタム比較戦略", () => {
    type Item = { type: string; value: any; metadata?: any };

    it("typeとvalueだけで比較", () => {
      const comparer = Comparers.custom<Item>(
        (a, b) => a.type === b.type && a.value === b.value,
        (item) => `${item.type}:${item.value}`
      );
      
      const before: Item[] = [
        { type: "text", value: "hello", metadata: { created: "2023-01-01" } },
        { type: "number", value: 42, metadata: { updated: "2023-01-02" } },
      ];
      
      const after: Item[] = [
        { type: "text", value: "hello", metadata: { created: "2023-01-05" } }, // metadataのみ変更
        { type: "number", value: 100, metadata: { updated: "2023-01-02" } },   // value変更
      ];
      
      const patch = $Patch.createFromDiff(before, after, comparer);
      const result = $Patch.apply(patch);
      
      // 最初の要素はtype+valueが同じなので保持される（元のmetadataが残る）
      expect(result[0].metadata?.created).toBe("2023-01-01");
      // 2番目の要素はvalueが変更されたので置き換えられる
      expect(result[1].value).toBe(100);
    });
  });

  describe("エッジケース", () => {
    const comparer = Comparers.strict<string>();

    it("空配列から空配列", () => {
      const patch = $Patch.createFromDiff([], [], comparer);
      const result = $Patch.apply(patch);
      
      expect(result).toEqual([]);
      expect(patch.spans).toEqual([]);
    });

    it("空配列から要素追加", () => {
      const patch = $Patch.createFromDiff([], ["a", "b"], comparer);
      const result = $Patch.apply(patch);
      
      expect(result).toEqual(["a", "b"]);
    });

    it("全削除", () => {
      const patch = $Patch.createFromDiff(["a", "b"], [], comparer);
      const result = $Patch.apply(patch);
      
      expect(result).toEqual([]);
    });

    it("同一配列", () => {
      const arr = ["a", "b", "c"];
      const patch = $Patch.createFromDiff(arr, [...arr], comparer);
      const result = $Patch.apply(patch);
      
      expect(result).toEqual(arr);
      expect(patch.spans).toEqual([$Span.createRetain(3)]);
    });
  });
});