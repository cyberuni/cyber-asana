import { describe, expect, it } from 'vitest'
import { diffRestCatalogs, isRestDrift, renderRestIssueBody } from './diff-rest.js'
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

describe('diffRestCatalogs parameters', () => {
	const withParams = (names: string[]) =>
		restCatalogFromOperations('x', [
			op('setParentForTask', { parameters: names.map((name) => ({ name, in: 'body' })) }),
		])

	it('reports parameters an existing operation gained', () => {
		const diff = diffRestCatalogs(withParams(['parent']), withParams(['parent', 'insert_after']))
		expect(diff.added_parameters).toEqual([{ operationId: 'setParentForTask', name: 'insert_after', in: 'body' }])
		expect(isRestDrift(diff)).toBe(true)
	})

	it('reports nothing for a baseline written before parameters were tracked', () => {
		const old = restCatalogFromOperations('b', [op('setParentForTask')])
		expect(diffRestCatalogs(old, withParams(['parent'])).added_parameters).toEqual([])
	})
})

describe('renderRestIssueBody', () => {
	it('lists added parameters and the coverage step', () => {
		const before = restCatalogFromOperations('b', [op('getTask', { parameters: [] })])
		const after = restCatalogFromOperations('f', [op('getTask', { parameters: [{ name: 'opt_fields', in: 'query' }] })])
		const body = renderRestIssueBody(diffRestCatalogs(before, after))
		expect(body).toContain('`getTask`: query `opt_fields`')
		expect(body).toContain('parameter-coverage.json')
	})

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
