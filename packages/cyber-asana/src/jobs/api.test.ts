import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getJob } from './default.js'

vi.mock('../platform/client.js', () => ({
	createClient: () => ({}),
}))

const mockJob = {
	gid: 'job1',
	resource_subtype: 'project_template_instantiate_project',
	status: 'succeeded',
	new_project: { gid: 'proj1', name: 'Client onboarding' },
}

describe('jobs/api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('getJob calls getJob with the gid', async () => {
		vi.spyOn(Asana.JobsApi.prototype, 'getJob').mockResolvedValue({ data: mockJob } as never)

		const result = await getJob('job1')

		expect(result).toEqual(mockJob)
		expect(Asana.JobsApi.prototype.getJob).toHaveBeenCalledWith('job1', {})
	})
})
