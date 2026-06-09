import type { StudyMaterial, StudyMaterialIndexItem } from "../types";

function requireStudyApi() {
  if (!window.mymind?.study) {
    throw new Error(
      "Study storage API is not available. Restart the Electron app to load the updated preload script.",
    );
  }

  return window.mymind.study;
}

export const studyStorageClient = {
  listIndex(): Promise<StudyMaterialIndexItem[]> {
    return requireStudyApi().listIndex();
  },

  getMaterial(materialId: string): Promise<StudyMaterial | null> {
    return requireStudyApi().get(materialId);
  },

  saveMaterial(material: StudyMaterial): Promise<StudyMaterial> {
    return requireStudyApi().save(material);
  },

  deleteMaterial(materialId: string): Promise<boolean> {
    return requireStudyApi().delete(materialId);
  },
};
