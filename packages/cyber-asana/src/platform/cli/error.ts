import { isCodedConfigError } from '../coded-error.js'
import { buildErrorBody, PLAN_LIMITATION_STATUS } from '../error-body.js'
import { REFERENCE_AMBIGUOUS } from '../reference-metadata.js'
import { encodeToon } from '../toon.js'
import type { OutputFormat } from './output.js'
import { buildUsageErrorBody, isUsageError, renderUsageErrorText } from './usage.js'

// Meaningful, stable exit codes — principle 6 (structured errors & exit codes).
// 0 success, 1 generic failure, then specific recoverable conditions agents can
// branch on without parsing the message.
// Config failures with a code of their own. Each is told apart by `error.code`, not by its exit
// code: a scope the command line named wrongly, or never configured, is a command the caller can
// fix and retry, which is what 2 means.
const CODED_EXIT_CODES: Readonly<Record<string, number>> = {
	'scope-missing': 2,
	'scope-unknown': 2,
	// Sprint commands: start a sprint, name a real one, or fix the policy, then retry.
	'sprint-none': 2,
	'sprint-unknown': 2,
	'model-unsupported': 2,
	'policy-incomplete': 2,
	// Workload: the window flags are wrong; pass both dates, in order, or neither.
	'window-invalid': 2,
	// The custom-field model: create and attach the Sprint field, then retry.
	'sprint-field-missing': 2,
	'sprint-field-ambiguous': 2,
	// The project model: set backlog_project and sprint_portfolio on the scope, then retry.
	'scope-incomplete': 2,
	// Task search is premium: the same code a raw 402 from Asana gets.
	'premium-required': 7,
}

export function exitCodeFor(error: unknown): number {
	if (isUsageError(error)) return 2 // the caller can fix the command line and retry
	if (isCodedConfigError(error) && error.code in CODED_EXIT_CODES) return CODED_EXIT_CODES[error.code] as number
	const body = buildErrorBody(error)
	if (body.error.code === REFERENCE_AMBIGUOUS) return 8 // pick one of `options`, then retry
	if (body.error.kind === 'config') return 3
	switch (body.error.status) {
		case PLAN_LIMITATION_STATUS:
			return 7 // above the workspace's plan level
		case 401:
			return 3 // unauthenticated
		case 403:
			return 4 // forbidden
		case 404:
			return 5 // not found
		case 429:
			return 6 // rate limited
		default:
			return 1
	}
}

export function renderCliError(error: unknown, format: OutputFormat): string {
	if (isUsageError(error)) {
		const usage = buildUsageErrorBody(error)
		if (format === 'json') return JSON.stringify(usage, null, 2)
		if (format === 'toon') return encodeToon(usage)
		return renderUsageErrorText(error)
	}
	const body = buildErrorBody(error)
	if (format === 'json') return JSON.stringify(body, null, 2)
	if (format === 'toon') return encodeToon(body)
	const prefix = body.error.kind === 'asana_api' ? 'Asana API error' : 'Error'
	let text = `${prefix}: ${body.error.message}`
	if (body.error.options?.length) text += `\nOptions: ${body.error.options.join(', ')}`
	if (body.error.hint) text += `\nHint: ${body.error.hint}`
	return text
}
