import { describe, expect, it } from 'vitest'
import { diffRestCatalogs, renderRestIssueBody } from './diff-rest.js'
import { restCatalogFromOperations } from './rest-catalog.js'
import type { RestOperation } from './rest-types.js'

const op = (operationId: string, extra: Partial<RestOperation> = {}): RestOperation => ({
	operationId,
	method: 'GET',
	path: `/${operationId}`,
	tag: 'Tasks',
	deprecated: false,
	...extra,
})

const baseline = restCatalogFromOperations('b', [op('getTask'), op('deleteTask'), op('getTags')])

describe('diffRestCatalogs', () => {
	it('reports added, removed and newly deprecated operations', () => {
		const fetched = restCatalogFromOperations('f', [op('getTask', { deprecated: true }), op('getTags'), op('getGoals')])
		const diff = diffRestCatalogs(baseline, fetched)
		expect(diff.added.map((o) => o.operationId)).toEqual(['getGoals'])
		expect(diff.removed.map((o) => o.operationId)).toEqual(['deleteTask'])
		expect(diff.newly_deprecated.map((o) => o.operationId)).toEqual(['getTask'])
	})

	it('reports nothing when identical', () => {
		const diff = diffRestCatalogs(baseline, restCatalogFromOperations('f', baseline.operations))
		expect(diff.added).toEqual([])
		expect(diff.removed).toEqual([])
		expect(diff.newly_deprecated).toEqual([])
	})

	it('does not report operations already deprecated in the baseline', () => {
		const dep = restCatalogFromOperations('b', [op('old', { deprecated: true })])
		expect(diffRestCatalogs(dep, dep).newly_deprecated).toEqual([])
	})
})

describe('renderRestIssueBody', () => {
	it('lists the changes and the next-step checklist', () => {
		const fetched = restCatalogFromOperations('f', [op('getGoals')])
		const body = renderRestIssueBody(diffRestCatalogs(baseline, fetched))
		expect(body).toContain('`getGoals`')
		expect(body).toContain('`deleteTask`')
		expect(body).toContain('analyze-asana-api-coverage')
		expect(body).toContain('update-asana-sdk')
		expect(body).toContain('fetch-rest -- --write')
	})
})
