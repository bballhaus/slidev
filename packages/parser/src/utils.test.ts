import { describe, expect, it } from 'vitest'
import { isPathInsideRoots } from './fs'
import { parseRangeString } from './utils'

describe('parseRangeString', () => {
  it('drops slide numbers below 1', () => {
    expect(parseRangeString(5, '0')).toEqual([])
    expect(parseRangeString(5, '-3')).toEqual([1, 2, 3])
    expect(parseRangeString(5, '0,2')).toEqual([2])
  })

  it('drops slide numbers above the total', () => {
    expect(parseRangeString(5, '4-8')).toEqual([4, 5])
  })
})

describe('isPathInsideRoots', () => {
  it('accepts a path nested inside a root', () => {
    expect(isPathInsideRoots('/a/b/c', ['/a'])).toBe(true)
  })

  it('accepts a path that equals the root itself', () => {
    expect(isPathInsideRoots('/a', ['/a'])).toBe(true)
  })

  it('rejects a path outside every root', () => {
    expect(isPathInsideRoots('/x', ['/a'])).toBe(false)
  })

  it('rejects a `..`-escaping relative resolution', () => {
    expect(isPathInsideRoots('/a/../x', ['/a'])).toBe(false)
  })
})
