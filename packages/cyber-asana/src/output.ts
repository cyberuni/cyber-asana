import { encodeToon } from './toon.js'

export type OutputFormat = 'json' | 'toon' | 'text'

export function selectFormat(argv: string[] = process.argv): OutputFormat {
	if (argv.includes('--toon')) return 'toon'
	if (argv.includes('--json')) return 'json'
	return 'text'
}

function printJson(data: unknown) {
	console.log(JSON.stringify(data, null, 2))
}

/** Definitive empty state — principle 5. */
export function printEmpty(entity?: string) {
	console.log(entity ? `0 ${entity} found` : '0 results')
}

export function printFields(fields: Record<string, string | null | undefined>) {
	const entries = Object.entries(fields).filter(([, v]) => v != null) as [string, string][]
	const width = Math.max(...entries.map(([k]) => k.length))
	for (const [key, val] of entries) {
		console.log(`${key.padEnd(width)}  ${val}`)
	}
}

export function printTable<T>(items: T[], cols: { label: string; get: (item: T) => string }[]) {
	if (items.length === 0) {
		printEmpty()
		return
	}
	const widths = cols.map((c) => Math.max(c.label.length, ...items.map((i) => c.get(i).length)))
	console.log(cols.map((c, i) => c.label.toUpperCase().padEnd(widths[i])).join('  '))
	console.log(widths.map((w) => '-'.repeat(w)).join('  '))
	for (const item of items) {
		console.log(cols.map((c, i) => c.get(item).padEnd(widths[i])).join('  '))
	}
}

export function output(data: unknown, readable: () => void, argv: string[] = process.argv) {
	switch (selectFormat(argv)) {
		case 'toon':
			console.log(encodeToon(data))
			break
		case 'json':
			printJson(data)
			break
		default:
			readable()
	}
}
