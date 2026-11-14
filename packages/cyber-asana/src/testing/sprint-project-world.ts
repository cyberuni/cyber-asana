import { vi } from 'vitest'
import type { ProjectModelGateways } from '../scrum/sprint-model/project.js'

type Task = { gid: string; name?: string; completed?: boolean }

/**
 * An in-memory Asana for the `project` sprint model: projects (the backlog and the sprints), one
 * portfolio listing the sprint projects, and tasks that live in any number of projects.
 */
export function createSprintProjectWorld(init: {
	/** Sprint projects already in the portfolio, by name. */
	sprints?: Record<string, string[]>
	backlog: string[]
	tasks: Task[]
	/** Projects in the portfolio that are not sprints. */
	extraPortfolioProjects?: Array<{ gid: string; name: string }>
}) {
	const names = new Map<string, string>([['backlog', 'Product backlog']])
	const portfolio: string[] = []
	const members = new Map<string, Set<string>>()
	const tasks = new Map(init.tasks.map((t) => [t.gid, t]))
	const home = (task: string) => members.get(task) ?? members.set(task, new Set()).get(task)!
	let next = 1
	for (const gid of init.backlog) home(gid).add('backlog')
	for (const [name, gids] of Object.entries(init.sprints ?? {})) {
		const projectGid = `sp-${name.replace(/\W+/g, '').toLowerCase()}`
		names.set(projectGid, name)
		portfolio.push(projectGid)
		for (const gid of gids) home(gid).add(projectGid)
	}
	for (const extra of init.extraPortfolioProjects ?? []) {
		names.set(extra.gid, extra.name)
		portfolio.push(extra.gid)
	}
	const created: Array<{ gid: string; name: string; via: 'create' | 'duplicate'; template?: string; team?: string }> =
		[]

	const gateways = {
		portfolios: {
			listPortfolioItems: vi.fn(async () => ({
				data: portfolio.map((gid) => ({ gid, name: names.get(gid), resource_type: 'project' })),
				next_page: null,
				limit: 100,
			})),
			addPortfolioItem: vi.fn(async (_portfolio: string, item: string) => {
				portfolio.push(item)
			}),
		},
		projects: {
			getProject: vi.fn(async (gid: string) => ({ gid, workspace: { gid: 'ws1' }, team: { gid: 'team1' } })),
			createProject: vi.fn(async (_ws: string, name: string, opts?: { team?: string }) => {
				const gid = `new${next++}`
				names.set(gid, name)
				created.push({ gid, name, via: 'create', ...(opts?.team && { team: opts.team }) })
				return { gid, name }
			}),
		},
		duplicateProject: vi.fn(async (template: string, fields: { name: string; team?: string }) => {
			const gid = `new${next++}`
			names.set(gid, fields.name)
			created.push({
				gid,
				name: fields.name,
				via: 'duplicate',
				template,
				...(fields.team && { team: fields.team }),
			})
			return { gid }
		}),
		tasks: {
			listTasks: vi.fn(async (projectGid: string, opts?: { incompleteOrCompletedSince?: string }) => ({
				data: [...tasks.values()]
					.filter((t) => home(t.gid).has(projectGid))
					.filter((t) => !(opts?.incompleteOrCompletedSince && t.completed))
					.map((t) => ({
						...t,
						memberships: [...home(t.gid)].map((p) => ({ project: { gid: p }, section: { name: 'Backlog' } })),
					})),
				next_page: null,
				limit: 100,
			})),
			getTask: vi.fn(async (gid: string) => ({
				gid,
				memberships: [...home(gid)].map((p) => ({ project: { gid: p } })),
			})),
			addTaskToProject: vi.fn(async (task: string, project: string) => {
				home(task).add(project)
			}),
			removeTaskFromProject: vi.fn(async (task: string, project: string) => {
				home(task).delete(project)
			}),
		},
	}
	return {
		addTask: (task: Task, projects: string[]) => {
			tasks.set(task.gid, task)
			for (const project of projects) home(task.gid).add(project)
		},
		removeTask: (gid: string) => {
			tasks.delete(gid)
			members.delete(gid)
		},
		nameOf: (gid: string) => names.get(gid),
		gateways: gateways as unknown as ProjectModelGateways,
		raw: gateways,
		created,
		portfolio,
		homes: (task: string) => [...home(task)].sort(),
		projectNamed: (name: string) => [...names.entries()].find(([, n]) => n === name)?.[0],
	}
}
