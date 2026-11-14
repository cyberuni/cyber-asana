import { CodedConfigError } from '../../platform/coded-error.js'
import { listItems } from '../../platform/pagination.js'
import type { PortfolioGateway } from '../../portfolios/gateway.js'
import type { ProjectGateway } from '../../projects/gateway.js'
import type { TaskGateway } from '../../tasks/gateway.js'
import { nameMatcher, resolveMatch } from '../sprint.js'
import type { SprintModel, SprintTarget, SprintTask } from './types.js'

export type ProjectModelGateways = {
	portfolios: Pick<PortfolioGateway, 'listPortfolioItems' | 'addPortfolioItem'>
	projects: Pick<ProjectGateway, 'getProject' | 'createProject'>
	tasks: Pick<TaskGateway, 'listTasks' | 'getTask' | 'addTaskToProject' | 'removeTaskFromProject'>
	/** Copies a project and waits for the copy; the new project's GID. Unset: a template is not used. */
	duplicateProject?: (templateGid: string, fields: { name: string; team?: string }) => Promise<{ gid: string }>
}

type SprintProject = { gid: string; name: string }
type Membership = { project?: { gid?: string }; section?: { name?: string } }
type ProjectTask = SprintTask & { memberships?: Membership[] }

const DEFAULT_FIELDS = 'gid,name,completed,assignee.name'

function required(target: SprintTarget): NonNullable<SprintTarget['sprintProject']> {
	if (!target.sprintProject) {
		throw new CodedConfigError('scope-incomplete', 'The project sprint model needs a backlog project and a portfolio', {
			hint: 'Set them on the scope: cyber-asana config scope add <name> ... --backlog-project <gid> --sprint-portfolio <gid>',
		})
	}
	return target.sprintProject
}

/**
 * The `project` sprint model (docs/design/scrum-system.md § 4.2): a sprint is a project named by
 * `sprint_name_format` inside a portfolio, tasks are multi-homed from the backlog project into the
 * sprint's project, and the backlog is the backlog project's incomplete tasks that no sprint holds.
 */
