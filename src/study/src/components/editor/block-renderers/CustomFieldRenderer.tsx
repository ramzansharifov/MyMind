import type {
  CustomBlockField,
  CustomBlockValue,
  StudyNode,
} from "../../../types/study";
import { resolveInternalLinks } from "../../../utils/internalLinks";
import { LatexView } from "../../latex/LatexView";
import { TextWithInternalLinks } from "../TextWithInternalLinks";

interface CustomFieldRendererProps {
  field: CustomBlockField;
  value: CustomBlockValue;
  editable: boolean;
  nodes: StudyNode[];
  onOpenNode: (nodeId: string) => void;
  onChange: (value: CustomBlockValue) => void;
}

export function CustomFieldRenderer({
  field,
  value,
  editable,
  nodes,
  onOpenNode,
  onChange,
}: CustomFieldRendererProps) {
  if (!editable) {
    return (
      <div className="border border-black bg-white">
        <div className="border-b border-black bg-neutral-100 px-3 py-2 text-sm font-bold">
          {field.label}
          {field.required && <span> *</span>}
        </div>

        <div className="p-3">
          {field.type === "checkbox" ? (
            <p>{value ? "Да" : "Нет"}</p>
          ) : field.type === "latex" ? (
            <LatexView code={String(value)} displayMode />
          ) : field.type === "link" ? (
            <div className="whitespace-pre-wrap leading-7">
              <TextWithInternalLinks
                text={String(value)}
                nodes={nodes}
                onOpenNode={onOpenNode}
              />
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{String(value) || "-"}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <label className="block border border-black bg-white p-3">
      <span className="mb-2 block text-sm font-bold">
        {field.label}
        {field.required && <span> *</span>}
      </span>

      {field.type === "long_text" || field.type === "latex" || field.type === "link" ? (
        <textarea
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={field.type === "long_text" ? 5 : 3}
          className="w-full border border-black bg-white px-3 py-2 outline-none"
        />
      ) : field.type === "checkbox" ? (
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span className="text-sm">Да / Нет</span>
        </span>
      ) : field.type === "select" ? (
        <select
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border border-black bg-white px-3 py-2 outline-none"
        >
          <option value="">Выбрать...</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={String(value)}
          onChange={(event) =>
            onChange(field.type === "number" ? Number(event.target.value) : event.target.value)
          }
          placeholder={field.placeholder}
          className="w-full border border-black bg-white px-3 py-2 outline-none"
        />
      )}

      {field.type === "latex" && (
        <div className="mt-3">
          <p className="mb-2 text-sm font-bold">Превью:</p>
          <LatexView code={String(value)} displayMode />
        </div>
      )}

      {field.type === "link" && String(value).includes("[[") && (
        <div className="mt-3 border border-black bg-neutral-100 p-3 text-sm">
          <p className="font-bold">Внутренние ссылки:</p>

          <div className="mt-2 flex flex-wrap gap-2">
            {resolveInternalLinks(String(value), nodes).map((link) => (
              <span
                key={`${link.label}_${link.found}`}
                className={[
                  "border border-black px-2 py-1",
                  link.found ? "bg-black text-white" : "bg-white text-black line-through",
                ].join(" ")}
              >
                [[{link.label}]] {link.found ? "найдена" : "не найдена"}
              </span>
            ))}
          </div>
        </div>
      )}
    </label>
  );
}
