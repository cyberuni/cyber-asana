import { createClient } from '../platform/client.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createTaskApi, type TaskCollectionOptions, type TaskListOptions, type TaskWithStoriesOptions } from './api.js'
import {
	type CreateTaskFields,
	createAsanaTaskGateway,
	type SearchTasksOptions,
	type TaskBatchLookupResult,
	type UpdateTaskFields,
} from './gateway.js'

function defaultTaskApi() {
	return createTaskApi(createAsanaTaskGateway(createClient()))
}

export async function listTasks(projectGid: string, opts?: TaskListOptions) {
	return defaultTaskApi().listTasks(projectGid, opts)
}

export async function listTasksForSection(sectionGid: string, opts?: TaskCollectionOptions) {
	return defaultTaskApi().listTasksForSection(sectionGid, opts)
}

export async function getTask(taskGid: string, opts?: ReadOptions) {
	return defaultTaskApi().getTask(taskGid, opts)
}

export async function getTaskWithStories(taskGid: string, opts?: TaskWithStoriesOptions) {
	return defaultTaskApi().getTaskWithStories(taskGid, opts)
}

export async function getTasksByGid(
	taskGids: string[],
	opts?: { optFields?: string },
): Promise<TaskBatchLookupResult[]> {
	return defaultTaskApi().getTasksByGid(taskGids, opts)
}

export async function createTask(workspaceGid: string, name: string, opts?: CreateTaskFields) {
	return defaultTaskApi().createTask(workspaceGid, name, opts)
}

export async function updateTask(taskGid: string, fields: UpdateTaskFields) {
	return defaultTaskApi().updateTask(taskGid, fields)
}

export async function deleteTask(taskGid: string) {
	return defaultTaskApi().deleteTask(taskGid)
}

export async function getMyTasks(workspaceGid: string, opts?: TaskCollectionOptions) {
	return defaultTaskApi().getMyTasks(workspaceGid, opts)
}

export async function listSubtasks(taskGid: string, opts?: TaskCollectionOptions) {
	return defaultTaskApi().listSubtasks(taskGid, opts)
}

export async function createSubtask(parentTaskGid: string, name: string, opts?: CreateTaskFields) {
	return defaultTaskApi().createSubtask(parentTaskGid, name, opts)
}

export async function addTaskToProject(
	taskGid: string,
	projectGid: string,
	opts?: { sectionGid?: string; insertAfter?: string; insertBefore?: string },
) {
	return defaultTaskApi().addTaskToProject(taskGid, projectGid, opts)
}

export async function removeTaskFromProject(taskGid: string, projectGid: string) {
	return defaultTaskApi().removeTaskFromProject(taskGid, projectGid)
}

export async function addFollowersToTask(taskGid: string, followerGids: string[]) {
	return defaultTaskApi().addFollowersToTask(taskGid, followerGids)
}

export async function removeFollowersFromTask(taskGid: string, followerGids: string[]) {
	return defaultTaskApi().removeFollowersFromTask(taskGid, followerGids)
}

export async function getDependencies(taskGid: string, opts?: { optFields?: string }) {
	return defaultTaskApi().getDependencies(taskGid, opts)
}

export async function getDependents(taskGid: string, opts?: { optFields?: string }) {
	return defaultTaskApi().getDependents(taskGid, opts)
}

export async function addDependencies(taskGid: string, dependencyGids: string[]) {
	return defaultTaskApi().addDependencies(taskGid, dependencyGids)
}

export async function addDependents(taskGid: string, dependentGids: string[]) {
	return defaultTaskApi().addDependents(taskGid, dependentGids)
}

export async function removeDependencies(taskGid: string, dependencyGids: string[]) {
	return defaultTaskApi().removeDependencies(taskGid, dependencyGids)
}

export async function removeDependents(taskGid: string, dependentGids: string[]) {
	return defaultTaskApi().removeDependents(taskGid, dependentGids)
}

export async function searchTasks(workspaceGid: string, opts?: SearchTasksOptions) {
	return defaultTaskApi().searchTasks(workspaceGid, opts)
}
