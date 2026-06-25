import { buildMcpToolErrorBody } from './mcp-error.js'
import type { OutputFormat } from './output.js'
import { encodeToon } from './toon.js'

// Meaningful, stable exit codes — principle 6 (structured errors & exit codes).
// 0 success, 1 generic failure, then specific recoverable conditions agents can
// branch on without parsing the message.
export function exitCodeFor(error: unknown): number {
	const body = buildMcpToolErrorBody(error)
	if (body.error.kind === 'config') return 3
	switch (body.error.status) {
		case 401:
			return 3 // unauthenticated
		case 403:
			return 4 // forbidden
		case 404:
			return 5 // not found
		case 429:
			return 6 // rate limited
		default:
			return 1
	}
}

export function renderCliError(error: unknown, format: OutputFormat): string {
	const body = buildMcpToolErrorBody(error)
	if (format === 'json') return JSON.stringify(body, null, 2)
	if (format === 'toon') return encodeToon(body)
	const prefix = body.error.kind === 'asana_api' ? 'Asana API error' : 'Error'
	let text = `${prefix}: ${body.error.message}`
	if (body.error.hint) text += `\nHint: ${body.error.hint}`
	return text
}
