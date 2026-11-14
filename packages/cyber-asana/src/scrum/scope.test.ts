import { describe, expect, it } from 'vitest'
import type { ScopeEntry } from '../config/scopes.js'
import { CodedConfigError } from '../platform/coded-error.js'
import { DEFAULT_SCRUM_POLICY } from './policy.js'
import {
	applyScopeOverrides,
	collectScopeTasks,
	resolveScopeProjects,
	type ScopeGateways,
	selectScope,
} from './scope.js'

const web: ScopeEntry = { name: 'web', kind: 'project', projects: ['1201'], default: true }
const platform: ScopeEntry = { name: 'platform', kind: 'projects', projects: ['1201', '1202'] }

function codeOf(fn: () => unknown): CodedConfigError {
	try {
		fn()
	} catch (error) {
		expect(error).toBeInstanceOf(CodedConfigError)
		return error as CodedConfigError
	}
	throw new Error('expected a throw')
}

describe('selectScope', () => {
	it('selects the scope --scope names, ignoring case', () => {
		expect(selectScope([web, platform], { name: 'PLATFORM' })).toEqual({ scope: platform, implicit: false })
	})

	it('selects the scope marked default when none is named', () => {
		expect(selectScope([platform, web], {})).toEqual({ scope: web, implicit: false })
	})

	it('reports scope-unknown, listing the configured scopes, when --scope names none of them', () => {
		const error = codeOf(() => selectScope([web, platform], { name: 'nope' }))
		expect(error.code).toBe('scope-unknown')
		expect(error.options).toEqual(['web', 'platform'])
		expect(error.message).toContain('"nope"')
	})

	it('reports scope-unknown, not scope-missing, for a named scope when none is configured', () => {
		const error = codeOf(() => selectScope([], { name: 'web', defaultProject: { gid: '1', name: 'Web' } }))
		expect(error.code).toBe('scope-unknown')
		expect(error.hint).toContain('config scope add')
	})

	it('reports scope-missing when scopes exist but none is default and none is named', () => {
		const error = codeOf(() => selectScope([platform], {}))
		expect(error.code).toBe('scope-missing')
		expect(error.options).toEqual(['platform'])
	})

	it('acts as an implicit project scope on the default project when no scope is configured', () => {
		expect(selectScope([], { defaultProject: { gid: '1201', name: 'Web' } })).toEqual({
			scope: { name: 'Web', kind: 'project', projects: ['1201'] },
			implicit: true,
		})
	})

	it('reports scope-missing when nothing is configured and there is no default project', () => {
		const error = codeOf(() => selectScope([], {}))
		expect(error.code).toBe('scope-missing')
		expect(error.hint).toContain('config scope add')
	})

	it('does not fall back to the default project once any scope is configured', () => {
		expect(codeOf(() => selectScope([platform], { defaultProject: { gid: '1', name: 'Web' } })).code).toBe(
			'scope-missing',
		)
	})
})

