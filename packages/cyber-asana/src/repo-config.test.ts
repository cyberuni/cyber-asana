import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	addProject,
	addUser,
	createEmptyRepoConfig,
	findConfigFile,
	loadRepoConfig,
	normalizeProjectName,
	observeProject,
	observeUser,
	parseRepoConfig,
	type RepoUserEntry,
	removeAliases,
	removeProject,
	removeUser,
	resolveAssignee,
	resolveProject,
	resolveUser,
	saveRepoConfig,
	tryObserveProjectFromConfigPath,
} from './repo-config.js'

describe('parseRepoConfig', () => {
	it('parses v1 schema with projects array', () => {
		expect(
			parseRepoConfig({
				schema_version: 1,
				projects: [{ gid: '123', name: 'Backend' }],
			}),
		).toEqual({
			schema_version: 1,
			projects: [{ gid: '123', name: 'Backend' }],
		})
	})

	it('rejects missing schema_version', () => {
		expect(() => parseRepoConfig({ projects: [] })).toThrow('schema_version')
	})

	it('rejects unsupported schema_version', () => {
		expect(() => parseRepoConfig({ schema_version: 2, projects: [] })).toThrow('schema_version')
	})
})

describe('resolveProject', () => {
	const config = createEmptyRepoConfig()
	config.projects = [
		{ gid: '111', name: 'Backend' },
		{ gid: '222', name: 'Frontend' },
	]

	it('resolves by case-insensitive name without API calls', () => {
		expect(resolveProject(config, { name: 'backend' })).toEqual({ gid: '111', name: 'Backend' })
	})

	it('resolves by gid', () => {
		expect(resolveProject(config, { gid: '222' })).toEqual({ gid: '222', name: 'Frontend' })
	})

	it('returns null when not found', () => {
		expect(resolveProject(config, { name: 'Missing' })).toBeNull()
	})
})

describe('observeProject', () => {
	it('updates name when gid matches and name differs', () => {
		const config = createEmptyRepoConfig()
		config.projects = [{ gid: '111', name: 'Old Name' }]

		const result = observeProject(config, { gid: '111', name: 'New Name' })

		expect(result.updated).toBe(true)
		expect(result.config.projects[0]?.name).toBe('New Name')
	})

	it('does not update when name matches', () => {
		const config = createEmptyRepoConfig()
		config.projects = [{ gid: '111', name: 'Same' }]

		const result = observeProject(config, { gid: '111', name: 'Same' })

		expect(result.updated).toBe(false)
	})

	it('ignores gid not in config', () => {
		const config = createEmptyRepoConfig()
		config.projects = [{ gid: '111', name: 'A' }]

		const result = observeProject(config, { gid: '999', name: 'Other' })

		expect(result.updated).toBe(false)
		expect(result.config.projects).toHaveLength(1)
	})
})

describe('addProject and removeProject', () => {
	it('addProject appends new entry', () => {
		const config = createEmptyRepoConfig()
		const next = addProject(config, { gid: '111', name: 'Backend' })
		expect(next.projects).toEqual([{ gid: '111', name: 'Backend' }])
	})

	it('addProject updates name for duplicate gid', () => {
		const config = createEmptyRepoConfig()
		config.projects = [{ gid: '111', name: 'Old' }]
		const next = addProject(config, { gid: '111', name: 'New' })
		expect(next.projects).toEqual([{ gid: '111', name: 'New' }])
	})

	it('removeProject removes by gid or name', () => {
		const config = createEmptyRepoConfig()
		config.projects = [
			{ gid: '111', name: 'Backend' },
			{ gid: '222', name: 'Frontend' },
		]
		expect(removeProject(config, { gid: '111' }).projects).toHaveLength(1)
		expect(removeProject(config, { name: 'frontend' }).projects).toEqual([{ gid: '111', name: 'Backend' }])
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
			config.projects = [{ gid: '111', name: 'Test' }]
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
				schema_version: 1,
				projects: [{ gid: '111', name: 'Old' }],
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
			expect(parseRepoConfig({ schema_version: 1, projects: [] })).toEqual({ schema_version: 1, projects: [] })
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
			schema_version: 1,
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
