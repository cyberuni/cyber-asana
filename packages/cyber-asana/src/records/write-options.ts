import { InvalidArgumentError } from 'commander'
import type { RecordCustomFields } from './gateway.js'

/** Commander collector for repeatable `--field <gid=value>`; values stay strings, as Asana reads them by field type. */
export function collectField(entry: string, previous: Record<string, string> = {}): Record<string, string> {
	const at = entry.indexOf('=')
	if (at < 1) throw new InvalidArgumentError('--field expects <custom-field-gid>=<value>')
	return { ...previous, [entry.slice(0, at)]: entry.slice(at + 1) }
}

/** Merges `--field` entries over `--fields-json`; undefined when neither was given. */
export function customFieldsFromCli(opts: {
	field?: Record<string, string>
	fieldsJson?: string
}): RecordCustomFields | undefined {
	let fromJson: RecordCustomFields | undefined
	if (opts.fieldsJson !== undefined) {
		let parsed: unknown
		try {
			parsed = JSON.parse(opts.fieldsJson)
		} catch {
			throw new InvalidArgumentError('--fields-json must be a JSON object of custom field GID to value')
		}
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new InvalidArgumentError('--fields-json must be a JSON object of custom field GID to value')
		}
		fromJson = parsed as RecordCustomFields
	}
	if (fromJson === undefined && opts.field === undefined) return undefined
	return { ...fromJson, ...opts.field }
}
