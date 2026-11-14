import { describe, expect, it } from 'vitest'
import { createFieldSprintWorld } from '../../testing/field-sprint-world.js'
import { DEFAULT_SCRUM_POLICY } from '../policy.js'
import { sprintWindow } from '../sprint.js'
import { createCustomFieldModel } from './custom-field.js'

const settings = { ...DEFAULT_SCRUM_POLICY, sprint_anchor_date: '2026-01-05' }
const sprint1 = sprintWindow(1, settings)
const sprint2 = sprintWindow(2, settings)
const sprint3 = sprintWindow(3, settings)
const projects = [{ gid: 'p1' }, { gid: 'p2' }]
const target = { projects, settings, backlogSection: 'Backlog' }

function setup(over: Partial<Parameters<typeof createFieldSprintWorld>[0]> = {}) {
	const w = createFieldSprintWorld({
		options: ['Sprint 1', 'Sprint 2'],
		attached: ['p1', 'p2'],
		tasks: [
			{ gid: 't1', projects: ['p1'] },
			{ gid: 't2', projects: ['p1'], completed: true },
			{ gid: 't3', projects: ['p1'], sprint: 'Sprint 1', completed: true },
			{ gid: 't4', projects: ['p1', 'p2'], sprint: 'Sprint 2' },
			{ gid: 't5', projects: ['p2'], sprint: 'Sprint 2', completed: true },
			{ gid: 't6', projects: ['p2'], sprint: 'Sprint 2' },
			{ gid: 't7', projects: ['p2'] },
		],
		...over,
	})
	return { ...w, model: createCustomFieldModel(w.gateways as never) }
}

describe('custom-field sprint model', () => {
	it('finds a sprint as an option of the field and names projects the field is not attached to', async () => {
		const { model, optionNamed } = setup({ attached: ['p1'] })
		const two = await model.sections(target, sprint2)
		expect(two.found.map((f) => [f.project.gid, f.section.name, f.section.gid])).toEqual([
			['p1', 'Sprint 2', optionNamed('Sprint 2')?.gid],
		])
		expect(two.missing.map((p) => p.gid)).toEqual(['p2'])
		expect((await model.sections(target, sprint3)).found).toEqual([])
	})

	it('uses the sprint field the config registered for a project, ignoring discovery', async () => {
		const { model, gateways } = setup()
		await model.sections({ ...target, sprintFields: { p1: 'f1', p2: 'f1' } }, sprint1)
		expect(gateways.customFields.listCustomFieldSettingsForProject).not.toHaveBeenCalled()
	})

	it('stops with sprint-field-missing when no project has a Sprint field', async () => {
		const { model } = setup({ attached: [] })
		await expect(model.sections(target, sprint1)).rejects.toMatchObject({ code: 'sprint-field-missing' })
	})

	it('lists the sprints that have an option, by index', async () => {
		const { model } = setup()
		const listed = await model.listSprints(target)
		expect(listed.map((s) => [s.n, s.sections.map((x) => x.project.gid)])).toEqual([
			[1, ['p1', 'p2']],
			[2, ['p1', 'p2']],
		])
	})

	it('lists a sprint tasks through search on the field value, once each', async () => {
		const { model, gateways, optionNamed } = setup()
		const tasks = await model.tasks(target, sprint2, {})
		expect(tasks.map((t) => t.gid)).toEqual(['t4', 't5', 't6'])
		expect(gateways.tasks.searchTasks).toHaveBeenCalledWith(
			'w1',
			expect.objectContaining({
				projectsAny: 'p1,p2',
				customFields: [{ gid: 'f1', operator: 'value', value: optionNamed('Sprint 2')?.gid }],
			}),
		)
	})

	it('lists only incomplete sprint tasks on request', async () => {
		const { model } = setup()
		expect((await model.tasks(target, sprint2, { incomplete: true })).map((t) => t.gid)).toEqual(['t4', 't6'])
	})

	it('lists the backlog as incomplete tasks whose Sprint field is unset', async () => {
		const { model } = setup()
		const backlog = await model.backlog(target, {})
		expect(backlog.map((t) => [t.gid, t.project])).toEqual([
			['t1', 'p1'],
			['t7', 'p2'],
		])
	})

	it('starts a sprint by creating its option, and starting it again changes nothing', async () => {
		const { model, options, gateways } = setup()
		const first = await model.start(target, sprint3)
		expect(first.created.map((p) => p.gid)).toEqual(['p1', 'p2'])
		expect(options.map((o) => o.name)).toContain('Sprint 3')
		const again = await model.start(target, sprint3)
		expect(again.created).toEqual([])
		expect(again.existing.map((p) => p.gid)).toEqual(['p1', 'p2'])
		expect(gateways.customFields.createEnumOption).toHaveBeenCalledTimes(1)
	})

	it('adds a task by setting the field, and leaves one already in the sprint alone', async () => {
		const { model, taskNamed, gateways } = setup()
		const result = await model.add(target, sprint2, ['t1', 't4', 'nope-outside'].slice(0, 2))
		expect(taskNamed('t1')?.sprint).toBe('Sprint 2')
		expect(result.added).toEqual([{ task: 't1', project: 'p1' }])
		expect(result.already).toEqual(['t4'])
		expect(gateways.tasks.updateTask).toHaveBeenCalledTimes(1)
	})

	it('reports a task outside the scope', async () => {
		const { model } = setup({ tasks: [{ gid: 'x', projects: ['other'] }] })
		expect((await model.add(target, sprint2, ['x'])).outside_scope).toEqual(['x'])
	})

	it('carries incomplete tasks over on close, creating the next option', async () => {
		const { model, taskNamed, options } = setup({ options: ['Sprint 1', 'Sprint 2'] })
		const result = await model.close(target, sprint2, sprint3, 'move')
		expect(result.moved.map((m) => m.task).sort()).toEqual(['t4', 't6'])
		expect(taskNamed('t4')?.sprint).toBe('Sprint 3')
		expect(taskNamed('t5')?.sprint).toBe('Sprint 2')
		expect(options.map((o) => o.name)).toContain('Sprint 3')
		expect(result.created_next.map((p) => p.gid)).toEqual(['p1', 'p2'])
	})

	it('leaves incomplete tasks where they are with carry_over leave', async () => {
		const { model, taskNamed } = setup()
		const result = await model.close(target, sprint2, sprint3, 'leave')
		expect(result.moved).toEqual([])
		expect(result.left.map((l) => l.task).sort()).toEqual(['t4', 't6'])
		expect(taskNamed('t4')?.sprint).toBe('Sprint 2')
	})

	it('turns a 402 from search into premium-required, naming the model', async () => {
		const { model } = setup({ premium: false })
		await expect(model.tasks(target, sprint2, {})).rejects.toMatchObject({
			code: 'premium-required',
			message: expect.stringContaining('custom-field'),
		})
		await expect(model.backlog(target, {})).rejects.toMatchObject({ code: 'premium-required' })
	})
})
