/**
 * 要素比較のための戦略インターフェース
 */
export interface EqualityComparer<T> {
  equals(a: T, b: T): boolean;
  hash?(item: T): string | number;
}

/**
 * 基本的な比較戦略の実装
 */
export const Comparers = {
  /**
   * プリミティブ値の厳密等価比較
   */
  strict<T>(): EqualityComparer<T> {
    return {
      equals: (a: T, b: T) => a === b,
      hash: (item: T) => String(item),
    };
  },

  /**
   * JSON文字列化による深い比較（オブジェクト用）
   */
  deepJson<T>(): EqualityComparer<T> {
    return {
      equals: (a: T, b: T) => {
        try {
          return JSON.stringify(a) === JSON.stringify(b);
        } catch {
          return false;
        }
      },
      hash: (item: T) => {
        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      },
    };
  },

  /**
   * オブジェクトの特定フィールドによる比較
   */
  byField<T, K extends keyof T>(field: K): EqualityComparer<T> {
    return {
      equals: (a: T, b: T) => {
        if (a == null || b == null) return a === b;
        return a[field] === b[field];
      },
      hash: (item: T) => {
        if (item == null) return "null";
        return String(item[field]);
      },
    };
  },

  /**
   * オブジェクトの複数フィールドによる比較
   */
  byFields<T>(...fields: (keyof T)[]): EqualityComparer<T> {
    return {
      equals: (a: T, b: T) => {
        if (a == null || b == null) return a === b;
        return fields.every(field => a[field] === b[field]);
      },
      hash: (item: T) => {
        if (item == null) return "null";
        return fields.map(field => String(item[field])).join("|");
      },
    };
  },

  /**
   * カスタム比較関数による比較
   */
  custom<T>(equalsFn: (a: T, b: T) => boolean, hashFn?: (item: T) => string | number): EqualityComparer<T> {
    return {
      equals: equalsFn,
      hash: hashFn || ((item: T) => String(item)),
    };
  },

  /**
   * 型に応じた自動比較戦略選択
   */
  auto<T>(): EqualityComparer<T> {
    return {
      equals: (a: T, b: T) => {
        // null/undefined の場合
        if (a == null || b == null) return a === b;
        
        // プリミティブ型の場合
        if (typeof a !== "object" || typeof b !== "object") {
          return a === b;
        }
        
        // 配列の場合
        if (Array.isArray(a) && Array.isArray(b)) {
          if (a.length !== b.length) return false;
          return a.every((item, index) => {
            const autoComparer = Comparers.auto();
            return autoComparer.equals(item, b[index]);
          });
        }
        
        // オブジェクトの場合（深い比較）
        try {
          return JSON.stringify(a) === JSON.stringify(b);
        } catch {
          return false;
        }
      },
      hash: (item: T) => {
        if (item == null) return "null";
        if (typeof item !== "object") return String(item);
        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      },
    };
  },
};

/**
 * 使用例:
 * 
 * // 文字列配列の比較
 * const stringComparer = Comparers.strict<string>();
 * 
 * // オブジェクト配列をIDで比較
 * const idComparer = Comparers.byField<{id: string, name: string}>('id');
 * 
 * // 複合条件での比較
 * const multiComparer = Comparers.byFields<User>('id', 'email');
 * 
 * // カスタム比較ロジック
 * const customComparer = Comparers.custom<MyType>(
 *   (a, b) => a.value === b.value && a.type === b.type,
 *   (item) => `${item.value}-${item.type}`
 * );
 * 
 * // 自動判定
 * const autoComparer = Comparers.auto<any>();
 */