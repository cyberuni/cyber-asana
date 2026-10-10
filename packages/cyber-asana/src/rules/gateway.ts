import Asana from 'asana'

/**
 * Body of `POST /rule_triggers/{rule_trigger_gid}/run`.
 *
 * Asana documents the endpoint as beta, with `task` the only supported resource
 * type, so `resource` is a task GID. `action_data` is free-form — whatever the
 * rule's action reads.
 */
export type RuleTriggerFields = {
	resource?: string
	action_data?: Record<string, unknown>
}

export type RuleGateway = {
	triggerRule(ruleTriggerGid: string, fields?: RuleTriggerFields): Promise<Record<string, never> | null>
}

export function createAsanaRuleGateway(client: Asana.ApiClient): RuleGateway {
	const rulesApi = new Asana.RulesApi(client)

	return {
		async triggerRule(ruleTriggerGid, fields) {
			const res = await rulesApi.triggerRule({ data: { ...fields } }, ruleTriggerGid)
			// A successful trigger carries no useful payload of its own; the SDK can
			// hand back an empty body, so an absent `data` is a success, not a gap.
			return res?.data ?? null
		},
	}
}
