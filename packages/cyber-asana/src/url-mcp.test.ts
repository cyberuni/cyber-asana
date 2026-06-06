import { describe, expect, it } from 'vitest'
import { registerUrlTools } from './url-mcp.js'

type ToolHandler = (params: { url: string }) => Promise<{ content: { type: string; text: string }[] }>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	return {
		handlers,
		tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
			handlers.set(name, handler)
		},
	}
}

describe('url-mcp', () => {
	it('asana_url_parse returns parsed GIDs as JSON', async () => {
		const server = createServer()
		registerUrlTools(server as any)

		const result = await server.handlers.get('asana_url_parse')?.({
			url: 'https://app.asana.com/1/1067629843637/project/1215109751173511/list/1215109875390628',
		})

		expect(JSON.parse(result?.content[0]?.text ?? '{}')).toEqual({
			kind: 'project_list',
			url: 'https://app.asana.com/1/1067629843637/project/1215109751173511/list/1215109875390628',
			workspace_gid: '1067629843637',
			project_gid: '1215109751173511',
			task_gid: null,
			list_view_gid: '1215109875390628',
		})
	})
})
