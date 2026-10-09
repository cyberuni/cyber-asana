import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTaskTemplateApi } from './api.js'
import { getTaskTemplate, instantiateTask, listTaskTemplates } from './default.js'
import { createAsanaTaskTemplateGateway } from './gateway.js'

vi.mock('../platform/client.js', () => ({
	createClient: () => ({}),
}))

const mockTemplate = { gid: 'tt1', name: 'Release checklist' }
const noSleep = () => Promise.resolve()

describe('task-templates/api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listTaskTemplates scopes the list to a project', async () => {
		vi.spyOn(Asana.TaskTemplatesApi.prototype, 'getTaskTemplates').mockResolvedValue({
			data: [mockTemplate],
		} as never)

		const result = await listTaskTemplates('p1')

		expect(result).toEqual({ data: [mockTemplate], next_page: null, limit: 100 })
		expect(Asana.TaskTemplatesApi.prototype.getTaskTemplates).toHaveBeenCalledWith({
			project: 'p1',
			limit: 100,
		})
	})

	it('listTaskTemplates forwards pagination options', async () => {
		vi.spyOn(Asana.TaskTemplatesApi.prototype, 'getTaskTemplates').mockResolvedValue({
			data: [mockTemplate],
		} as never)

		await listTaskTemplates('p1', { limit: 5, offset: 'cur', optFields: 'gid,name' })

		expect(Asana.TaskTemplatesApi.prototype.getTaskTemplates).toHaveBeenCalledWith({
			project: 'p1',
			limit: 5,
			offset: 'cur',
			opt_fields: 'gid,name',
		})
	})

	it('getTaskTemplate calls getTaskTemplate with the gid', async () => {
		vi.spyOn(Asana.TaskTemplatesApi.prototype, 'getTaskTemplate').mockResolvedValue({
			data: mockTemplate,
		} as never)

		const result = await getTaskTemplate('tt1')

		expect(result).toEqual(mockTemplate)
		expect(Asana.TaskTemplatesApi.prototype.getTaskTemplate).toHaveBeenCalledWith('tt1', {})
	})

	it('instantiateTask posts the new task name and returns the finished job', async () => {
		vi.spyOn(Asana.TaskTemplatesApi.prototype, 'instantiateTask').mockResolvedValue({
			data: { gid: 'j1', status: 'succeeded', new_task: { gid: 't1', name: 'Release 1.2' } },
		} as never)
		const getJob = vi.spyOn(Asana.JobsApi.prototype, 'getJob')

		const result = await instantiateTask('tt1', { name: 'Release 1.2' }, { sleep: noSleep })

		expect(result).toEqual({ gid: 'j1', status: 'succeeded', new_task: { gid: 't1', name: 'Release 1.2' } })
		expect(Asana.TaskTemplatesApi.prototype.instantiateTask).toHaveBeenCalledWith('tt1', {
			body: { data: { name: 'Release 1.2' } },
		})
		expect(getJob).not.toHaveBeenCalled()
	})

	it('instantiateTask omits the body when no name is given', async () => {
		vi.spyOn(Asana.TaskTemplatesApi.prototype, 'instantiateTask').mockResolvedValue({
			data: { gid: 'j1', status: 'succeeded' },
		} as never)

		await instantiateTask('tt1', {}, { sleep: noSleep })

		expect(Asana.TaskTemplatesApi.prototype.instantiateTask).toHaveBeenCalledWith('tt1', { body: { data: {} } })
	})

	it('instantiateTask polls the job until the task exists', async () => {
		vi.spyOn(Asana.TaskTemplatesApi.prototype, 'instantiateTask').mockResolvedValue({
			data: { gid: 'j1', status: 'in_progress' },
		} as never)
		vi.spyOn(Asana.JobsApi.prototype, 'getJob').mockResolvedValue({
			data: { gid: 'j1', status: 'succeeded', new_task: { gid: 't1' } },
		} as never)

		const result = await instantiateTask('tt1', { name: 'Release 1.2' }, { sleep: noSleep })

		expect(result).toEqual({ gid: 'j1', status: 'succeeded', new_task: { gid: 't1' } })
		expect(Asana.JobsApi.prototype.getJob).toHaveBeenCalledWith('j1', {})
	})

	it('instantiateTask returns the pending job when polling is turned off', async () => {
		vi.spyOn(Asana.TaskTemplatesApi.prototype, 'instantiateTask').mockResolvedValue({
			data: { gid: 'j1', status: 'in_progress' },
		} as never)
		const getJob = vi.spyOn(Asana.JobsApi.prototype, 'getJob')

		const result = await instantiateTask('tt1', { name: 'Release 1.2' }, { maxAttempts: 0, sleep: noSleep })

		expect(result).toEqual({ gid: 'j1', status: 'in_progress' })
		expect(getJob).not.toHaveBeenCalled()
	})

	it('createTaskTemplateApi delegates to the gateway it is given', async () => {
		const gateway = {
			listTaskTemplates: vi.fn().mockResolvedValue([mockTemplate]),
			getTaskTemplate: vi.fn().mockResolvedValue(mockTemplate),
			instantiateTask: vi.fn().mockResolvedValue({ gid: 'j1', status: 'succeeded' }),
			getJob: vi.fn(),
		}
		const api = createTaskTemplateApi(gateway)

		await expect(api.listTaskTemplates('p1')).resolves.toEqual([mockTemplate])
		await expect(api.getTaskTemplate('tt1')).resolves.toEqual(mockTemplate)
		await expect(api.instantiateTask('tt1', { name: 'x' }, { sleep: noSleep })).resolves.toEqual({
			gid: 'j1',
			status: 'succeeded',
		})
		expect(gateway.instantiateTask).toHaveBeenCalledWith('tt1', { name: 'x' })
	})

	it('the Asana gateway reads a job through the Jobs API', async () => {
		vi.spyOn(Asana.JobsApi.prototype, 'getJob').mockResolvedValue({
			data: { gid: 'j1', status: 'failed' },
		} as never)

		await expect(createAsanaTaskTemplateGateway({} as never).getJob('j1')).resolves.toEqual({
			gid: 'j1',
			status: 'failed',
		})
	})
})
