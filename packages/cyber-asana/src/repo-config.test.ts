import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	addProject,
	addUser,
	clearDefaultProject,
	createEmptyRepoConfig,
	defaultProject,
	findConfigFile,
	loadRepoConfig,
	normalizeProjectName,
	observeProject,
	observeUser,
	parseRepoConfig,
	type RepoConfig,
	type RepoUserEntry,
	removeAliases,
	removeProject,
	removeProjectAliases,
	removeUser,
	resolveAssignee,
	resolveProject,
	resolveProjectRef,
	resolveSectionRef,
	resolveUser,
	resolveWorkspaceRef,
	saveRepoConfig,
	setConventions,
	setDefaultProject,
	setDefaults,
	tryObserveProjectFromConfigPath,
} from './repo-config.js'

describe('parseRepoConfig', () => {
	it('parses v2 schema with enriched project entries', () => {
		expect(
			parseRepoConfig({
				schema_version: 2,
				projects: [{ gid: '123', name: 'Backend', aliases: ['api'], purpose: 'Service work', default: true }],
			}),
		).toEqual({
			schema_version: 2,
			projects: [{ gid: '123', name: 'Backend', aliases: ['api'], purpose: 'Service work', default: true }],
		})
	})

	it('migrates a v1 config to v2 with empty project aliases', () => {
		expect(
			parseRepoConfig({
				schema_version: 1,
				projects: [{ gid: '123', name: 'Backend' }],
			}),
		).toEqual({
			schema_version: 2,
			projects: [{ gid: '123', name: 'Backend', aliases: [] }],
		})
	})

	it('rejects missing schema_version', () => {
		expect(() => parseRepoConfig({ projects: [] })).toThrow('schema_version')
	})

	it('rejects unsupported schema_version', () => {
		expect(() => parseRepoConfig({ schema_version: 3, projects: [] })).toThrow('schema_version')
	})

	it('rejects a project alias that is not a non-empty string', () => {
		expect(() => parseRepoConfig({ schema_version: 2, projects: [{ gid: '1', name: 'A', aliases: [''] }] })).toThrow(
			'projects[0].aliases',
		)
	})

	it('rejects a non-string project purpose', () => {
		expect(() => parseRepoConfig({ schema_version: 2, projects: [{ gid: '1', name: 'A', purpose: 7 }] })).toThrow(
			'projects[0].purpose',
		)
	})

	it('rejects more than one default project', () => {
		expect(() =>
			parseRepoConfig({
				schema_version: 2,
				projects: [
					{ gid: '1', name: 'A', default: true },
					{ gid: '2', name: 'B', default: true },
				],
			}),
		).toThrow('one default project')
	})
})

describe('resolveProject', () => {
	const config: RepoConfig = {
		schema_version: 2,
		projects: [
			{ gid: '111', name: 'Backend', aliases: ['api', 'svc'] },
			{ gid: '222', name: 'Frontend', aliases: [] },
		],
	}

	it('resolves by case-insensitive name without API calls', () => {
		expect(resolveProject(config, { name: 'backend' })?.gid).toBe('111')
	})

	it('resolves by gid', () => {
		expect(resolveProject(config, { gid: '222' })?.gid).toBe('222')
	})

	it('resolves by case-insensitive alias', () => {
		expect(resolveProject(config, { name: 'API' })?.gid).toBe('111')
	})

	it('prefers a registered alias over another project display name', () => {
		const shadowed: RepoConfig = {
			schema_version: 2,
			projects: [
				{ gid: '111', name: 'Backend', aliases: ['Frontend'] },
				{ gid: '222', name: 'Frontend', aliases: [] },
			],
		}
		expect(resolveProject(shadowed, { name: 'frontend' })?.gid).toBe('111')
	})

	it('throws when a name matches more than one project', () => {
		const ambiguous: RepoConfig = {
			schema_version: 2,
			projects: [
				{ gid: '111', name: 'Shared', aliases: [] },
				{ gid: '222', name: 'Shared', aliases: [] },
			],
		}
		expect(() => resolveProject(ambiguous, { name: 'shared' })).toThrow('matches 2 registered projects')
	})

	it('returns null when not found', () => {
		expect(resolveProject(config, { name: 'Missing' })).toBeNull()
	})
})

