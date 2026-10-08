import { readFileSync } from 'node:fs'
import path from 'node:path'

export const skillsRoot = path.resolve(import.meta.dirname, '../../skills')
export const repoRoot = path.resolve(import.meta.dirname, '../../../..')

const subsetDoc = path.join('asana', 'references', 'tidy-description.md')

export function readSubsetSkill(): string {
	return readFileSync(path.join(skillsRoot, subsetDoc), 'utf8')
}

/** `<h4>`–`<h6>` in the docs stands for three tags; probing needs them one by one. */
function expandHeadingRanges(text: string): string {
	return text.replace(/`<h(\d)>`[–-]`<h(\d)>`/g, (_match, from: string, to: string) => {
		const tags: string[] = []
		for (let level = Number(from); level <= Number(to); level++) tags.push(`\`<h${level}>\``)
		return tags.join(' · ')
	})
}

function tagsIn(text: string): string[] {
	// Only the tag name matters: `<a href="...">` and `<a>` are the same tag.
	return [...expandHeadingRanges(text).matchAll(/`<([a-z0-9]+)[^`]*>`/g)].map((match) => `<${match[1]}>`)
}

/**
 * The tag classification the skill documents. Parsed rather than duplicated so the
 * procedure file stays the single source of truth for both the offline drift test and the
 * live system probe.
 */
export function parseDocumentedSubset(content = readSubsetSkill()) {
	const supportedStart = content.indexOf('**Supported**')
	const rejectedStart = content.indexOf('**Rejected')
	if (supportedStart < 0) throw new Error('tidy-description.md is missing its **Supported** tag table')
	if (rejectedStart < supportedStart) throw new Error('tidy-description.md is missing its **Rejected** tag list')

	// First cell only — the Notes column names tags that are rejected, not supported.
	const supported = new Set<string>()
	for (const line of content.slice(supportedStart, rejectedStart).split('\n')) {
		if (!line.startsWith('|') || line.includes('---')) continue
		const firstCell = line.split('|')[1] ?? ''
		if (firstCell.trim() === 'Tag') continue
		for (const tag of tagsIn(firstCell)) supported.add(tag)
	}

	const rejectedLine = content
		.slice(rejectedStart)
		.split('\n')
		.find((line) => line.includes('·'))
	if (!rejectedLine) throw new Error('tidy-description.md no longer enumerates rejected tags on one line')

	return { supported, rejected: new Set(tagsIn(rejectedLine)) }
}
