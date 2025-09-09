/**
 * Test setup file
 */

import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/vue'

// Testing Library の cleanup を各テスト後に実行
afterEach(() => {
  cleanup()
})

// カスタムマッチャーの追加（必要に応じて）
expect.extend({
  toBeValidResult(received: any) {
    const pass = received && typeof received === 'object' && 'ok' in received
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Result type`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid Result type`,
        pass: false,
      }
    }
  },
})