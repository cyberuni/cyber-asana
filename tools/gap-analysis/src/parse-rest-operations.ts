import { parse } from 'yaml'
import type { RestOperation } from './rest-types.js'

const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']

/** Smallest plausible count; Asana's spec has 271 operations. */
const minimumOperationCount = 200

type OasOperation = { operationId?: string; tags?: string[]; deprecated?: boolean }
type OasDocument = { paths?: Record<string, Record<string, unknown>> }

export function parseRestOperations(yamlText: string): RestOperation[] {
	const doc = parse(yamlText) as OasDocument | null
	if (!doc?.paths) throw new Error('OpenAPI document has no paths')

	const operations: RestOperation[] = []
	for (const [path, item] of Object.entries(doc.paths)) {
		for (const method of httpMethods) {
			const operation = item[method] as OasOperation | undefined
			if (!operation?.operationId) continue
			operations.push({
				operationId: operation.operationId,
				method: method.toUpperCase(),
				path,
				tag: operation.tags?.[0] ?? '',
				deprecated: operation.deprecated === true,
			})
		}
	}
	return operations.sort((a, b) => (a.operationId < b.operationId ? -1 : a.operationId > b.operationId ? 1 : 0))
}

export function assertRestOperationCount(operations: RestOperation[]): void {
	if (operations.length < minimumOperationCount) {
		throw new Error(
			`Expected at least ${minimumOperationCount} REST operations, parsed ${operations.length}; the OpenAPI source may have moved`,
		)
	}
}
