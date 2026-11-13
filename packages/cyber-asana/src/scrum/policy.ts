import { type LoadReferenceMetadataOptions, loadReferenceMetadata } from '../platform/reference-metadata.js'

/**
 * The reference whose frontmatter holds how a team runs scrum: sprint length and anchor, workflow
 * states, carry-over, and the rest of § 5.2 of docs/design/scrum-system.md. Policy only, never a GID.
 */
export const SCRUM_REFERENCE = 'cyber-asana.scrum'

const WORKFLOW_STATES = ['backlog', 'ready', 'in_progress', 'review', 'done'] as const
type WorkflowState = (typeof WORKFLOW_STATES)[number]

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type Weekday = (typeof WEEKDAYS)[number]

const STATE_CARRIERS = ['field', 'sections', 'none'] as const
const CARRY_OVER = ['move', 'leave'] as const
const NAME_FORMAT_PLACEHOLDERS = ['n', 'start', 'end', 'year']

export type ScrumPolicy = {
	/** `sections`, `custom-field`, `project`, or the key of a custom `cyber-asana.sprint-model` implementation. */
	sprint_model: string
	sprint_length_days: number
	/** The first day of sprint 1, `YYYY-MM-DD`. Unset until setup asks for it. */
	sprint_anchor_date?: string
	/** A sprint's name, with `{n}`, `{start}`, `{end}`, and `{year}` filled in. */
	sprint_name_format: string
	backlog_section: string
	/** Where a task's workflow state is read from. */
	state_carrier: (typeof STATE_CARRIERS)[number]
	/** Each workflow state's option or section name. */
	workflow_states: Record<WorkflowState, string>
	/** `dependency`, `tag:<name>`, or `state:<state>`. */
	blocked_signals: string[]
	carry_over: (typeof CARRY_OVER)[number]
	/** How many past sprints velocity averages over. */
	velocity_window: number
	hours_per_point: number
	working_hours_per_day: number
	working_days: Weekday[]
	/** `previous_working_day`, or `<n>d` for the last n days. */
	standup_window: string
}

export const DEFAULT_SCRUM_POLICY: Readonly<ScrumPolicy> = Object.freeze<ScrumPolicy>({
	sprint_model: 'sections',
	sprint_length_days: 14,
	sprint_name_format: 'Sprint {n}',
	backlog_section: 'Backlog',
	state_carrier: 'none',
	workflow_states: {
		backlog: 'Backlog',
		ready: 'Ready',
		in_progress: 'In Progress',
		review: 'Review',
		done: 'Done',
	},
	blocked_signals: ['dependency'],
	carry_over: 'move',
	velocity_window: 3,
	hours_per_point: 1,
	working_hours_per_day: 8,
	working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
	standup_window: 'previous_working_day',
})

function fail(key: string, rule: string): never {
	throw new Error(`${SCRUM_REFERENCE}: ${key} must be ${rule}`)
}

function nonEmptyString(key: string, value: unknown): string {
	if (typeof value !== 'string' || value.trim().length === 0) fail(key, 'a non-empty string')
	return value
}

function oneOf<T extends string>(key: string, value: unknown, allowed: readonly T[]): T {
	if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value))
		fail(key, `one of ${allowed.join(', ')}`)
	return value as T
}

function positiveInteger(key: string, value: unknown): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) fail(key, 'a positive integer')
	return value
}

function positiveNumber(key: string, value: unknown, max = Number.POSITIVE_INFINITY): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > max) {
		fail(key, max === Number.POSITIVE_INFINITY ? 'a positive number' : `a positive number up to ${max}`)
	}
	return value
}

function isoDate(key: string, value: unknown): string {
	const text = value instanceof Date ? value.toISOString().slice(0, 10) : value
	if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) fail(key, 'a date written YYYY-MM-DD')
	const date = new Date(`${text}T00:00:00Z`)
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) fail(key, 'a real calendar date')
	return text
}

function nameFormat(key: string, value: unknown): string {
	const format = nonEmptyString(key, value)
	for (const [, placeholder] of format.matchAll(/\{([^}]*)\}/g)) {
		if (!NAME_FORMAT_PLACEHOLDERS.includes(placeholder as string)) {
			fail(key, `a string whose placeholders are ${NAME_FORMAT_PLACEHOLDERS.map((p) => `{${p}}`).join(' ')}`)
		}
	}
	return format
}

