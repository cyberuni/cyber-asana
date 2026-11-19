import { describe, expect, it, vi } from 'vitest'
import type { ProjectBriefApi } from './api.js'
import { registerProjectBriefTools } from './mcp.js'

type Handler = (params: any) => Promise<any>

function setup(over: Partial<ProjectBriefApi> = {}) {
	const handlers = new Map<string, Handler>()
	const server = { tool: (name: string, _d: string, _s: unknown, h: Handler) => handlers.set(name, h) }
	const api = {
		getProjectBrief: vi.fn(),
		createProjectBrief: vi.fn(),
		updateProjectBrief: vi.fn(),
		deleteProjectBrief: vi.fn(),
		...over,
	} as ProjectBriefApi
	registerProjectBriefTools(server as never, api)
	return handlers
}

describe('project-briefs/mcp', () => {
	it('registers the four brief tools', () => {
		expect([...setup().keys()].sort()).toEqual([
			'asana_project_brief_create',
			'asana_project_brief_delete',
			'asana_project_brief_get',
			'asana_project_brief_update',
		])
	})

	it('create, get and update pass their fields through', async () => {
		const createProjectBrief = vi.fn().mockResolvedValue({ gid: 'b1' })
		const getProjectBrief = vi.fn().mockResolvedValue({ gid: 'b1', title: 'T' })
		const updateProjectBrief = vi.fn().mockResolvedValue({ gid: 'b1' })
		const handlers = setup({ createProjectBrief, getProjectBrief, updateProjectBrief })

		const created = await handlers.get('asana_project_brief_create')?.({
			project_gid: 'p1',
			title: 'T',
			html_text: '<body>x</body>',
		})
		const read = await handlers.get('asana_project_brief_get')?.({ project_brief_gid: 'b1', opt_fields: 'gid,title' })
		await handlers.get('asana_project_brief_update')?.({ project_brief_gid: 'b1', text: 'new' })

		expect(createProjectBrief).toHaveBeenCalledWith('p1', { title: 'T', html_text: '<body>x</body>' }, undefined)
		expect(getProjectBrief).toHaveBeenCalledWith('b1', { optFields: 'gid,title' })
		expect(updateProjectBrief).toHaveBeenCalledWith('b1', { text: 'new' }, undefined)
		expect(JSON.parse(created.content[0].text)).toEqual({ gid: 'b1' })
		expect(JSON.parse(read.content[0].text)).toEqual({ gid: 'b1', title: 'T' })
	})

	it('update refuses a call with no field to change', async () => {
		const updateProjectBrief = vi.fn()
		const handlers = setup({ updateProjectBrief })

		await expect(handlers.get('asana_project_brief_update')?.({ project_brief_gid: 'b1' })).rejects.toThrow(
			/at least one/,
		)
		expect(updateProjectBrief).not.toHaveBeenCalled()
	})

	it('delete reports already_absent for a missing brief', async () => {
		const deleteProjectBrief = vi
			.fn()
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce({ response: { status: 404, body: { errors: [{ message: 'Not Found' }] } } })
		const handlers = setup({ deleteProjectBrief })

		const first = await handlers.get('asana_project_brief_delete')?.({ project_brief_gid: 'b1' })
		const second = await handlers.get('asana_project_brief_delete')?.({ project_brief_gid: 'b1' })

		expect(JSON.parse(first.content[0].text)).toMatchObject({ deleted: true, gid: 'b1', already_absent: false })
		expect(JSON.parse(second.content[0].text)).toMatchObject({ deleted: true, gid: 'b1', already_absent: true })
	})
})
