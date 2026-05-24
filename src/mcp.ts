import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerAttachmentTools } from './attachments/mcp.js'
import { createRuntimeContext, type RuntimeContext } from './composition.js'
import { registerGoalTools } from './goals/mcp.js'
import { registerPortfolioTools } from './portfolios/mcp.js'
import { registerProjectTools } from './projects/mcp.js'
import { registerSectionTools } from './sections/mcp.js'
import { registerStoryTools } from './stories/mcp.js'
import { registerTagTools } from './tags/mcp.js'
import { registerTaskTools } from './tasks/mcp.js'
import { registerTeamTools } from './teams/mcp.js'
import { registerUserTools } from './users/mcp.js'
import { registerWorkspaceTools } from './workspaces/mcp.js'

const server = new McpServer({
	name: 'cyber-asana',
	version: '0.0.0',
})
let runtimeContext: RuntimeContext | undefined

function getRuntimeContext() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext
}

registerWorkspaceTools(server)
registerProjectTools(server)
registerTaskTools(server)
registerSectionTools(server)
registerUserTools(server)
registerTeamTools(server)
registerPortfolioTools(server)
registerGoalTools(server)
registerTagTools(server, () => getRuntimeContext().tags)
registerAttachmentTools(server)
registerStoryTools(server, () => getRuntimeContext().stories)

const transport = new StdioServerTransport()
await server.connect(transport)
