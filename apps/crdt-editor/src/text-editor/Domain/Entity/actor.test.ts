import { describe, it, expect, vi } from 'vitest'
import {
  createActor,
  createActorWithId,
  updateActorName,
  updateActorColor,
  updateActorLastSeen,
  getActorDisplayName,
  getActorInitialsFromEntity,
  getActorColorValue,
  isLocalActor,
  isRemoteActor,
  createActorPresence,
  updatePresenceStatus,
  updatePresenceActivity,
  calculateActorStatus,
  isEqualActor,
  compareActorByName,
  compareActorByJoinTime,
  groupActorsByStatus,
  validateActor,
} from './actor'

// モックUUID生成
vi.mock('../../utils/fp', async () => {
  const actual = await vi.importActual('../../utils/fp')
  return {
    ...actual,
    generateUUID: vi.fn(() => 'test-uuid-456'),
    timestamp: vi.fn(() => new Date('2024-01-01T00:00:00.000Z')),
  }
})

describe('Actor Entity', () => {
  describe('createActor', () => {
    it('should create a new actor with generated ID', () => {
      const result = createActor('Alice')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe('test-uuid-456')
        expect(result.value.name).toBe('Alice')
        expect(result.value.color).toMatch(/^#[0-9A-F]{6}$/)
        expect(result.value.isLocal).toBe(false)
        expect(result.value.joinedAt).toEqual(new Date('2024-01-01T00:00:00.000Z'))
        expect(result.value.lastSeenAt).toEqual(new Date('2024-01-01T00:00:00.000Z'))
      }
    })

    it('should create local actor when specified', () => {
      const result = createActor('Bob', undefined, true)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.isLocal).toBe(true)
      }
    })

    it('should use provided color', () => {
      const result = createActor('Charlie', '#FF6B6B')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.color).toBe('#FF6B6B')
      }
    })

    it('should reject invalid name', () => {
      const result = createActor('')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('at least')
      }
    })

    it('should reject name with invalid characters', () => {
      const result = createActor('Alice@#$')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('invalid characters')
      }
    })

    it('should reject invalid color format', () => {
      const result = createActor('Alice', 'not-a-color')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('color format')
      }
    })

    it('should reject name exceeding max length', () => {
      const longName = 'a'.repeat(51)
      const result = createActor(longName)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('at most')
      }
    })
  })

  describe('createActorWithId', () => {
    it('should create actor with specified ID', () => {
      const result = createActorWithId('custom-id', 'Alice', '#FF6B6B')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe('custom-id')
        expect(result.value.name).toBe('Alice')
        expect(result.value.color).toBe('#FF6B6B')
      }
    })
  })

  describe('updateActorName', () => {
    it('should update actor name', () => {
      const actorResult = createActor('Alice')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      const result = updateActorName(actorResult.value, 'Alicia')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.name).toBe('Alicia')
        expect(result.value.id).toBe(actorResult.value.id)
      }
    })

    it('should reject invalid new name', () => {
      const actorResult = createActor('Alice')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      const result = updateActorName(actorResult.value, '')
      expect(result.ok).toBe(false)
    })
  })

  describe('updateActorColor', () => {
    it('should update actor color', () => {
      const actorResult = createActor('Alice')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      const result = updateActorColor(actorResult.value, '#4ECDC4')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.color).toBe('#4ECDC4')
      }
    })

    it('should reject invalid color', () => {
      const actorResult = createActor('Alice')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      const result = updateActorColor(actorResult.value, 'invalid')
      expect(result.ok).toBe(false)
    })
  })

  describe('updateActorLastSeen', () => {
    it('should update last seen timestamp', () => {
      const actorResult = createActor('Alice')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      const updated = updateActorLastSeen(actorResult.value)
      expect(updated.lastSeenAt).toEqual(new Date('2024-01-01T00:00:00.000Z'))
    })
  })

  describe('Actor information getters', () => {
    it('should get actor display name', () => {
      const actorResult = createActor('Alice Smith')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      expect(getActorDisplayName(actorResult.value)).toBe('Alice Smith')
    })

    it('should get actor initials', () => {
      const actorResult = createActor('Alice Smith')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      expect(getActorInitialsFromEntity(actorResult.value)).toBe('AS')
    })

    it('should get actor color value', () => {
      const actorResult = createActor('Alice', '#FF6B6B')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      expect(getActorColorValue(actorResult.value)).toBe('#FF6B6B')
    })
  })

  describe('Actor type checks', () => {
    it('should identify local actor', () => {
      const localActorResult = createActor('Alice', undefined, true)
      const remoteActorResult = createActor('Bob', undefined, false)
      
      expect(localActorResult.ok).toBe(true)
      expect(remoteActorResult.ok).toBe(true)
      if (!localActorResult.ok || !remoteActorResult.ok) return

      expect(isLocalActor(localActorResult.value)).toBe(true)
      expect(isLocalActor(remoteActorResult.value)).toBe(false)
    })

    it('should identify remote actor', () => {
      const localActorResult = createActor('Alice', undefined, true)
      const remoteActorResult = createActor('Bob', undefined, false)
      
      expect(localActorResult.ok).toBe(true)
      expect(remoteActorResult.ok).toBe(true)
      if (!localActorResult.ok || !remoteActorResult.ok) return

      expect(isRemoteActor(localActorResult.value)).toBe(false)
      expect(isRemoteActor(remoteActorResult.value)).toBe(true)
    })
  })

  describe('Actor presence', () => {
    it('should create actor presence', () => {
      const actorResult = createActor('Alice')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      const presence = createActorPresence(actorResult.value, 'active')
      expect(presence.actor).toBe(actorResult.value)
      expect(presence.status).toBe('active')
      expect(presence.lastActivity).toEqual(new Date('2024-01-01T00:00:00.000Z'))
    })

    it('should update presence status', () => {
      const actorResult = createActor('Alice')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      const presence = createActorPresence(actorResult.value)
      const updated = updatePresenceStatus(presence, 'idle')
      expect(updated.status).toBe('idle')
      expect(updated.lastActivity).toEqual(new Date('2024-01-01T00:00:00.000Z'))
    })

    it('should update presence activity', () => {
      const actorResult = createActor('Alice')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      const presence = createActorPresence(actorResult.value)
      const updated = updatePresenceActivity(presence)
      expect(updated.lastActivity).toEqual(new Date('2024-01-01T00:00:00.000Z'))
    })
  })

  describe('calculateActorStatus', () => {
    it('should return active for recent activity', () => {
      const now = new Date()
      const status = calculateActorStatus(now, {
        idleMs: 30000,
        disconnectedMs: 60000,
      })
      expect(status).toBe('active')
    })

    it('should return idle for activity within idle threshold', () => {
      const now = new Date()
      const thirtyOneSecondsAgo = new Date(now.getTime() - 31000)
      const status = calculateActorStatus(thirtyOneSecondsAgo, {
        idleMs: 30000,
        disconnectedMs: 60000,
      })
      expect(status).toBe('idle')
    })

    it('should return disconnected for old activity', () => {
      const now = new Date()
      const twoMinutesAgo = new Date(now.getTime() - 120000)
      const status = calculateActorStatus(twoMinutesAgo, {
        idleMs: 30000,
        disconnectedMs: 60000,
      })
      expect(status).toBe('disconnected')
    })
  })

  describe('Actor comparison', () => {
    it('should check actor equality', () => {
      const actor1Result = createActorWithId('id-1', 'Alice')
      const actor2Result = createActorWithId('id-1', 'Bob')
      const actor3Result = createActorWithId('id-2', 'Alice')
      
      expect(actor1Result.ok).toBe(true)
      expect(actor2Result.ok).toBe(true)
      expect(actor3Result.ok).toBe(true)
      if (!actor1Result.ok || !actor2Result.ok || !actor3Result.ok) return

      expect(isEqualActor(actor1Result.value, actor2Result.value)).toBe(true)
      expect(isEqualActor(actor1Result.value, actor3Result.value)).toBe(false)
    })

    it('should compare actors by name', () => {
      const aliceResult = createActor('Alice')
      const bobResult = createActor('Bob')
      
      expect(aliceResult.ok).toBe(true)
      expect(bobResult.ok).toBe(true)
      if (!aliceResult.ok || !bobResult.ok) return

      expect(compareActorByName(aliceResult.value, bobResult.value)).toBeLessThan(0)
      expect(compareActorByName(bobResult.value, aliceResult.value)).toBeGreaterThan(0)
      expect(compareActorByName(aliceResult.value, aliceResult.value)).toBe(0)
    })

    it('should compare actors by join time', () => {
      // Create actors with different join times manually
      const actor1Result = createActorWithId('id-1', 'Alice')
      const actor2Result = createActorWithId('id-2', 'Bob')
      
      expect(actor1Result.ok).toBe(true)
      expect(actor2Result.ok).toBe(true)
      if (!actor1Result.ok || !actor2Result.ok) return

      // Manually set different join times
      const actor1 = {
        ...actor1Result.value,
        joinedAt: new Date('2024-01-01T00:00:00.000Z')
      }
      const actor2 = {
        ...actor2Result.value,
        joinedAt: new Date('2024-01-01T00:01:00.000Z')
      }

      expect(compareActorByJoinTime(actor1, actor2)).toBeLessThan(0)
      expect(compareActorByJoinTime(actor2, actor1)).toBeGreaterThan(0)
      expect(compareActorByJoinTime(actor1, actor1)).toBe(0)
    })
  })

  describe('groupActorsByStatus', () => {
    it('should group actors by their status', () => {
      const now = new Date()
      
      const activeActorResult = createActor('Active')
      const idleActorResult = createActor('Idle')
      const disconnectedActorResult = createActor('Disconnected')
      
      expect(activeActorResult.ok).toBe(true)
      expect(idleActorResult.ok).toBe(true)
      expect(disconnectedActorResult.ok).toBe(true)
      if (!activeActorResult.ok || !idleActorResult.ok || !disconnectedActorResult.ok) return

      // Create actors with specific last seen times
      const actors = [
        { ...activeActorResult.value, lastSeenAt: now },
        { ...idleActorResult.value, lastSeenAt: new Date(now.getTime() - 31000) }, // 31 seconds ago
        { ...disconnectedActorResult.value, lastSeenAt: new Date(now.getTime() - 120000) }, // 2 minutes ago
      ]

      const grouped = groupActorsByStatus(actors)
      
      expect(grouped.active).toHaveLength(1)
      expect(grouped.active[0].name).toBe('Active')
      expect(grouped.idle).toHaveLength(1)
      expect(grouped.idle[0].name).toBe('Idle')
      expect(grouped.disconnected).toHaveLength(1)
      expect(grouped.disconnected[0].name).toBe('Disconnected')
    })
  })

  describe('validateActor', () => {
    it('should validate correct actor object', () => {
      const actorResult = createActor('Alice')
      expect(actorResult.ok).toBe(true)
      if (!actorResult.ok) return

      expect(validateActor(actorResult.value)).toBe(true)
    })

    it('should reject invalid objects', () => {
      expect(validateActor(null)).toBe(false)
      expect(validateActor(undefined)).toBe(false)
      expect(validateActor({})).toBe(false)
      expect(validateActor({ id: 'test' })).toBe(false)
      expect(validateActor({
        id: 'test',
        name: 'Alice',
        color: '#FF6B6B',
        isLocal: 'not-boolean',
        joinedAt: new Date(),
        lastSeenAt: new Date(),
      })).toBe(false)
      expect(validateActor({
        id: 'test',
        name: 'Alice',
        color: '#FF6B6B',
        isLocal: true,
        joinedAt: 'not-a-date',
        lastSeenAt: new Date(),
      })).toBe(false)
    })

    it('should validate actor with all correct properties', () => {
      const validActor = {
        id: 'test-id',
        name: 'Alice',
        color: '#FF6B6B',
        isLocal: false,
        joinedAt: new Date(),
        lastSeenAt: new Date(),
      }
      expect(validateActor(validActor)).toBe(true)
    })
  })
})