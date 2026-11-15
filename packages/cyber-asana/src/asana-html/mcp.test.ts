import { describe, expect, it } from 'vitest'
import { registerHtmlTools } from './mcp.js'

type ToolHandler = (params: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[] }>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	return {
		handlers,
		tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
			handlers.set(name, handler)
		},
	}
}

async function call(name: string, params: Record<string, unknown>) {
	const server = createServer()
	registerHtmlTools(server as never)
	const result = await server.handlers.get(name)?.(params)
	return JSON.parse(result?.content[0]?.text ?? 'null')
}

describe('asana-html/mcp', () => {
	it('registers check, fix and rules', () => {
		const server = createServer()
		registerHtmlTools(server as never)
		expect([...server.handlers.keys()]).toEqual(['asana_html_check', 'asana_html_fix', 'asana_html_rules'])
	})

	it('asana_html_check returns the problems', async () => {
		expect(await call('asana_html_check', { html: '<p>x</p>', surface: 'task-notes' })).toMatchObject({ ok: false })
	})

	it('asana_html_fix returns the fixed html', async () => {
		expect(await call('asana_html_fix', { html: '<h1>x</h1>', surface: 'status-update' })).toMatchObject({
			html: '<body><strong>x</strong></body>',
			ok: true,
		})
	})

	it('asana_html_rules returns one surface or all', async () => {
		expect(await call('asana_html_rules', {})).toHaveLength(2)
		expect(await call('asana_html_rules', { surface: 'task-notes' })).toHaveLength(1)
	})
})
