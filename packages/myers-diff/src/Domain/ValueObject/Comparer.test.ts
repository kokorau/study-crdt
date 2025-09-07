import { describe, it, expect } from "bun:test";
import { Comparers, type EqualityComparer } from "./Comparer";

describe("Comparers", () => {
  describe("strict", () => {
    it("プリミティブ値の厳密比較", () => {
      const comparer = Comparers.strict<string>();
      
      expect(comparer.equals("hello", "hello")).toBe(true);
      expect(comparer.equals("hello", "world")).toBe(false);
      expect(comparer.equals("", "")).toBe(true);
    });

    it("数値の厳密比較", () => {
      const comparer = Comparers.strict<number>();
      
      expect(comparer.equals(42, 42)).toBe(true);
      expect(comparer.equals(42, 43)).toBe(false);
      expect(comparer.equals(0, 0)).toBe(true);
      expect(comparer.equals(NaN, NaN)).toBe(false); // NaN !== NaN
    });

    it("hash関数", () => {
      const comparer = Comparers.strict<string>();
      
      expect(comparer.hash?.("hello")).toBe("hello");
      expect(comparer.hash?.("world")).toBe("world");
      expect(comparer.hash?.("")).toBe("");
    });

    it("null/undefinedの比較", () => {
      const comparer = Comparers.strict<string | null>();
      
      expect(comparer.equals(null, null)).toBe(true);
      expect(comparer.equals(undefined, undefined)).toBe(true);
      expect(comparer.equals(null, undefined)).toBe(false);
      expect(comparer.equals("hello", null)).toBe(false);
    });
  });

  describe("deepJson", () => {
    type TestObject = { id: string; value: number; nested?: { prop: string } };

    it("オブジェクトの深い比較", () => {
      const comparer = Comparers.deepJson<TestObject>();
      
      const obj1 = { id: "1", value: 42 };
      const obj2 = { id: "1", value: 42 };
      const obj3 = { id: "1", value: 43 };
      
      expect(comparer.equals(obj1, obj2)).toBe(true);
      expect(comparer.equals(obj1, obj3)).toBe(false);
    });

    it("ネストしたオブジェクトの比較", () => {
      const comparer = Comparers.deepJson<TestObject>();
      
      const obj1 = { id: "1", value: 42, nested: { prop: "test" } };
      const obj2 = { id: "1", value: 42, nested: { prop: "test" } };
      const obj3 = { id: "1", value: 42, nested: { prop: "different" } };
      
      expect(comparer.equals(obj1, obj2)).toBe(true);
      expect(comparer.equals(obj1, obj3)).toBe(false);
    });

    it("配列の比較", () => {
      const comparer = Comparers.deepJson<number[]>();
      
      expect(comparer.equals([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(comparer.equals([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(comparer.equals([], [])).toBe(true);
    });

    it("hash関数", () => {
      const comparer = Comparers.deepJson<TestObject>();
      
      const obj = { id: "1", value: 42 };
      expect(comparer.hash?.(obj)).toBe(JSON.stringify(obj));
    });

    it("循環参照の処理", () => {
      const comparer = Comparers.deepJson<any>();
      
      const obj1: any = { id: "1" };
      obj1.self = obj1;
      
      const obj2: any = { id: "1" };
      obj2.self = obj2;
      
      // 循環参照はJSONでエラーになるのでfalseを返すべき
      expect(comparer.equals(obj1, obj2)).toBe(false);
      expect(comparer.hash?.(obj1)).toBe("[object Object]"); // fallback to String(item)
    });
  });

  describe("byField", () => {
    type User = { id: string; name: string; age: number };

    it("指定フィールドによる比較", () => {
      const comparer = Comparers.byField<User, "id">("id");
      
      const user1 = { id: "1", name: "Alice", age: 25 };
      const user2 = { id: "1", name: "Bob", age: 30 };
      const user3 = { id: "2", name: "Alice", age: 25 };
      
      expect(comparer.equals(user1, user2)).toBe(true); // 名前・年齢が違ってもIDが同じ
      expect(comparer.equals(user1, user3)).toBe(false); // IDが違う
    });

    it("null/undefinedの処理", () => {
      const comparer = Comparers.byField<User | null, "id">("id");
      
      const user = { id: "1", name: "Alice", age: 25 };
      
      expect(comparer.equals(null, null)).toBe(true);
      expect(comparer.equals(undefined, undefined)).toBe(true);
      expect(comparer.equals(null, undefined)).toBe(false);
      expect(comparer.equals(user, null)).toBe(false);
    });

    it("hash関数", () => {
      const comparer = Comparers.byField<User, "id">("id");
      
      const user = { id: "user123", name: "Alice", age: 25 };
      expect(comparer.hash?.(user)).toBe("user123");
      
      expect(comparer.hash?.(null as any)).toBe("null");
    });

    it("数値フィールドの比較", () => {
      const comparer = Comparers.byField<User, "age">("age");
      
      const user1 = { id: "1", name: "Alice", age: 25 };
      const user2 = { id: "2", name: "Bob", age: 25 };
      const user3 = { id: "1", name: "Alice", age: 30 };
      
      expect(comparer.equals(user1, user2)).toBe(true); // 年齢が同じ
      expect(comparer.equals(user1, user3)).toBe(false); // 年齢が違う
    });
  });

  describe("byFields", () => {
    type Person = { firstName: string; lastName: string; age: number; email: string };

    it("複数フィールドによる比較", () => {
      const comparer = Comparers.byFields<Person>("firstName", "lastName");
      
      const person1 = { firstName: "John", lastName: "Doe", age: 30, email: "john@example.com" };
      const person2 = { firstName: "John", lastName: "Doe", age: 25, email: "john.doe@example.com" };
      const person3 = { firstName: "Jane", lastName: "Doe", age: 30, email: "john@example.com" };
      
      expect(comparer.equals(person1, person2)).toBe(true); // 名前が同じ
      expect(comparer.equals(person1, person3)).toBe(false); // firstName が違う
    });

    it("空のフィールド配列", () => {
      const comparer = Comparers.byFields<Person>();
      
      const person1 = { firstName: "John", lastName: "Doe", age: 30, email: "john@example.com" };
      const person2 = { firstName: "Jane", lastName: "Smith", age: 25, email: "jane@example.com" };
      
      expect(comparer.equals(person1, person2)).toBe(true); // 比較フィールドがないので常にtrue
    });

    it("null/undefinedの処理", () => {
      const comparer = Comparers.byFields<Person | null>("firstName", "lastName");
      
      const person = { firstName: "John", lastName: "Doe", age: 30, email: "john@example.com" };
      
      expect(comparer.equals(null, null)).toBe(true);
      expect(comparer.equals(person, null)).toBe(false);
    });

    it("hash関数", () => {
      const comparer = Comparers.byFields<Person>("firstName", "lastName");
      
      const person = { firstName: "John", lastName: "Doe", age: 30, email: "john@example.com" };
      expect(comparer.hash?.(person)).toBe("John|Doe");
      
      expect(comparer.hash?.(null as any)).toBe("null");
    });

    it("1つのフィールドでの比較", () => {
      const comparer = Comparers.byFields<Person>("email");
      
      const person1 = { firstName: "John", lastName: "Doe", age: 30, email: "john@example.com" };
      const person2 = { firstName: "Jane", lastName: "Smith", age: 25, email: "john@example.com" };
      const person3 = { firstName: "John", lastName: "Doe", age: 30, email: "different@example.com" };
      
      expect(comparer.equals(person1, person2)).toBe(true); // メールが同じ
      expect(comparer.equals(person1, person3)).toBe(false); // メールが違う
    });
  });

  describe("custom", () => {
    type Task = { id: string; title: string; priority: number; tags: string[] };

    it("カスタム比較関数", () => {
      const comparer = Comparers.custom<Task>(
        (a, b) => a.id === b.id && a.priority === b.priority,
        (item) => `${item.id}:${item.priority}`
      );
      
      const task1 = { id: "1", title: "Task 1", priority: 1, tags: ["urgent"] };
      const task2 = { id: "1", title: "Different Title", priority: 1, tags: ["normal"] };
      const task3 = { id: "1", title: "Task 1", priority: 2, tags: ["urgent"] };
      
      expect(comparer.equals(task1, task2)).toBe(true); // IDと優先度が同じ
      expect(comparer.equals(task1, task3)).toBe(false); // 優先度が違う
    });

    it("カスタムhash関数", () => {
      const comparer = Comparers.custom<Task>(
        (a, b) => a.id === b.id,
        (item) => `task-${item.id}`
      );
      
      const task = { id: "123", title: "Test", priority: 1, tags: [] };
      expect(comparer.hash?.(task)).toBe("task-123");
    });

    it("hash関数未指定の場合のデフォルト", () => {
      const comparer = Comparers.custom<string>(
        (a, b) => a.toLowerCase() === b.toLowerCase()
      );
      
      expect(comparer.equals("Hello", "HELLO")).toBe(true);
      expect(comparer.hash?.("Hello")).toBe("Hello"); // デフォルトはString(item)
    });

    it("複雑なカスタム比較ロジック", () => {
      const comparer = Comparers.custom<Task>(
        (a, b) => {
          // タイトルの長さと優先度で比較
          return a.title.length === b.title.length && a.priority === b.priority;
        }
      );
      
      const task1 = { id: "1", title: "Short", priority: 1, tags: [] };
      const task2 = { id: "2", title: "Brief", priority: 1, tags: [] }; // 同じ長さ
      const task3 = { id: "3", title: "Very Long Title", priority: 1, tags: [] }; // 違う長さ
      
      expect(comparer.equals(task1, task2)).toBe(true); // タイトル長さと優先度が同じ
      expect(comparer.equals(task1, task3)).toBe(false); // タイトル長さが違う
    });
  });

  describe("auto", () => {
    it("プリミティブ値の自動比較", () => {
      const comparer = Comparers.auto<string | number | boolean>();
      
      expect(comparer.equals("hello", "hello")).toBe(true);
      expect(comparer.equals("hello", "world")).toBe(false);
      expect(comparer.equals(42, 42)).toBe(true);
      expect(comparer.equals(42, 43)).toBe(false);
      expect(comparer.equals(true, true)).toBe(true);
      expect(comparer.equals(true, false)).toBe(false);
    });

    it("null/undefinedの処理", () => {
      const comparer = Comparers.auto<string | null | undefined>();
      
      expect(comparer.equals(null, null)).toBe(true);
      expect(comparer.equals(undefined, undefined)).toBe(true);
      expect(comparer.equals(null, undefined)).toBe(false);
      expect(comparer.equals("hello", null)).toBe(false);
      expect(comparer.equals("hello", undefined)).toBe(false);
    });

    it("配列の自動比較", () => {
      const comparer = Comparers.auto<number[]>();
      
      expect(comparer.equals([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(comparer.equals([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(comparer.equals([], [])).toBe(true);
      expect(comparer.equals([1, 2], [1, 2, 3])).toBe(false); // 長さが違う
    });

    it("ネストした配列の比較", () => {
      const comparer = Comparers.auto<number[][]>();
      
      expect(comparer.equals([[1, 2], [3, 4]], [[1, 2], [3, 4]])).toBe(true);
      expect(comparer.equals([[1, 2], [3, 4]], [[1, 2], [3, 5]])).toBe(false);
    });

    it("オブジェクトの自動比較", () => {
      const comparer = Comparers.auto<{ id: string; value: number }>();
      
      const obj1 = { id: "1", value: 42 };
      const obj2 = { id: "1", value: 42 };
      const obj3 = { id: "1", value: 43 };
      
      expect(comparer.equals(obj1, obj2)).toBe(true);
      expect(comparer.equals(obj1, obj3)).toBe(false);
    });

    it("混在型の自動比較", () => {
      const comparer = Comparers.auto<string | number | { id: string }>();
      
      expect(comparer.equals("hello", "hello")).toBe(true);
      expect(comparer.equals(42, 42)).toBe(true);
      expect(comparer.equals({ id: "1" }, { id: "1" })).toBe(true);
      expect(comparer.equals("hello", 42)).toBe(false);
      expect(comparer.equals("hello", { id: "1" })).toBe(false);
    });

    it("hash関数", () => {
      const comparer = Comparers.auto<string | number | object>();
      
      expect(comparer.hash?.("hello")).toBe("hello");
      expect(comparer.hash?.(42)).toBe("42");
      expect(comparer.hash?.(null)).toBe("null");
      expect(comparer.hash?.({ id: "1" })).toBe('{"id":"1"}');
    });

    it("循環参照の処理", () => {
      const comparer = Comparers.auto<any>();
      
      const obj: any = { id: "1" };
      obj.self = obj;
      
      expect(comparer.equals(obj, obj)).toBe(false); // 循環参照はJSONでエラー
      expect(comparer.hash?.(obj)).toBe("[object Object]"); // fallback
    });
  });

  describe("型安全性", () => {
    it("型パラメータが正しく推論される", () => {
      type User = { id: string; name: string };
      
      // 型エラーにならないことを確認
      const comparer1: EqualityComparer<User> = Comparers.byField<User, "id">("id");
      const comparer2: EqualityComparer<User> = Comparers.byFields<User>("id", "name");
      const comparer3: EqualityComparer<User> = Comparers.deepJson<User>();
      const comparer4: EqualityComparer<User> = Comparers.strict<User>();
      const comparer5: EqualityComparer<User> = Comparers.auto<User>();
      const comparer6: EqualityComparer<User> = Comparers.custom<User>(
        (a, b) => a.id === b.id
      );

      // 実際の使用例
      const user1 = { id: "1", name: "Alice" };
      const user2 = { id: "1", name: "Bob" };
      
      expect(comparer1.equals(user1, user2)).toBe(true);
      expect(comparer2.equals(user1, user2)).toBe(false);
      expect(comparer3.equals(user1, user2)).toBe(false);
      expect(comparer4.equals(user1, user2)).toBe(false);
      expect(comparer5.equals(user1, user2)).toBe(false);
      expect(comparer6.equals(user1, user2)).toBe(true);
    });
  });

  describe("エラーケース", () => {
    it("予期しない値での比較", () => {
      const comparer = Comparers.strict<any>();
      
      expect(comparer.equals(Symbol("a"), Symbol("a"))).toBe(false); // Symbol は === で false
      expect(comparer.equals(BigInt(123), BigInt(123))).toBe(true);
      expect(comparer.equals(new Date("2023-01-01"), new Date("2023-01-01"))).toBe(false); // 異なるオブジェクト
    });

    it("deepJsonでシリアライズできないオブジェクト", () => {
      const comparer = Comparers.deepJson<any>();
      
      const withFunction = { id: "1", fn: () => {} };
      const withSymbol = { id: "1", sym: Symbol("test") };
      
      // 関数やSymbolを含むオブジェクトは正しく処理される
      expect(comparer.equals(withFunction, withFunction)).toBe(true); // 同じ参照
      expect(comparer.equals(withSymbol, withSymbol)).toBe(true); // 同じ参照
    });
  });
});