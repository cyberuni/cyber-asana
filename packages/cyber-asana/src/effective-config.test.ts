import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	loadEffectiveProjects,
	loadEffectiveUsers,
	mergeProjectEntries,
	mergeUserEntries,
	resolveEffectiveAssignee,
	resolveEffectiveProject,
	resolveEffectiveUser,
	resolveEffectiveUsersQuery,
} from './effective-config.js'
import { saveGlobalConfig } from './global-config.js'
import { saveRepoConfig } from './repo-config.js'

describe('mergeProjectEntries', () => {
	it('unions two lists with no overlap', () => {
		expect(mergeProjectEntries([{ gid: '1', name: 'A', aliases: [] }], [{ gid: '2', name: 'B', aliases: [] }])).toEqual(
			[
				{ gid: '1', name: 'A', aliases: [] },
				{ gid: '2', name: 'B', aliases: [] },
			],
		)
	})

	it('keeps the local entry on a gid collision, dropping the global duplicate', () => {
		expect(
			mergeProjectEntries(
				[{ gid: '1', name: 'Local Name', aliases: [] }],
				[{ gid: '1', name: 'Global Name', aliases: [] }],
			),
		).toEqual([{ gid: '1', name: 'Local Name', aliases: [] }])
	})

	it('returns the global list unchanged when local is empty', () => {
		expect(mergeProjectEntries([], [{ gid: '1', name: 'A', aliases: [] }])).toEqual([
			{ gid: '1', name: 'A', aliases: [] },
		])
	})
})

describe('loadEffectiveProjects', () => {
	let root: string

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-effective-'))
		await mkdir(join(root, '.git'))
		await writeFile(join(root, '.git', 'config'), '[remote "origin"]\n\turl = git@github.com:org/repo.git\n')
	})

	afterEach(async () => {
		await rm(root, { recursive: true, force: true })
	})

	it('unions the repo config and the global entry for the derived repo key', async () => {
		await mkdir(join(root, '.agents'))
		await saveRepoConfig(join(root, '.agents', 'cyber-asana.json'), {
			schema_version: 2,
			projects: [{ gid: '1', name: 'Local', aliases: [] }],
		})
		const globalPath = join(root, 'global.json')
		await saveGlobalConfig(globalPath, {
			schema_version: 1,
			repos: [{ repo: 'github.com/org/repo', projects: [{ gid: '2', name: 'Global', aliases: [] }] }],
		})
		process.env.CYBER_ASANA_GLOBAL_CONFIG = globalPath
		try {
			const effective = await loadEffectiveProjects({ startDir: root })
			expect(effective.repo).toBe('github.com/org/repo')
			expect(effective.localPath).toBe(join(root, '.agents', 'cyber-asana.json'))
			expect(effective.projects).toEqual([
				{ gid: '1', name: 'Local', aliases: [] },
				{ gid: '2', name: 'Global', aliases: [] },
			])
		} finally {
			delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		}
	})

	it('reports no local path and empty projects when neither source exists', async () => {
		process.env.CYBER_ASANA_GLOBAL_CONFIG = join(root, 'missing-global.json')
		try {
			const effective = await loadEffectiveProjects({ startDir: root })
			expect(effective.localPath).toBeNull()
			expect(effective.projects).toEqual([])
		} finally {
			delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		}
	})

	it('honors an explicit repo override for the global side', async () => {
		const globalPath = join(root, 'global.json')
		await saveGlobalConfig(globalPath, {
			schema_version: 1,
			repos: [{ repo: 'manual-key', projects: [{ gid: '3', name: 'Manual', aliases: [] }] }],
		})
		process.env.CYBER_ASANA_GLOBAL_CONFIG = globalPath
		try {
			const effective = await loadEffectiveProjects({ startDir: root, repo: 'manual-key' })
			expect(effective.repo).toBe('manual-key')
			expect(effective.projects).toEqual([{ gid: '3', name: 'Manual', aliases: [] }])
		} finally {
			delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		}
	})

	it('never throws for an unresolvable repo key outside any git working tree', async () => {
		const orphan = await mkdtemp(join(tmpdir(), 'cyber-asana-orphan-'))
		try {
			const effective = await loadEffectiveProjects({ startDir: orphan })
			expect(effective.repo).toBeNull()
			expect(effective.projects).toEqual([])
		} finally {
			await rm(orphan, { recursive: true, force: true })
		}
	})
})

