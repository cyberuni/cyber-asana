import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadEffectiveProjects, mergeProjectEntries, resolveEffectiveProject } from './effective-config.js'
import { saveGlobalConfig } from './global-config.js'
import { saveRepoConfig } from './repo-config.js'

describe('mergeProjectEntries', () => {
	it('unions two lists with no overlap', () => {
		expect(mergeProjectEntries([{ gid: '1', name: 'A' }], [{ gid: '2', name: 'B' }])).toEqual([
			{ gid: '1', name: 'A' },
			{ gid: '2', name: 'B' },
		])
	})

	it('keeps the local entry on a gid collision, dropping the global duplicate', () => {
		expect(mergeProjectEntries([{ gid: '1', name: 'Local Name' }], [{ gid: '1', name: 'Global Name' }])).toEqual([
			{ gid: '1', name: 'Local Name' },
		])
	})

	it('returns the global list unchanged when local is empty', () => {
		expect(mergeProjectEntries([], [{ gid: '1', name: 'A' }])).toEqual([{ gid: '1', name: 'A' }])
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
			schema_version: 1,
			projects: [{ gid: '1', name: 'Local' }],
		})
		const globalPath = join(root, 'global.json')
		await saveGlobalConfig(globalPath, {
			schema_version: 1,
			repos: [{ repo: 'github.com/org/repo', projects: [{ gid: '2', name: 'Global' }] }],
		})
		process.env.CYBER_ASANA_GLOBAL_CONFIG = globalPath
		try {
			const effective = await loadEffectiveProjects({ startDir: root })
			expect(effective.repo).toBe('github.com/org/repo')
			expect(effective.localPath).toBe(join(root, '.agents', 'cyber-asana.json'))
			expect(effective.projects).toEqual([
				{ gid: '1', name: 'Local' },
				{ gid: '2', name: 'Global' },
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
			repos: [{ repo: 'manual-key', projects: [{ gid: '3', name: 'Manual' }] }],
		})
		process.env.CYBER_ASANA_GLOBAL_CONFIG = globalPath
		try {
			const effective = await loadEffectiveProjects({ startDir: root, repo: 'manual-key' })
			expect(effective.repo).toBe('manual-key')
			expect(effective.projects).toEqual([{ gid: '3', name: 'Manual' }])
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
			projects: [{ gid: '1', name: 'Backend' }],
		}
		expect(resolveEffectiveProject(effective, { name: 'backend' })).toEqual({ gid: '1', name: 'Backend' })
		expect(resolveEffectiveProject(effective, { name: 'missing' })).toBeNull()
	})
})
