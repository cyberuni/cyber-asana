import type { ScopeEntry } from '../config/scopes.js'
import { CodedConfigError } from '../platform/coded-error.js'
import { listItems } from '../platform/pagination.js'
import type { PortfolioGateway } from '../portfolios/gateway.js'
import type { TaskGateway } from '../tasks/gateway.js'
import type { ScrumPolicy } from './policy.js'

/** The Asana reads a scope needs, taken as gateways so this module never touches the SDK. */
export type ScopeGateways = {
	portfolios: Pick<PortfolioGateway, 'listPortfolioItems'>
	tasks: Pick<TaskGateway, 'listTasks'>
}

export type SelectedScope = {
	scope: ScopeEntry
	/** True when no scope is configured and the repo's default project stands in for one. */
	implicit: boolean
}

const ADD_HINT = 'Configure one with: cyber-asana config scope add <name> --kind project --project <gid> --default'

/**
 * Choose the scope a command runs against (§ 6): the one `--scope` names; else the one marked
 * `default`; else, only when no scope is configured at all, the repo's default project as an implicit
 * `project` scope. A named scope that does not exist is `scope-unknown`; no way to pick one is
 * `scope-missing`. The two are told apart by `code`.
 */
export function selectScope(
	scopes: ScopeEntry[],
	opts: { name?: string; defaultProject?: { gid: string; name: string } },
): SelectedScope {
	const names = scopes.map((scope) => scope.name)
	if (opts.name !== undefined) {
		const wanted = opts.name.trim().toLowerCase()
		const found = scopes.find((scope) => scope.name.trim().toLowerCase() === wanted)
		if (found) return { scope: found, implicit: false }
		throw new CodedConfigError('scope-unknown', `Scope "${opts.name}" is not configured`, {
			options: names,
			hint: names.length > 0 ? 'Pass one of the options to --scope.' : ADD_HINT,
		})
	}
	const marked = scopes.find((scope) => scope.default)
	if (marked) return { scope: marked, implicit: false }
	if (scopes.length === 0 && opts.defaultProject) {
		return {
			scope: { name: opts.defaultProject.name, kind: 'project', projects: [opts.defaultProject.gid] },
			implicit: true,
		}
	}
	throw new CodedConfigError(
		'scope-missing',
		scopes.length > 0
			? 'No scope given and none is marked default'
			: 'No scope is configured and the repo has no default project',
		{
			options: names,
			hint:
				scopes.length > 0
					? 'Pass --scope <name>, or mark one with: cyber-asana config scope add <name> ... --default'
					: ADD_HINT,
		},
	)
}

export type SprintSettings = Pick<ScrumPolicy, 'sprint_model' | 'sprint_length_days' | 'sprint_anchor_date'>

/** The policy's sprint settings with the scope's overrides laid over them. Nothing else may be overridden. */
export function applyScopeOverrides(policy: ScrumPolicy, scope: ScopeEntry): SprintSettings {
	const anchor = scope.sprint_anchor_date ?? policy.sprint_anchor_date
	return {
		sprint_model: scope.sprint_model ?? policy.sprint_model,
		sprint_length_days: scope.sprint_length_days ?? policy.sprint_length_days,
		...(anchor !== undefined && { sprint_anchor_date: anchor }),
	}
}

export type ScopeProject = { gid: string; name?: string }

type PortfolioItem = { gid?: string; name?: string; resource_type?: string }

/**
 * The projects a scope covers. `project` and `projects` name them outright; `portfolio` reads the
 * portfolio's items and follows nested portfolios depth first. A project reachable twice is listed
 * once, and a portfolio is read once however it is reached, so a cycle ends.
 */
export async function resolveScopeProjects(
	scope: ScopeEntry,
	gateways: Pick<ScopeGateways, 'portfolios'>,
): Promise<ScopeProject[]> {
	if (scope.kind !== 'portfolio') return (scope.projects ?? []).map((gid) => ({ gid }))
	const projects = new Map<string, ScopeProject>()
	const visited = new Set<string>()
	async function walk(portfolioGid: string) {
		if (visited.has(portfolioGid)) return
		visited.add(portfolioGid)
		const items = listItems(
			await gateways.portfolios.listPortfolioItems(portfolioGid, { fetchAll: true, optFields: 'name,resource_type' }),
		) as PortfolioItem[]
		for (const item of items) {
			if (!item.gid) continue
			if (item.resource_type === 'portfolio') await walk(item.gid)
			else if (item.resource_type === 'project' && !projects.has(item.gid)) {
				projects.set(item.gid, { gid: item.gid, ...(item.name !== undefined && { name: item.name }) })
			}
		}
	}
	await walk(scope.portfolio as string)
	return [...projects.values()]
}

/** A scope's tasks across its projects. A task multi-homed in two of them is returned once, by GID. */
export async function collectScopeTasks(
	projectGids: string[],
	gateways: Pick<ScopeGateways, 'tasks'>,
	opts?: { optFields?: string },
) {
	const seen = new Map<string, { gid?: string }>()
	for (const projectGid of projectGids) {
		const tasks = listItems(
			await gateways.tasks.listTasks(projectGid, {
				fetchAll: true,
				...(opts?.optFields && { optFields: opts.optFields }),
			}),
		)
		for (const task of tasks) {
			if (task.gid && !seen.has(task.gid)) seen.set(task.gid, task)
		}
	}
	return [...seen.values()] as Array<{ gid: string } & Record<string, unknown>>
}
