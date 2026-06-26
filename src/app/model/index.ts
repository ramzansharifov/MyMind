export { getModuleCollections, moduleCollections } from './moduleCollections';
export { dataCollections, reminderCollections } from '../../shared/app/collectionRegistry';
export type { AppCollectionName } from '../../shared/app/collectionRegistry';
export { createDefaultSettings, createDefaultSidebarSettings, normalizeSettings } from '../../shared/app/settingsModel';
export {
  emptyData,
  getDataCollection,
  normalizeCollectionValue,
  normalizeData,
  setDataCollection,
} from '../../shared/app/appData';
export type { AppData } from '../../shared/app/appData';
