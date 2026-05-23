import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getAttachment, listAttachments } from './api.js'

export function registerAttachmentTools(server: McpServer) {
	server.tool(
		'asana_attachment_list',
		'List Asana attachments for a task',
		{ task_gid: z.string().describe('Task GID') },
		async ({ task_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listAttachments(task_gid)) }],
		}),
	)

	server.tool(
		'asana_attachment_get',
		'Get an Asana attachment by GID',
		{ attachment_gid: z.string().describe('Attachment GID') },
		async ({ attachment_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await getAttachment(attachment_gid)) }],
		}),
	)
}
