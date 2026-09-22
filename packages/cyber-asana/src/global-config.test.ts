import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	addGlobalProject,
	createEmptyGlobalConfig,
	findGlobalRepoEntry,
	type GlobalConfig,
	globalConfigPath,
	loadGlobalConfig,
	normalizeRepoUrl,
	observeGlobalProject,
	parseGlobalConfig,
	removeGlobalProject,
	resolveGlobalProject,
	resolveRepoKey,
	saveGlobalConfig,
} from './global-config.js'

describe('parseGlobalConfig', () => {
	it('parses v1 schema with repos array', () => {
		expect(
			parseGlobalConfig({
				schema_version: 1,
				repos: [{ repo: 'github.com/org/repo', projects: [{ gid: '123', name: 'Backend' }] }],
			}),
		).toEqual({
			schema_version: 1,
			repos: [{ repo: 'github.com/org/repo', projects: [{ gid: '123', name: 'Backend' }] }],
		})
	})

	it('rejects missing schema_version', () => {
		expect(() => parseGlobalConfig({ repos: [] })).toThrow('schema_version')
	})

	it('rejects a repos entry with no repo key', () => {
		expect(() => parseGlobalConfig({ schema_version: 1, repos: [{ projects: [] }] })).toThrow('repos[0].repo')
	})

	it('rejects a project entry missing a name, scoped to its repo', () => {
		expect(() => parseGlobalConfig({ schema_version: 1, repos: [{ repo: 'x', projects: [{ gid: '1' }] }] })).toThrow(
			'repos[0].projects[0].name',
		)
	})
})

describe('normalizeRepoUrl', () => {
	it('normalizes an scp-style SSH URL', () => {
		expect(normalizeRepoUrl('git@github.com:cyberuni/cyber-asana.git')).toBe('github.com/cyberuni/cyber-asana')
	})

	it('normalizes an HTTPS URL to the same key', () => {
		expect(normalizeRepoUrl('https://github.com/cyberuni/cyber-asana.git')).toBe('github.com/cyberuni/cyber-asana')
	})

	it('normalizes an ssh:// URL with userinfo', () => {
		expect(normalizeRepoUrl('ssh://git@github.com/cyberuni/cyber-asana.git')).toBe('github.com/cyberuni/cyber-asana')
	})

	it('drops a trailing slash and lowercases', () => {
		expect(normalizeRepoUrl('https://GitHub.com/CyberUni/Cyber-Asana/')).toBe('github.com/cyberuni/cyber-asana')
	})
})

describe('findGlobalRepoEntry / addGlobalProject / removeGlobalProject / resolveGlobalProject', () => {
	it('addGlobalProject creates a new repo entry when none exists', () => {
		const next = addGlobalProject(createEmptyGlobalConfig(), 'repo-a', { gid: '1', name: 'Backend' })
		expect(findGlobalRepoEntry(next, 'repo-a')).toEqual({ repo: 'repo-a', projects: [{ gid: '1', name: 'Backend' }] })
	})

	it('addGlobalProject appends to an existing repo entry without touching other repos', () => {
		let config = addGlobalProject(createEmptyGlobalConfig(), 'repo-a', { gid: '1', name: 'Backend' })
		config = addGlobalProject(config, 'repo-b', { gid: '2', name: 'Other' })
		config = addGlobalProject(config, 'repo-a', { gid: '3', name: 'Frontend' })
		expect(findGlobalRepoEntry(config, 'repo-a')?.projects).toEqual([
			{ gid: '1', name: 'Backend' },
			{ gid: '3', name: 'Frontend' },
		])
		expect(findGlobalRepoEntry(config, 'repo-b')?.projects).toEqual([{ gid: '2', name: 'Other' }])
	})

	it('addGlobalProject replaces the entry when the gid is already registered for that repo', () => {
		let config = addGlobalProject(createEmptyGlobalConfig(), 'repo-a', { gid: '1', name: 'Old' })
		config = addGlobalProject(config, 'repo-a', { gid: '1', name: 'New' })
		expect(findGlobalRepoEntry(config, 'repo-a')?.projects).toEqual([{ gid: '1', name: 'New' }])
	})

	it('removeGlobalProject removes only from the matching repo', () => {
		let config = addGlobalProject(createEmptyGlobalConfig(), 'repo-a', { gid: '1', name: 'Backend' })
		config = addGlobalProject(config, 'repo-b', { gid: '1', name: 'Backend (other repo)' })
		config = removeGlobalProject(config, 'repo-a', { gid: '1' })
		expect(findGlobalRepoEntry(config, 'repo-a')?.projects).toEqual([])
		expect(findGlobalRepoEntry(config, 'repo-b')?.projects).toEqual([{ gid: '1', name: 'Backend (other repo)' }])
	})

	it('resolveGlobalProject resolves by name, scoped to the repo, case-insensitively', () => {
		let config = addGlobalProject(createEmptyGlobalConfig(), 'repo-a', { gid: '1', name: 'Backend' })
		config = addGlobalProject(config, 'repo-b', { gid: '2', name: 'Different' })
		expect(resolveGlobalProject(config, 'repo-a', { name: 'backend' })).toEqual({ gid: '1', name: 'Backend' })
		expect(resolveGlobalProject(config, 'repo-b', { name: 'backend' })).toBeNull()
	})

	it('findGlobalRepoEntry returns null for an unregistered repo', () => {
		expect(findGlobalRepoEntry(createEmptyGlobalConfig(), 'nope')).toBeNull()
	})
})

