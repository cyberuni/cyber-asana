import { describe } from 'vitest'
import { createCustomFieldApi } from './api.js'
import { defineCustomFieldAuthoringAcceptanceSpecs } from './authoring.acceptance.js'
import type { CustomFieldGateway } from './gateway.js'

type Option = { gid: string; name: string; enabled: boolean }

/** A gateway double that keeps one workspace's fields, their ordered options, and one project's settings. */
function createAuthoringGateway() {
	let next = 1
	const fields = new Map<string, { gid: string; name: string; options: Option[] }>()
	const attached = new Set<string>()
	const move = (list: Option[], gid: string, to: number) => {
		const from = list.findIndex((o) => o.gid === gid)
		const [item] = list.splice(from, 1)
		list.splice(to, 0, item as Option)
	}
	const optionOf = (gid: string) => [...fields.values()].flatMap((f) => f.options).find((o) => o.gid === gid) as Option
	const partial: Partial<Record<keyof CustomFieldGateway, (...args: any[]) => Promise<any>>> = {
		createCustomField: async (input) => {
			const gid = `cf${next++}`
			fields.set(gid, {
				gid,
				name: input.name,
				options: (input.enumOptions ?? []).map((o: { name: string }) => ({
					gid: `o${next++}`,
					name: o.name,
					enabled: true,
				})),
			})
			return { gid, name: input.name }
		},
		getCustomField: async (gid) => {
			const field = fields.get(gid)
			return { gid, name: field?.name, enum_options: field?.options.map((o) => ({ ...o })) }
		},
		createEnumOption: async (fieldGid, input) => {
			const field = fields.get(fieldGid)
			const option = { gid: `o${next++}`, name: input.name, enabled: true }
			field?.options.push(option)
			const anchor = input.insertBefore ?? input.insertAfter
			if (field && anchor) {
				const at = field.options.findIndex((o) => o.gid === anchor)
				move(field.options, option.gid, input.insertBefore ? at : at + 1)
			}
			return option
		},
		insertEnumOption: async (fieldGid, input) => {
			const field = fields.get(fieldGid)
			const anchor = (input.beforeEnumOption ?? input.afterEnumOption) as string
			if (field) {
				const without = field.options.filter((o) => o.gid !== input.enumOption)
				const at = without.findIndex((o) => o.gid === anchor)
				move(field.options, input.enumOption, input.beforeEnumOption ? at : at + 1)
			}
			return optionOf(input.enumOption)
		},
		updateEnumOption: async (gid, input) => Object.assign(optionOf(gid), input),
		listCustomFieldSettingsForProject: async () =>
			[...attached].map((gid) => ({ gid: `s-${gid}`, custom_field: { gid } })),
		addCustomFieldToProject: async (_project, field) => {
			attached.add(field)
			return { gid: `s-${field}` }
		},
		removeCustomFieldFromProject: async (_project, field) => {
			attached.delete(field)
		},
	}
	return { gateway: partial as CustomFieldGateway, fields }
}

const fixture = createAuthoringGateway()

describe(
	'custom-fields/authoring acceptance',
	defineCustomFieldAuthoringAcceptanceSpecs({
		getApi: () => createCustomFieldApi(fixture.gateway),
		workspaceGid: 'w1',
		projectGid: 'p1',
		uniqueName: () => 'Sprint probe',
		deleteField: async (gid) => {
			fixture.fields.delete(gid)
		},
	}),
)
