import { describe, expect, it } from 'vitest'
import { createSprintWorld } from '../../testing/sprint-world.js'
import { DEFAULT_SCRUM_POLICY } from '../policy.js'
import { sprintWindow } from '../sprint.js'
import { createSectionsModel } from './sections.js'

const settings = { ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05' }
const sprint2 = sprintWindow(2, settings)
const sprint3 = sprintWindow(3, settings)
const projects = [{ gid: 'p1' }, { gid: 'p2' }]
const target = { projects, settings, backlogSection: 'Backlog' }

function setup() {
	const w = createSprintWorld({
		p1: [
			{ name: 'Backlog', tasks: [{ gid: 't1' }, { gid: 't2', completed: true }] },
			{ name: 'Sprint 1', tasks: [{ gid: 't3', completed: true }] },
			{ name: 'Sprint 2', tasks: [{ gid: 't4' }, { gid: 't5', completed: true }, { gid: 't6' }] },
			{ name: 'Icebox', tasks: [{ gid: 't7' }] },
		],
		p2: [
			{ name: 'Backlog', tasks: [{ gid: 't8' }] },
			{ name: 'Sprint 2', tasks: [{ gid: 't4' }, { gid: 't9' }] },
		],
	})
	return { ...w, model: createSectionsModel(w.gateways) }
}

describe('sections sprint model', () => {
	it('finds the sprint section in each project and names the projects without one', async () => {
		const { model } = setup()
		const found = await model.sections(target, sprint3)
		expect(found.found).toEqual([])
		expect(found.missing.map((p) => p.gid)).toEqual(['p1', 'p2'])
		const two = await model.sections(target, sprint2)
		expect(two.found.map((f) => [f.project.gid, f.section.name])).toEqual([
			['p1', 'Sprint 2'],
			['p2', 'Sprint 2'],
		])
	})

	it('lists the sprints that have a section, by index', async () => {
		const { model } = setup()
		const listed = await model.listSprints(target)
		expect(listed.map((s) => [s.n, s.sections.map((x) => x.project.gid)])).toEqual([
			[1, ['p1']],
			[2, ['p1', 'p2']],
		])
	})

	it('lists a sprint tasks once each, across projects', async () => {
		const { model } = setup()
		const tasks = await model.tasks(target, sprint2, {})
		expect(tasks.map((t) => t.gid)).toEqual(['t4', 't5', 't6', 't9'])
	})

	it('lists only incomplete sprint tasks on request', async () => {
		const { model } = setup()
		const tasks = await model.tasks(target, sprint2, { incomplete: true })
		expect(tasks.map((t) => t.gid)).toEqual(['t4', 't6', 't9'])
	})

	it('lists the backlog: incomplete tasks in no sprint section, tagged with their section', async () => {
		const { model } = setup()
		const backlog = await model.backlog(target, {})
		expect(backlog.map((t) => [t.gid, t.section])).toEqual([
			['t1', 'Backlog'],
			['t7', 'Icebox'],
			['t8', 'Backlog'],
		])
	})

	it('leaves a task out of the backlog when another project has it in a sprint', async () => {
		const w = createSprintWorld({
			p1: [{ name: 'Backlog', tasks: [{ gid: 'tx' }] }],
			p2: [{ name: 'Sprint 2', tasks: [{ gid: 'tx' }] }],
		})
		const backlog = await createSectionsModel(w.gateways).backlog(target, {})
		expect(backlog).toEqual([])
	})

	it('starts a sprint by creating its section where missing, and is a no-op where present', async () => {
		const { model, gateways } = setup()
		const first = await model.start(target, sprint3)
		expect(first.created.map((p) => p.gid)).toEqual(['p1', 'p2'])
		const again = await model.start(target, sprint3)
		expect(again.created).toEqual([])
		expect(again.existing.map((p) => p.gid)).toEqual(['p1', 'p2'])
		expect(gateways.sections.createSection).toHaveBeenCalledTimes(2)
	})

	it('adds a task to the sprint section of each scope project it is in', async () => {
		const { model, sectionNamed } = setup()
		const result = await model.add(target, sprint2, ['t1', 't8'])
		expect(result.added.map((a) => [a.task, a.project, a.from])).toEqual([
			['t1', 'p1', 'Backlog'],
			['t8', 'p2', 'Backlog'],
		])
		expect(sectionNamed('p1', 'Sprint 2')?.tasks.map((t) => t.gid)).toContain('t1')
	})

	it('treats adding a task already in the sprint as a no-op', async () => {
		const { model, gateways } = setup()
		const result = await model.add(target, sprint2, ['t4'])
		expect(result.added).toEqual([])
		expect(result.already).toEqual(['t4'])
		expect(gateways.sections.addTaskToSection).not.toHaveBeenCalled()
	})

	it('reports a task that is in none of the scope projects', async () => {
		const { model } = setup()
		const result = await model.add(target, sprint2, ['nope'])
		expect(result.outside_scope).toEqual(['nope'])
	})

	it('closes with carry_over move: incomplete tasks go to the next sprint, created if missing', async () => {
		const { model, sectionNamed } = setup()
		const result = await model.close(target, sprint2, sprint3, 'move')
		expect(result.moved.map((m) => [m.task, m.project])).toEqual([
			['t4', 'p1'],
			['t6', 'p1'],
			['t4', 'p2'],
			['t9', 'p2'],
		])
		expect(result.created_next.map((p) => p.gid)).toEqual(['p1', 'p2'])
		expect(sectionNamed('p1', 'Sprint 3')?.tasks.map((t) => t.gid)).toEqual(['t4', 't6'])
		expect(sectionNamed('p1', 'Sprint 2')?.tasks.map((t) => t.gid)).toEqual(['t5'])
	})

	it('closing again moves nothing', async () => {
		const { model } = setup()
		await model.close(target, sprint2, sprint3, 'move')
		const again = await model.close(target, sprint2, sprint3, 'move')
		expect(again.moved).toEqual([])
		expect(again.created_next).toEqual([])
	})

	it('closes with carry_over leave: nothing moves and the incomplete tasks are reported', async () => {
		const { model, gateways } = setup()
		const result = await model.close(target, sprint2, sprint3, 'leave')
		expect(result.moved).toEqual([])
		expect(result.left.map((t) => t.task)).toEqual(['t4', 't6', 't4', 't9'])
		expect(gateways.sections.createSection).not.toHaveBeenCalled()
	})
})
