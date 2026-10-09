import type { RuleGateway, RuleTriggerFields } from './gateway.js'

export type { RuleTriggerFields } from './gateway.js'

/**
 * A successful trigger returns no meaningful payload, so the acknowledgement
 * names what fired instead of handing back an empty object.
 */
export type RuleTriggerAck = {
	triggered: true
	rule_trigger_gid: string
	resource?: string
	data?: unknown
}

export type RuleApi = ReturnType<typeof createRuleApi>

export function createRuleApi(gateway: RuleGateway) {
	return {
		async triggerRule(ruleTriggerGid: string, fields?: RuleTriggerFields): Promise<RuleTriggerAck> {
			const data = await gateway.triggerRule(ruleTriggerGid, fields)
			return {
				triggered: true,
				rule_trigger_gid: ruleTriggerGid,
				...(fields?.resource !== undefined && { resource: fields.resource }),
				...(data != null && { data }),
			}
		},
	}
}
