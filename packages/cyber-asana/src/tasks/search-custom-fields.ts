import { InvalidArgumentError } from 'commander'

/** The operators Asana's task search takes on a custom field: `custom_fields.{gid}.<operator>`. */
export const CUSTOM_FIELD_OPERATORS = ['value', 'is_set', 'less_than', 'greater_than', 'before', 'after'] as const

export type CustomFieldOperator = (typeof CUSTOM_FIELD_OPERATORS)[number]

export type CustomFieldFilter = { gid: string; operator: CustomFieldOperator; value: string }

/** Parse `<gid>.<operator>=<value>`, such as `1201.value=1209` or `1201.is_set=false`. */
export function parseCustomFieldFilter(text: string): CustomFieldFilter {
	const match = /^([^.=]*)\.([^.=]*)=(.*)$/.exec(text)
	if (!match) throw new InvalidArgumentError(`"${text}" is not <gid>.<operator>=<value>`)
	const [, gid, operator, value] = match as unknown as [string, string, string, string]
	if (!gid) throw new InvalidArgumentError(`"${text}" has no custom field gid before the operator`)
	if (!(CUSTOM_FIELD_OPERATORS as readonly string[]).includes(operator)) {
		throw new InvalidArgumentError(`"${operator}" is not an operator; use ${CUSTOM_FIELD_OPERATORS.join(', ')}`)
	}
	if (value === '') throw new InvalidArgumentError(`"${text}" has no value after =`)
	return { gid, operator: operator as CustomFieldOperator, value }
}
