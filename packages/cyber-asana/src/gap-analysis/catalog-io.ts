import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { McpCatalog } from './types.js'

export async function readCatalog(filePath: string): Promise<McpCatalog> {
	const raw = await readFile(filePath, 'utf8')
	return JSON.parse(raw) as McpCatalog
}

export async function writeCatalog(filePath: string, catalog: McpCatalog): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true })
	const sorted = { ...catalog, tools: [...catalog.tools].sort() }
	sorted.tool_count = sorted.tools.length
	await writeFile(filePath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
}

export function catalogFromTools(source: string, tools: string[], fetchedAt?: string): McpCatalog {
	const sorted = [...tools].sort()
	return {
		source,
		fetched_at: fetchedAt ?? new Date().toISOString().slice(0, 10),
		tool_count: sorted.length,
		tools: sorted,
	}
}

export function diffToolLists(
	baseline: string[],
	fetched: string[],
): {
	added: string[]
	removed: string[]
	unchanged: string[]
} {
	const baselineSet = new Set(baseline)
	const fetchedSet = new Set(fetched)
	const added = fetched.filter((tool) => !baselineSet.has(tool))
	const removed = baseline.filter((tool) => !fetchedSet.has(tool))
	const unchanged = baseline.filter((tool) => fetchedSet.has(tool))
	return { added, removed, unchanged }
}

export function catalogsEqual(a: McpCatalog, b: McpCatalog): boolean {
	if (a.tools.length !== b.tools.length) return false
	const sortedA = [...a.tools].sort()
	const sortedB = [...b.tools].sort()
	return sortedA.every((tool, index) => tool === sortedB[index])
}
