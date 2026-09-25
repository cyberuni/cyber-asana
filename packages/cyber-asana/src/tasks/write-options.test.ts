import { describe, expect, it } from 'vitest'
import { buildTaskCreateFields, buildTaskUpdateFields, parseGidList } from './write-options.js'

describe('tasks/write-options', () => {
	it('parseGidList splits comma-separated gids and trims whitespace', () => {
		expect(parseGidList(' p1, p2 ,, p3 ')).toEqual(['p1', 'p2', 'p3'])
	})

	it('buildTaskCreateFields merges custom field json and repeated custom field entries', () => {
		expect(
			buildTaskCreateFields({
				notes: 'plain',
				projectInput: 'p1,p2',
				followerInput: 'u1,u2',
				customFieldsJson: '{"cf1":"json","cf2":2}',
				customFieldEntries: ['cf2=override', 'cf3=value'],
			}),
		).toEqual({
			notes: 'plain',
			projects: ['p1', 'p2'],
			followers: ['u1', 'u2'],
			custom_fields: { cf1: 'json', cf2: 'override', cf3: 'value' },
		})
	})

	it('buildTaskCreateFields maps resolved tag gids', () => {
		expect(buildTaskCreateFields({ tagGids: ['t1', 't2'] })).toEqual({ tags: ['t1', 't2'] })
	})

	it('buildTaskCreateFields omits tags when none are given', () => {
		expect(buildTaskCreateFields({ notes: 'plain' })).toEqual({ notes: 'plain' })
	})

	it('buildTaskCreateFields maps start_on', () => {
		expect(buildTaskCreateFields({ startOn: '2026-09-01', dueOn: '2026-10-31' })).toEqual({
			start_on: '2026-09-01',
			due_on: '2026-10-31',
		})
	})

	it('buildTaskCreateFields maps due_at and start_at', () => {
		expect(buildTaskCreateFields({ startAt: '2026-09-01T09:00:00.000Z', dueAt: '2026-10-31T17:00:00.000Z' })).toEqual({
			start_at: '2026-09-01T09:00:00.000Z',
			due_at: '2026-10-31T17:00:00.000Z',
		})
	})

	it('buildTaskCreateFields rejects due_on and due_at together', () => {
		expect(() => buildTaskCreateFields({ dueOn: '2026-10-31', dueAt: '2026-10-31T17:00:00.000Z' })).toThrow(
			'--due-on and --due-at are mutually exclusive',
		)
	})

	it('buildTaskCreateFields maps completed', () => {
		expect(buildTaskCreateFields({ completed: true })).toEqual({ completed: true })
	})

	it('buildTaskCreateFields rejects notes and html_notes together', () => {
		expect(() => buildTaskCreateFields({ notes: 'plain', htmlNotes: '<body>html</body>' })).toThrow(
			'--notes and --html-notes are mutually exclusive',
		)
	})

	it('buildTaskUpdateFields rejects parent and clear_parent together', () => {
		expect(() => buildTaskUpdateFields({ parent: 'parent1', clearParent: true })).toThrow(
			'--parent and --clear-parent are mutually exclusive',
		)
	})

	it('buildTaskUpdateFields rejects due_on and clear_due_on together', () => {
		expect(() => buildTaskUpdateFields({ dueOn: '2026-06-01', clearDueOn: true })).toThrow(
			'--due-on and --clear-due-on are mutually exclusive',
		)
	})

	it('buildTaskUpdateFields maps start_on', () => {
		expect(buildTaskUpdateFields({ startOn: '2026-09-01', dueOn: '2026-10-31' })).toEqual({
			start_on: '2026-09-01',
			due_on: '2026-10-31',
		})
	})

	it('buildTaskUpdateFields maps clear_start_on to null', () => {
		expect(buildTaskUpdateFields({ clearStartOn: true })).toEqual({ start_on: null })
	})

	it('buildTaskUpdateFields rejects start_on and clear_start_on together', () => {
		expect(() => buildTaskUpdateFields({ startOn: '2026-09-01', clearStartOn: true })).toThrow(
			'--start-on and --clear-start-on are mutually exclusive',
		)
	})

	it('buildTaskUpdateFields maps due_at and start_at', () => {
		expect(buildTaskUpdateFields({ startAt: '2026-09-01T09:00:00.000Z', dueAt: '2026-10-31T17:00:00.000Z' })).toEqual({
			start_at: '2026-09-01T09:00:00.000Z',
			due_at: '2026-10-31T17:00:00.000Z',
		})
	})

	it('buildTaskUpdateFields maps the clear date-time flags to null', () => {
		expect(buildTaskUpdateFields({ clearDueAt: true, clearStartAt: true })).toEqual({
			due_at: null,
			start_at: null,
		})
	})

	it('buildTaskUpdateFields rejects due_at and clear_due_at together', () => {
		expect(() => buildTaskUpdateFields({ dueAt: '2026-10-31T17:00:00.000Z', clearDueAt: true })).toThrow(
			'--due-at and --clear-due-at are mutually exclusive',
		)
	})

	it('buildTaskUpdateFields rejects start_on and start_at together', () => {
		expect(() => buildTaskUpdateFields({ startOn: '2026-09-01', startAt: '2026-09-01T09:00:00.000Z' })).toThrow(
			'--start-on and --start-at are mutually exclusive',
		)
	})

	it('buildTaskUpdateFields maps clear_assignee to null', () => {
		expect(buildTaskUpdateFields({ clearAssignee: true })).toEqual({ assignee: null })
	})

	it('buildTaskUpdateFields rejects assignee and clear_assignee together', () => {
		expect(() => buildTaskUpdateFields({ assignee: 'u1', clearAssignee: true })).toThrow(
			'--assignee-gid and --clear-assignee are mutually exclusive',
		)
	})

	it('buildTaskUpdateFields keeps html_notes and custom field values', () => {
		expect(
			buildTaskUpdateFields({
				htmlNotes: '<body>Updated</body>',
				resourceSubtype: 'milestone',
				customFieldsJson: '{"cf1":{"nested":true}}',
				customFieldEntries: ['cf2=value'],
				parent: 'parent1',
				clearDueOn: true,
			}),
		).toEqual({
			html_notes: '<body>Updated</body>',
			resource_subtype: 'milestone',
			custom_fields: { cf1: { nested: true }, cf2: 'value' },
			parent: 'parent1',
			due_on: null,
		})
	})
})
