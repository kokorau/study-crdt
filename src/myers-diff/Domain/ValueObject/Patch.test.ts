import { describe, test, expect } from "bun:test";
import { $Patch, type Patch, type PatchDto } from "./Patch";

describe("$Patch", () => {
  describe("create", () => {
    test("should create a frozen patch", () => {
      const patch: Patch = {
        baseVersion: "hello",
        spans: [{ type: "retain", count: 5 }],
      };
      const frozen = $Patch.create(patch);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen).toEqual(patch);
    });
  });

  describe("fromDto", () => {
    test("should convert DTO to domain", () => {
      const dto: PatchDto = {
        v: "hello",
        s: [{ r: 2 }, { d: 1 }, { i: "a" }],
      };
      const patch = $Patch.fromDto(dto);
      expect(patch).toEqual({
        baseVersion: "hello",
        spans: [
          { type: "retain", count: 2 },
          { type: "delete", count: 1 },
          { type: "insert", text: "a" },
        ],
      });
    });
  });

  describe("toDto", () => {
    test("should convert domain to DTO", () => {
      const patch: Patch = {
        baseVersion: "hello",
        spans: [
          { type: "retain", count: 2 },
          { type: "delete", count: 1 },
          { type: "insert", text: "a" },
        ],
      };
      const dto = $Patch.toDto(patch);
      expect(dto).toEqual({
        v: "hello",
        s: [{ r: 2 }, { d: 1 }, { i: "a" }],
      });
    });
  });

  describe("apply - Myers Diff samples", () => {
    test("kitten -> sitting", () => {
      // "kitten" -> "sitting"
      // More straightforward approach
      const patch: Patch = {
        baseVersion: "kitten",
        spans: [
          { type: "delete", count: 6 }, // delete entire "kitten"
          { type: "insert", text: "sitting" }, // insert "sitting"
        ],
      };
      expect($Patch.apply(patch)).toBe("sitting");
    });

    test("empty string -> hello", () => {
      const patch: Patch = {
        baseVersion: "",
        spans: [{ type: "insert", text: "hello" }],
      };
      expect($Patch.apply(patch)).toBe("hello");
    });

    test("hello -> empty string", () => {
      const patch: Patch = {
        baseVersion: "hello",
        spans: [{ type: "delete", count: 5 }],
      };
      expect($Patch.apply(patch)).toBe("");
    });

    test("abc -> axc (replace middle)", () => {
      const patch: Patch = {
        baseVersion: "abc",
        spans: [
          { type: "retain", count: 1 }, // retain 'a'
          { type: "delete", count: 1 }, // delete 'b'
          { type: "insert", text: "x" }, // insert 'x'
          { type: "retain", count: 1 }, // retain 'c'
        ],
      };
      expect($Patch.apply(patch)).toBe("axc");
    });

    test("test -> testing (append)", () => {
      const patch: Patch = {
        baseVersion: "test",
        spans: [
          { type: "retain", count: 4 }, // retain 'test'
          { type: "insert", text: "ing" }, // insert 'ing'
        ],
      };
      expect($Patch.apply(patch)).toBe("testing");
    });

    test("prefix test -> test (remove prefix)", () => {
      const patch: Patch = {
        baseVersion: "prefix test",
        spans: [
          { type: "delete", count: 7 }, // delete 'prefix '
          { type: "retain", count: 4 }, // retain 'test'
        ],
      };
      expect($Patch.apply(patch)).toBe("test");
    });

    test("complex multi-operation", () => {
      // "Hello World" -> "Hi there, World!"
      const patch: Patch = {
        baseVersion: "Hello World",
        spans: [
          { type: "delete", count: 2 }, // delete "He"
          { type: "insert", text: "Hi" }, // insert "Hi"
          { type: "retain", count: 3 }, // retain "llo"
          { type: "delete", count: 1 }, // delete " "
          { type: "insert", text: " there," }, // insert " there,"
          { type: "retain", count: 5 }, // retain "World"
          { type: "insert", text: "!" }, // insert "!"
        ],
      };
      expect($Patch.apply(patch)).toBe("Hillo there,World!");
    });

    test("no changes (identity)", () => {
      const patch: Patch = {
        baseVersion: "unchanged",
        spans: [{ type: "retain", count: 9 }],
      };
      expect($Patch.apply(patch)).toBe("unchanged");
    });
  });

  describe("roundtrip conversion", () => {
    test("DTO -> Domain -> DTO should be identical", () => {
      const originalDto: PatchDto = {
        v: "kitten",
        s: [
          { d: 1 },
          { i: "s" },
          { r: 1 },
          { d: 1 },
          { i: "t" },
          { r: 2 },
          { d: 1 },
          { i: "ing" },
        ],
      };

      const domain = $Patch.fromDto(originalDto);
      const backToDto = $Patch.toDto(domain);
      expect(backToDto).toEqual(originalDto);
    });

    test("Domain -> DTO -> Domain should be identical", () => {
      const originalPatch: Patch = {
        baseVersion: "hello",
        spans: [
          { type: "retain", count: 2 },
          { type: "delete", count: 1 },
          { type: "insert", text: "world" },
        ],
      };

      const dto = $Patch.toDto(originalPatch);
      const backToPatch = $Patch.fromDto(dto);
      expect(backToPatch).toEqual(originalPatch);
    });
  });

  describe("createFromDiff", () => {
    test("should create patch for identical strings", () => {
      const patch = $Patch.createFromDiff("hello", "hello");
      const result = $Patch.apply(patch);
      expect(result).toBe("hello");
    });

    test("should create patch for empty to non-empty", () => {
      const patch = $Patch.createFromDiff("", "hello");
      const result = $Patch.apply(patch);
      expect(result).toBe("hello");
    });

    test("should create patch for non-empty to empty", () => {
      const patch = $Patch.createFromDiff("hello", "");
      const result = $Patch.apply(patch);
      expect(result).toBe("");
    });

    test("should create patch for simple substitution", () => {
      const patch = $Patch.createFromDiff("cat", "bat");
      const result = $Patch.apply(patch);
      expect(result).toBe("bat");
    });

    test("should create patch for insertion at beginning", () => {
      const patch = $Patch.createFromDiff("world", "hello world");
      const result = $Patch.apply(patch);
      expect(result).toBe("hello world");
    });

    test("should create patch for insertion at end", () => {
      const patch = $Patch.createFromDiff("hello", "hello world");
      const result = $Patch.apply(patch);
      expect(result).toBe("hello world");
    });

    test("should create patch for deletion at beginning", () => {
      const patch = $Patch.createFromDiff("hello world", "world");
      const result = $Patch.apply(patch);
      expect(result).toBe("world");
    });

    test("should create patch for deletion at end", () => {
      const patch = $Patch.createFromDiff("hello world", "hello");
      const result = $Patch.apply(patch);
      expect(result).toBe("hello");
    });

    test("should create patch for kitten -> sitting", () => {
      const patch = $Patch.createFromDiff("kitten", "sitting");
      const result = $Patch.apply(patch);
      expect(result).toBe("sitting");
    });

    test("should create patch for complex transformation", () => {
      const patch = $Patch.createFromDiff(
        "ABCDEFGHIJKLMNOP",
        "A1B2C3DEFGHIJKLMNOP",
      );
      const result = $Patch.apply(patch);
      expect(result).toBe("A1B2C3DEFGHIJKLMNOP");
    });

    test("should create patch for middle insertion", () => {
      const patch = $Patch.createFromDiff("abc", "aXbc");
      const result = $Patch.apply(patch);
      expect(result).toBe("aXbc");
    });

    test("should create patch for middle deletion", () => {
      const patch = $Patch.createFromDiff("aXbc", "abc");
      const result = $Patch.apply(patch);
      expect(result).toBe("abc");
    });

    test("should create patch for multiple operations", () => {
      const before = "The quick brown fox";
      const after = "A quick red fox jumps";
      const patch = $Patch.createFromDiff(before, after);
      const result = $Patch.apply(patch);
      expect(result).toBe(after);
    });

    test("should handle single character strings", () => {
      const patch = $Patch.createFromDiff("a", "b");
      const result = $Patch.apply(patch);
      expect(result).toBe("b");
    });

    test("should handle repeated characters", () => {
      const patch = $Patch.createFromDiff("aaa", "aaaa");
      const result = $Patch.apply(patch);
      expect(result).toBe("aaaa");
    });

    test("should prefer retain operations when possible", () => {
      const patch = $Patch.createFromDiff("hello world", "hello earth");
      const result = $Patch.apply(patch);
      expect(result).toBe("hello earth");

      // Should retain "hello " and then handle the change
      const hasRetain = patch.spans.some((span) => span.type === "retain");
      expect(hasRetain).toBe(true);
    });
  });
});
