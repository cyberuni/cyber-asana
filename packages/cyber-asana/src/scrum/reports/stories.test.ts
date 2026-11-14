import { describe, expect, it } from 'vitest'
import { blockedHours, joinedAt, STORY_SUBTYPES } from './stories.js'

const story = (resource_subtype: string, created_at: string, text = '') => ({ resource_subtype, created_at, text })

describe('system stories (G14)', () => {
	it('names the documented subtypes in one place', () => {
		expect(STORY_SUBTYPES.sectionChanged).toBe('section_changed')
		expect(STORY_SUBTYPES.addedToTag).toBe('added_to_tag')
	})

	it('finds when a task entered a sprint section, not a sprint whose name only starts the same', () => {
		const stories = [
			story('section_changed', '2026-01-09T10:00:00Z', 'moved this Task from "Backlog" to "Sprint 20"'),
			story('section_changed', '2026-01-08T10:00:00Z', 'moved this Task from "Backlog" to "Sprint 2"'),
			story('comment_added', '2026-01-05T10:00:00Z', 'Sprint 2 looks good'),
		]
		expect(joinedAt(stories, 'Sprint 2')).toBe('2026-01-08T10:00:00Z')
		expect(joinedAt([], 'Sprint 2')).toBeUndefined()
	})

	it('reads an enum field change to the sprint option as joining it (the custom-field model)', () => {
		const stories = [
			story('enum_custom_field_changed', '2026-01-08T10:00:00Z', 'changed Sprint from "Sprint 1" to "Sprint 2"'),
		]
		expect(joinedAt(stories, 'Sprint 2')).toBe('2026-01-08T10:00:00Z')
	})

	it('sums the hours a tag blocked a task, open until completion or now', () => {
		const stories = [
			story('added_to_tag', '2026-01-08T00:00:00Z', 'added tag Blocked'),
			story('removed_from_tag', '2026-01-08T06:00:00Z', 'removed tag Blocked'),
			story('added_to_tag', '2026-01-09T00:00:00Z', 'added tag Blocked'),
			story('added_to_tag', '2026-01-09T01:00:00Z', 'added tag Other'),
		]
		const result = blockedHours(stories, ['tag:Blocked'], '2026-01-09T12:00:00Z')
		expect(result?.hours).toBe(18)
		expect(result?.intervals).toEqual([
			{ from: '2026-01-08T00:00:00Z', to: '2026-01-08T06:00:00Z' },
			{ from: '2026-01-09T00:00:00Z', to: null },
		])
	})

	it('reads a dependency as blocked from added until removed or completed', () => {
		const stories = [
			story('dependency_added', '2026-01-08T00:00:00Z'),
			story('dependency_marked_complete', '2026-01-08T04:00:00Z'),
		]
		expect(blockedHours(stories, ['dependency'], '2026-01-09T00:00:00Z')?.hours).toBe(4)
	})

	it('says nothing when no story shows a block', () => {
		expect(
			blockedHours([story('assigned', '2026-01-08T00:00:00Z')], ['dependency'], '2026-01-09T00:00:00Z'),
		).toBeUndefined()
	})
})
