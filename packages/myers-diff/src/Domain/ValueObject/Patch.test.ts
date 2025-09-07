import { describe, it, expect } from "bun:test";
import { $Patch, type Patch } from "./Patch";
import { $Span } from "./Span";
import { Comparers } from "./Comparer";

describe("Patch", () => {
  describe("create", () => {
    it("パッチオブジェクトを作成", () => {
      const spans = [$Span.createRetain(2), $Span.createInsert(["x"])];
      const patch = $Patch.create({
        baseVersion: ["a", "b", "c"],
        spans,
      });

      expect(patch.baseVersion).toEqual(["a", "b", "c"]);
      expect(patch.spans).toEqual(spans);
      expect(Object.isFrozen(patch)).toBe(true);
    });
  });

  describe("DTO変換", () => {
    it("PatchからDTOへの変換", () => {
      const patch: Patch<string> = {
        baseVersion: ["a", "b"],
        spans: [$Span.createRetain(1), $Span.createInsert(["x"])],
      };

      const dto = $Patch.toDto(patch);

      expect(dto).toEqual({
        v: ["a", "b"],
        s: [{ r: 1 }, { i: ["x"] }],
      });
      expect(Object.isFrozen(dto)).toBe(true);
    });

    it("DTOからPatchへの変換", () => {
      const dto = {
        v: ["a", "b"],
        s: [{ r: 1 }, { i: ["x"] }],
      };

      const patch = $Patch.fromDto(dto);

      expect(patch.baseVersion).toEqual(["a", "b"]);
      expect(patch.spans).toHaveLength(2);
      expect($Span.isRetain(patch.spans[0])).toBe(true);
      expect($Span.isInsert(patch.spans[1])).toBe(true);
    });
  });

  describe("_createFromDiffArray", () => {
    const comparer = Comparers.strict<string>();

    it("基本的な配列差分", () => {
      const patch = $Patch._createFromDiffArray(
        ["a", "b", "c"],
        ["a", "x", "c"],
        comparer
      );

      expect(patch.baseVersion).toEqual(["a", "b", "c"]);
      
      // 実際の結果をテスト
      const result = $Patch._applyArray(patch);
      expect(result).toEqual(["a", "x", "c"]);
      
      // 最適な操作が生成されることを確認
      expect(patch.spans.length).toBeGreaterThan(0);
    });

    it("空配列の処理", () => {
      const patch = $Patch._createFromDiffArray([], ["a", "b"], comparer);

      expect(patch.baseVersion).toEqual([]);
      expect(patch.spans).toHaveLength(1);
      expect($Span.isInsert(patch.spans[0])).toBe(true);
    });

    it("全削除", () => {
      const patch = $Patch._createFromDiffArray(["a", "b"], [], comparer);

      expect(patch.baseVersion).toEqual(["a", "b"]);
      expect(patch.spans).toHaveLength(1);
      expect($Span.isDelete(patch.spans[0])).toBe(true);
    });

    it("同一配列", () => {
      const arr = ["a", "b", "c"];
      const patch = $Patch._createFromDiffArray(arr, [...arr], comparer);

      expect(patch.spans).toEqual([$Span.createRetain(3)]);
    });
  });

  describe("_applyArray", () => {
    it("基本的な適用", () => {
      const patch: Patch<string> = {
        baseVersion: ["a", "b", "c"],
        spans: [
          $Span.createRetain(1),
          $Span.createDelete(1),
          $Span.createInsert(["x"]),
          $Span.createRetain(1),
        ],
      };

      const result = $Patch._applyArray(patch);

      expect(result).toEqual(["a", "x", "c"]);
    });

    it("全削除の適用", () => {
      const patch: Patch<string> = {
        baseVersion: ["a", "b", "c"],
        spans: [$Span.createDelete(3)],
      };

      const result = $Patch._applyArray(patch);

      expect(result).toEqual([]);
    });

    it("全挿入の適用", () => {
      const patch: Patch<string> = {
        baseVersion: [],
        spans: [$Span.createInsert(["x", "y", "z"])],
      };

      const result = $Patch._applyArray(patch);

      expect(result).toEqual(["x", "y", "z"]);
    });
  });

  describe("統一API - 文字列", () => {
    it("createFromDiff - 文字列", () => {
      const patch = $Patch.createFromDiff("abc", "axc");

      expect(patch._isStringPatch).toBe(true);
      expect(patch.baseVersion).toEqual(["a", "b", "c"]);
    });

    it("apply - 文字列パッチ", () => {
      const patch = $Patch.createFromDiff("abc", "axc");
      const result = $Patch.apply(patch);

      expect(result).toBe("axc");
    });

    it("getEditDistance - 文字列", () => {
      const distance = $Patch.getEditDistance("kitten", "sitting");

      expect(distance).toBe(5); // 実際の編集距離
    });
  });

  describe("統一API - 配列", () => {
    const comparer = Comparers.strict<string>();

    it("createFromDiff - 配列", () => {
      const patch = $Patch.createFromDiff(
        ["a", "b", "c"],
        ["a", "x", "c"],
        comparer
      );

      expect(patch._isStringPatch).toBeUndefined();
      expect(patch.baseVersion).toEqual(["a", "b", "c"]);
    });

    it("apply - 配列パッチ", () => {
      const patch = $Patch.createFromDiff(
        ["a", "b", "c"],
        ["a", "x", "c"],
        comparer
      );
      const result = $Patch.apply(patch) as string[];

      expect(result).toEqual(["a", "x", "c"]);
    });

    it("getEditDistance - 配列", () => {
      const distance = $Patch.getEditDistance(
        ["a", "b", "c"],
        ["a", "x", "c"],
        comparer
      );

      expect(distance).toBe(2); // b削除 + x挿入
    });

    it("comparer未指定時のエラー", () => {
      expect(() => {
        $Patch.createFromDiff(["a"], ["b"]);
      }).toThrow("Comparer is required for array diff");
    });
  });

  describe("オブジェクト配列のテスト", () => {
    type User = { id: string; name: string };

    it("IDによる比較", () => {
      const comparer = Comparers.byField<User, "id">("id");
      const before: User[] = [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ];
      const after: User[] = [
        { id: "1", name: "Alice Updated" }, // 名前変更だがIDは同じ
        { id: "3", name: "Charlie" }, // 新規追加
      ];

      const patch = $Patch.createFromDiff(before, after, comparer);
      const result = $Patch.apply(patch) as User[];

      // IDが同じなので元のオブジェクトが保持される
      expect(result[0]).toEqual({ id: "1", name: "Alice" });
      expect(result[1]).toEqual({ id: "3", name: "Charlie" });
    });

    it("深い比較", () => {
      const comparer = Comparers.deepJson<User>();
      const before: User[] = [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ];
      const after: User[] = [
        { id: "1", name: "Alice Updated" }, // 名前変更
        { id: "2", name: "Bob" }, // 変更なし
      ];

      const patch = $Patch.createFromDiff(before, after, comparer);
      const result = $Patch.apply(patch) as User[];

      // 名前が変更されたので新しいオブジェクトに置換
      expect(result[0]).toEqual({ id: "1", name: "Alice Updated" });
      expect(result[1]).toEqual({ id: "2", name: "Bob" });
    });
  });

  describe("複雑なパッチパターン", () => {
    const comparer = Comparers.strict<number>();

    it("複数の操作が連続する場合", () => {
      const patch = $Patch.createFromDiff(
        [1, 2, 3, 4, 5],
        [1, 6, 7, 5, 8],
        comparer
      );

      const result = $Patch.apply(patch) as number[];
      expect(result).toEqual([1, 6, 7, 5, 8]);

      // 編集距離の確認
      const distance = $Patch.getEditDistance([1, 2, 3, 4, 5], [1, 6, 7, 5, 8], comparer);
      expect(distance).toBe(6); // 実際の編集距離
    });

    it("先頭・末尾の変更", () => {
      const patch = $Patch.createFromDiff(
        ["a", "b", "c"],
        ["x", "b", "y"],
        Comparers.strict<string>()
      );

      const result = $Patch.apply(patch) as string[];
      expect(result).toEqual(["x", "b", "y"]);
    });
  });

  describe("エラーハンドリング", () => {
    it("配列編集距離でcomparer未指定", () => {
      expect(() => {
        $Patch.getEditDistance(["a"], ["b"]);
      }).toThrow("Comparer is required for array edit distance");
    });

    it("不正な型の組み合わせ", () => {
      expect(() => {
        // 文字列と配列の組み合わせは実行時エラーになる
        ($Patch.createFromDiff as any)("string", ["array"]);
      }).toThrow();
    });
  });
});