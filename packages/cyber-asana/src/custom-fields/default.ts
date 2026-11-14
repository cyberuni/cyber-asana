import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import {
	type AddCustomFieldToProjectOptions,
	type CreateCustomFieldInput,
	type CreateEnumOptionInput,
	createCustomFieldApi,
	type InsertEnumOptionInput,
	type UpdateEnumOptionInput,
} from './api.js'
import { createAsanaCustomFieldGateway } from './gateway.js'

function defaultCustomFieldApi() {
	return createCustomFieldApi(createAsanaCustomFieldGateway(createClient()))
}

export async function listCustomFields(workspaceGid: string, opts?: PaginationOptions) {
	return defaultCustomFieldApi().listCustomFields(workspaceGid, opts)
}

export async function getCustomField(customFieldGid: string, opts?: ReadOptions) {
	return defaultCustomFieldApi().getCustomField(customFieldGid, opts)
}

export async function listCustomFieldSettingsForProject(projectGid: string, opts?: PaginationOptions) {
	return defaultCustomFieldApi().listCustomFieldSettingsForProject(projectGid, opts)
}

export async function listCustomFieldSettingsForPortfolio(portfolioGid: string, opts?: PaginationOptions) {
	return defaultCustomFieldApi().listCustomFieldSettingsForPortfolio(portfolioGid, opts)
}

export async function listCustomFieldSettingsForGoal(goalGid: string, opts?: PaginationOptions) {
	return defaultCustomFieldApi().listCustomFieldSettingsForGoal(goalGid, opts)
}

export async function listCustomFieldSettingsForTeam(teamGid: string, opts?: PaginationOptions) {
	return defaultCustomFieldApi().listCustomFieldSettingsForTeam(teamGid, opts)
}

export async function createCustomField(input: CreateCustomFieldInput) {
	return defaultCustomFieldApi().createCustomField(input)
}

export async function createEnumOption(customFieldGid: string, input: CreateEnumOptionInput) {
	return defaultCustomFieldApi().createEnumOption(customFieldGid, input)
}

export async function insertEnumOption(customFieldGid: string, input: InsertEnumOptionInput) {
	return defaultCustomFieldApi().insertEnumOption(customFieldGid, input)
}

export async function updateEnumOption(enumOptionGid: string, input: UpdateEnumOptionInput) {
	return defaultCustomFieldApi().updateEnumOption(enumOptionGid, input)
}

export async function attachCustomField(
	projectGid: string,
	customFieldGid: string,
	opts?: AddCustomFieldToProjectOptions,
) {
	return defaultCustomFieldApi().attachCustomField(projectGid, customFieldGid, opts)
}

export async function detachCustomField(projectGid: string, customFieldGid: string) {
	return defaultCustomFieldApi().detachCustomField(projectGid, customFieldGid)
}
