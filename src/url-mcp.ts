import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { parseAsanaUrl } from './url.js'

export function registerUrlTools(server: McpServer) {
	server.tool(
		'asana_url_parse',
		'Parse an Asana app URL into GIDs without calling the Asana API. Use workspace_gid and project_gid for task create. list_view_gid is browser list-view metadata, not a section GID — do not pass it to section APIs unless the user explicitly names a section.',
		{ url: z.string().describe('Asana app URL (e.g. app.asana.com/1/.../project/.../list/...)') },
		async ({ url }) => ({
			content: [{ type: 'text', text: JSON.stringify(parseAsanaUrl(url)) }],
		}),
	)
}
