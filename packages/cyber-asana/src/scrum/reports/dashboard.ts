import {
	type LoadReferenceMetadataOptions,
	loadReferenceContent,
	loadReferenceMetadata,
} from '../../platform/reference-metadata.js'
import { parseStatusTemplate, type StatusTemplate } from './status-update.js'

/** The reference whose frontmatter says which reports the dashboard runs and how it grades them (§ 5.5). */
const DASHBOARD_REFERENCE = 'cyber-asana.dashboard'

const DASHBOARD_FORMS = ['cli', 'status-update', 'page'] as const
const STATUS_PARENTS = ['project', 'portfolio', 'scope-default'] as const
const STATUS_TYPES = ['on_track', 'at_risk', 'off_track', 'on_hold', 'complete'] as const
const RULE_LEVELS = ['error', 'warning'] as const

export type StatusType = (typeof STATUS_TYPES)[number]
type RuleLevel = (typeof RULE_LEVELS)[number]

/**
 * `off_track` and `at_risk` name the least severe health finding that sets that status; `otherwise`
 * is the status when neither does. Health findings are the only input (D2.2).
 */
export type StatusRules = { off_track: RuleLevel; at_risk: RuleLevel; otherwise: StatusType }

export type DashboardSettings = {
	reports: string[]
	forms: Array<(typeof DASHBOARD_FORMS)[number]>
	status_parent: (typeof STATUS_PARENTS)[number]
	status_rules: StatusRules
}

export const DEFAULT_DASHBOARD_SETTINGS: Readonly<DashboardSettings> = Object.freeze({
	reports: ['sprint', 'health', 'workload', 'velocity'],
	forms: ['cli'],
	status_parent: 'scope-default',
	status_rules: { off_track: 'error', at_risk: 'warning', otherwise: 'on_track' },
} as DashboardSettings)

function fail(key: string, rule: string): never {
	throw new Error(`${DASHBOARD_REFERENCE}: ${key} must be ${rule}`)
}

function distinctList(key: string, value: unknown, allowed?: readonly string[]): string[] {
	const rule = allowed
		? `a non-empty list of distinct values from ${allowed.join(', ')}`
		: 'a non-empty list of distinct report keys'
	if (
		!Array.isArray(value) ||
		value.length === 0 ||
		new Set(value).size !== value.length ||
		!value.every((v) => typeof v === 'string' && v.trim().length > 0 && (!allowed || allowed.includes(v)))
	) {
		fail(key, rule)
	}
	return value as string[]
}

/** The dashboard settings from a reference's frontmatter; a bad value throws so a typo reports itself. */
export function parseDashboardSettings(metadata: Record<string, unknown>): DashboardSettings {
	const settings = structuredClone({ ...DEFAULT_DASHBOARD_SETTINGS }) as DashboardSettings
	const { reports, forms, status_parent, status_rules } = metadata
	if (reports !== undefined && reports !== null) settings.reports = distinctList('reports', reports)
	if (forms !== undefined && forms !== null) {
		settings.forms = distinctList('forms', forms, DASHBOARD_FORMS) as DashboardSettings['forms']
	}
	if (status_parent !== undefined && status_parent !== null) {
		if (!(STATUS_PARENTS as readonly unknown[]).includes(status_parent)) {
			fail('status_parent', `one of ${STATUS_PARENTS.join(', ')}`)
		}
		settings.status_parent = status_parent as DashboardSettings['status_parent']
	}
	if (status_rules !== undefined && status_rules !== null) {
		const rule = `a map with off_track and at_risk (each ${RULE_LEVELS.join(' or ')}) and otherwise (one of ${STATUS_TYPES.join(', ')})`
		if (typeof status_rules !== 'object' || Array.isArray(status_rules)) fail('status_rules', rule)
		const rules = status_rules as Record<string, unknown>
		for (const key of Object.keys(rules)) {
			if (!['off_track', 'at_risk', 'otherwise'].includes(key)) fail('status_rules', rule)
		}
		for (const key of ['off_track', 'at_risk'] as const) {
			if (rules[key] === undefined) continue
			if (!(RULE_LEVELS as readonly unknown[]).includes(rules[key])) fail('status_rules', rule)
			settings.status_rules[key] = rules[key] as RuleLevel
		}
		if (rules.otherwise !== undefined) {
			if (!(STATUS_TYPES as readonly unknown[]).includes(rules.otherwise)) fail('status_rules', rule)
			settings.status_rules.otherwise = rules.otherwise as StatusType
		}
	}
	return settings
}

/** The dashboard settings from the resolved `cyber-asana.dashboard` reference, or the defaults. */
export async function loadDashboardSettings(opts: LoadReferenceMetadataOptions = {}): Promise<DashboardSettings> {
	return (await loadReferenceMetadata(DASHBOARD_REFERENCE, parseDashboardSettings, opts)) ?? parseDashboardSettings({})
}

const matches = (level: RuleLevel, counts: { error: number; warning: number }) =>
	level === 'error' ? counts.error > 0 : counts.error + counts.warning > 0

/** The status update's `status_type`: the first of `off_track`, `at_risk` whose level a finding reaches, else `otherwise`. */
export function statusFor(counts: { error: number; warning: number }, rules: StatusRules): StatusType {
	if (matches(rules.off_track, counts)) return 'off_track'
	if (matches(rules.at_risk, counts)) return 'at_risk'
	return rules.otherwise
}

/** The `## Status update` template of the resolved `cyber-asana.dashboard` reference. */
export async function loadStatusTemplate(opts: LoadReferenceMetadataOptions = {}): Promise<StatusTemplate> {
	const template = await loadReferenceContent(DASHBOARD_REFERENCE, parseStatusTemplate, opts)
	if (!template) throw new Error(`${DASHBOARD_REFERENCE} is not installed, so there is no status update template`)
	return template
}
