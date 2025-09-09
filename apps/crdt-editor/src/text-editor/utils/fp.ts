/**
 * Functional Programming Utilities
 */

// Result型
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export function ok<T, E = Error>(value: T): Result<T, E> {
  return {
    ok: true,
    value,
  } as Result<T, E>
}

export const err = <E = Error>(error: E): Result<never, E> => ({
  ok: false,
  error,
})

// Option型
export type Option<T> =
  | { readonly some: true; readonly value: T }
  | { readonly some: false }

export const some = <T>(value: T): Option<T> => ({
  some: true,
  value,
})

export const none = (): Option<never> => ({
  some: false,
})

// パイプライン関数
export const pipe = <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T =>
    fns.reduce((acc, fn) => fn(acc), value)

// 関数合成
export const compose = <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T =>
    fns.reduceRight((acc, fn) => fn(acc), value)

// メモ化
export const memoize = <Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  keyGenerator?: (...args: Args) => string
): ((...args: Args) => Result) => {
  const cache = new Map<string, Result>()
  
  return (...args: Args): Result => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

// カリー化
export const curry = <Args extends unknown[], Result>(
  fn: (...args: Args) => Result
) => {
  const curried = (...args: unknown[]): unknown => {
    if (args.length >= fn.length) {
      return fn(...(args as Args))
    }
    return (...nextArgs: unknown[]) => curried(...args, ...nextArgs)
  }
  return curried as unknown
}

// Result型のmap関数
export const mapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  if (result.ok) {
    return ok(fn(result.value))
  }
  return result
}

// Result型のflatMap関数
export const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  if (result.ok) {
    return fn(result.value)
  }
  return result
}

// Option型のmap関数
export const mapOption = <T, U>(
  option: Option<T>,
  fn: (value: T) => U
): Option<U> => {
  if (option.some) {
    return some(fn(option.value))
  }
  return option
}

// Option型のflatMap関数
export const flatMapOption = <T, U>(
  option: Option<T>,
  fn: (value: T) => Option<U>
): Option<U> => {
  if (option.some) {
    return fn(option.value)
  }
  return option
}

// Option型のgetOrElse関数
export const getOrElse = <T>(
  option: Option<T>,
  defaultValue: T
): T => {
  if (option.some) {
    return option.value
  }
  return defaultValue
}

// Result型のgetOrElse関数
export const getResultOrElse = <T, E>(
  result: Result<T, E>,
  defaultValue: T
): T => {
  if (result.ok) {
    return result.value
  }
  return defaultValue
}

// 非同期Result型
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>

// 非同期Result型のmap関数
export const mapAsyncResult = async <T, U, E>(
  asyncResult: AsyncResult<T, E>,
  fn: (value: T) => U | Promise<U>
): AsyncResult<U, E> => {
  const result = await asyncResult
  if (result.ok) {
    const value = await fn(result.value)
    return ok(value)
  }
  return result
}

// 非同期Result型のflatMap関数
export const flatMapAsyncResult = async <T, U, E>(
  asyncResult: AsyncResult<T, E>,
  fn: (value: T) => AsyncResult<U, E>
): AsyncResult<U, E> => {
  const result = await asyncResult
  if (result.ok) {
    return fn(result.value)
  }
  return result
}

// UUID生成（簡易版）
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 配列のimmutableな更新
export const updateAt = <T>(
  array: readonly T[],
  index: number,
  updater: (item: T) => T
): readonly T[] => {
  if (index < 0 || index >= array.length) {
    return array
  }
  return array.map((item, i) => (i === index ? updater(item) : item))
}

// 配列のimmutableな削除
export const removeAt = <T>(
  array: readonly T[],
  index: number
): readonly T[] => {
  if (index < 0 || index >= array.length) {
    return array
  }
  return [...array.slice(0, index), ...array.slice(index + 1)]
}

// 配列のimmutableな挿入
export const insertAt = <T>(
  array: readonly T[],
  index: number,
  item: T
): readonly T[] => {
  if (index < 0 || index > array.length) {
    return array
  }
  return [...array.slice(0, index), item, ...array.slice(index)]
}

// 配列の移動
export const moveItem = <T>(
  array: readonly T[],
  fromIndex: number,
  toIndex: number
): readonly T[] => {
  if (
    fromIndex < 0 ||
    fromIndex >= array.length ||
    toIndex < 0 ||
    toIndex >= array.length
  ) {
    return array
  }
  
  const result = [...array]
  const [item] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, item)
  return result
}

// タイムスタンプ生成
export const timestamp = (): Date => new Date()

// デバウンス
export const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
): ((...args: Args) => void) => {
  let timeoutId: number | undefined
  
  return (...args: Args): void => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => fn(...args), delay)
  }
}

// スロットル
export const throttle = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
): ((...args: Args) => void) => {
  let lastTime = 0
  let timeoutId: number | undefined
  
  return (...args: Args): void => {
    const now = Date.now()
    
    if (now - lastTime >= delay) {
      fn(...args)
      lastTime = now
    } else {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
      timeoutId = window.setTimeout(() => {
        fn(...args)
        lastTime = Date.now()
      }, delay - (now - lastTime))
    }
  }
}