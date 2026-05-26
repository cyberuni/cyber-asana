import { describe, expect, it } from 'vitest'
import { buildGapReport } from './report.js'

describe('buildGapReport', () => {
	it('classifies official-only, cyber-only, and overlap buckets', () => {
		const report = buildGapReport(
			['search_objects', 'get_task', 'create_tasks'],
			['asana_task_get', 'asana_task_create', 'asana_goal_list'],
		)

		expect(report.official_only).toEqual(['search_objects'])
		expect(report.cyber_only).toEqual(['asana_goal_list'])
		expect(report.overlap).toEqual([
			{ official: 'get_task', cyber: 'asana_task_get', confidence: 'high' },
			{ official: 'create_tasks', cyber: 'asana_task_create', confidence: 'high' },
		])
		expect(report.unmapped_official).toEqual([])
		expect(report.unmapped_cyber).toEqual([])
	})
})
