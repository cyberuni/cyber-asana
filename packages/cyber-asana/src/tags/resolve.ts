import { listItems } from '../pagination.js'
import { listTags as defaultListTags } from './api.js'

type TagHit = { gid?: string; name?: string }

export type ResolveTagDeps = {
	listTags?: typeof defaultListTags
}

function normalize(value: string) {
	return value.trim().toLowerCase()
}

/**
 * Turn `--tag` values or `conventions.default_tags` into tag GIDs. An Asana GID is a long numeric
 * string, so a numeric value is taken as-is and a list of only GIDs costs no API call at all.
 * Anything else is a tag name, resolved against one listing of the workspace's tags.
 */
export async function resolveTagRefs(
	values: string[] | undefined,
	workspaceGid: string,
	deps?: ResolveTagDeps,
): Promise<string[] | undefined> {
	const wanted = (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0)
	if (wanted.length === 0) {
		return undefined
	}
	if (wanted.every((value) => /^\d+$/.test(value))) {
		return wanted
	}
	const listTags = deps?.listTags ?? defaultListTags
	const tags = listItems(await listTags(workspaceGid, { fetchAll: true, optFields: 'gid,name' })) as TagHit[]
	return wanted.map((value) => {
		if (/^\d+$/.test(value)) return value
		const matches = tags.filter((tag) => tag.name !== undefined && normalize(tag.name) === normalize(value))
		if (matches.length === 1) return (matches[0] as TagHit).gid as string
		if (matches.length > 1) {
			const candidates = matches.map((tag) => tag.gid).join(', ')
			throw new Error(`"${value}" matches ${matches.length} tags: ${candidates}. Use the GID instead.`)
		}
		throw new Error(
			`Tag "${value}" is not in workspace ${workspaceGid}. Create it with: cyber-asana tag create "${value}"`,
		)
	})
}
