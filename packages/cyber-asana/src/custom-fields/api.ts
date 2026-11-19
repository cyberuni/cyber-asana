import type { PaginationOptions } from '../platform/pagination.js'
import { listItems } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type {
	AddCustomFieldToProjectOptions,
	CreateCustomFieldInput,
	CreateEnumOptionInput,
	CustomFieldGateway,
	InsertEnumOptionInput,
	UpdateCustomFieldInput,
	UpdateEnumOptionInput,
} from './gateway.js'

export type {
	AddCustomFieldToProjectOptions,
	CreateCustomFieldInput,
	CreateEnumOptionInput,
	InsertEnumOptionInput,
	UpdateCustomFieldInput,
	UpdateEnumOptionInput,
}

export type CustomFieldApi = ReturnType<typeof createCustomFieldApi>

export function createCustomFieldApi(gateway: CustomFieldGateway) {
	async function hasField(
		list: (gid: string, opts: PaginationOptions) => ReturnType<CustomFieldGateway['listCustomFieldSettingsForProject']>,
		ownerGid: string,
		customFieldGid: string,
	) {
		const settings = (await list(ownerGid, { fetchAll: true, optFields: 'custom_field.gid' })) as never
		return (listItems(settings) as Array<{ custom_field?: { gid?: string } | null }>).some(
			(s) => s.custom_field?.gid === customFieldGid,
		)
	}
	const isAttached = (projectGid: string, customFieldGid: string) =>
		hasField((g, o) => gateway.listCustomFieldSettingsForProject(g, o), projectGid, customFieldGid)
	const isAttachedToPortfolio = (portfolioGid: string, customFieldGid: string) =>
		hasField((g, o) => gateway.listCustomFieldSettingsForPortfolio(g, o), portfolioGid, customFieldGid)

	return {
		listCustomFields(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFields(workspaceGid, opts)
		},
		getCustomField(customFieldGid: string, opts?: ReadOptions) {
			return gateway.getCustomField(customFieldGid, opts)
		},
		listCustomFieldSettingsForProject(projectGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFieldSettingsForProject(projectGid, opts)
		},
		listCustomFieldSettingsForPortfolio(portfolioGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFieldSettingsForPortfolio(portfolioGid, opts)
		},
		listCustomFieldSettingsForGoal(goalGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFieldSettingsForGoal(goalGid, opts)
		},
		listCustomFieldSettingsForTeam(teamGid: string, opts?: PaginationOptions) {
			return gateway.listCustomFieldSettingsForTeam(teamGid, opts)
		},
		createCustomField(input: CreateCustomFieldInput, opts?: ReadOptions) {
			return gateway.createCustomField(input, opts)
		},
		updateCustomField(customFieldGid: string, input: UpdateCustomFieldInput, opts?: ReadOptions) {
			return gateway.updateCustomField(customFieldGid, input, opts)
		},
		deleteCustomField(customFieldGid: string) {
			return gateway.deleteCustomField(customFieldGid)
		},
		createEnumOption(customFieldGid: string, input: CreateEnumOptionInput, opts?: ReadOptions) {
			return gateway.createEnumOption(customFieldGid, input, opts)
		},
		insertEnumOption(customFieldGid: string, input: InsertEnumOptionInput) {
			return gateway.insertEnumOption(customFieldGid, input)
		},
		updateEnumOption(enumOptionGid: string, input: UpdateEnumOptionInput, opts?: ReadOptions) {
			return gateway.updateEnumOption(enumOptionGid, input, opts)
		},
		/** Attaching a field the project already has succeeds with `already_attached` and writes nothing. */
		async attachCustomField(projectGid: string, customFieldGid: string, opts?: AddCustomFieldToProjectOptions) {
			assertOnePosition(opts)
			if (await isAttached(projectGid, customFieldGid)) {
				return { project: projectGid, custom_field: customFieldGid, status: 'already_attached' as const }
			}
			await gateway.addCustomFieldToProject(projectGid, customFieldGid, opts)
			return { project: projectGid, custom_field: customFieldGid, status: 'attached' as const }
		},
		/** Detaching a field the project does not have succeeds with `already_detached` and writes nothing. */
		async detachCustomField(projectGid: string, customFieldGid: string) {
			if (!(await isAttached(projectGid, customFieldGid))) {
				return { project: projectGid, custom_field: customFieldGid, status: 'already_detached' as const }
			}
			await gateway.removeCustomFieldFromProject(projectGid, customFieldGid)
			return { project: projectGid, custom_field: customFieldGid, status: 'detached' as const }
		},
		/** Attaching a field the portfolio already has succeeds with `already_attached` and writes nothing. */
		async attachCustomFieldToPortfolio(
			portfolioGid: string,
			customFieldGid: string,
			opts?: AddCustomFieldToProjectOptions,
		) {
			assertOnePosition(opts)
			if (await isAttachedToPortfolio(portfolioGid, customFieldGid)) {
				return { portfolio: portfolioGid, custom_field: customFieldGid, status: 'already_attached' as const }
			}
			await gateway.addCustomFieldToPortfolio(portfolioGid, customFieldGid, opts)
			return { portfolio: portfolioGid, custom_field: customFieldGid, status: 'attached' as const }
		},
		/** Detaching a field the portfolio does not have succeeds with `already_detached` and writes nothing. */
		async detachCustomFieldFromPortfolio(portfolioGid: string, customFieldGid: string) {
			if (!(await isAttachedToPortfolio(portfolioGid, customFieldGid))) {
				return { portfolio: portfolioGid, custom_field: customFieldGid, status: 'already_detached' as const }
			}
			await gateway.removeCustomFieldFromPortfolio(portfolioGid, customFieldGid)
			return { portfolio: portfolioGid, custom_field: customFieldGid, status: 'detached' as const }
		},
	}
}

/** Asana rejects a custom field setting placed both before and after another; fail before any request. */
function assertOnePosition(opts?: AddCustomFieldToProjectOptions) {
	if (opts?.insertBefore !== undefined && opts.insertAfter !== undefined) {
		throw new Error('insert_before and insert_after cannot both be given')
	}
}
