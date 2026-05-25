import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createRuntimeContext, type RuntimeContext, registerMcpTools } from './composition.js'

const server = new McpServer({
	name: 'cyber-asana',
	version: '0.0.0',
})
let runtimeContext: RuntimeContext | undefined

function getRuntimeContext() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext
}

registerMcpTools(server, getRuntimeContext)

const transport = new StdioServerTransport()
await server.connect(transport)
