import { describe, expect, it } from 'vitest'
import { addScope, parseRepoConfig, type RepoConfig, removeScope } from './repo-config.js'
import { defaultScope, mergeScopes, parseScopeEntries, type ScopeEntry } from './scopes.js'

const web: ScopeEntry = { name: 'web', kind: 'project', projects: ['1201'], default: true }

describe('parseScopeEntries', () => {
	it('reads the three kinds with their overrides', () => {
		const scopes = parseScopeEntries(
			[
				web,
				{ name: 'platform', kind: 'projects', projects: ['1201', '1202'], sprint_model: 'custom-field' },
				{
					name: 'growth',
					kind: 'portfolio',
					portfolio: '1300',
					sprint_length_days: 7,
					sprint_anchor_date: '2026-01-05',
				},
			],
			'scrum.scopes',
		)
		expect(scopes).toHaveLength(3)
		expect(scopes[2]).toEqual({
			name: 'growth',
			kind: 'portfolio',
			portfolio: '1300',
			sprint_length_days: 7,
			sprint_anchor_date: '2026-01-05',
		})
	})

	it.each([
		[[{ kind: 'project', projects: ['1'] }], 'scrum.scopes[0].name must be a non-empty string'],
		[[{ name: 'a', kind: 'team', team: '1' }], 'scrum.scopes[0].kind must be one of project, projects, portfolio'],
		[
			[{ name: 'a', kind: 'project', projects: ['1', '2'] }],
			'scrum.scopes[0] of kind project needs exactly one project',
		],
		[[{ name: 'a', kind: 'projects', projects: [] }], 'scrum.scopes[0] of kind projects needs at least one project'],
		[[{ name: 'a', kind: 'portfolio' }], 'scrum.scopes[0].portfolio must be a non-empty string'],
		[
			[{ name: 'a', kind: 'project', projects: ['1'], portfolio: '2' }],
			'scrum.scopes[0].portfolio is not allowed on a project scope',
		],
		[
			[{ name: 'a', kind: 'project', projects: ['1'], hours_per_point: 2 }],
			'Unknown scope key scrum.scopes[0].hours_per_point; a scope may set only sprint_model, sprint_length_days, sprint_anchor_date',
		],
		[
			[{ name: 'a', kind: 'project', projects: ['1'], sprint_length_days: 0 }],
			'scrum.scopes[0].sprint_length_days must be a positive integer',
		],
		[
			[{ name: 'a', kind: 'project', projects: ['1'], sprint_anchor_date: '2026-13-40' }],
			'scrum.scopes[0].sprint_anchor_date must be a YYYY-MM-DD date',
		],
		[
			[{ name: 'a', kind: 'project', projects: ['1'], sprint_model: '' }],
			'scrum.scopes[0].sprint_model must be a non-empty string',
		],
		[
			[{ name: 'a', kind: 'project', projects: ['1'], default: false }],
			'scrum.scopes[0].default must be true when present',
		],
		[
			[
				{ name: 'a', kind: 'project', projects: ['1'] },
				{ name: 'A', kind: 'project', projects: ['2'] },
			],
			'Scope name "A" is already used by scope "a"',
		],
		[
			[
				{ name: 'a', kind: 'project', projects: ['1'], default: true },
				{ name: 'b', kind: 'project', projects: ['2'], default: true },
			],
			'Only one scope may be marked default; found 2: a, b',
		],
	])('rejects %j', (raw, message) => {
		expect(() => parseScopeEntries(raw, 'scrum.scopes')).toThrow(message)
	})
})