function workflowStates(key: string, value: unknown): Record<WorkflowState, string> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) fail(key, `a map of ${WORKFLOW_STATES.join(', ')}`)
	const states = { ...DEFAULT_SCRUM_POLICY.workflow_states }
	for (const [state, name] of Object.entries(value)) {
		if (!(WORKFLOW_STATES as readonly string[]).includes(state)) fail(key, `a map of ${WORKFLOW_STATES.join(', ')}`)
		states[state as WorkflowState] = nonEmptyString(`${key}.${state}`, name)
	}
	return states
}

function blockedSignals(key: string, value: unknown): string[] {
	const rule = 'a list of dependency, tag:<name>, or state:<state>'
	if (!Array.isArray(value)) fail(key, rule)
	return value.map((signal) => {
		if (signal === 'dependency') return signal
		if (typeof signal === 'string' && /^tag:.+/.test(signal)) return signal
		if (typeof signal === 'string' && signal.startsWith('state:')) {
			if ((WORKFLOW_STATES as readonly string[]).includes(signal.slice('state:'.length))) return signal
		}
		return fail(key, rule)
	})
}

function workingDays(key: string, value: unknown): Weekday[] {
	const rule = `a non-empty list of distinct weekdays (${WEEKDAYS.join(', ')})`
	if (!Array.isArray(value) || value.length === 0 || new Set(value).size !== value.length) fail(key, rule)
	return value.map((day) => oneOf(key, day, WEEKDAYS))
}

function standupWindow(key: string, value: unknown): string {
	if (value === 'previous_working_day') return value
	if (typeof value === 'string' && /^[1-9]\d*d$/.test(value)) return value
	return fail(key, 'previous_working_day or <n>d with n at least 1')
}

const PARSERS: { [K in keyof ScrumPolicy]-?: (key: K, value: unknown) => ScrumPolicy[K] } = {
	sprint_model: (key, value) => {
		const model = nonEmptyString(key, value)
		if (!/^[a-z0-9][a-z0-9-]*$/.test(model)) fail(key, 'sections, custom-field, project, or a lowercase custom key')
		return model
	},
	sprint_length_days: positiveInteger,
	sprint_anchor_date: isoDate,
	sprint_name_format: nameFormat,
	backlog_section: nonEmptyString,
	state_carrier: (key, value) => oneOf(key, value, STATE_CARRIERS),
	workflow_states: workflowStates,
	blocked_signals: blockedSignals,
	carry_over: (key, value) => oneOf(key, value, CARRY_OVER),
	velocity_window: positiveInteger,
	hours_per_point: (key, value) => positiveNumber(key, value),
	working_hours_per_day: (key, value) => positiveNumber(key, value, 24),
	working_days: workingDays,
	standup_window: standupWindow,
}

/**
 * The scrum policy from a reference's frontmatter, each key validated and each unset key given its
 * default. Other keys (`description`, `tags`, …) belong to the reference itself and are ignored; a
 * policy key with a bad value throws, so a typo reports itself instead of silently doing nothing.
 */
export function parseScrumPolicy(metadata: Record<string, unknown>): ScrumPolicy {
	const policy: Record<string, unknown> = structuredClone({ ...DEFAULT_SCRUM_POLICY })
	for (const [key, parse] of Object.entries(PARSERS) as [
		keyof ScrumPolicy,
		(key: string, value: unknown) => unknown,
	][]) {
		const value = metadata[key]
		if (value === undefined || value === null) continue
		policy[key] = parse(key, value)
	}
	return policy as ScrumPolicy
}

/** The scrum policy from the resolved `cyber-asana.scrum` reference, or the defaults when no tier ships it. */
export async function loadScrumPolicy(opts: LoadReferenceMetadataOptions = {}): Promise<ScrumPolicy> {
	return (await loadReferenceMetadata(SCRUM_REFERENCE, parseScrumPolicy, opts)) ?? parseScrumPolicy({})
}