describe('applyScopeOverrides', () => {
	it('takes the policy value for every setting the scope leaves alone', () => {
		expect(applyScopeOverrides({ ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05' }, web)).toEqual({
			sprint_model: 'sections',
			sprint_length_days: 14,
			sprint_anchor_date: '2026-01-05',
		})
	})

	it('lets the scope override the model, length, and anchor, and only those', () => {
		expect(
			applyScopeOverrides(DEFAULT_SCRUM_POLICY, {
				...web,
				sprint_model: 'custom-field',
				sprint_length_days: 7,
				sprint_anchor_date: '2026-02-02',
			}),
		).toEqual({ sprint_model: 'custom-field', sprint_length_days: 7, sprint_anchor_date: '2026-02-02' })
	})

	it('leaves the anchor unset when neither the policy nor the scope has one', () => {
		expect(applyScopeOverrides(DEFAULT_SCRUM_POLICY, web)).not.toHaveProperty('sprint_anchor_date')
	})
})

type Item = { gid: string; name?: string; resource_type: string }

function portfolioGateway(tree: Record<string, Item[]>): ScopeGateways['portfolios'] & { calls: string[] } {
	const calls: string[] = []
	return {
		calls,
		async listPortfolioItems(gid, opts) {
			calls.push(gid)
			expect(opts?.fetchAll).toBe(true)
			return (tree[gid] ?? []) as never
		},
	}
}

describe('resolveScopeProjects', () => {
	const none = portfolioGateway({})

	it('returns the listed projects of a project or projects scope without calling Asana', async () => {
		expect(
			await resolveScopeProjects({ name: 'p', kind: 'projects', projects: ['2', '1'] }, { portfolios: none }),
		).toEqual([{ gid: '2' }, { gid: '1' }])
		expect(none.calls).toEqual([])
	})

	it('flattens a portfolio of projects', async () => {
		const portfolios = portfolioGateway({
			'1300': [
				{ gid: '1', name: 'A', resource_type: 'project' },
				{ gid: '2', name: 'B', resource_type: 'project' },
			],
		})
		expect(await resolveScopeProjects({ name: 'g', kind: 'portfolio', portfolio: '1300' }, { portfolios })).toEqual([
			{ gid: '1', name: 'A' },
			{ gid: '2', name: 'B' },
		])
	})

	it('follows a nested portfolio recursively, to any depth', async () => {
		const portfolios = portfolioGateway({
			'1': [
				{ gid: '10', name: 'A', resource_type: 'project' },
				{ gid: '2', resource_type: 'portfolio' },
			],
			'2': [
				{ gid: '3', resource_type: 'portfolio' },
				{ gid: '11', name: 'B', resource_type: 'project' },
			],
			'3': [{ gid: '12', name: 'C', resource_type: 'project' }],
		})
		const projects = await resolveScopeProjects({ name: 'g', kind: 'portfolio', portfolio: '1' }, { portfolios })
		expect(projects.map((p) => p.gid)).toEqual(['10', '12', '11'])
		expect(portfolios.calls).toEqual(['1', '2', '3'])
	})

	it('counts a project reachable through two portfolios once', async () => {
		const portfolios = portfolioGateway({
			'1': [
				{ gid: '10', name: 'A', resource_type: 'project' },
				{ gid: '2', resource_type: 'portfolio' },
			],
			'2': [{ gid: '10', name: 'A', resource_type: 'project' }],
		})
		const projects = await resolveScopeProjects({ name: 'g', kind: 'portfolio', portfolio: '1' }, { portfolios })
		expect(projects).toEqual([{ gid: '10', name: 'A' }])
	})

	it('visits a portfolio that contains itself, directly or through another, once', async () => {
		const portfolios = portfolioGateway({
			'1': [
				{ gid: '2', resource_type: 'portfolio' },
				{ gid: '10', name: 'A', resource_type: 'project' },
			],
			'2': [{ gid: '1', resource_type: 'portfolio' }],
		})
		const projects = await resolveScopeProjects({ name: 'g', kind: 'portfolio', portfolio: '1' }, { portfolios })
		expect(projects).toEqual([{ gid: '10', name: 'A' }])
		expect(portfolios.calls).toEqual(['1', '2'])
	})

	it('ignores items that are neither projects nor portfolios', async () => {
		const portfolios = portfolioGateway({ '1': [{ gid: '5', resource_type: 'goal' }] })
		expect(await resolveScopeProjects({ name: 'g', kind: 'portfolio', portfolio: '1' }, { portfolios })).toEqual([])
	})
})

describe('collectScopeTasks', () => {
	function taskGateway(byProject: Record<string, Array<{ gid: string; name: string }>>) {
		const calls: string[] = []
		return {
			calls,
			async listTasks(projectGid: string) {
				calls.push(projectGid)
				return (byProject[projectGid] ?? []) as never
			},
		} satisfies ScopeGateways['tasks'] & { calls: string[] }
	}

	it('counts a task homed in two projects of the scope once, keeping its first appearance', async () => {
		const tasks = taskGateway({
			'1': [
				{ gid: 't1', name: 'one' },
				{ gid: 't2', name: 'two' },
			],
			'2': [
				{ gid: 't2', name: 'two' },
				{ gid: 't3', name: 'three' },
			],
		})
		const result = await collectScopeTasks(['1', '2'], { tasks })
		expect(result.map((t) => t.gid)).toEqual(['t1', 't2', 't3'])
		expect(tasks.calls).toEqual(['1', '2'])
	})

	it('returns nothing for a scope with no projects', async () => {
		expect(await collectScopeTasks([], { tasks: taskGateway({}) })).toEqual([])
	})
})
