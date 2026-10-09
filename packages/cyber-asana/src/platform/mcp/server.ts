import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createRuntimeContext, type RuntimeContext, registerMcpTools } from '../../composition.js'
import { VERSION } from '../../version.js'
import { withMcpErrorHandling } from './error.js'
import { withMcpOutputFormat } from './output.js'

export async function startMcpServer(getContext: () => RuntimeContext = createRuntimeContext) {
	const server = withMcpOutputFormat(
		withMcpErrorHandling(
			new McpServer({
				name: 'cyber-asana',
				version: VERSION,
			}),
		),
	)

	registerMcpTools(server, getContext)

	const transport = new StdioServerTransport()
	await server.connect(transport)
}
