import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'

/** An enum option as Asana returns it. */
export type EnumOption = { gid: string; name?: string; color?: string; enabled?: boolean }

export type EnumOptionInput = { name: string; color?: string; enabled?: boolean }

/** Request-body fields beyond name, type, and workspace are from Asana's docs; the system tests confirm them. */
export type CreateCustomFieldInput = {
	workspace: string
	name: string
	resourceSubtype: 'text' | 'enum' | 'multi_enum' | 'number' | 'date' | 'people'
	description?: string
	enumOptions?: EnumOptionInput[]
	precision?: number
}

/** Every field is optional; `resource_subtype` is absent because Asana cannot change a field's type. */
export type UpdateCustomFieldInput = {
	name?: string
	description?: string
	precision?: number
	format?: 'currency' | 'identifier' | 'percentage' | 'custom' | 'duration' | 'none'
	currencyCode?: string
	customLabel?: string
	customLabelPosition?: 'prefix' | 'suffix'
	enabled?: boolean
}

export type CreateEnumOptionInput = EnumOptionInput & { insertBefore?: string; insertAfter?: string }

export type InsertEnumOptionInput = { enumOption: string; beforeEnumOption?: string; afterEnumOption?: string }

export type UpdateEnumOptionInput = Partial<EnumOptionInput>

export type AddCustomFieldToProjectOptions = { isImportant?: boolean; insertBefore?: string; insertAfter?: string }

export type CustomFieldGateway = {
	listCustomFields(workspaceGid: string, opts?: PaginationOptions): Promise<ListResult<Asana.CustomField>>
	getCustomField(customFieldGid: string, opts?: ReadOptions): Promise<Asana.CustomField>
	listCustomFieldSettingsForProject(
		projectGid: string,
		opts?: PaginationOptions,
	): Promise<ListResult<Asana.CustomFieldSetting>>
	listCustomFieldSettingsForPortfolio(
		portfolioGid: string,
		opts?: PaginationOptions,
	): Promise<ListResult<Asana.CustomFieldSetting>>
	listCustomFieldSettingsForGoal(
		goalGid: string,
		opts?: PaginationOptions,
	): Promise<ListResult<Asana.CustomFieldSetting>>
	listCustomFieldSettingsForTeam(
		teamGid: string,
		opts?: PaginationOptions,
	): Promise<ListResult<Asana.CustomFieldSetting>>
	createCustomField(input: CreateCustomFieldInput, opts?: ReadOptions): Promise<Asana.CustomField>
	updateCustomField(
		customFieldGid: string,
		input: UpdateCustomFieldInput,
		opts?: ReadOptions,
	): Promise<Asana.CustomField>
	deleteCustomField(customFieldGid: string): Promise<void>
	createEnumOption(customFieldGid: string, input: CreateEnumOptionInput, opts?: ReadOptions): Promise<EnumOption>
	insertEnumOption(customFieldGid: string, input: InsertEnumOptionInput): Promise<EnumOption>
	updateEnumOption(enumOptionGid: string, input: UpdateEnumOptionInput, opts?: ReadOptions): Promise<EnumOption>
	addCustomFieldToProject(
		projectGid: string,
		customFieldGid: string,
		opts?: AddCustomFieldToProjectOptions,
	): Promise<Asana.CustomFieldSetting>
	removeCustomFieldFromProject(projectGid: string, customFieldGid: string): Promise<void>
	addCustomFieldToPortfolio(
		portfolioGid: string,
		customFieldGid: string,
		opts?: AddCustomFieldToProjectOptions,
	): Promise<Asana.CustomFieldSetting>
	removeCustomFieldFromPortfolio(portfolioGid: string, customFieldGid: string): Promise<void>
}

