import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { RuleApi, RuleTriggerFields } from './api.js'
import { triggerRule } from './default.js'

function resolveRuleApi(api?: RuleApi | (() => RuleApi)): RuleApi {
	if (typeof api === 'function') return api()
	return api ?? { triggerRule }
}

const RULE_TRIGGER_DESCRIPTION =
	'Trigger an Asana rule so a repo, script, or CI job can drive the board — the rule owns what happens next. ' +
	'The rule must be configured in Asana with an "incoming web request" trigger; Asana generates `rule_trigger_gid` ' +
	'there and it can only be copied out of the Asana UI — no API call discovers or lists it, so ask the user for it. ' +
	'Asana documents this endpoint as beta, and `task` is the only supported resource type. ' +
	'A 402 means the operation is above the workspace plan level.'

export function registerRuleTools(server: McpServer, api?: RuleApi | (() => RuleApi)) {
	server.tool(
		'asana_rule_trigger',
		RULE_TRIGGER_DESCRIPTION,
		{
			rule_trigger_gid: z.string().describe('Incoming web request trigger GID, copied from the Asana rule UI'),
			resource: z.string().optional().describe('Task GID the rule acts on'),
			action_data: z
				.record(z.string(), z.unknown())
				.optional()
				.describe("Free-form variables the rule's action can read"),
		},
		async ({ rule_trigger_gid, resource, action_data }) => {
			const fields: RuleTriggerFields = {
				...(resource !== undefined && { resource }),
				...(action_data !== undefined && { action_data }),
			}
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(await resolveRuleApi(api).triggerRule(rule_trigger_gid, fields)),
					},
				],
			}
		},
	)
}
