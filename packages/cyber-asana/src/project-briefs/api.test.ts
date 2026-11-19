import { describe, expect, it, vi } from 'vitest'
import { createProjectBriefApi } from './api.js'
import type { ProjectBriefGateway } from './gateway.js'

function gateway(over: Partial<ProjectBriefGateway> = {}): ProjectBriefGateway {
	return {
		getProjectBrief: vi.fn(),
		createProjectBrief: vi.fn(),
		updateProjectBrief: vi.fn(),
		deleteProjectBrief: vi.fn(),
		...over,
	}
}

describe('project-briefs/api', () => {
	it('forwards reads, creates, updates and deletes to the gateway', async () => {
		const g = gateway({
			getProjectBrief: vi.fn().mockResolvedValue({ gid: 'b1' }),
			createProjectBrief: vi.fn().mockResolvedValue({ gid: 'b1' }),
			updateProjectBrief: vi.fn().mockResolvedValue({ gid: 'b1' }),
		})
		const api = createProjectBriefApi(g)

		await api.getProjectBrief('b1', { optFields: 'gid' })
		await api.createProjectBrief('p1', { title: 'T', text: 'plain' })
		await api.updateProjectBrief('b1', { title: 'U' })
		await api.deleteProjectBrief('b1')

		expect(g.getProjectBrief).toHaveBeenCalledWith('b1', { optFields: 'gid' })
		expect(g.createProjectBrief).toHaveBeenCalledWith('p1', { title: 'T', text: 'plain' }, undefined)
		expect(g.updateProjectBrief).toHaveBeenCalledWith('b1', { title: 'U' }, undefined)
		expect(g.deleteProjectBrief).toHaveBeenCalledWith('b1')
	})

	it('accepts html_text that fits the project-brief surface', async () => {
		const g = gateway({ createProjectBrief: vi.fn().mockResolvedValue({ gid: 'b1' }) })

		await createProjectBriefApi(g).createProjectBrief('p1', {
			html_text: '<body><h1>Goal</h1><ul><li>Ship</li></ul></body>',
		})

		expect(g.createProjectBrief).toHaveBeenCalled()
	})

	it('refuses html_text Asana would reject, naming the problem and the fix command', async () => {
		const g = gateway()
		const api = createProjectBriefApi(g)

		await expect(api.createProjectBrief('p1', { html_text: '<body><p>Goal</p></body>' })).rejects.toThrow(
			/<p> is not in Asana's HTML subset.*html fix/s,
		)
		await expect(api.updateProjectBrief('b1', { html_text: 'no body wrapper' })).rejects.toThrow(/wrapped in <body>/)
		expect(g.createProjectBrief).not.toHaveBeenCalled()
		expect(g.updateProjectBrief).not.toHaveBeenCalled()
	})
})