describe('observeProject', () => {
	it('updates name when gid matches and name differs', () => {
		const config = createEmptyRepoConfig()
		config.projects = [{ gid: '111', name: 'Old Name', aliases: [] }]

		const result = observeProject(config, { gid: '111', name: 'New Name' })

		expect(result.updated).toBe(true)
		expect(result.config.projects[0]?.name).toBe('New Name')
	})

	it('preserves aliases, purpose and the default marker when refreshing the name', () => {
		const config: RepoConfig = {
			schema_version: 2,
			projects: [{ gid: '111', name: 'Old', aliases: ['api'], purpose: 'Service work', default: true }],
		}

		const result = observeProject(config, { gid: '111', name: 'New' })

		expect(result.config.projects[0]).toEqual({
			gid: '111',
			name: 'New',
			aliases: ['api'],
			purpose: 'Service work',
			default: true,
		})
	})

	it('does not update when name matches', () => {
		const config = createEmptyRepoConfig()
		config.projects = [{ gid: '111', name: 'Same', aliases: [] }]

		const result = observeProject(config, { gid: '111', name: 'Same' })

		expect(result.updated).toBe(false)
	})

	it('ignores gid not in config', () => {
		const config = createEmptyRepoConfig()
		config.projects = [{ gid: '111', name: 'A', aliases: [] }]

		const result = observeProject(config, { gid: '999', name: 'Other' })

		expect(result.updated).toBe(false)
		expect(result.config.projects).toHaveLength(1)
	})
})

describe('addProject and removeProject', () => {
	it('addProject appends new entry', () => {
		const config = createEmptyRepoConfig()
		const next = addProject(config, { gid: '111', name: 'Backend', aliases: [] })
		expect(next.projects).toEqual([{ gid: '111', name: 'Backend', aliases: [] }])
	})

	it('addProject refreshes the name and merges aliases for a duplicate gid', () => {
		const config = createEmptyRepoConfig()
		config.projects = [{ gid: '111', name: 'Old', aliases: ['api'] }]
		const next = addProject(config, { gid: '111', name: 'New', aliases: ['svc', 'API'] })
		expect(next.projects).toEqual([{ gid: '111', name: 'New', aliases: ['api', 'svc'] }])
	})

	it('addProject keeps an existing purpose when the new entry gives none', () => {
		const config: RepoConfig = {
			schema_version: 2,
			projects: [{ gid: '111', name: 'Backend', aliases: [], purpose: 'Service work' }],
		}
		expect(addProject(config, { gid: '111', name: 'Backend', aliases: [] }).projects[0]?.purpose).toBe('Service work')
	})

	it('addProject replaces the purpose when the new entry gives one', () => {
		const config: RepoConfig = {
			schema_version: 2,
			projects: [{ gid: '111', name: 'Backend', aliases: [], purpose: 'Old' }],
		}
		expect(addProject(config, { gid: '111', name: 'Backend', aliases: [], purpose: 'New' }).projects[0]?.purpose).toBe(
			'New',
		)
	})

	it('addProject rejects an alias already registered to another project', () => {
		const config = createEmptyRepoConfig()
		config.projects = [{ gid: '111', name: 'Backend', aliases: ['api'] }]
		expect(() => addProject(config, { gid: '222', name: 'Frontend', aliases: ['API'] })).toThrow(
			'already registered to project 111',
		)
	})

	it('removeProject removes by gid, name, or alias', () => {
		const config: RepoConfig = {
			schema_version: 2,
			projects: [
				{ gid: '111', name: 'Backend', aliases: ['api'] },
				{ gid: '222', name: 'Frontend', aliases: ['web'] },
			],
		}
		expect(removeProject(config, { gid: '111' }).projects).toHaveLength(1)
		expect(removeProject(config, { name: 'frontend' }).projects.map((p) => p.gid)).toEqual(['111'])
		expect(removeProject(config, { name: 'API' }).projects.map((p) => p.gid)).toEqual(['222'])
	})
})