describe('repo config schema 3', () => {
	it('still reads schema 2, which carries no scope', () => {
		const config = parseRepoConfig({ schema_version: 2, projects: [] })
		expect(config).toEqual({ schema_version: 2, projects: [] })
	})

	it('reads a scrum block under schema 3', () => {
		const config = parseRepoConfig({ schema_version: 3, projects: [], scrum: { scopes: [web] } })
		expect(config.schema_version).toBe(3)
		expect(config.scrum?.scopes).toEqual([web])
	})

	it('reads schema 3 with no scrum block', () => {
		expect(parseRepoConfig({ schema_version: 3, projects: [] })).toEqual({ schema_version: 3, projects: [] })
	})

	it('rejects a scrum block under schema 2, naming the version it needs', () => {
		expect(() => parseRepoConfig({ schema_version: 2, projects: [], scrum: { scopes: [web] } })).toThrow(
			'scrum needs schema_version 3',
		)
	})

	it('rejects an unknown scrum key', () => {
		expect(() => parseRepoConfig({ schema_version: 3, projects: [], scrum: { scope: [] } })).toThrow(
			'Unknown repo config key scrum.scope; expected scopes',
		)
	})

	it('keeps users and defaults beside scopes', () => {
		const config = parseRepoConfig({
			schema_version: 3,
			projects: [],
			users: [{ gid: '9', name: 'Ada', aliases: [] }],
			defaults: { assignee: 'ada' },
			scrum: { scopes: [web] },
		})
		expect(config.users).toHaveLength(1)
		expect(config.defaults).toEqual({ assignee: 'ada' })
		expect(config.scrum?.scopes).toEqual([web])
	})
})

describe('addScope', () => {
	const empty: RepoConfig = { schema_version: 2, projects: [] }

	it('writes schema 3 once a scope is added', () => {
		const next = addScope(empty, web)
		expect(next.schema_version).toBe(3)
		expect(next.scrum?.scopes).toEqual([web])
	})

	it('replaces a scope of the same name, ignoring case', () => {
		const first = addScope(empty, { name: 'web', kind: 'project', projects: ['1'] })
		const next = addScope(first, { name: 'Web', kind: 'projects', projects: ['1', '2'] })
		expect(next.scrum?.scopes).toEqual([{ name: 'Web', kind: 'projects', projects: ['1', '2'] }])
	})

	it('moves the default marker when a new scope claims it', () => {
		const first = addScope(empty, web)
		const next = addScope(first, { name: 'other', kind: 'project', projects: ['2'], default: true })
		expect(next.scrum?.scopes?.map((s) => [s.name, s.default])).toEqual([
			['web', undefined],
			['other', true],
		])
	})

	it('validates the entry like the parser does', () => {
		expect(() => addScope(empty, { name: 'a', kind: 'portfolio' } as ScopeEntry)).toThrow('portfolio')
	})
})

describe('removeScope', () => {
	it('removes by name, ignoring case, and drops an emptied scrum block', () => {
		const config = addScope({ schema_version: 2, projects: [] }, web)
		const next = removeScope(config, 'WEB')
		expect(next.scrum).toBeUndefined()
		expect(next.schema_version).toBe(3)
	})

	it('throws when no scope has that name, listing the ones that exist', () => {
		const config = addScope({ schema_version: 2, projects: [] }, web)
		expect(() => removeScope(config, 'nope')).toThrow('Scope "nope" is not configured; known scopes: web')
	})
})

describe('mergeScopes', () => {
	it('lets a repo scope win a name clash and keeps the global scopes it does not shadow', () => {
		const local: ScopeEntry[] = [{ name: 'web', kind: 'project', projects: ['1'] }]
		const global: ScopeEntry[] = [
			{ name: 'WEB', kind: 'project', projects: ['9'] },
			{ name: 'mine', kind: 'projects', projects: ['1', '2'] },
		]
		expect(mergeScopes(local, global).map((s) => [s.name, s.projects])).toEqual([
			['web', ['1']],
			['mine', ['1', '2']],
		])
	})

	it('picks the default from the repo before the global, and never two', () => {
		const local: ScopeEntry[] = [{ name: 'a', kind: 'project', projects: ['1'], default: true }]
		const global: ScopeEntry[] = [{ name: 'b', kind: 'project', projects: ['2'], default: true }]
		expect(defaultScope(mergeScopes(local, global))?.name).toBe('a')
		expect(defaultScope(mergeScopes([], global))?.name).toBe('b')
		expect(mergeScopes(local, global).filter((s) => s.default)).toHaveLength(1)
	})
})
