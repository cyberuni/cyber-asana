import { readFileSync } from 'node:fs'
import path from 'node:path'

export const skillsRoot = path.resolve(import.meta.dirname, '../../skills')
export const repoRoot = path.resolve(import.meta.dirname, '../../../..')

const subsetDoc = path.join('asana', 'references', 'tidy-description.md')

export function readSubsetSkill(): string {
	return readFileSync(path.join(skillsRoot, subsetDoc), 'utf8')
}
