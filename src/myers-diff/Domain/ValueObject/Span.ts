export type SpanDto = { r: number } | { d: number } | { i: string };

type SpanRetain = { type: "retain"; count: number };
type SpanDelete = { type: "delete"; count: number };
type SpanInsert = { type: "insert"; text: string };
export type Span = SpanRetain | SpanDelete | SpanInsert;

export const $Span = {
  isRetain(span: Span): span is SpanRetain {
    return span.type === "retain";
  },
  isDelete(span: Span): span is SpanDelete {
    return span.type === "delete";
  },
  isInsert(span: Span): span is SpanInsert {
    return span.type === "insert";
  },
  fromDto(dto: SpanDto): Span {
    if ("r" in dto) return { type: "retain", count: dto.r };
    if ("d" in dto) return { type: "delete", count: dto.d };
    if ("i" in dto) return { type: "insert", text: dto.i };
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