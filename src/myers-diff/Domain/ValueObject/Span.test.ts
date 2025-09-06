import { describe, test, expect } from "bun:test";
import { $Span, type Span, type SpanDto } from "./Span";

describe("$Span", () => {
  describe("type guards", () => {
    test("isRetain should identify retain spans", () => {
      const span: Span = { type: "retain", count: 5 };
      expect($Span.isRetain(span)).toBe(true);
      expect($Span.isDelete(span)).toBe(false);
      expect($Span.isInsert(span)).toBe(false);
    });

    test("isDelete should identify delete spans", () => {
      const span: Span = { type: "delete", count: 3 };
      expect($Span.isDelete(span)).toBe(true);
      expect($Span.isRetain(span)).toBe(false);
      expect($Span.isInsert(span)).toBe(false);
    });

    test("isInsert should identify insert spans", () => {
      const span: Span = { type: "insert", text: "hello" };
      expect($Span.isInsert(span)).toBe(true);
      expect($Span.isRetain(span)).toBe(false);
      expect($Span.isDelete(span)).toBe(false);
    });
  });

  describe("fromDto", () => {
    test("should convert retain DTO to domain", () => {
      const dto: SpanDto = { r: 5 };
      const span = $Span.fromDto(dto);
      expect(span).toEqual({ type: "retain", count: 5 });
    });

    test("should convert delete DTO to domain", () => {
      const dto: SpanDto = { d: 3 };
      const span = $Span.fromDto(dto);
      expect(span).toEqual({ type: "delete", count: 3 });
    });

    test("should convert insert DTO to domain", () => {
      const dto: SpanDto = { i: "hello" };
      const span = $Span.fromDto(dto);
      expect(span).toEqual({ type: "insert", text: "hello" });
    });

    test("should throw error for invalid DTO", () => {
      expect(() => $Span.fromDto({} as SpanDto)).toThrow("Invalid span DTO");
    });
  });

  describe("toDto", () => {
    test("should convert retain domain to DTO", () => {
      const span: Span = { type: "retain", count: 5 };
      const dto = $Span.toDto(span);
      expect(dto).toEqual({ r: 5 });
    });

    test("should convert delete domain to DTO", () => {
      const span: Span = { type: "delete", count: 3 };
      const dto = $Span.toDto(span);
      expect(dto).toEqual({ d: 3 });
    });

    test("should convert insert domain to DTO", () => {
      const span: Span = { type: "insert", text: "hello" };
      const dto = $Span.toDto(span);
      expect(dto).toEqual({ i: "hello" });
    });
  });

  describe("roundtrip conversion", () => {
    test("DTO -> Domain -> DTO should be identical", () => {
      const originalDtos: SpanDto[] = [
        { r: 5 },
        { d: 3 },
        { i: "hello" }
      ];

      originalDtos.forEach(dto => {
        const domain = $Span.fromDto(dto);
        const backToDto = $Span.toDto(domain);
        expect(backToDto).toEqual(dto);
      });
    });

    test("Domain -> DTO -> Domain should be identical", () => {
      const originalSpans: Span[] = [
        { type: "retain", count: 5 },
        { type: "delete", count: 3 },
        { type: "insert", text: "hello" }
      ];

      originalSpans.forEach(span => {
        const dto = $Span.toDto(span);
        const backToSpan = $Span.fromDto(dto);
        expect(backToSpan).toEqual(span);
      });
    });
  });
});