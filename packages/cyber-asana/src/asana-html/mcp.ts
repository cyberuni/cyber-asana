import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { htmlCheckResult, htmlFixResult, htmlRulesFor, SURFACES } from './api.js'

const surface = z.enum(SURFACES).describe(`Surface the HTML is for: ${SURFACES.join(', ')}`)
const html = z.string().describe('Asana rich text, e.g. <body><strong>Health</strong></body>')
const json = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] })

export function registerHtmlTools(server: McpServer) {
	server.tool(
		'asana_html_check',
		'Check Asana rich text (html_notes, html_text) for one surface without calling the Asana API. Returns ok and the problems Asana would refuse or mangle.',
		{ html, surface },
		async (params) => json(htmlCheckResult(params.html, params.surface)),
	)
	server.tool(
		'asana_html_fix',
		'Normalize Asana rich text for one surface (bare <body>, <b> to <strong>, <p>/<br> to newlines, headings a surface does not keep). Returns the fixed html and anything it could not repair. No API call.',
		{ html, surface },
		async (params) => json(htmlFixResult(params.html, params.surface)),
	)
	server.tool(
		'asana_html_rules',
		"List Asana's HTML subset per surface: allowed and rejected tags, the evidence, and what is unverified. Omit surface for every surface.",
		{ surface: surface.optional() },
		async (params) => json(htmlRulesFor(params.surface)),
	)
}