describe('removeProjectAliases', () => {
	const config: RepoConfig = {
		schema_version: 2,
		projects: [
			{ gid: '111', name: 'Backend', aliases: ['api', 'svc'] },
			{ gid: '222', name: 'Frontend', aliases: ['web'] },
		],
	}

	it('drops aliases from whichever projects own them', () => {
		const next = removeProjectAliases(config, ['API', 'web'])
		expect(next.projects.map((p) => p.aliases)).toEqual([['svc'], []])
	})

	it('rejects an unregistered alias without changing the config', () => {
		expect(() => removeProjectAliases(config, ['api', 'nope'])).toThrow('"nope" is not registered')
		expect(config.projects[0]?.aliases).toEqual(['api', 'svc'])
	})
})

describe('setDefaultProject and defaultProject', () => {
	const config: RepoConfig = {
		schema_version: 2,
		projects: [
			{ gid: '111', name: 'Backend', aliases: [] },
			{ gid: '222', name: 'Frontend', aliases: [], default: true },
		],
	}

	it('defaultProject returns the marked project', () => {
		expect(defaultProject(config)?.gid).toBe('222')
	})

	it('defaultProject returns null when nothing is marked', () => {
		expect(defaultProject(createEmptyRepoConfig())).toBeNull()
	})

	it('setDefaultProject moves the marker to exactly one project', () => {
		const next = setDefaultProject(config, '111')
		expect(next.projects.filter((p) => p.default).map((p) => p.gid)).toEqual(['111'])
	})

	it('setDefaultProject throws when the project is not registered', () => {
		expect(() => setDefaultProject(config, '999')).toThrow('not registered')
	})

	it('clearDefaultProject leaves no project marked', () => {
		expect(clearDefaultProject(config).projects.some((p) => p.default)).toBe(false)
	})
})

describe('defaults block', () => {
	it('parses a defaults block', () => {
		expect(
			parseRepoConfig({
				schema_version: 2,
				projects: [],
				defaults: { assignee: 'ali', workspace: '900', section: '800' },
			}).defaults,
		).toEqual({ assignee: 'ali', workspace: '900', section: '800' })
	})

	it('rejects an unknown defaults key so a typo is not silently ignored', () => {
		expect(() => parseRepoConfig({ schema_version: 2, projects: [], defaults: { assinee: 'ali' } })).toThrow(
			'defaults.assinee',
		)
	})

	it('rejects a non-string defaults value', () => {
		expect(() => parseRepoConfig({ schema_version: 2, projects: [], defaults: { workspace: 900 } })).toThrow(
			'defaults.workspace',
		)
	})

	it('setDefaults merges into an absent block', () => {
		expect(setDefaults(createEmptyRepoConfig(), { assignee: 'ali' }).defaults).toEqual({ assignee: 'ali' })
	})

	it('setDefaults leaves keys it was not given alone', () => {
		const config = setDefaults(createEmptyRepoConfig(), { assignee: 'ali', workspace: '900' })
		expect(setDefaults(config, { workspace: '901' }).defaults).toEqual({ assignee: 'ali', workspace: '901' })
	})

	it('setDefaults clears a key given null', () => {
		const config = setDefaults(createEmptyRepoConfig(), { assignee: 'ali', workspace: '900' })
		expect(setDefaults(config, { assignee: null }).defaults).toEqual({ workspace: '900' })
	})

	it('setDefaults drops the block once it holds nothing', () => {
		const config = setDefaults(createEmptyRepoConfig(), { assignee: 'ali' })
		expect(setDefaults(config, { assignee: null })).not.toHaveProperty('defaults')
	})
})

