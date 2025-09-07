/**
 * Span操作の定義
 */
export type SpanDto<T> = 
  | { r: number }           // retain
  | { d: number }           // delete  
  | { i: T[] };             // insert

type SpanRetain = { type: "retain"; count: number };
type SpanDelete = { type: "delete"; count: number };
type SpanInsert<T> = { type: "insert"; items: T[] };

export type Span<T> = SpanRetain | SpanDelete | SpanInsert<T>;

export const $Span = {
  createRetain(count: number): Readonly<SpanRetain> {
    return Object.freeze({ type: "retain", count });
  },

  createDelete(count: number): Readonly<SpanDelete> {
    return Object.freeze({ type: "delete", count });
  },

  createInsert<T>(items: T[]): Readonly<SpanInsert<T>> {
    return Object.freeze({ type: "insert", items: [...items] });
  },

  isRetain<T>(span: Span<T>): span is SpanRetain {
    return span.type === "retain";
  },

  isDelete<T>(span: Span<T>): span is SpanDelete {
    return span.type === "delete";
  },

  isInsert<T>(span: Span<T>): span is SpanInsert<T> {
    return span.type === "insert";
  },

  fromDto<T>(dto: SpanDto<T>): Readonly<Span<T>> {
    if ("r" in dto) return $Span.createRetain(dto.r);
    if ("d" in dto) return $Span.createDelete(dto.d);
    if ("i" in dto) return $Span.createInsert(dto.i);
    throw new Error("Invalid span DTO");
  },

  toDto<T>(span: Span<T>): SpanDto<T> {
    switch (span.type) {
      case "retain":
        return { r: span.count };
      case "delete":
        return { d: span.count };
      case "insert":
        return { i: [...span.items] };
    }
  },
};