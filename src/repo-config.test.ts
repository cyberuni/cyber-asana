import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	addProject,
	createEmptyRepoConfig,
	findConfigFile,
	loadRepoConfig,
	normalizeProjectName,
	observeProject,
	parseRepoConfig,
	removeProject,
	resolveProject,
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
