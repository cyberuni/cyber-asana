import { Command } from 'commander'
import { output, printFields, printNextSteps } from '../platform/cli/output.js'
import type { RuleApi, RuleTriggerAck, RuleTriggerFields } from './api.js'
import { triggerRule } from './api.js'

function resolveRuleApi(api?: RuleApi | (() => RuleApi)): RuleApi {
	if (typeof api === 'function') return api()
	return api ?? { triggerRule }
}

const RULE_TRIGGER_NEXT_STEPS = [
	'cyber-asana task get <gid> — check what the rule did to the resource task',
	'cyber-asana story list <gid> — read the activity the rule left on the task',
]

function parseActionDataJson(value?: string): Record<string, unknown> | undefined {
	if (!value) return undefined
	const parsed = JSON.parse(value)
	if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
		throw new Error('action data JSON must be an object')
	}
	return parsed as Record<string, unknown>
}

function fmtAck(ack: RuleTriggerAck) {
	printFields({
		Triggered: ack.rule_trigger_gid,
		Resource: ack.resource ?? null,
	})
	printNextSteps(RULE_TRIGGER_NEXT_STEPS)
}

// The trigger GID cannot be discovered from the API, and the endpoint has plan
// and beta limits Asana only documents on the web — so the help carries them.
const RULE_TRIGGER_CONSTRAINTS = [
	'',
	'The rule has to be configured in Asana with an "incoming web request" trigger.',
	'Asana generates the rule trigger GID there, and it can only be copied out of the',
	'Asana UI — nothing in the API discovers or lists it.',
	'',
	'Asana documents this endpoint as beta; task is the only supported resource type.',
	'A 402 means the operation is above the workspace plan level (exit code 7).',
]

export function ruleCommand(api?: RuleApi | (() => RuleApi)) {
	const cmd = new Command('rule').description('Fire Asana automation rules from a script or CI job')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana rule trigger <rule-trigger-gid> --resource <task-gid>',
			'  cyber-asana rule trigger <rule-trigger-gid> --action-data-json \'{"deploy":"v2"}\'',
			...RULE_TRIGGER_CONSTRAINTS,
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	cmd
		.command('trigger <rule-trigger-gid>')
		.description('Trigger a rule that uses an "incoming web request" trigger')
		.option('--resource <gid>', 'Task GID the rule acts on (task is the only resource type Asana supports)')
		.option('--action-data-json <json>', "Variables the rule's action can read, as a JSON object")
		.addHelpText(
			'after',
			[
				...RULE_TRIGGER_CONSTRAINTS,
				'',
				'Examples:',
				'  cyber-asana rule trigger 1204 --resource 1205 --action-data-json \'{"deploy":"v2"}\'',
			].join('\n'),
		)
		.action(async (ruleTriggerGid: string, opts: { resource?: string; actionDataJson?: string }) => {
			const actionData = parseActionDataJson(opts.actionDataJson)
			const fields: RuleTriggerFields = {
				...(opts.resource !== undefined && { resource: opts.resource }),
				...(actionData !== undefined && { action_data: actionData }),
			}
			const ack = await resolveRuleApi(api).triggerRule(ruleTriggerGid, fields)
			output(ack, () => fmtAck(ack))
		})

	return cmd
}
