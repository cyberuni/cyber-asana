/**
 * What the scrum reports read from a task's system stories (design G14). Asana documents these
 * `resource_subtype` values but the SDK does not type them, so they live here and a system test
 * (`stories.system.ts`) confirms them against a live workspace. A report that finds none of them
 * says so and shows what it could not read.
 */
export const STORY_SUBTYPES = {
	sectionChanged: 'section_changed',
	addedToProject: 'added_to_project',
	addedToTag: 'added_to_tag',
	removedFromTag: 'removed_from_tag',
	dependencyAdded: 'dependency_added',
	dependencyRemoved: 'dependency_removed',
	dependencyMarkedComplete: 'dependency_marked_complete',
	dependencyMarkedIncomplete: 'dependency_marked_incomplete',
} as const

export type TaskStory = { resource_subtype?: string | null; created_at?: string | null; text?: string | null }

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The text names `name` as a whole word, so "Sprint 2" does not match "Sprint 20". */
const mentions = (text: string | null | undefined, name: string) =>
	new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(name)}($|[^\\p{L}\\p{N}])`, 'iu').test(text ?? '')

/** When a task first entered the sprint's section, from its "moved to" stories. */
export function joinedAt(stories: TaskStory[], sprintName: string): string | undefined {
	return stories
		.filter(
			(s) =>
				(s.resource_subtype === STORY_SUBTYPES.sectionChanged ||
					s.resource_subtype === STORY_SUBTYPES.addedToProject) &&
				s.created_at &&
				mentions(s.text, sprintName),
		)
		.map((s) => s.created_at as string)
		.sort()[0]
}

export type BlockedInterval = { from: string; to: string | null }

const HOUR_MS = 3_600_000

/**
 * Hours a task was blocked, best effort, from `dependency` and `tag:<name>` signals. A `state:<x>`
 * signal leaves no system story the reports rely on, so it is not read. An interval still open is
 * counted up to `until` (completion, or now) and reported with `to: null`.
 */
export function blockedHours(
	stories: TaskStory[],
	signals: readonly string[],
	until: string,
): { hours: number; intervals: BlockedInterval[] } | undefined {
	const tags = signals.filter((s) => s.startsWith('tag:')).map((s) => s.slice(4))
	const dependency = signals.includes('dependency')
	const delta = (s: TaskStory): number => {
		if (dependency) {
			if (
				s.resource_subtype === STORY_SUBTYPES.dependencyAdded ||
				s.resource_subtype === STORY_SUBTYPES.dependencyMarkedIncomplete
			)
				return 1
			if (
				s.resource_subtype === STORY_SUBTYPES.dependencyRemoved ||
				s.resource_subtype === STORY_SUBTYPES.dependencyMarkedComplete
			)
				return -1
		}
		for (const tag of tags) {
			if (!mentions(s.text, tag)) continue
			if (s.resource_subtype === STORY_SUBTYPES.addedToTag) return 1
			if (s.resource_subtype === STORY_SUBTYPES.removedFromTag) return -1
		}
		return 0
	}
	const events = stories
		.filter((s) => s.created_at && delta(s) !== 0)
		.sort((a, b) => (a.created_at as string).localeCompare(b.created_at as string))
	if (events.length === 0) return undefined
	const intervals: BlockedInterval[] = []
	let depth = 0
	let from = ''
	for (const event of events) {
		const next = Math.max(0, depth + delta(event))
		if (depth === 0 && next > 0) from = event.created_at as string
		if (depth > 0 && next === 0) intervals.push({ from, to: event.created_at as string })
		depth = next
	}
	if (depth > 0) intervals.push({ from, to: null })
	const ms = intervals.reduce((total, i) => total + (Date.parse(i.to ?? until) - Date.parse(i.from)), 0)
	return { hours: Math.round((ms / HOUR_MS) * 10) / 10, intervals }
}
