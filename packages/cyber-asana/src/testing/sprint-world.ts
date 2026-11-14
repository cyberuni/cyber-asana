import { vi } from 'vitest'

export type WorldTask = { gid: string; name?: string; completed?: boolean }
type WorldSection = { gid: string; name: string; tasks: WorldTask[] }

/**
 * An in-memory Asana for sprint tests: projects hold ordered sections, sections hold ordered tasks.
 * Adding a task to a section takes it out of the project's other sections, as Asana does.
 */
export function createSprintWorld(projects: Record<string, Array<{ name: string; tasks?: WorldTask[] }>>) {
	let next = 100
	const world: Record<string, WorldSection[]> = Object.fromEntries(
		Object.entries(projects).map(([project, sections]) => [
			project,
			sections.map((s) => ({ gid: `s${next++}`, name: s.name, tasks: [...(s.tasks ?? [])] })),
		]),
	)
	const find = (sectionGid: string) => {
		for (const [project, sections] of Object.entries(world)) {
			const section = sections.find((s) => s.gid === sectionGid)
			if (section) return { project, section }
		}
		throw new Error(`no section ${sectionGid}`)
	}
	const gateways = {
		sections: {
			listSections: vi.fn(async (projectGid: string) =>
				(world[projectGid] ?? []).map(({ gid, name }) => ({ gid, name })),
			),
			createSection: vi.fn(async (projectGid: string, name: string) => {
				const section = { gid: `s${next++}`, name, tasks: [] }
				;(world[projectGid] ??= []).push(section)
				return { gid: section.gid, name }
			}),
			addTaskToSection: vi.fn(async (sectionGid: string, taskGid: string) => {
				const { project, section } = find(sectionGid)
				let task: WorldTask = { gid: taskGid }
				for (const s of world[project] ?? []) {
					const at = s.tasks.findIndex((t) => t.gid === taskGid)
					if (at >= 0) task = s.tasks.splice(at, 1)[0] as WorldTask
				}
				section.tasks.push(task)
			}),
		},
		tasks: {
			listTasksForSection: vi.fn(async (sectionGid: string, opts?: { incompleteOrCompletedSince?: string }) =>
				find(sectionGid).section.tasks.filter((t) => opts?.incompleteOrCompletedSince !== 'now' || !t.completed),
			),
			getTask: vi.fn(async (taskGid: string) => ({
				gid: taskGid,
				memberships: Object.entries(world).flatMap(([project, sections]) =>
					sections
						.filter((s) => s.tasks.some((t) => t.gid === taskGid))
						.map((s) => ({ project: { gid: project }, section: { gid: s.gid, name: s.name } })),
				),
			})),
		},
	}
	return {
		world,
		gateways,
		sectionNamed: (project: string, name: string) => world[project]?.find((s) => s.name === name),
	}
}
