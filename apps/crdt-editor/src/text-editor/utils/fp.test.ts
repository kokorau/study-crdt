import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Result } from './fp'
import {
  ok,
  err,
  some,
  none,
  pipe,
  compose,
  memoize,
  mapResult,
  flatMapResult,
  mapOption,
  flatMapOption,
  getOrElse,
  getResultOrElse,
  updateAt,
  removeAt,
  insertAt,
  moveItem,
  debounce,
  throttle,
} from './fp'

describe('FP Utilities', () => {
  describe('Result type', () => {
    it('should create success result', () => {
      const result = ok(42)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(42)
      }
    })

    it('should create error result', () => {
      const error = new Error('Something went wrong')
      const result = err(error)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe(error)
      }
    })

    it('should map success result', () => {
      const result = ok(10)
      const mapped = mapResult(result, (x: number) => x * 2)
      expect(mapped.ok).toBe(true)
      if (mapped.ok) {
        expect(mapped.value).toBe(20)
      }
    })

    it('should not map error result', () => {
      const error = new Error('Error')
      const result = err(error) as Result<number, Error>
      const mapped = mapResult(result, (x: number) => x * 2)
      expect(mapped.ok).toBe(false)
      if (!mapped.ok) {
        expect(mapped.error).toBe(error)
      }
    })

    it('should flatMap success result', () => {
      const result = ok(10)
      const flatMapped = flatMapResult(result, x => ok(x * 2))
      expect(flatMapped.ok).toBe(true)
      if (flatMapped.ok) {
        expect(flatMapped.value).toBe(20)
      }
    })

    it('should handle flatMap with error result', () => {
      const result = ok(10)
      const error = new Error('Division by zero')
      const flatMapped = flatMapResult(result, () => err(error))
      expect(flatMapped.ok).toBe(false)
      if (!flatMapped.ok) {
        expect(flatMapped.error).toBe(error)
      }
    })

    it('should get value or else for success', () => {
      const result = ok(42)
      expect(getResultOrElse(result, 0)).toBe(42)
    })

    it('should get default value for error', () => {
      const result = err(new Error()) as Result<number, Error>
      expect(getResultOrElse(result, 0)).toBe(0)
    })
  })

  describe('Option type', () => {
    it('should create some option', () => {
      const option = some(42)
      expect(option.some).toBe(true)
      if (option.some) {
        expect(option.value).toBe(42)
      }
    })

    it('should create none option', () => {
      const option = none()
      expect(option.some).toBe(false)
    })

    it('should map some option', () => {
      const option = some(10)
      const mapped = mapOption(option, x => x * 2)
      expect(mapped.some).toBe(true)
      if (mapped.some) {
        expect(mapped.value).toBe(20)
      }
    })

    it('should not map none option', () => {
      const option = none()
      const mapped = mapOption(option, x => x * 2)
      expect(mapped.some).toBe(false)
    })

    it('should flatMap some option', () => {
      const option = some(10)
      const flatMapped = flatMapOption(option, x => some(x * 2))
      expect(flatMapped.some).toBe(true)
      if (flatMapped.some) {
        expect(flatMapped.value).toBe(20)
      }
    })

    it('should get value or else for some', () => {
      const option = some(42)
      expect(getOrElse(option, 0)).toBe(42)
    })

    it('should get default value for none', () => {
      const option = none()
      expect(getOrElse(option, 0)).toBe(0)
    })
  })

  describe('Function composition', () => {
    const add = (x: number) => x + 1
    const multiply = (x: number) => x * 2
    const subtract = (x: number) => x - 3

    it('should pipe functions left to right', () => {
      const result = pipe(add, multiply, subtract)(5)
      expect(result).toBe(9) // ((5 + 1) * 2) - 3 = 9
    })

    it('should compose functions right to left', () => {
      const result = compose(subtract, multiply, add)(5)
      expect(result).toBe(9) // ((5 + 1) * 2) - 3 = 9
    })
  })

  describe('Memoization', () => {
    it('should memoize function results', () => {
      const fn = vi.fn((x: number) => x * 2)
      const memoized = memoize(fn)

      expect(memoized(5)).toBe(10)
      expect(memoized(5)).toBe(10)
      expect(memoized(5)).toBe(10)
      expect(fn).toHaveBeenCalledTimes(1)

      expect(memoized(10)).toBe(20)
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should use custom key generator', () => {
      const fn = vi.fn((a: number, b: number) => a + b)
      const memoized = memoize(fn, (a, b) => `${a}-${b}`)

      expect(memoized(2, 3)).toBe(5)
      expect(memoized(2, 3)).toBe(5)
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Array utilities', () => {
    describe('updateAt', () => {
      it('should update element at index', () => {
        const arr = [1, 2, 3, 4, 5]
        const result = updateAt(arr, 2, x => x * 10)
        expect(result).toEqual([1, 2, 30, 4, 5])
        expect(arr).toEqual([1, 2, 3, 4, 5]) // Original unchanged
      })

      it('should return original array for invalid index', () => {
        const arr = [1, 2, 3]
        expect(updateAt(arr, -1, x => x * 10)).toEqual(arr)
        expect(updateAt(arr, 5, x => x * 10)).toEqual(arr)
      })
    })

    describe('removeAt', () => {
      it('should remove element at index', () => {
        const arr = [1, 2, 3, 4, 5]
        const result = removeAt(arr, 2)
        expect(result).toEqual([1, 2, 4, 5])
        expect(arr).toEqual([1, 2, 3, 4, 5]) // Original unchanged
      })

      it('should return original array for invalid index', () => {
        const arr = [1, 2, 3]
        expect(removeAt(arr, -1)).toEqual(arr)
        expect(removeAt(arr, 5)).toEqual(arr)
      })
    })

    describe('insertAt', () => {
      it('should insert element at index', () => {
        const arr = [1, 2, 4, 5]
        const result = insertAt(arr, 2, 3)
        expect(result).toEqual([1, 2, 3, 4, 5])
        expect(arr).toEqual([1, 2, 4, 5]) // Original unchanged
      })

      it('should insert at beginning', () => {
        const arr = [2, 3]
        expect(insertAt(arr, 0, 1)).toEqual([1, 2, 3])
      })

      it('should insert at end', () => {
        const arr = [1, 2]
        expect(insertAt(arr, 2, 3)).toEqual([1, 2, 3])
      })

      it('should return original array for invalid index', () => {
        const arr = [1, 2, 3]
        expect(insertAt(arr, -1, 0)).toEqual(arr)
        expect(insertAt(arr, 5, 0)).toEqual(arr)
      })
    })

    describe('moveItem', () => {
      it('should move item to new position', () => {
        const arr = [1, 2, 3, 4, 5]
        const result = moveItem(arr, 1, 3)
        expect(result).toEqual([1, 3, 4, 2, 5])
        expect(arr).toEqual([1, 2, 3, 4, 5]) // Original unchanged
      })

      it('should handle moving to beginning', () => {
        const arr = [1, 2, 3, 4]
        expect(moveItem(arr, 3, 0)).toEqual([4, 1, 2, 3])
      })

      it('should handle moving to end', () => {
        const arr = [1, 2, 3, 4]
        expect(moveItem(arr, 0, 3)).toEqual([2, 3, 4, 1])
      })

      it('should return original array for invalid indices', () => {
        const arr = [1, 2, 3]
        expect(moveItem(arr, -1, 1)).toEqual(arr)
        expect(moveItem(arr, 1, -1)).toEqual(arr)
        expect(moveItem(arr, 5, 1)).toEqual(arr)
        expect(moveItem(arr, 1, 5)).toEqual(arr)
      })
    })
  })

  describe('Timing utilities', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    describe('debounce', () => {
      it('should debounce function calls', () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 100)

        debounced('a')
        debounced('b')
        debounced('c')

        expect(fn).not.toHaveBeenCalled()

        vi.advanceTimersByTime(100)
        expect(fn).toHaveBeenCalledTimes(1)
        expect(fn).toHaveBeenCalledWith('c')
      })

      it('should reset timer on each call', () => {
        const fn = vi.fn()
        const debounced = debounce(fn, 100)

        debounced('a')
        vi.advanceTimersByTime(50)
        
        debounced('b')
        vi.advanceTimersByTime(50)
        
        debounced('c')
        vi.advanceTimersByTime(99)
        expect(fn).not.toHaveBeenCalled()
        
        vi.advanceTimersByTime(1)
        expect(fn).toHaveBeenCalledTimes(1)
        expect(fn).toHaveBeenCalledWith('c')
      })
    })

    describe('throttle', () => {
      it('should throttle function calls', () => {
        const fn = vi.fn()
        const throttled = throttle(fn, 100)

        throttled('a')
        expect(fn).toHaveBeenCalledTimes(1)
        expect(fn).toHaveBeenCalledWith('a')

        throttled('b')
        throttled('c')
        expect(fn).toHaveBeenCalledTimes(1)

        vi.advanceTimersByTime(100)
        expect(fn).toHaveBeenCalledTimes(2)
        expect(fn).toHaveBeenLastCalledWith('c')
      })

      it('should execute immediately after throttle period', () => {
        const fn = vi.fn()
        const throttled = throttle(fn, 100)

        throttled('a')
        vi.advanceTimersByTime(100)
        
        throttled('b')
        expect(fn).toHaveBeenCalledTimes(2)
        expect(fn).toHaveBeenLastCalledWith('b')
      })
    })
  })
})