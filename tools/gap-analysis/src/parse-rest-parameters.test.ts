import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseRestOperations } from './parse-rest-operations.js'

const fixture = readFileSync(new URL('./fixtures/asana-oas-parameters.yaml', import.meta.url), 'utf8')
const byId = Object.fromEntries(parseRestOperations(fixture).map((o) => [o.operationId, o.parameters]))

describe('parseRestOperations parameters', () => {
	it('lists path, query and body parameters, resolving $ref and allOf and dropping read-only fields', () => {
		expect(byId.setParentForTask).toEqual([
			{ name: 'task_gid', in: 'path' },
			{ name: 'opt_fields', in: 'query' },
			{ name: 'opt_pretty', in: 'query' },
			{ name: 'insert_after', in: 'body' },
			{ name: 'insert_before', in: 'body' },
			{ name: 'name', in: 'body' },
			{ name: 'parent', in: 'body' },
		])
	})

	it('reads a multipart body without a data wrapper', () => {
		expect(byId.createAttachmentForObject).toEqual([
			{ name: 'file', in: 'body' },
			{ name: 'parent', in: 'body' },
		])
	})

	it('keeps header parameters, which an API client sets once, out of the list', () => {
		expect(byId.getStoriesForTask).toEqual([
			{ name: 'task_gid', in: 'path' },
			{ name: 'limit', in: 'query' },
		])
	})
})
