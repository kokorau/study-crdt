export type SpanDto = { r: number } | { d: number } | { i: string };

type SpanRetain = { type: "retain"; count: number };
type SpanDelete = { type: "delete"; count: number };
type SpanInsert = { type: "insert"; text: string };
export type Span = SpanRetain | SpanDelete | SpanInsert;

export const $Span = {
  createRetain(count: number): Readonly<SpanRetain> {
    return Object.freeze({ type: "retain", count });
  },
  createDelete(count: number): Readonly<SpanDelete> {
    return Object.freeze({ type: "delete", count });
  },
  createInsert(text: string): Readonly<SpanInsert> {
    return Object.freeze({ type: "insert", text });
  },
  isRetain(span: Span): span is SpanRetain {
    return span.type === "retain";
  },
  isDelete(span: Span): span is SpanDelete {
    return span.type === "delete";
  },
  isInsert(span: Span): span is SpanInsert {
    return span.type === "insert";
  },
  fromDto(dto: SpanDto): Readonly<Span> {
    if ("r" in dto) return $Span.createRetain(dto.r);
    if ("d" in dto) return $Span.createDelete(dto.d);
    if ("i" in dto) return $Span.createInsert(dto.i);
    throw new Error("Invalid span DTO");
  },
  toDto(span: Span): SpanDto {
    switch (span.type) {
      case "retain":
        return { r: span.count };
      case "delete":
        return { d: span.count };
      case "insert":
        return { i: span.text };
    }
  },
};