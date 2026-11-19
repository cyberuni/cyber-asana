import { mergeCustomFields, mergeHtmlCustomFields } from '../platform/custom-fields.js'
import type { PortfolioCreateFields, PortfolioUpdateFields } from './gateway.js'
import type { PortfolioColor, PortfolioDefaultAccessLevel, PortfolioResourceSubtype } from './portfolio-enums.js'

/** What `portfolio create` and `asana_portfolio_create` collect, before Asana's names. */
export type PortfolioWriteInput = {
	archived?: boolean
	color?: string
	customType?: string
	resourceSubtype?: string
	defaultAccessLevel?: string
	public?: boolean
	dueOn?: string
	startOn?: string
}

export type PortfolioUpdateInput = PortfolioWriteInput & {
	name?: string
	customFields?: Record<string, unknown>
	customFieldsJson?: string
	customFieldEntries?: string[]
	htmlCustomFields?: Record<string, string>
	htmlCustomFieldsJson?: string
	htmlCustomFieldEntries?: string[]
}

function writeFields(input: PortfolioWriteInput): PortfolioCreateFields {
	return {
		...(input.archived !== undefined && { archived: input.archived }),
		...(input.color !== undefined && { color: input.color as PortfolioColor }),
		...(input.customType !== undefined && { custom_type: input.customType }),
		...(input.resourceSubtype !== undefined && { resource_subtype: input.resourceSubtype as PortfolioResourceSubtype }),
		...(input.defaultAccessLevel !== undefined && {
			default_access_level: input.defaultAccessLevel as PortfolioDefaultAccessLevel,
		}),
		...(input.public !== undefined && { public: input.public }),
		...(input.dueOn !== undefined && { due_on: input.dueOn }),
		...(input.startOn !== undefined && { start_on: input.startOn }),
	}
}

/** Asana's create fields from the input; undefined when nothing was given. */
export function buildPortfolioCreateFields(input: PortfolioWriteInput): PortfolioCreateFields | undefined {
	const fields = writeFields(input)
	return Object.keys(fields).length > 0 ? fields : undefined
}

/** Asana's update fields from the input, including `name` and custom fields. */
export function buildPortfolioUpdateFields(input: PortfolioUpdateInput): PortfolioUpdateFields {
	const customFields = {
		...input.customFields,
		...mergeCustomFields(input.customFieldsJson, input.customFieldEntries),
	}
	const htmlCustomFields = mergeHtmlCustomFields(input)
	return {
		...(input.name !== undefined && { name: input.name }),
		...writeFields(input),
		...(Object.keys(customFields).length > 0 && { custom_fields: customFields }),
		...(htmlCustomFields && { html_custom_fields: htmlCustomFields }),
	}
}
