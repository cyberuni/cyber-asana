import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import type { AttachmentApi } from './api.js'
import { getAttachment, listAttachments } from './api.js'

function resolveAttachmentApi(api?: AttachmentApi | (() => AttachmentApi)): AttachmentApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listAttachments,
			getAttachment,
		}
	)
}

export function registerAttachmentTools(server: McpServer, api?: AttachmentApi | (() => AttachmentApi)) {
	server.tool(
		'asana_attachment_list',
		'List Asana attachments for a task',
		{ task_gid: z.string().describe('Task GID'), ...paginationParams },
		async ({ task_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveAttachmentApi(api).listAttachments(task_gid, paginationOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_attachment_get',
		'Get an Asana attachment by GID',
		{ attachment_gid: z.string().describe('Attachment GID') },
		async ({ attachment_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveAttachmentApi(api).getAttachment(attachment_gid)) }],
		}),
	)
}
