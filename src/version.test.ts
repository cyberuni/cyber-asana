import { describe, expect, it } from 'vitest'
import pkg from '../package.json' with { type: 'json' }
import { VERSION } from './version.js'

describe('version', () => {
	it('matches package.json version', () => {
		expect(VERSION).toBe(pkg.version)
	})
})
