import type { StudyNode } from "../../types";

interface InternalLinkInputProps {
  inputId: string;
  query: string;
  suggestions: StudyNode[];
  onQueryChange: (value: string) => void;
  onInsert: (title: string) => void;
}

function findBestMaterialTitle(
  query: string,
  suggestions: StudyNode[]
): string {
  const cleanQuery = query.trim();
  if (!cleanQuery) return "";
  const exactMatch = suggestions.find(node => node.title.toLowerCase() === cleanQuery.toLowerCase());
  if (exactMatch) return exactMatch.title;
  if (suggestions.length > 0) return suggestions[0].title;
  return cleanQuery;
}

export function StudyInternalLinkInput({
  inputId,
  query,
  suggestions,
  onQueryChange,
  onInsert,
}: InternalLinkInputProps) {
  const datalistId = `${inputId}-suggestions`;

  function insertCurrentValue() {
    const title = findBestMaterialTitle(query, suggestions);
    if (!title) return;
    onInsert(title);
  }

  return (
    <div className="study-internal-link-input-wrap">
      <label className="form-field">
        <span>Material</span>
        <input
          value={query}
          list={datalistId}
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              insertCurrentValue();
            }
          }}
          placeholder="Type material title..."
        />
        <datalist id={datalistId}>
          {suggestions.map((node) => (
            <option key={node.id} value={node.title} />
          ))}
        </datalist>
      </label>

      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={insertCurrentValue}
        disabled={!query.trim()}
        className="button ghost full-width"
        style={{ marginTop: 8 }}
      >
        Insert [[link]]
      </button>

      <p className="study-muted" style={{ fontSize: 11, marginTop: 4 }}>
        Link will be inserted at cursor position.
      </p>
    </div>
  );
}