describe('resolveEffectiveProject', () => {
	it('resolves by name across the merged list', () => {
		const effective = {
			localPath: null,
			globalPath: '/x',
			repo: null,
			projects: [{ gid: '1', name: 'Backend', aliases: [] }],
		}
		expect(resolveEffectiveProject(effective, { name: 'backend' })).toEqual({ gid: '1', name: 'Backend', aliases: [] })
		expect(resolveEffectiveProject(effective, { name: 'missing' })).toBeNull()
	})
})

describe('mergeUserEntries', () => {
	it('unions two lists with no overlap', () => {
		expect(mergeUserEntries([{ gid: '1', name: 'A', aliases: [] }], [{ gid: '2', name: 'B', aliases: [] }])).toEqual([
			{ gid: '1', name: 'A', aliases: [] },
			{ gid: '2', name: 'B', aliases: [] },
		])
	})

	it('keeps the local entry on a gid collision, dropping the global duplicate', () => {
		expect(
			mergeUserEntries(
				[{ gid: '1', name: 'Local Alice', aliases: ['ali'] }],
				[{ gid: '1', name: 'Global Alice', aliases: ['al'] }],
			),
		).toEqual([{ gid: '1', name: 'Local Alice', aliases: ['ali'] }])
	})
})

describe('loadEffectiveUsers / resolveEffectiveUsersQuery (merged listing)', () => {
	let root: string

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-effective-users-'))
	})

	afterEach(async () => {
		await rm(root, { recursive: true, force: true })
	})

	it('unions the repo config and global users, local winning a gid collision', async () => {
		await mkdir(join(root, '.agents'))
		await saveRepoConfig(join(root, '.agents', 'cyber-asana.json'), {
			schema_version: 2,
			projects: [],
			users: [{ gid: '100', name: 'Local Alice', aliases: ['ali'] }],
		})
		const globalPath = join(root, 'global.json')
		await saveGlobalConfig(globalPath, {
			schema_version: 1,
			repos: [],
			users: [
				{ gid: '100', name: 'Global Alice', aliases: ['al'] },
				{ gid: '200', name: 'Bob', aliases: ['bobby'] },
			],
		})
		process.env.CYBER_ASANA_GLOBAL_CONFIG = globalPath
		try {
			const effective = await loadEffectiveUsers({ startDir: root })
			expect(effective.users).toEqual([
				{ gid: '100', name: 'Local Alice', aliases: ['ali'] },
				{ gid: '200', name: 'Bob', aliases: ['bobby'] },
			])
		} finally {
			delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		}
	})

	it('resolveEffectiveUsersQuery raises a cross-scope ambiguity that neither source has alone', () => {
		const effective = {
			localPath: null,
			globalPath: '/x',
			users: [
				{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] },
				{ gid: '200', name: 'Bob Impostor', aliases: ['ali'] },
			],
		}
		expect(() => resolveEffectiveUsersQuery(effective, 'ali')).toThrow(/matches 2 registered users/)
	})
})

