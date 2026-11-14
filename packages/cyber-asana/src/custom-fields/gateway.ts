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
	createCustomField(input: CreateCustomFieldInput): Promise<Asana.CustomField>
	createEnumOption(customFieldGid: string, input: CreateEnumOptionInput): Promise<EnumOption>
	insertEnumOption(customFieldGid: string, input: InsertEnumOptionInput): Promise<EnumOption>
	updateEnumOption(enumOptionGid: string, input: UpdateEnumOptionInput): Promise<EnumOption>
	addCustomFieldToProject(
		projectGid: string,
		customFieldGid: string,
		opts?: AddCustomFieldToProjectOptions,
	): Promise<Asana.CustomFieldSetting>
	removeCustomFieldFromProject(projectGid: string, customFieldGid: string): Promise<void>
}

export function createAsanaCustomFieldGateway(client: Asana.ApiClient): CustomFieldGateway {
	const customFieldsApi = new Asana.CustomFieldsApi(client)
	const settingsApi = new Asana.CustomFieldSettingsApi(client)
	const projectsApi = new Asana.ProjectsApi(client)

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
		async createCustomField(input) {
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
				{},
			)
			return res.data
		},
		async createEnumOption(customFieldGid, input) {
			const res = await customFieldsApi.createEnumOptionForCustomField(customFieldGid, {
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
		async updateEnumOption(enumOptionGid, input) {
			const res = await customFieldsApi.updateEnumOption(enumOptionGid, {
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
	}
}
