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

	it('buildTaskUpdateFields keeps html_notes and custom field values', () => {
		expect(
			buildTaskUpdateFields({
				htmlNotes: '<body>Updated</body>',
				resourceSubtype: 'milestone',
				customFieldsJson: '{"cf1":{"nested":true}}',
				customFieldEntries: ['cf2=value'],
				parent: 'parent1',
			}),
		).toEqual({
			html_notes: '<body>Updated</body>',
			resource_subtype: 'milestone',
			custom_fields: { cf1: { nested: true }, cf2: 'value' },
			parent: 'parent1',
		})
	})
})
