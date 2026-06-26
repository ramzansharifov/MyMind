export interface EditorNavigationActions {
  save: () => void | Promise<void>;
  discard: () => void;
}
