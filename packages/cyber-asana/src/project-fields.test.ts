import { describe, expect, it } from 'vitest'
import { applyFieldDiscovery, matchFieldRole } from './project-fields.js'
import type { RepoConfig } from './repo-config.js'

describe('matchFieldRole', () => {
	it.each(['Story Points', 'story point', 'Task Points', 'task_points', 'Points', 'Story pts', 'SP'])(
		'matches %s as story_points',
		(name) => {
			expect(matchFieldRole({ name, resource_subtype: 'number' })).toBe('story_points')
		},
	)

	it('accepts an enum field, for teams that pick points from a scale', () => {
		expect(matchFieldRole({ name: 'Story Points', resource_subtype: 'enum' })).toBe('story_points')
	})

	it.each(['Priority', 'Points of contact', 'Estimated hours', 'Pointer'])('does not match %s', (name) => {
		expect(matchFieldRole({ name, resource_subtype: 'number' })).toBeUndefined()
	})

	it('does not match a text field named Story Points', () => {
		expect(matchFieldRole({ name: 'Story Points', resource_subtype: 'text' })).toBeUndefined()
	})
})

describe('applyFieldDiscovery', () => {
	const base = (fields?: RepoConfig['projects'][number]['fields']): RepoConfig => ({
		schema_version: 2,
		projects: [{ gid: '1', name: 'A', aliases: [], ...(fields && { fields }) }],
	})
	const points = { gid: '900', name: 'Story Points', resource_subtype: 'number' }

	it('saves the one field that matches a role', () => {
		const { config, discovered, ambiguous } = applyFieldDiscovery(base(), '1', [
			points,
			{ gid: '901', name: 'Priority', resource_subtype: 'enum' },
		])
		expect(config.projects[0]?.fields).toEqual({ story_points: { gid: '900', name: 'Story Points' } })
		expect(discovered).toEqual({ story_points: { gid: '900', name: 'Story Points' } })
		expect(ambiguous).toEqual({})
	})

	it('reports several matches for one role and leaves the saved entry alone', () => {
		const saved = { gid: '800', name: 'Points' }
		const { config, ambiguous } = applyFieldDiscovery(base({ story_points: saved }), '1', [
			{ gid: '800', name: 'Points', resource_subtype: 'number' },
			points,
		])
		expect(config.projects[0]?.fields).toEqual({ story_points: saved })
		expect(ambiguous).toEqual({
			story_points: [
				{ gid: '800', name: 'Points' },
				{ gid: '900', name: 'Story Points' },
			],
		})
	})

	it('keeps a hand-picked field the name heuristic misses while it is still on the project', () => {
		const saved = { gid: '700', name: 'Effort' }
		const { config } = applyFieldDiscovery(base({ story_points: saved }), '1', [
			{ gid: '700', name: 'Effort', resource_subtype: 'number' },
		])
		expect(config.projects[0]?.fields).toEqual({ story_points: saved })
	})

	it('drops a saved field that is no longer on the project', () => {
		const { config } = applyFieldDiscovery(base({ story_points: { gid: '700', name: 'Effort' } }), '1', [])
		expect(config.projects[0]).not.toHaveProperty('fields')
	})

	it('refreshes the name of a saved field that was renamed', () => {
		const { config } = applyFieldDiscovery(base({ story_points: { gid: '900', name: 'Old' } }), '1', [points])
		expect(config.projects[0]?.fields).toEqual({ story_points: { gid: '900', name: 'Story Points' } })
	})
})
