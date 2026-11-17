import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAsanaProjectBriefGateway } from './gateway.js'

const client = {} as Asana.ApiClient

describe('project-briefs/gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('createProjectBrief posts the fields under the project', async () => {
		const spy = vi
			.spyOn(Asana.ProjectBriefsApi.prototype, 'createProjectBrief')
			.mockResolvedValue({ data: { gid: 'b1' } } as never)

		const brief = await createAsanaProjectBriefGateway(client).createProjectBrief('p1', {
			title: 'Charter',
			html_text: '<body>Goal</body>',
		})

		expect(brief).toEqual({ gid: 'b1' })
		expect(spy).toHaveBeenCalledWith({ data: { title: 'Charter', html_text: '<body>Goal</body>' } }, 'p1', {})
	})

	it('getProjectBrief sends requested fields as opt_fields', async () => {
		const spy = vi
			.spyOn(Asana.ProjectBriefsApi.prototype, 'getProjectBrief')
			.mockResolvedValue({ data: { gid: 'b1' } } as never)

		await createAsanaProjectBriefGateway(client).getProjectBrief('b1', { optFields: 'gid,title' })

		expect(spy).toHaveBeenCalledWith('b1', { opt_fields: 'gid,title' })
	})

	it('updateProjectBrief puts only the given fields', async () => {
		const spy = vi
			.spyOn(Asana.ProjectBriefsApi.prototype, 'updateProjectBrief')
			.mockResolvedValue({ data: { gid: 'b1' } } as never)

		await createAsanaProjectBriefGateway(client).updateProjectBrief('b1', { title: 'New' })

		expect(spy).toHaveBeenCalledWith({ data: { title: 'New' } }, 'b1', {})
	})

	it('deleteProjectBrief deletes by GID', async () => {
		const spy = vi
			.spyOn(Asana.ProjectBriefsApi.prototype, 'deleteProjectBrief')
			.mockResolvedValue({ data: {} } as never)

		await createAsanaProjectBriefGateway(client).deleteProjectBrief('b1')

		expect(spy).toHaveBeenCalledWith('b1')
	})
})
