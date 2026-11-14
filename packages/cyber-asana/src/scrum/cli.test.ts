import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installUsageErrors } from '../platform/cli/usage.js'
import type { ScrumApi } from './api.js'
import { scopeConfigCommand, scrumCommand } from './cli.js'

function fakeApi(overrides: Partial<ScrumApi> = {}): ScrumApi {
	return {
		listScopes: vi.fn(async () => ({ scopes: [] })),
		addScope: vi.fn(async (scope) => ({ scope, path: '/r.json', target: 'repo' as const })),
		removeScope: vi.fn(async (name) => ({
			removed: name,
			already_absent: false,
			path: '/r.json',
			target: 'repo' as const,
		})),
		resolveScope: vi.fn(async () => ({
			scope: { name: 'web', kind: 'project' as const, projects: ['1201'] },
			implicit: false,
			projects: [{ gid: '1201', name: 'Web' }],
			sprint: { sprint_model: 'sections', sprint_length_days: 14 },
		})),
		...overrides,
	} as ScrumApi
}

function withGlobalOptions(program: Command) {
	program.option('--json').option('--toon')
	installUsageErrors(program)
	return program
}

function configProgram(api: ScrumApi) {
	return withGlobalOptions(new Command().addCommand(new Command('config').addCommand(scopeConfigCommand(() => api))))
}

describe('config scope', () => {
	const originalArgv = [...process.argv]
	afterEach(() => {
		vi.restoreAllMocks()
		process.argv = [...originalArgv]
	})

	async function run(program: Command, ...args: string[]) {
		const lines: string[] = []
		vi.spyOn(console, 'log').mockImplementation((...a) => {
			lines.push(a.join(' '))
		})
		process.argv = ['node', 'test', ...args]
		await program.parseAsync(['node', 'test', ...args], { from: 'node' })
		return lines
	}

	it('add builds a project scope from --kind and --project and marks the default', async () => {
		const api = fakeApi()
		await run(
			configProgram(api),
			'config',
			'scope',
			'add',
			'web',
			'--kind',
			'project',
			'--project',
			'1201',
			'--default',
		)
		expect(api.addScope).toHaveBeenCalledWith(
			{ name: 'web', kind: 'project', projects: ['1201'], default: true },
			{ global: undefined, configPath: undefined, repo: undefined },
		)
	})

	it('add accepts a comma list and repeated --project for a projects scope, with the three overrides', async () => {
		const api = fakeApi()
		await run(
			configProgram(api),
			'config',
			'scope',
			'add',
			'platform',
			'--kind',
			'projects',
			'--project',
			'1201,1202',
			'--project',
			'1203',
			'--sprint-model',
			'custom-field',
			'--sprint-length-days',
			'7',
			'--sprint-anchor-date',
			'2026-01-05',
		)
		expect(api.addScope).toHaveBeenCalledWith(
			{
				name: 'platform',
				kind: 'projects',
				projects: ['1201', '1202', '1203'],
				sprint_model: 'custom-field',
				sprint_length_days: 7,
				sprint_anchor_date: '2026-01-05',
			},
			expect.any(Object),
		)
	})

	it('add builds a portfolio scope and passes --global through', async () => {
		const api = fakeApi()
		await run(
			configProgram(api),
			'config',
			'scope',
			'add',
			'growth',
			'--kind',
			'portfolio',
			'--portfolio',
			'1300',
			'--global',
		)
		expect(api.addScope).toHaveBeenCalledWith(
			{ name: 'growth', kind: 'portfolio', portfolio: '1300' },
			expect.objectContaining({ global: true }),
		)
	})

	it('add builds a team scope', async () => {
		const api = fakeApi()
		await run(configProgram(api), 'config', 'scope', 'add', 'web-team', '--kind', 'team', '--team', '1400')
		expect(api.addScope).toHaveBeenCalledWith({ name: 'web-team', kind: 'team', team: '1400' }, expect.any(Object))
	})

	it('add rejects an unknown kind', async () => {
		await expect(
			run(configProgram(fakeApi()), 'config', 'scope', 'add', 'x', '--kind', 'cohort', '--project', '1'),
		).rejects.toThrow('Unknown scope kind "cohort"')
	})

	it('add rejects a non-numeric sprint length', async () => {
		await expect(
			run(
				configProgram(fakeApi()),
				'config',
				'scope',
				'add',
				'x',
				'--kind',
				'project',
				'--project',
				'1',
				'--sprint-length-days',
				'x',
			),
		).rejects.toThrow('--sprint-length-days')
	})

	it('add prints what it saved and where, and the next step', async () => {
		const lines = await run(
			configProgram(fakeApi()),
			'config',
			'scope',
			'add',
			'web',
			'--kind',
			'project',
			'--project',
			'1201',
		)
		expect(lines.join('\n')).toContain('Added scope web')
		expect(lines.join('\n')).toContain('/r.json')
		expect(lines.join('\n')).toContain('cyber-asana scrum scope resolve --scope web')
	})

	it('add emits the saved scope under --json', async () => {
		const lines = await run(
			configProgram(fakeApi()),
			'config',
			'scope',
			'add',
			'web',
			'--kind',
			'project',
			'--project',
			'1201',
			'--json',
		)
		expect(JSON.parse(lines.join('\n'))).toMatchObject({ scope: { name: 'web' }, path: '/r.json', target: 'repo' })
	})

	it('remove forwards the name and --global', async () => {
		const api = fakeApi()
		await run(configProgram(api), 'config', 'scope', 'remove', 'web', '--global')
		expect(api.removeScope).toHaveBeenCalledWith('web', expect.objectContaining({ global: true }))
	})

	it('remove says so, and succeeds, when the scope was already gone', async () => {
		const api = fakeApi({ removeScope: vi.fn(async (name) => ({ removed: name, already_absent: true as const })) })
		const lines = await run(configProgram(api), 'config', 'scope', 'remove', 'web')
		expect(lines.join('\n')).toContain('Scope web was already absent')
	})

	it('list prints a count and next steps', async () => {
		const api = fakeApi({
			listScopes: vi.fn(async () => ({
				scopes: [{ name: 'web', kind: 'project' as const, projects: ['1201'], source: 'repo' as const }],
			})),
		})
		const lines = await run(configProgram(api), 'config', 'scope', 'list')
		expect(lines).toContain('\n1 scope(s)')
		expect(lines.join('\n')).toContain('cyber-asana scrum scope resolve --scope <name>')
	})

	it('an empty list suggests adding a scope', async () => {
		const lines = await run(configProgram(fakeApi()), 'config', 'scope', 'list')
		expect(lines.join('\n')).toContain('cyber-asana config scope add <name> --kind project --project <gid>')
	})

	it('list names the empty state', async () => {
		expect((await run(configProgram(fakeApi()), 'config', 'scope', 'list')).join('\n')).toContain('0 scopes found')
	})

	it('list shows each scope with its members, overrides, default marker, and source', async () => {
		const api = fakeApi({
			listScopes: vi.fn(async () => ({
				scopes: [
					{
						name: 'web',
						kind: 'project' as const,
						projects: ['1201'],
						default: true as const,
						source: 'repo' as const,
					},
					{
						name: 'growth',
						kind: 'portfolio' as const,
						portfolio: '1300',
						sprint_length_days: 7,
						source: 'global' as const,
					},
				],
			})),
		})
		const text = (await run(configProgram(api), 'config', 'scope', 'list')).join('\n')
		expect(text).toMatch(/web\s+project\s+1201\s+yes\s+repo/)
		expect(text).toMatch(/growth\s+portfolio\s+1300\s+global/)
		expect(text).toContain('sprint_length_days=7')
	})

	it('list says when the repo default project stands in for a scope', async () => {
		const api = fakeApi({
			listScopes: vi.fn(async () => ({
				scopes: [],
				implicit: { name: 'Web', kind: 'project' as const, projects: ['1201'] },
			})),
		})
		const text = (await run(configProgram(api), 'config', 'scope', 'list')).join('\n')
		expect(text).toContain('0 scopes found')
		expect(text).toContain('implicit project scope "Web"')
	})
})