export function createProjectModel(gateways: ProjectModelGateways): SprintModel {
	/** The portfolio's projects whose names match the sprint format, never the backlog project. */
	async function sprintProjects(target: SprintTarget): Promise<Array<SprintProject & { n: number }>> {
		const { backlog, portfolio } = required(target)
		const matcher = nameMatcher({ sprint_name_format: target.settings.sprint_name_format })
		const items = listItems(
			await gateways.portfolios.listPortfolioItems(portfolio, { fetchAll: true, optFields: 'name,resource_type' }),
		) as Array<{ gid?: string; name?: string; resource_type?: string }>
		const found: Array<SprintProject & { n: number }> = []
		for (const item of items) {
			if (!item.gid || !item.name || item.resource_type !== 'project' || item.gid === backlog.gid) continue
			const match = matcher.exec(item.name)
			if (match) found.push({ gid: item.gid, name: item.name, n: resolveMatch(match, target.settings) })
		}
		return found
	}

	async function projectFor(target: SprintTarget, sprint: { name: string }): Promise<SprintProject | undefined> {
		return (await sprintProjects(target)).find((p) => p.name === sprint.name)
	}

	async function projectTasks(projectGid: string, opts: { incomplete?: boolean; optFields?: string }) {
		return listItems(
			await gateways.tasks.listTasks(projectGid, {
				fetchAll: true,
				optFields: opts.optFields ?? DEFAULT_FIELDS,
				...(opts.incomplete && { incompleteOrCompletedSince: 'now' }),
			}),
		) as ProjectTask[]
	}

	const model: SprintModel = {
		kind: 'project',

		async sections(target, sprint) {
			const { backlog } = required(target)
			const found = await projectFor(target, sprint)
			if (!found) return { found: [], missing: [backlog] }
			return { found: [{ project: backlog, section: { gid: found.gid, name: found.name } }], missing: [] }
		},

		async listSprints(target) {
			const { backlog } = required(target)
			const byIndex = new Map<number, SprintProject>()
			for (const project of await sprintProjects(target)) if (!byIndex.has(project.n)) byIndex.set(project.n, project)
			return [...byIndex.entries()]
				.sort(([a], [b]) => a - b)
				.map(([n, project]) => ({
					n,
					sections: [{ project: backlog, section: { gid: project.gid, name: project.name } }],
				}))
		},

		async tasks(target, sprint, opts) {
			const found = await projectFor(target, sprint)
			return found ? projectTasks(found.gid, opts) : []
		},

		async backlog(target, opts) {
			const { backlog } = required(target)
			const sprintGids = new Set((await sprintProjects(target)).map((p) => p.gid))
			const tasks = await projectTasks(backlog.gid, {
				incomplete: true,
				optFields: `${opts.optFields ?? DEFAULT_FIELDS},memberships.project.gid,memberships.section.name`,
			})
			return tasks
				.filter((task) => !(task.memberships ?? []).some((m) => m.project?.gid && sprintGids.has(m.project.gid)))
				.map((task) => ({
					...task,
					section: (task.memberships ?? []).find((m) => m.project?.gid === backlog.gid)?.section?.name ?? '',
					project: backlog.gid,
				}))
		},

		async start(target, sprint) {
			const { backlog, portfolio, template } = required(target)
			const existing = await projectFor(target, sprint)
			if (existing) return { created: [], existing: [backlog] }
			const home = (await gateways.projects.getProject(backlog.gid, { optFields: 'workspace.gid,team.gid' })) as {
				workspace?: { gid?: string }
				team?: { gid?: string }
			}
			const team = home.team?.gid
			let gid: string | undefined
			if (template && gateways.duplicateProject) {
				gid = (await gateways.duplicateProject(template, { name: sprint.name, ...(team && { team }) })).gid
			} else {
				if (!home.workspace?.gid) throw new Error(`Could not read the workspace of project ${backlog.gid}`)
				gid = (await gateways.projects.createProject(home.workspace.gid, sprint.name, { ...(team && { team }) })).gid
			}
			await gateways.portfolios.addPortfolioItem(portfolio, gid)
			return { created: [backlog], existing: [], sprintProject: { gid, name: sprint.name } }
		},

		async add(target, sprint, taskGids) {
			const { backlog } = required(target)
			const found = await projectFor(target, sprint)
			const added: Array<{ task: string; project: string; from?: string }> = []
			const already: string[] = []
			const outside: string[] = []
			for (const taskGid of taskGids) {
				const task = (await gateways.tasks.getTask(taskGid, { optFields: 'memberships.project.gid' })) as ProjectTask
				const homes = (task.memberships ?? []).map((m) => m.project?.gid)
				if (found && homes.includes(found.gid)) already.push(taskGid)
				else if (found && homes.includes(backlog.gid)) {
					await gateways.tasks.addTaskToProject(taskGid, found.gid)
					added.push({ task: taskGid, project: backlog.gid })
				} else outside.push(taskGid)
			}
			return { added, already, outside_scope: outside, missing: found ? [] : [backlog] }
		},

		async close(target, sprint, next, carryOver) {
			const { backlog } = required(target)
			const found = await projectFor(target, sprint)
			const open = found ? await projectTasks(found.gid, { incomplete: true, optFields: 'gid' }) : []
			const plain = open.map((task) => ({ task: task.gid, project: backlog.gid }))
			if (!found || carryOver === 'leave' || open.length === 0) return { moved: [], left: plain, created_next: [] }
			const started = await model.start(target, next)
			const nextProject = started.sprintProject ?? (await projectFor(target, next))
			if (!nextProject) throw new Error(`Could not find the project for ${next.name} after starting it`)
			for (const item of plain) {
				// Add first, so a failure never leaves a task in no sprint at all.
				await gateways.tasks.addTaskToProject(item.task, nextProject.gid)
				await gateways.tasks.removeTaskFromProject(item.task, found.gid)
			}
			return { moved: plain, left: [], created_next: started.created }
		},
	}
	return model
}
