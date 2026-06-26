import { appModules, type AppModuleDefinition } from './moduleRegistry';
import { getModuleCollections } from './moduleCollections';
import type { AppCollectionName } from './collectionRegistry';
import type { ModuleKey } from '../types/common';

export type ModuleDataNormalizer = (value: unknown) => unknown;
export type ModuleDefaultDataFactory = () => unknown;

export interface ModuleContract extends AppModuleDefinition {
  collections: AppCollectionName[];
  hasDirtyNavigationGuard: boolean;
  normalize?: ModuleDataNormalizer;
  createDefaultData?: ModuleDefaultDataFactory;
}

const dirtyGuardModules = new Set<ModuleKey>(['notes', 'study']);

export const moduleContracts: ModuleContract[] = appModules.map((module) => ({
  ...module,
  collections: getModuleCollections(module.key),
  hasDirtyNavigationGuard: dirtyGuardModules.has(module.key),
}));

export const moduleContractsByKey = new Map<ModuleKey, ModuleContract>(moduleContracts.map((module) => [module.key, module]));

export function getModuleContract(moduleKey: ModuleKey) {
  return moduleContractsByKey.get(moduleKey);
}