describe('scrum scope resolve', () => {
	const originalArgv = [...process.argv]
	afterEach(() => {
		vi.restoreAllMocks()
		process.argv = [...originalArgv]
	})

	async function run(api: ScrumApi, ...args: string[]) {
		const lines: string[] = []
		vi.spyOn(console, 'log').mockImplementation((...a) => {
			lines.push(a.join(' '))
		})
		process.argv = ['node', 'test', ...args]
		await withGlobalOptions(new Command().addCommand(scrumCommand(() => api))).parseAsync(['node', 'test', ...args], {
			from: 'node',
		})
		return lines
	}

	it('resolves the scope --scope names, with --tasks, and prints its projects and sprint settings', async () => {
		const api = fakeApi()
		const text = (await run(api, 'scrum', 'scope', 'resolve', '--scope', 'web', '--tasks')).join('\n')
		expect(api.resolveScope).toHaveBeenCalledWith(
			{ scope: 'web', tasks: true },
			{ configPath: undefined, repo: undefined },
		)
		expect(text).toContain('1201')
		expect(text).toContain('sprint_length_days')
	})

	it('emits the whole resolution under --json', async () => {
		const lines = await run(fakeApi(), 'scrum', 'scope', 'resolve', '--json')
		expect(JSON.parse(lines.join('\n'))).toMatchObject({ implicit: false, projects: [{ gid: '1201' }] })
	})

	it('prints a project count', async () => {
		expect(await run(fakeApi(), 'scrum', 'scope', 'resolve')).toContain('\n1 project(s)')
	})

	it('prints the people of a team scope, with a count, after its projects', async () => {
		const api = fakeApi({
			resolveScope: vi.fn(async () => ({
				scope: { name: 'web-team', kind: 'team' as const, team: '1400' },
				implicit: false,
				projects: [{ gid: '1201', name: 'Web' }],
				people: [
					{ gid: 'u1', name: 'Ada' },
					{ gid: 'u2', name: 'Bo' },
				],
				sprint: { sprint_model: 'custom-field', sprint_length_days: 14 },
			})),
		})
		const text = (await run(api, 'scrum', 'scope', 'resolve', '--scope', 'web-team')).join('\n')
		expect(text).toContain('Ada')
		expect(text).toContain('u2')
		expect(text).toContain('2 people')
	})

	it('notes an implicit scope', async () => {
		const api = fakeApi({
			resolveScope: vi.fn(async () => ({
				scope: { name: 'Web', kind: 'project' as const, projects: ['1201'] },
				implicit: true,
				projects: [{ gid: '1201' }],
				sprint: { sprint_model: 'sections', sprint_length_days: 14 },
			})),
		})
		expect((await run(api, 'scrum', 'scope', 'resolve')).join('\n')).toContain('implicit')
	})
})
