// TOON (Token-Oriented Object Notation) encoder.
//
// A compact, token-efficient serialization of JSON-like data for LLM agents.
// Uniform arrays of objects collapse into a tabular block with a single header
// row and a length marker, which saves ~40% tokens over pretty-printed JSON by
// dropping repeated keys, braces, and quotes.

type Scalar = string | number | boolean | null | undefined

function isScalar(value: unknown): value is Scalar {
	return value === null || value === undefined || typeof value !== 'object'
}

const RESERVED = new Set(['true', 'false', 'null'])

function needsQuote(s: string): boolean {
	if (s === '') return true
	if (s !== s.trim()) return true
	if (/[,:"\n]/.test(s)) return true
	if (RESERVED.has(s)) return true
	// Quote numeric-looking strings only when they would not survive a JSON
	// number round-trip (leading zeros, precision loss); plain integers like
	// "123" stay unquoted to keep GID-heavy output token-efficient.
	if (/^-?\d+(\.\d+)?$/.test(s) && String(Number(s)) !== s) return true
	return false
}

function formatScalar(value: Scalar): string {
	if (value === null || value === undefined) return 'null'
	if (typeof value === 'boolean') return value ? 'true' : 'false'
	if (typeof value === 'number') return String(value)
	return needsQuote(value) ? JSON.stringify(value) : value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniformFields(arr: unknown[]): string[] | null {
	if (arr.length === 0) return null
	if (!arr.every(isPlainObject)) return null
	const first = arr[0] as Record<string, unknown>
	const fields = Object.keys(first)
	if (fields.length === 0) return null
	for (const item of arr as Record<string, unknown>[]) {
		const keys = Object.keys(item)
		if (keys.length !== fields.length) return null
		for (const f of fields) {
			if (!(f in item)) return null
			if (!isScalar(item[f])) return null
		}
	}
	return fields
}

function pad(indent: number): string {
	return '  '.repeat(indent)
}

function encodeArray(label: string, arr: unknown[], indent: number): string[] {
	const prefix = `${pad(indent)}${label}`
	if (arr.length === 0) return [`${prefix}[0]:`]

	if (arr.every(isScalar)) {
		return [`${prefix}[${arr.length}]: ${arr.map((v) => formatScalar(v as Scalar)).join(',')}`]
	}

	const fields = uniformFields(arr)
	if (fields) {
		const lines = [`${prefix}[${arr.length}]{${fields.join(',')}}:`]
		for (const item of arr as Record<string, unknown>[]) {
			lines.push(`${pad(indent + 1)}${fields.map((f) => formatScalar(item[f] as Scalar)).join(',')}`)
		}
		return lines
	}

	// Mixed or nested elements: list block, one "- " entry per item.
	const lines = [`${prefix}[${arr.length}]:`]
	for (const item of arr) {
		const block = encodeValue(item, indent + 1)
		if (block.length === 1 && !block[0].includes('\n')) {
			lines.push(`${pad(indent + 1)}- ${block[0].trimStart()}`)
		} else {
			const [head, ...rest] = block
			lines.push(`${pad(indent + 1)}- ${head.trimStart()}`)
			lines.push(...rest)
		}
	}
	return lines
}

function encodeValue(value: unknown, indent: number): string[] {
	if (isScalar(value)) return [`${pad(indent)}${formatScalar(value as Scalar)}`]
	if (Array.isArray(value)) return encodeArray('', value, indent)

	const obj = value as Record<string, unknown>
	const entries = Object.entries(obj)
	if (entries.length === 0) return [`${pad(indent)}{}`]

	const lines: string[] = []
	for (const [key, val] of entries) {
		if (isScalar(val)) {
			lines.push(`${pad(indent)}${key}: ${formatScalar(val as Scalar)}`)
		} else if (Array.isArray(val)) {
			lines.push(...encodeArray(key, val, indent))
		} else {
			const nested = val as Record<string, unknown>
			if (Object.keys(nested).length === 0) {
				lines.push(`${pad(indent)}${key}: {}`)
			} else {
				lines.push(`${pad(indent)}${key}:`)
				lines.push(...encodeValue(nested, indent + 1))
			}
		}
	}
	return lines
}

export function encodeToon(value: unknown): string {
	return encodeValue(value, 0).join('\n')
}