describe('conventions block', () => {
	it('parses a conventions block', () => {
		expect(
			parseRepoConfig({
				schema_version: 2,
				projects: [],
				conventions: {
					task_name_format: '<area>: <summary>',
					description_template: '## Context\n\n## Acceptance',
					default_tags: ['eng'],
				},
			}).conventions,
		).toEqual({
			task_name_format: '<area>: <summary>',
			description_template: '## Context\n\n## Acceptance',
			default_tags: ['eng'],
		})
	})

	it('rejects an unknown conventions key', () => {
		expect(() => parseRepoConfig({ schema_version: 2, projects: [], conventions: { naming: 'x' } })).toThrow(
			'conventions.naming',
		)
	})

	it('rejects default_tags that are not non-empty strings', () => {
		expect(() => parseRepoConfig({ schema_version: 2, projects: [], conventions: { default_tags: [''] } })).toThrow(
			'conventions.default_tags',
		)
	})

	it('setConventions merges, clears with null, and drops the empty block', () => {
		const config = setConventions(createEmptyRepoConfig(), { task_name_format: '<area>: <summary>' })
		expect(setConventions(config, { default_tags: ['eng'] }).conventions).toEqual({
			task_name_format: '<area>: <summary>',
			default_tags: ['eng'],
		})
		expect(setConventions(config, { task_name_format: null })).not.toHaveProperty('conventions')
	})
})

describe('normalizeProjectName', () => {
	it('trims and lowercases for comparison', () => {
		expect(normalizeProjectName('  Backend  ')).toBe('backend')
	})
})

describe('findConfigFile', () => {
	let root: string

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-config-'))
		await mkdir(join(root, '.git'))
		await mkdir(join(root, '.agents'))
		await writeFile(join(root, '.agents', 'cyber-asana.json'), '{"schema_version":1,"projects":[]}')
	})

	afterEach(async () => {
		await rm(root, { recursive: true, force: true })
	})

	it('finds config at git root from nested cwd', async () => {
		const nested = join(root, 'packages', 'app')
		await mkdir(nested, { recursive: true })
		expect(await findConfigFile(nested)).toBe(join(root, '.agents', 'cyber-asana.json'))
	})

	it('returns null when no git root config exists', async () => {
		const orphan = await mkdtemp(join(tmpdir(), 'cyber-asana-orphan-'))
		try {
			expect(await findConfigFile(orphan)).toBeNull()
		} finally {
			await rm(orphan, { recursive: true, force: true })
		}
	})

	it('prefers CYBER_ASANA_CONFIG env override', async () => {
		const custom = join(root, 'custom.json')
		await writeFile(custom, '{"schema_version":1,"projects":[]}')
		const prev = process.env.CYBER_ASANA_CONFIG
		process.env.CYBER_ASANA_CONFIG = custom
		try {
			expect(await findConfigFile(root)).toBe(custom)
		} finally {
			if (prev === undefined) delete process.env.CYBER_ASANA_CONFIG
			else process.env.CYBER_ASANA_CONFIG = prev
		}
	})
})

describe('loadRepoConfig and saveRepoConfig', () => {
	it('round-trips through filesystem', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'cyber-asana-load-'))
		const path = join(dir, 'config.json')
		try {
			const config = createEmptyRepoConfig()
			config.projects = [{ gid: '111', name: 'Test', aliases: [] }]
			await saveRepoConfig(path, config)
			expect(await loadRepoConfig(path)).toEqual(config)
		} finally {
			await rm(dir, { recursive: true, force: true })
		}
	})
})

describe('tryObserveProjectFromConfigPath', () => {
	it('writes file when observation updates config', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'cyber-asana-observe-'))
		const path = join(dir, 'config.json')
		try {
			await saveRepoConfig(path, {
				schema_version: 2,
				projects: [{ gid: '111', name: 'Old', aliases: [] }],
			})
			const updated = await tryObserveProjectFromConfigPath(path, { gid: '111', name: 'New' })
			expect(updated).toBe(true)
			const raw = JSON.parse(await readFile(path, 'utf8'))
			expect(raw.projects[0].name).toBe('New')
		} finally {
			await rm(dir, { recursive: true, force: true })
		}
	})
})

