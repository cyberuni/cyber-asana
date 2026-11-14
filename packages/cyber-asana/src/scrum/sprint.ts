import { CodedConfigError } from '../platform/coded-error.js'
import type { ScrumPolicy } from './policy.js'

/** What sprint identity reads: the effective sprint settings plus the policy's name format and working days. */
export type SprintSettings = Pick<
	ScrumPolicy,
	'sprint_length_days' | 'sprint_name_format' | 'working_days' | 'sprint_anchor_date'
>

export type Sprint = {
	n: number
	name: string
	/** First day, `YYYY-MM-DD`. */
	start: string
	/** Last day, inclusive. */
	end: string
	/** Days in the window that fall on the policy's `working_days`. */
	working_days: number
}

const DAY_MS = 86_400_000
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

const toDay = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS)
const fromDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10)

function anchorOf(settings: SprintSettings): string {
	if (settings.sprint_anchor_date === undefined) {
		throw new CodedConfigError('policy-incomplete', 'sprint_anchor_date is not set, so sprints cannot be computed', {
			hint: 'Set sprint_anchor_date (the first day of sprint 1, YYYY-MM-DD) in the cyber-asana.scrum reference, or on the scope with: cyber-asana config scope add <name> ... --sprint-anchor-date <date>',
		})
	}
	return settings.sprint_anchor_date
}

/** The index of the sprint a date falls in (sprint 1 starts on the anchor), or undefined before the anchor. */
export function sprintNumber(date: string, settings: SprintSettings): number | undefined {
	const offset = toDay(date) - toDay(anchorOf(settings))
	return offset < 0 ? undefined : Math.floor(offset / settings.sprint_length_days) + 1
}

export function sprintName(format: string, parts: { n: number; start: string; end: string }): string {
	return format
		.replaceAll('{n}', String(parts.n))
		.replaceAll('{start}', parts.start)
		.replaceAll('{end}', parts.end)
		.replaceAll('{year}', parts.start.slice(0, 4))
}

export function sprintWindow(n: number, settings: SprintSettings): Sprint {
	const first = toDay(anchorOf(settings)) + (n - 1) * settings.sprint_length_days
	const last = first + settings.sprint_length_days - 1
	let working = 0
	for (let day = first; day <= last; day++) {
		if ((settings.working_days as readonly string[]).includes(WEEKDAYS[new Date(day * DAY_MS).getUTCDay()] as string))
			working++
	}
	const start = fromDay(first)
	const end = fromDay(last)
	return { n, name: sprintName(settings.sprint_name_format, { n, start, end }), start, end, working_days: working }
}

export function sprintAt(date: string, settings: SprintSettings): Sprint | undefined {
	const n = sprintNumber(date, settings)
	return n === undefined ? undefined : sprintWindow(n, settings)
}

/** Today's date in an IANA timezone, `YYYY-MM-DD`. */
export function todayIn(timeZone: string, now: Date): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/**
 * A sprint index from `current | next | previous`, a number, or a sprint name written by
 * `sprint_name_format`. `current` is the index of today's sprint.
 */
export function parseSprintRef(ref: string, current: number, settings: SprintSettings): number {
	const text = ref.trim()
	if (text === 'current') return current
	if (text === 'next') return current + 1
	if (text === 'previous') {
		if (current <= 1) throw new CodedConfigError('sprint-none', 'There is no previous sprint: sprint 1 is the first')
		return current - 1
	}
	if (/^\d+$/.test(text) && Number(text) >= 1) return Number(text)
	const match = nameMatcher(settings).exec(text)
	if (match) return resolveMatch(match, settings)
	throw new CodedConfigError('sprint-unknown', `"${ref}" does not name a sprint`, {
		hint: `Use current, next, previous, a sprint number, or a name written like "${sprintName(settings.sprint_name_format, { n: 1, start: '2026-01-05', end: '2026-01-18' })}".`,
	})
}

const TOKEN_PATTERNS: Record<string, string> = {
	n: '(\\d+)',
	start: '(\\d{4}-\\d{2}-\\d{2})',
	end: '(\\d{4}-\\d{2}-\\d{2})',
	year: '(\\d{4})',
}

function nameTokens(format: string) {
	return [...format.matchAll(/\{(n|start|end|year)\}/g)].map((m) => m[1] as string)
}

/** A matcher for names `sprint_name_format` writes; its groups follow the order of the tokens. */
export function nameMatcher(settings: Pick<SprintSettings, 'sprint_name_format'>): RegExp {
	const source = settings.sprint_name_format
		.split(/(\{(?:n|start|end|year)\})/)
		.map((piece) => {
			const token = /^\{(.+)\}$/.exec(piece)?.[1]
			return token && token in TOKEN_PATTERNS
				? (TOKEN_PATTERNS[token] as string)
				: piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		})
		.join('')
	return new RegExp(`^${source}$`)
}

/** The sprint index a matched section name stands for, from `{n}` or else from `{start}` or `{end}`. */
export function resolveMatch(match: RegExpExecArray, settings: SprintSettings): number {
	const tokens = nameTokens(settings.sprint_name_format)
	const at = (token: string) => match[tokens.indexOf(token) + 1]
	if (tokens.includes('n')) return Number(at('n'))
	const date = at('start') ?? at('end')
	const n = date === undefined ? undefined : sprintNumber(date, settings)
	if (n === undefined) {
		throw new CodedConfigError('sprint-unknown', `"${match[0]}" names no sprint: its date is not inside one`)
	}
	return n
}
