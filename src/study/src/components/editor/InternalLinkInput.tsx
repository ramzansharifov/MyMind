import type { StudyNode } from "../../types/study";

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

  if (!cleanQuery) {
    return "";
  }

  const exactMatch = suggestions.find(
    (node) => node.title.toLowerCase() === cleanQuery.toLowerCase()
  );

  if (exactMatch) {
    return exactMatch.title;
  }

  if (suggestions.length > 0) {
    return suggestions[0].title;
  }

  return cleanQuery;
}

export function InternalLinkInput({
  inputId,
  query,
  suggestions,
  onQueryChange,
  onInsert,
}: InternalLinkInputProps) {
  const datalistId = `${inputId}-suggestions`;

  function insertCurrentValue() {
    const title = findBestMaterialTitle(query, suggestions);

    if (!title) {
      return;
    }

    onInsert(title);
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-xs font-bold">
          Материал
        </span>

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
          placeholder="Начни писать название материала..."
          className="w-full border border-black bg-white px-3 py-2 text-sm outline-none"
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
        className="mt-2 w-full border border-black bg-white px-3 py-2 text-sm hover:bg-black hover:text-white disabled:border-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-400"
      >
        Insert [[link]]
      </button>

      <p className="mt-2 text-xs text-neutral-600">
        Ссылка вставится в активное место текста или выбранной ячейки. Можно выбрать подсказку или нажать Enter.
      </p>
    </div>
  );
}
