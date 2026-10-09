import { createClient } from '../platform/client.js'
import { createRuleApi } from './api.js'
import { createAsanaRuleGateway, type RuleTriggerFields } from './gateway.js'

function defaultRuleApi() {
	return createRuleApi(createAsanaRuleGateway(createClient()))
}

export async function triggerRule(ruleTriggerGid: string, fields?: RuleTriggerFields) {
	return defaultRuleApi().triggerRule(ruleTriggerGid, fields)
}