describe('observeGlobalProject', () => {
	it('refreshes a drifted name, scoped to the repo and gid', () => {
		let config = addGlobalProject(createEmptyGlobalConfig(), 'repo-a', { gid: '1', name: 'Old' })
		config = addGlobalProject(config, 'repo-b', { gid: '1', name: 'Old' })
		const result = observeGlobalProject(config, { repo: 'repo-a', gid: '1', name: 'New' })
		expect(result.updated).toBe(true)
		expect(findGlobalRepoEntry(result.config, 'repo-a')?.projects).toEqual([{ gid: '1', name: 'New' }])
		expect(findGlobalRepoEntry(result.config, 'repo-b')?.projects).toEqual([{ gid: '1', name: 'Old' }])
	})

	it('does not update when the name already matches', () => {
		const config = addGlobalProject(createEmptyGlobalConfig(), 'repo-a', { gid: '1', name: 'Same' })
		expect(observeGlobalProject(config, { repo: 'repo-a', gid: '1', name: 'Same' }).updated).toBe(false)
	})

	it('ignores an unregistered repo or gid', () => {
		const config = addGlobalProject(createEmptyGlobalConfig(), 'repo-a', { gid: '1', name: 'A' })
		expect(observeGlobalProject(config, { repo: 'repo-missing', gid: '1', name: 'X' }).updated).toBe(false)
		expect(observeGlobalProject(config, { repo: 'repo-a', gid: '999', name: 'X' }).updated).toBe(false)
	})
})

describe('globalConfigPath', () => {
	const prevOverride = process.env.CYBER_ASANA_GLOBAL_CONFIG
	const prevXdg = process.env.XDG_CONFIG_HOME

	afterEach(() => {
		if (prevOverride === undefined) delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		else process.env.CYBER_ASANA_GLOBAL_CONFIG = prevOverride
		if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME
		else process.env.XDG_CONFIG_HOME = prevXdg
	})

	it('prefers CYBER_ASANA_GLOBAL_CONFIG when set', () => {
		process.env.CYBER_ASANA_GLOBAL_CONFIG = '/custom/global.json'
		delete process.env.XDG_CONFIG_HOME
		expect(globalConfigPath()).toBe('/custom/global.json')
	})

	it('falls back to XDG_CONFIG_HOME/cyber-asana/config.json', () => {
		delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		process.env.XDG_CONFIG_HOME = '/home/operator/.config'
		expect(globalConfigPath()).toBe(join('/home/operator/.config', 'cyber-asana', 'config.json'))
	})
})

describe('loadGlobalConfig and saveGlobalConfig', () => {
	it('round-trips through the filesystem', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'cyber-asana-global-'))
		const path = join(dir, 'nested', 'config.json')
		try {
			const config: GlobalConfig = {
				schema_version: 1,
				repos: [{ repo: 'repo-a', projects: [{ gid: '1', name: 'Backend' }] }],
			}
			await saveGlobalConfig(path, config)
			expect(await loadGlobalConfig(path)).toEqual(config)
		} finally {
			await rm(dir, { recursive: true, force: true })
		}
	})
})

describe('resolveRepoKey', () => {
	let root: string

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-repokey-'))
	})

	afterEach(async () => {
		await rm(root, { recursive: true, force: true })
	})

	it('returns the explicit --repo verbatim without touching the filesystem', async () => {
		expect(await resolveRepoKey(root, 'manual-key')).toBe('manual-key')
	})

	it('normalizes the origin remote from .git/config', async () => {
		await mkdir(join(root, '.git'))
		await writeFile(
			join(root, '.git', 'config'),
			'[core]\n\tbare = false\n[remote "origin"]\n\turl = git@github.com:cyberuni/cyber-asana.git\n\tfetch = +refs/*:refs/*\n',
		)
		expect(await resolveRepoKey(root)).toBe('github.com/cyberuni/cyber-asana')
	})

	it('falls back to the git root path when there is no remote', async () => {
		await mkdir(join(root, '.git'))
		await writeFile(join(root, '.git', 'config'), '[core]\n\tbare = false\n')
		expect(await resolveRepoKey(root)).toBe(root)
	})

	it('falls back to the git root path when .git/config is missing entirely', async () => {
		await mkdir(join(root, '.git'))
		expect(await resolveRepoKey(root)).toBe(root)
	})

	it('walks up from a nested directory to find the git root', async () => {
		await mkdir(join(root, '.git'))
		await writeFile(join(root, '.git', 'config'), '[remote "origin"]\n\turl = https://github.com/org/repo.git\n')
		const nested = join(root, 'packages', 'app')
		await mkdir(nested, { recursive: true })
		expect(await resolveRepoKey(nested)).toBe('github.com/org/repo')
	})

	it('returns null when no .git is found anywhere up to the filesystem root', async () => {
		expect(await resolveRepoKey(root)).toBeNull()
	})
})