describe('user registry', () => {
	const alice = { gid: '100', name: 'Alice Anderson', email: 'alice@example.com', aliases: ['ali'] }
	const bob = { gid: '200', name: 'Bob Brown', email: 'bob@example.com', aliases: ['bobby'] }

	function withUsers(...users: RepoUserEntry[]) {
		return { ...createEmptyRepoConfig(), users }
	}

	describe('parseRepoConfig', () => {
		it('accepts a config without users (projects-only files stay valid)', () => {
			expect(parseRepoConfig({ schema_version: 2, projects: [] })).toEqual({ schema_version: 2, projects: [] })
		})

		it('parses users with aliases and optional email', () => {
			expect(
				parseRepoConfig({
					schema_version: 1,
					projects: [],
					users: [alice, { gid: '300', name: 'No Email', aliases: [] }],
				}).users,
			).toEqual([alice, { gid: '300', name: 'No Email', aliases: [] }])
		})

		it('rejects a user without a gid', () => {
			expect(() => parseRepoConfig({ schema_version: 1, projects: [], users: [{ name: 'X', aliases: [] }] })).toThrow(
				'users[0].gid',
			)
		})
	})

	describe('addUser', () => {
		it('appends a new user', () => {
			expect(addUser(createEmptyRepoConfig(), alice).users).toEqual([alice])
		})

		it('refreshes name and email and merges aliases for an existing gid', () => {
			const next = addUser(withUsers(alice), {
				gid: '100',
				name: 'Alice A.',
				email: 'alice@new.example.com',
				aliases: ['al'],
			})
			expect(next.users).toEqual([
				{ gid: '100', name: 'Alice A.', email: 'alice@new.example.com', aliases: ['ali', 'al'] },
			])
		})

		it('rejects an alias already registered to another user', () => {
			expect(() => addUser(withUsers(alice), { ...bob, aliases: ['ALI'] })).toThrow(/alias "ALI".*100/)
		})
	})

	describe('resolveUser', () => {
		const config = withUsers(alice, bob)

		it('resolves by gid', () => {
			expect(resolveUser(config, '200')).toEqual(bob)
		})

		it('resolves by alias, case-insensitively', () => {
			expect(resolveUser(config, ' Bobby ')).toEqual(bob)
		})

		it('resolves by email, case-insensitively', () => {
			expect(resolveUser(config, 'ALICE@example.com')).toEqual(alice)
		})

		it('resolves by full display name', () => {
			expect(resolveUser(config, 'bob brown')).toEqual(bob)
		})

		it('returns null when nothing matches', () => {
			expect(resolveUser(config, 'carol')).toBeNull()
		})

		it('prefers an alias over another user whose name matches', () => {
			const namedAli = { gid: '300', name: 'Ali', aliases: [] }
			expect(resolveUser(withUsers(alice, namedAli), 'ali')).toEqual(alice)
		})

		it('throws when a name matches more than one user', () => {
			const twin = { gid: '300', name: 'Bob Brown', aliases: [] }
			expect(() => resolveUser(withUsers(bob, twin), 'Bob Brown')).toThrow(/matches 2 registered users.*200.*300/)
		})
	})

	describe('removeUser', () => {
		it('removes the user with the given gid', () => {
			expect(removeUser(withUsers(alice, bob), '100').users).toEqual([bob])
		})
	})

	describe('removeAliases', () => {
		it('removes aliases case-insensitively from whichever user owns them', () => {
			const multi = { ...alice, aliases: ['ali', 'al', 'aa'] }
			expect(removeAliases(withUsers(multi, bob), ['AL', 'bobby']).users).toEqual([
				{ ...alice, aliases: ['ali', 'aa'] },
				{ ...bob, aliases: [] },
			])
		})

		it('rejects an alias that is not registered and changes nothing', () => {
			expect(() => removeAliases(withUsers(alice), ['ali', 'nope'])).toThrow('alias "nope" is not registered')
		})
	})

	describe('observeUser', () => {
		it('updates name and email when they changed', () => {
			const result = observeUser(withUsers(alice), { gid: '100', name: 'Alice Z', email: 'alice@example.com' })
			expect(result.updated).toBe(true)
			expect(result.config.users).toEqual([{ ...alice, name: 'Alice Z' }])
		})

		it('does not update when nothing changed', () => {
			expect(observeUser(withUsers(alice), { gid: '100', name: alice.name, email: alice.email }).updated).toBe(false)
		})
	})
})

