import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join, normalize, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The layering, and why each rule exists, is written up in AGENTS.md ("Architecture").
// Domain and capability folders stay at the top so the source names what the tool does;
// these rules keep the technical code beneath them pointing inward.

const SRC = dirname(fileURLToPath(import.meta.url))

type Layer = 'rate-limit' | 'platform' | 'cli-support' | 'mcp-support' | 'delivery' | 'domain' | 'root' | 'other'

function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
	)
}

const isProduction = (file: string) =>
	file.endsWith('.ts') &&
	!file.endsWith('.d.ts') &&
	!/\.(test|system|acceptance)\.ts$/.test(file) &&
	!file.startsWith('testing/')

function layerOf(file: string): Layer {
	if (file.startsWith('rate-limit/')) return 'rate-limit'
	if (file.startsWith('platform/cli/')) return 'cli-support'
	if (file.startsWith('platform/mcp/')) return 'mcp-support'
	if (file.startsWith('platform/')) return 'platform'
	if (!file.includes('/')) return 'root'
	if (file.startsWith('types/') || file.startsWith('testing/')) return 'other'
	return ['cli.ts', 'mcp.ts'].includes(basename(file)) ? 'delivery' : 'domain'
}

function importsOf(file: string): string[] {
	const text = readFileSync(join(SRC, file), 'utf8')
	return [...text.matchAll(/from\s+(['"])(\.{1,2}\/[^'"\n]*?)\.js\1/g)]
		.map((match) => normalize(join(dirname(file), match[2] as string)) + '.ts')
		.filter((target) => existsSync(join(SRC, target)))
}

const edges = walk(SRC)
	.map((absolute) => relative(SRC, absolute))
	.filter(isProduction)
	.flatMap((file) => importsOf(file).map((target) => ({ file, target, from: layerOf(file), to: layerOf(target) })))

function violations(from: Layer | Layer[], forbidden: (edge: (typeof edges)[number]) => boolean) {
	const sources = Array.isArray(from) ? from : [from]
	return edges.filter((edge) => sources.includes(edge.from) && forbidden(edge)).map((e) => `${e.file} -> ${e.target}`)
}

describe('architecture', () => {
	it('keeps rate-limit free of everything else, so it stays pure and reusable', () => {
		expect(violations('rate-limit', (e) => e.to !== 'rate-limit')).toEqual([])
	})

	it('keeps platform helpers independent of domains and of CLI/MCP delivery', () => {
		expect(violations('platform', (e) => !['platform', 'rate-limit'].includes(e.to))).toEqual([])
	})

	it('keeps CLI and MCP support from reaching into domains, delivery files, or each other', () => {
		expect(violations('cli-support', (e) => ['domain', 'delivery', 'mcp-support'].includes(e.to))).toEqual([])
		expect(violations('mcp-support', (e) => ['domain', 'delivery', 'cli-support'].includes(e.to))).toEqual([])
	})

	it('keeps a domain core (api, gateway, options) from depending on CLI/MCP delivery', () => {
		expect(violations('domain', (e) => ['cli-support', 'mcp-support', 'delivery'].includes(e.to))).toEqual([])
	})

	it('finds production files to check', () => {
		expect(edges.length).toBeGreaterThan(100)
		expect(new Set(edges.map((e) => e.from))).toEqual(
			new Set(['rate-limit', 'platform', 'cli-support', 'mcp-support', 'delivery', 'domain', 'root']),
		)
	})
})
