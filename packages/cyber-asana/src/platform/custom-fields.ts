/** Parsing of custom field values, shared by every resource that takes them in a write body. */

function parseCustomFieldsJson(value?: string) {
	if (!value) return undefined
	const parsed = JSON.parse(value)
	if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
		throw new Error('custom fields JSON must be an object')
	}
	return parsed as Record<string, unknown>
}

function parseCustomFieldEntries(entries?: string[]) {
	if (!entries?.length) return undefined
	return Object.fromEntries(
		entries.map((entry) => {
			const separator = entry.indexOf('=')
			if (separator <= 0) throw new Error(`invalid custom field entry: ${entry}`)
			return [entry.slice(0, separator), entry.slice(separator + 1)]
		}),
	)
}

function parseHtmlCustomFieldsJson(value?: string) {
	if (!value) return undefined
	const parsed = JSON.parse(value)
	if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
		throw new Error('html custom fields JSON must be an object')
	}
	for (const [gid, html] of Object.entries(parsed)) {
		if (typeof html !== 'string') throw new Error(`html custom field ${gid} must be a string of HTML`)
	}
	return parsed as Record<string, string>
}

function parseHtmlCustomFieldEntries(entries?: string[]) {
	if (!entries?.length) return undefined
	return Object.fromEntries(
		entries.map((entry) => {
			const separator = entry.indexOf('=')
			if (separator <= 0) throw new Error(`invalid html custom field entry: ${entry}`)
			return [entry.slice(0, separator), entry.slice(separator + 1)]
		}),
	)
}

/** Custom field values from JSON and `gid=value` entries; entries win over JSON. */
export function mergeCustomFields(customFieldsJson?: string, customFieldEntries?: string[]) {
	const fromJson = parseCustomFieldsJson(customFieldsJson)
	const fromEntries = parseCustomFieldEntries(customFieldEntries)
	if (!fromJson && !fromEntries) return undefined
	return { ...fromJson, ...fromEntries }
}

/** HTML custom field values from an object, JSON, and `gid=html` entries, later sources winning. */
export function mergeHtmlCustomFields(input: {
	htmlCustomFields?: Record<string, string>
	htmlCustomFieldsJson?: string
	htmlCustomFieldEntries?: string[]
}) {
	const merged = {
		...input.htmlCustomFields,
		...parseHtmlCustomFieldsJson(input.htmlCustomFieldsJson),
		...parseHtmlCustomFieldEntries(input.htmlCustomFieldEntries),
	}
	return Object.keys(merged).length > 0 ? merged : undefined
}
