import { describe, expect, it } from 'vitest'
import { createSprintProjectWorld } from '../../testing/sprint-project-world.js'
import { DEFAULT_SCRUM_POLICY } from '../policy.js'
import { sprintWindow } from '../sprint.js'
import { createProjectModel } from './project.js'
import type { SprintTarget } from './types.js'

const settings = { ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05' }
const sprint1 = sprintWindow(1, settings)
const sprint2 = sprintWindow(2, settings)
const sprint3 = sprintWindow(3, settings)
const backlog = { gid: 'backlog' }
const target = (extra: Partial<NonNullable<SprintTarget['sprintProject']>> = {}): SprintTarget => ({
	projects: [backlog],
	settings,
	backlogSection: 'Backlog',
	sprintProject: { backlog, portfolio: 'pf1', ...extra },
})

function setup(overrides: Partial<Parameters<typeof createSprintProjectWorld>[0]> = {}) {
	const world = createSprintProjectWorld({
		sprints: { 'Sprint 1': ['t3'], 'Sprint 2': ['t1', 't4', 't5'] },
		backlog: ['t1', 't2', 't3', 't4', 't5', 't6'],
		tasks: [
			{ gid: 't1' },
			{ gid: 't2' },
			{ gid: 't3', completed: true },
			{ gid: 't4' },
			{ gid: 't5', completed: true },
			{ gid: 't6' },
		],
		extraPortfolioProjects: [{ gid: 'other', name: 'Roadmap notes' }],
		...overrides,
	})
	const model = createProjectModel({
		...world.gateways,
		duplicateProject: world.raw.duplicateProject,
	})
	return { ...world, model }
}

describe('project sprint model', () => {
	it('stands a sprint for a portfolio project named by the format', async () => {
		const { model } = setup()
		const two = await model.sections(target(), sprint2)
		expect(two.found.map((f) => [f.project.gid, f.section.gid, f.section.name])).toEqual([
			['backlog', 'sp-sprint2', 'Sprint 2'],
		])
		const three = await model.sections(target(), sprint3)
		expect(three.found).toEqual([])
		expect(three.missing.map((p) => p.gid)).toEqual(['backlog'])
	})

	it('lists the sprint projects by index and ignores other portfolio projects', async () => {
		const { model } = setup()
		const listed = await model.listSprints(target())
		expect(listed.map((s) => [s.n, s.sections[0]?.section.gid])).toEqual([
			[1, 'sp-sprint1'],
			[2, 'sp-sprint2'],
		])
	})

	it('lists a sprint project tasks, incomplete only on request', async () => {
		const { model } = setup()
		expect((await model.tasks(target(), sprint2, {})).map((t) => t.gid)).toEqual(['t1', 't4', 't5'])
		expect((await model.tasks(target(), sprint2, { incomplete: true })).map((t) => t.gid)).toEqual(['t1', 't4'])
		expect(await model.tasks(target(), sprint3, {})).toEqual([])
	})

	it('takes the backlog project incomplete tasks that no sprint project holds', async () => {
		const { model } = setup()
		const tasks = await model.backlog(target(), {})
		expect(tasks.map((t) => t.gid)).toEqual(['t2', 't6'])
		expect(tasks[0]).toMatchObject({ project: 'backlog', section: 'Backlog' })
	})

	it('starts a sprint by creating a project in the backlog workspace and team, then adds it to the portfolio', async () => {
		const { model, created, portfolio } = setup()
		const result = await model.start(target(), sprint3)
		expect(created).toEqual([{ gid: 'new1', name: 'Sprint 3', via: 'create', team: 'team1' }])
		expect(portfolio).toContain('new1')
		expect(result.created.map((p) => p.gid)).toEqual(['backlog'])
		expect(result.sprintProject).toEqual({ gid: 'new1', name: 'Sprint 3' })
	})

	it('starts a sprint by duplicating the template when the scope names one', async () => {
		const { model, created, portfolio } = setup()
		await model.start(target({ template: 'tpl1' }), sprint3)
		expect(created).toEqual([{ gid: 'new1', name: 'Sprint 3', via: 'duplicate', template: 'tpl1', team: 'team1' }])
		expect(portfolio).toContain('new1')
	})

	it('starting a sprint whose project exists changes nothing', async () => {
		const { model, created } = setup()
		const result = await model.start(target(), sprint2)
		expect(created).toEqual([])
		expect(result.created).toEqual([])
		expect(result.existing.map((p) => p.gid)).toEqual(['backlog'])
	})

	it('adds a backlog task by multi-homing it, and reports repeats and strangers', async () => {
		const { model, homes } = setup({ tasks: [{ gid: 't1' }, { gid: 't2' }, { gid: 'x' }], backlog: ['t1', 't2'] })
		const result = await model.add(target(), sprint2, ['t1', 't2', 'x'])
		expect(result.added).toEqual([{ task: 't2', project: 'backlog' }])
		expect(result.already).toEqual(['t1'])
		expect(result.outside_scope).toEqual(['x'])
		expect(homes('t2')).toEqual(['backlog', 'sp-sprint2'])
	})

	it('closes with move: the next sprint project is made, and incomplete tasks leave the old sprint for it', async () => {
		const { model, homes, created } = setup()
		const result = await model.close(target(), sprint2, sprint3, 'move')
		expect(created.map((c) => c.name)).toEqual(['Sprint 3'])
		expect(result.moved).toEqual([
			{ task: 't1', project: 'backlog' },
			{ task: 't4', project: 'backlog' },
		])
		expect(result.created_next.map((p) => p.gid)).toEqual(['backlog'])
		expect(homes('t1')).toEqual(['backlog', 'new1'])
		// A completed task keeps its sprint, so the closed sprint still shows what it delivered.
		expect(homes('t5')).toEqual(['backlog', 'sp-sprint2'])
	})

	it('closes with leave: nothing moves and the incomplete tasks are reported', async () => {
		const { model, homes, created } = setup()
		const result = await model.close(target(), sprint2, sprint3, 'leave')
		expect(created).toEqual([])
		expect(result.left.map((l) => l.task)).toEqual(['t1', 't4'])
		expect(homes('t1')).toEqual(['backlog', 'sp-sprint2'])
	})

	it('closing a sprint with nothing incomplete does not create the next project', async () => {
		const { model, created } = setup()
		const result = await model.close(target(), sprint1, sprint2, 'move')
		expect(created).toEqual([])
		expect(result.moved).toEqual([])
	})
})