describe('resolveAssignee', () => {
	let dir: string
	let path: string

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'cyber-asana-assignee-'))
		path = join(dir, 'config.json')
		await saveRepoConfig(path, {
			schema_version: 2,
			projects: [],
			users: [{ gid: '100', name: 'Alice Anderson', email: 'alice@example.com', aliases: ['ali'] }],
		})
	})

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true })
	})

	it('passes a numeric GID through without reading the registry', async () => {
		expect(await resolveAssignee('12345', { configPath: join(dir, 'missing.json') })).toBe('12345')
	})

	it('passes "me" through', async () => {
		expect(await resolveAssignee('me', { configPath: join(dir, 'missing.json') })).toBe('me')
	})

	it('resolves an alias to the registered GID', async () => {
		expect(await resolveAssignee('ali', { configPath: path })).toBe('100')
	})

	it('explains how to register an unknown user', async () => {
		await expect(resolveAssignee('carol', { configPath: path })).rejects.toThrow(/carol.*config add-user/)
	})

	it('explains how to register when there is no repo config', async () => {
		await expect(resolveAssignee('carol', { configPath: join(dir, 'missing.json') })).rejects.toThrow(/config add-user/)
	})
})

describe('resolveProjectRef', () => {
	let dir: string
	let path: string

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'cyber-asana-project-ref-'))
		path = join(dir, 'config.json')
		await saveRepoConfig(path, {
			schema_version: 2,
			projects: [
				{ gid: '111', name: 'Backend', aliases: ['api'] },
				{ gid: '222', name: 'Frontend', aliases: [], default: true },
			],
		})
	})

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true })
	})

	it('passes a numeric GID through without reading the registry', async () => {
		expect(await resolveProjectRef('12345', { configPath: join(dir, 'missing.json') })).toBe('12345')
	})

	it('resolves an alias to the registered GID', async () => {
		expect(await resolveProjectRef('api', { configPath: path })).toBe('111')
	})

	it('falls back to the default project when given nothing', async () => {
		expect(await resolveProjectRef(undefined, { configPath: path })).toBe('222')
	})

	it('returns undefined when given nothing and no project is marked default', async () => {
		await saveRepoConfig(path, { schema_version: 2, projects: [{ gid: '111', name: 'Backend', aliases: [] }] })
		expect(await resolveProjectRef(undefined, { configPath: path })).toBeUndefined()
	})

	it('returns undefined when given nothing and there is no repo config', async () => {
		expect(await resolveProjectRef(undefined, { configPath: join(dir, 'missing.json') })).toBeUndefined()
	})

	it('explains how to register an unknown project', async () => {
		await expect(resolveProjectRef('nope', { configPath: path })).rejects.toThrow(/nope.*config add/)
	})
})

describe('defaults fallbacks', () => {
	let dir: string
	let path: string

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'cyber-asana-defaults-'))
		path = join(dir, 'config.json')
		await saveRepoConfig(path, {
			schema_version: 2,
			projects: [],
			users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
			defaults: { assignee: 'ali', workspace: '900' },
		})
	})

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true })
	})

	it('resolveAssignee falls back to defaults.assignee when given nothing', async () => {
		expect(await resolveAssignee(undefined, { configPath: path })).toBe('100')
	})

	it('resolveAssignee returns undefined when given nothing and no default is set', async () => {
		await saveRepoConfig(path, { schema_version: 2, projects: [] })
		expect(await resolveAssignee(undefined, { configPath: path })).toBeUndefined()
	})

	it('resolveWorkspaceRef prefers the given value over the default', async () => {
		expect(await resolveWorkspaceRef('901', { configPath: path })).toBe('901')
	})

	it('resolveWorkspaceRef falls back to defaults.workspace', async () => {
		expect(await resolveWorkspaceRef(undefined, { configPath: path })).toBe('900')
	})

	it('resolveSectionRef falls back to defaults.section', async () => {
		await saveRepoConfig(path, { schema_version: 2, projects: [], defaults: { section: '800' } })
		expect(await resolveSectionRef(undefined, { configPath: path })).toBe('800')
	})
})
