import type { StudyState } from "../types/study";

export const emptyStudyState: StudyState = {
  selectedNodeId: null,
  nodes: [],
  materials: [],
  customBlockTemplates: [],
};
