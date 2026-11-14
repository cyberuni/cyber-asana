import { describe, expect, it } from 'vitest'
import { DEFAULT_SCRUM_POLICY } from './policy.js'
import { parseSprintRef, sprintAt, sprintName, sprintNumber, sprintWindow, todayIn } from './sprint.js'

const settings = { ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05' }

describe('sprint identity', () => {
	it('numbers sprints from the anchor in blocks of sprint_length_days', () => {
		expect(sprintNumber('2026-01-05', settings)).toBe(1)
		expect(sprintNumber('2026-01-18', settings)).toBe(1)
		expect(sprintNumber('2026-01-19', settings)).toBe(2)
	})

	it('has no sprint before the anchor', () => {
		expect(sprintNumber('2026-01-04', settings)).toBeUndefined()
	})

	it('computes a sprint window with its working days', () => {
		expect(sprintWindow(2, settings)).toEqual({
			n: 2,
			name: 'Sprint 2',
			start: '2026-01-19',
			end: '2026-02-01',
			working_days: 10,
		})
	})

	it('counts only the policy working_days', () => {
		const sixDay = { ...settings, working_days: ['mon', 'tue'] as const }
		expect(sprintWindow(1, { ...sixDay, working_days: ['mon', 'tue'] }).working_days).toBe(4)
	})

	it('fills every name token', () => {
		expect(sprintName('{year}-S{n} {start}..{end}', { n: 3, start: '2026-02-02', end: '2026-02-15' })).toBe(
			'2026-S3 2026-02-02..2026-02-15',
		)
	})

	it('finds the sprint a date is in', () => {
		expect(sprintAt('2026-01-20', settings)?.name).toBe('Sprint 2')
	})

	it('reads today in a named timezone', () => {
		const now = new Date('2026-01-05T23:30:00Z')
		expect(todayIn('Asia/Tokyo', now)).toBe('2026-01-06')
		expect(todayIn('America/Los_Angeles', now)).toBe('2026-01-05')
	})

	it('parses sprint references', () => {
		expect(parseSprintRef('current', 4, settings)).toBe(4)
		expect(parseSprintRef('next', 4, settings)).toBe(5)
		expect(parseSprintRef('previous', 4, settings)).toBe(3)
		expect(parseSprintRef('7', 4, settings)).toBe(7)
		expect(parseSprintRef('Sprint 9', 4, settings)).toBe(9)
	})

	it('rejects a reference that names no sprint', () => {
		expect(() => parseSprintRef('Iteration 9', 4, settings)).toThrow(/sprint-unknown|does not name a sprint/)
		expect(() => parseSprintRef('previous', 1, settings)).toThrow(/no previous sprint/)
	})
})