export function createAsanaCustomFieldGateway(client: Asana.ApiClient): CustomFieldGateway {
	const customFieldsApi = new Asana.CustomFieldsApi(client)
	const settingsApi = new Asana.CustomFieldSettingsApi(client)
	const projectsApi = new Asana.ProjectsApi(client)
	const portfoliosApi = new Asana.PortfoliosApi(client)

	return {
		async listCustomFields(workspaceGid, opts) {
			const res = await customFieldsApi.getCustomFieldsForWorkspace(workspaceGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getCustomField(customFieldGid, opts) {
			const res = await customFieldsApi.getCustomField(customFieldGid, toAsanaReadOptions(opts))
			return res.data
		},
		async listCustomFieldSettingsForProject(projectGid, opts) {
			const res = await settingsApi.getCustomFieldSettingsForProject(projectGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async listCustomFieldSettingsForPortfolio(portfolioGid, opts) {
			const res = await settingsApi.getCustomFieldSettingsForPortfolio(portfolioGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async listCustomFieldSettingsForGoal(goalGid, opts) {
			const res = await settingsApi.getCustomFieldSettingsForGoal(goalGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async listCustomFieldSettingsForTeam(teamGid, opts) {
			const res = await settingsApi.getCustomFieldSettingsForTeam(teamGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async createCustomField(input, opts) {
			const res = await customFieldsApi.createCustomField(
				{
					data: {
						workspace: input.workspace,
						name: input.name,
						resource_subtype: input.resourceSubtype,
						...(input.description !== undefined && { description: input.description }),
						...(input.precision !== undefined && { precision: input.precision }),
						...(input.enumOptions !== undefined && { enum_options: input.enumOptions }),
					},
				},
				toAsanaReadOptions(opts),
			)
			return res.data
		},
		async updateCustomField(customFieldGid, input, opts) {
			const res = await customFieldsApi.updateCustomField(customFieldGid, {
				...toAsanaReadOptions(opts),
				body: {
					data: {
						...(input.name !== undefined && { name: input.name }),
						...(input.description !== undefined && { description: input.description }),
						...(input.precision !== undefined && { precision: input.precision }),
						...(input.format !== undefined && { format: input.format }),
						...(input.currencyCode !== undefined && { currency_code: input.currencyCode }),
						...(input.customLabel !== undefined && { custom_label: input.customLabel }),
						...(input.customLabelPosition !== undefined && { custom_label_position: input.customLabelPosition }),
						...(input.enabled !== undefined && { enabled: input.enabled }),
					},
				},
			})
			return res.data
		},
		async deleteCustomField(customFieldGid) {
			await customFieldsApi.deleteCustomField(customFieldGid)
		},
		async createEnumOption(customFieldGid, input, opts) {
			const res = await customFieldsApi.createEnumOptionForCustomField(customFieldGid, {
				...toAsanaReadOptions(opts),
				body: {
					data: {
						name: input.name,
						...(input.color !== undefined && { color: input.color }),
						...(input.enabled !== undefined && { enabled: input.enabled }),
						...(input.insertBefore !== undefined && { insert_before: input.insertBefore }),
						...(input.insertAfter !== undefined && { insert_after: input.insertAfter }),
					},
				},
			})
			return res.data
		},
		async insertEnumOption(customFieldGid, input) {
			const res = await customFieldsApi.insertEnumOptionForCustomField(customFieldGid, {
				body: {
					data: {
						enum_option: input.enumOption,
						...(input.beforeEnumOption !== undefined && { before_enum_option: input.beforeEnumOption }),
						...(input.afterEnumOption !== undefined && { after_enum_option: input.afterEnumOption }),
					},
				},
			})
			return res.data
		},
		async updateEnumOption(enumOptionGid, input, opts) {
			const res = await customFieldsApi.updateEnumOption(enumOptionGid, {
				...toAsanaReadOptions(opts),
				body: {
					data: {
						...(input.name !== undefined && { name: input.name }),
						...(input.color !== undefined && { color: input.color }),
						...(input.enabled !== undefined && { enabled: input.enabled }),
					},
				},
			})
			return res.data
		},
		async addCustomFieldToProject(projectGid, customFieldGid, opts) {
			const res = await projectsApi.addCustomFieldSettingForProject(
				{
					data: {
						custom_field: customFieldGid,
						...(opts?.isImportant !== undefined && { is_important: opts.isImportant }),
						...(opts?.insertBefore !== undefined && { insert_before: opts.insertBefore }),
						...(opts?.insertAfter !== undefined && { insert_after: opts.insertAfter }),
					},
				},
				projectGid,
			)
			return res.data
		},
		async removeCustomFieldFromProject(projectGid, customFieldGid) {
			await projectsApi.removeCustomFieldSettingForProject({ data: { custom_field: customFieldGid } }, projectGid)
		},
		// Request body taken from developers.asana.com; unverified against a live paid workspace.
		async addCustomFieldToPortfolio(portfolioGid, customFieldGid, opts) {
			const res = await portfoliosApi.addCustomFieldSettingForPortfolio(
				{
					data: {
						custom_field: customFieldGid,
						...(opts?.isImportant !== undefined && { is_important: opts.isImportant }),
						...(opts?.insertBefore !== undefined && { insert_before: opts.insertBefore }),
						...(opts?.insertAfter !== undefined && { insert_after: opts.insertAfter }),
					},
				},
				portfolioGid,
			)
			return res.data
		},
		async removeCustomFieldFromPortfolio(portfolioGid, customFieldGid) {
			await portfoliosApi.removeCustomFieldSettingForPortfolio({ data: { custom_field: customFieldGid } }, portfolioGid)
		},
	}
}
