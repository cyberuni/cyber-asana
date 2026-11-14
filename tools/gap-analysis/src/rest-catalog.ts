import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { RestCatalog, RestOperation } from './rest-types.js'

export function restCatalogFromOperations(
	source: string,
	operations: RestOperation[],
	fetchedAt?: string,
): RestCatalog {
	const sorted = [...operations].sort((a, b) =>
		a.operationId < b.operationId ? -1 : a.operationId > b.operationId ? 1 : 0,
	)
	return {
		source,
		fetched_at: fetchedAt ?? new Date().toISOString().slice(0, 10),
		operation_count: sorted.length,
		operations: sorted,
	}
}

export async function readRestCatalog(filePath: string): Promise<RestCatalog> {
	return JSON.parse(await readFile(filePath, 'utf8')) as RestCatalog
}

export async function writeRestCatalog(filePath: string, catalog: RestCatalog): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true })
	await writeFile(filePath, `${JSON.stringify(catalog, null, '\t')}\n`, 'utf8')
}
