import { describe, expect, it } from 'vitest'
import { isCodedConfigError } from '../platform/coded-error.js'
import { assertKnownStatusType, assertStatusType, STATUS_TYPES, statusTypeIsExclusive } from './status-type.js'

describe('status types per parent', () => {
	it('lists the five project and portfolio types and the goal types', () => {
		expect(STATUS_TYPES.project).toEqual(['on_track', 'at_risk', 'off_track', 'on_hold', 'complete'])
		expect(STATUS_TYPES.portfolio).toEqual(STATUS_TYPES.project)
		expect(STATUS_TYPES.goal).toEqual(['on_track', 'at_risk', 'off_track', 'achieved', 'partial', 'missed', 'dropped'])
	})

	it('accepts a type its parent allows', () => {
		expect(() => assertStatusType('complete', 'project')).not.toThrow()
		expect(() => assertStatusType('achieved', 'goal')).not.toThrow()
	})

	it('rejects a type no parent allows, with a coded error naming the options', () => {
		try {
			assertStatusType('green', 'project')
			expect.unreachable()
		} catch (error) {
			expect(isCodedConfigError(error)).toBe(true)
			expect(error).toMatchObject({ code: 'status-type-invalid', options: STATUS_TYPES.project })
		}
	})

	it('rejects a goal-only type on a project and a project-only type on a goal', () => {
		expect(() => assertStatusType('achieved', 'project')).toThrow(/project/)
		expect(() => assertStatusType('on_hold', 'goal')).toThrow(/goal/)
	})

	it('says which types need the parent to be known', () => {
		expect(statusTypeIsExclusive('on_track')).toBe(false)
		expect(statusTypeIsExclusive('complete')).toBe(true)
		expect(statusTypeIsExclusive('dropped')).toBe(true)
		expect(statusTypeIsExclusive('green')).toBe(false)
	})

	it('rejects a value no parent accepts when the parent is unknown', () => {
		expect(() => assertKnownStatusType('on_hold')).not.toThrow()
		expect(() => assertKnownStatusType('green')).toThrow(/not valid/)
	})
})