describe('resolveEffectiveUser (staged, not merged)', () => {
	let root: string

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-staged-'))
	})

	afterEach(async () => {
		await rm(root, { recursive: true, force: true })
	})

	it('resolves from the repo config without ever reading the global registry', async () => {
		await mkdir(join(root, '.agents'))
		await saveRepoConfig(join(root, '.agents', 'cyber-asana.json'), {
			schema_version: 2,
			projects: [],
			users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
		})
		process.env.CYBER_ASANA_GLOBAL_CONFIG = join(root, 'nonexistent-global.json')
		try {
			const user = await resolveEffectiveUser('ali', { startDir: root })
			expect(user).toEqual({ gid: '100', name: 'Alice Anderson', aliases: ['ali'] })
		} finally {
			delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		}
	})

	it('falls back to the global registry when the repo config has no match', async () => {
		await mkdir(join(root, '.git'))
		await writeFile(join(root, '.git', 'config'), '[remote "origin"]\n\turl = git@github.com:org/repo.git\n')
		await mkdir(join(root, '.agents'))
		await saveRepoConfig(join(root, '.agents', 'cyber-asana.json'), {
			schema_version: 2,
			projects: [],
			users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
		})
		const globalPath = join(root, 'global.json')
		await saveGlobalConfig(globalPath, {
			schema_version: 1,
			repos: [],
			users: [{ gid: '200', name: 'Bob Brown', aliases: ['bobby'] }],
		})
		process.env.CYBER_ASANA_GLOBAL_CONFIG = globalPath
		try {
			const user = await resolveEffectiveUser('bobby', { startDir: root })
			expect(user).toEqual({ gid: '200', name: 'Bob Brown', aliases: ['bobby'] })
		} finally {
			delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		}
	})

	it('resolves from the global registry even with no .git anywhere — global users carry no repo key', async () => {
		const globalPath = join(root, 'global.json')
		await saveGlobalConfig(globalPath, {
			schema_version: 1,
			repos: [],
			users: [{ gid: '200', name: 'Bob Brown', aliases: ['bobby'] }],
		})
		process.env.CYBER_ASANA_GLOBAL_CONFIG = globalPath
		try {
			const user = await resolveEffectiveUser('bobby', { startDir: root })
			expect(user).toEqual({ gid: '200', name: 'Bob Brown', aliases: ['bobby'] })
		} finally {
			delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		}
	})

	it("raises the repo config's own ambiguous-match error without consulting global", async () => {
		await mkdir(join(root, '.agents'))
		await saveRepoConfig(join(root, '.agents', 'cyber-asana.json'), {
			schema_version: 2,
			projects: [],
			users: [
				{ gid: '100', name: 'Bob Brown', aliases: ['bb'] },
				{ gid: '200', name: 'Bob Brown', aliases: ['bb2'] },
			],
		})
		process.env.CYBER_ASANA_GLOBAL_CONFIG = join(root, 'nonexistent-global.json')
		try {
			await expect(resolveEffectiveUser('Bob Brown', { startDir: root })).rejects.toThrow(/matches 2 registered users/)
		} finally {
			delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		}
	})

	it('returns null when neither source resolves the query', async () => {
		process.env.CYBER_ASANA_GLOBAL_CONFIG = join(root, 'nonexistent-global.json')
		try {
			expect(await resolveEffectiveUser('carol', { startDir: root })).toBeNull()
		} finally {
			delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		}
	})
})

describe('resolveEffectiveAssignee', () => {
	let root: string

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-assignee-'))
		process.env.CYBER_ASANA_GLOBAL_CONFIG = join(root, 'nonexistent-global.json')
	})

	afterEach(async () => {
		delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		await rm(root, { recursive: true, force: true })
	})

	it('passes a numeric gid or "me" through without reading either registry', async () => {
		expect(await resolveEffectiveAssignee('12345', { startDir: root })).toBe('12345')
		expect(await resolveEffectiveAssignee('me', { startDir: root })).toBe('me')
	})

	it('resolves an alias to the registered gid', async () => {
		await mkdir(join(root, '.agents'))
		await saveRepoConfig(join(root, '.agents', 'cyber-asana.json'), {
			schema_version: 2,
			projects: [],
			users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
		})
		expect(await resolveEffectiveAssignee('ali', { startDir: root })).toBe('100')
	})

	it('names both config add-user and --global when nothing resolves', async () => {
		await expect(resolveEffectiveAssignee('carol', { startDir: root })).rejects.toThrow(/config add-user/)
		await expect(resolveEffectiveAssignee('carol', { startDir: root })).rejects.toThrow(/--global/)
	})
})
