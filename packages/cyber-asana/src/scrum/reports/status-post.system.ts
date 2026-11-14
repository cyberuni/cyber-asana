import { describe, expect, it } from 'vitest'
import { createClient } from '../../platform/client.js'
import { findHtmlSubsetProblems } from '../../platform/html-subset.js'
import { createAsanaStatusGateway } from '../../status/gateway.js'
import { isSystemTestEnabled, systemEnv } from '../../testing/system.js'
import { loadStatusTemplate } from './dashboard.js'
import { renderStatusUpdate } from './status-update.js'

const projectGid = systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const enabled = isSystemTestEnabled() && Boolean(projectGid)

// `report dashboard --post-status` sends the shipped `## Status update` template, rendered, as a
// project status update. This posts that exact body and title on the system-test project and
// deletes the update afterwards, so a body Asana rejects (a tag outside its HTML subset, a
// status_type it does not take) fails here rather than for a user. A status update cannot be
// edited (A3), so the probe is a create and a delete.
describe.skipIf(!enabled)('dashboard status update (system)', () => {
	it('posts the rendered shipped template on a project and deletes it', async () => {
		const template = await loadStatusTemplate()
		const rendered = renderStatusUpdate(template, {
			scope: 'system',
			status_type: 'at_risk',
			reports: [
				{
					key: 'health',
					status: 'ok',
					data: {
						counts: { error: 0, warning: 1 },
						findings: [
							{
								check: 'H3',
								level: 'warning',
								message: 'a probe finding with <angle> & ampersand',
								task: { gid: '1', name: 'Probe task', url: 'https://app.asana.com/0/1/1' },
								fix: 'x',
							},
						],
					},
				},
				{
					key: 'sprint',
					status: 'ok',
					data: {
						sprint: { name: 'Probe sprint' },
						points_tracked: { story: true, task: true },
						committed: { source: 'snapshot', count: 4, points: { story: 8, task: 3 } },
						completed: { count: 2, points: { story: 5, task: 1 } },
						completion_rate: { count: 50 },
					},
				},
				{
					key: 'workload',
					status: 'ok',
					data: {
						people: [
							{
								person: { gid: 'u', name: 'Probe' },
								effort_hours: { total: 5 },
								capacity: { status: 'known', hours: 8 },
								flag: 'ok',
							},
							{
								person: { gid: 'v' },
								effort_hours: { total: 2 },
								capacity: { status: 'unknown', reason: 'no-allocation' },
								flag: 'unknown',
							},
						],
					},
				},
				{
					key: 'velocity',
					status: 'ok',
					data: { window: 3, mean: { story: 6, task: 2 }, points_tracked: { story: true, task: true } },
				},
			],
		})
		expect(findHtmlSubsetProblems(rendered.html_text)).toEqual([])

		const gateway = createAsanaStatusGateway(createClient())
		const created = await gateway.createStatus(projectGid as string, {
			status_type: 'at_risk',
			title: `cyber-asana system test: ${rendered.title}`,
			html_text: rendered.html_text,
		})
		try {
			expect(created.gid).toBeTruthy()
			expect(created.status_type).toBe('at_risk')
			const read = await gateway.getStatus(created.gid, { optFields: 'gid,title,status_type,html_text' })
			expect(read.html_text).toContain('<h2>')
		} finally {
			await gateway.deleteStatus(created.gid)
		}
	})
})
