import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createRuntimeContext, type RuntimeContext, registerMcpTools } from './composition.js'
import { withMcpErrorHandling } from './mcp-error.js'
import { VERSION } from './version.js'

export async function startMcpServer(getContext: () => RuntimeContext = createRuntimeContext) {
	const server = withMcpErrorHandling(
		new McpServer({
			name: 'cyber-asana',
			version: VERSION,
		}),
	)

	registerMcpTools(server, getContext)

	const transport = new StdioServerTransport()
	await server.connect(transport)
}
