import { CodedConfigError } from '../platform/coded-error.js'

export type StatusParentType = 'project' | 'portfolio' | 'goal'

const PROJECT_TYPES = ['on_track', 'at_risk', 'off_track', 'on_hold', 'complete'] as const

/**
 * The `status_type` each parent accepts. Project and portfolio: Asana's documented body (A3). Goals
 * take their own outcome words beside the three shared ones *(docs: the export reference lists
 * on_track, at_risk, off_track, on_hold, complete, achieved, partial, missed, dropped)*.
 */
export const STATUS_TYPES: Readonly<Record<StatusParentType, readonly string[]>> = {
	project: PROJECT_TYPES,
	portfolio: PROJECT_TYPES,
	goal: ['on_track', 'at_risk', 'off_track', 'achieved', 'partial', 'missed', 'dropped'],
}

/** True when only some parent types accept the value, so the parent must be known to judge it. */
export function statusTypeIsExclusive(value: string): boolean {
	const accepting = (Object.keys(STATUS_TYPES) as StatusParentType[]).filter((p) => STATUS_TYPES[p].includes(value))
	return accepting.length > 0 && accepting.length < 3
}

/** Throws the caller-fixable `status-type-invalid` when `parentType` does not accept `value`. */
export function assertStatusType(value: string, parentType: StatusParentType): void {
	const options = STATUS_TYPES[parentType]
	if (options.includes(value)) return
	throw new CodedConfigError(
		'status-type-invalid',
		`status_type "${value}" is not valid for a ${parentType}; use one of ${options.join(', ')}`,
		{ options, hint: `Retry with --status-type <${options.join('|')}>.` },
	)
}

/** Throws `status-type-invalid` when no parent type accepts `value`; used when the parent is not known. */
export function assertKnownStatusType(value: string): void {
	const all = [...new Set(Object.values(STATUS_TYPES).flat())]
	if (all.includes(value)) return
	throw new CodedConfigError(
		'status-type-invalid',
		`status_type "${value}" is not valid; use one of ${all.join(', ')}`,
		{
			options: all,
			hint: 'Project and portfolio updates take on_track, at_risk, off_track, on_hold, complete; goals take on_track, at_risk, off_track, achieved, partial, missed, dropped.',
		},
	)
}
