import { useState } from "react";
import type {
  CustomBlockField,
  CustomBlockTemplate,
  CustomFieldType,
} from "../../types/study";
import { createId, now } from "../../utils/ids";
import { DangerConfirmModal } from "../modals/DangerConfirmModal";

interface TemplateManagerProps {
  templates: CustomBlockTemplate[];
  onChange: (templates: CustomBlockTemplate[]) => void;
  onClose: () => void;
}

const fieldTypes: Array<{
  value: CustomFieldType;
  label: string;
}> = [
  { value: "text", label: "Text" },
  { value: "long_text", label: "Long text" },
  { value: "latex", label: "LaTeX" },
  { value: "number", label: "Number" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Select" },
  { value: "date", label: "Date" },
  { value: "link", label: "Internal link" },
];

function createEmptyField(): CustomBlockField {
  return {
    id: createId("field"),
    label: "Новое поле",
    type: "text",
    required: false,
    placeholder: "",
    options: [],
  };
}

export function TemplateManager({
  templates,
  onChange,
  onClose,
}: TemplateManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("Новый шаблон");
  const [icon, setIcon] = useState("B");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<CustomBlockField[]>([createEmptyField()]);
  const [templateToDelete, setTemplateToDelete] = useState<CustomBlockTemplate | null>(null);

  const editingTemplate = templates.find((template) => template.id === editingId) ?? null;

  function resetForm() {
    setEditingId(null);
    setName("Новый шаблон");
    setIcon("B");
    setDescription("");
    setFields([createEmptyField()]);
  }

  function startEdit(template: CustomBlockTemplate) {
    setEditingId(template.id);
    setName(template.name);
    setIcon(template.icon || "B");
    setDescription(template.description ?? "");
    setFields(
      template.fields.map((field) => ({
        ...field,
        options: field.options ?? [],
      }))
    );
  }

  function updateField(fieldId: string, patch: Partial<CustomBlockField>) {
    setFields((previous) =>
      previous.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              ...patch,
            }
          : field
      )
    );
  }

  function removeField(fieldId: string) {
    if (fields.length === 1) {
      window.alert("В шаблоне должно быть хотя бы одно поле.");
      return;
    }

    setFields((previous) => previous.filter((field) => field.id !== fieldId));
  }

  function moveField(fieldId: string, direction: -1 | 1) {
    setFields((previous) => {
      const index = previous.findIndex((field) => field.id === fieldId);
      const targetIndex = index + direction;

      if (index < 0 || targetIndex < 0 || targetIndex >= previous.length) {
        return previous;
      }

      const next = [...previous];
      const current = next[index];

      next[index] = next[targetIndex];
      next[targetIndex] = current;

      return next;
    });
  }

  function saveTemplate() {
    const cleanName = name.trim();

    if (!cleanName) {
      window.alert("Укажи название шаблона.");
      return;
    }

    const cleanFields = fields
      .map((field) => ({
        ...field,
        label: field.label.trim(),
        placeholder: field.placeholder?.trim() ?? "",
        options:
          field.type === "select"
            ? (field.options ?? []).map((option) => option.trim()).filter(Boolean)
            : [],
      }))
      .filter((field) => field.label);

    if (cleanFields.length === 0) {
      window.alert("Добавь хотя бы одно поле.");
      return;
    }

    if (editingId) {
      onChange(
        templates.map((template) =>
          template.id === editingId
            ? {
                ...template,
                name: cleanName,
                icon: icon.trim() || "B",
                color: "#000000",
                description: description.trim(),
                fields: cleanFields,
                updatedAt: now(),
              }
            : template
        )
      );
    } else {
      const template: CustomBlockTemplate = {
        id: createId("template"),
        name: cleanName,
        icon: icon.trim() || "B",
        color: "#000000",
        description: description.trim(),
        fields: cleanFields,
        createdAt: now(),
        updatedAt: now(),
      };

      onChange([...templates, template]);
    }

    resetForm();
  }

  function deleteTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    setTemplateToDelete(template);
  }

  function confirmDeleteTemplate() {
    if (!templateToDelete) {
      return;
    }

    onChange(templates.filter((item) => item.id !== templateToDelete.id));

    if (editingId === templateToDelete.id) {
      resetForm();
    }

    setTemplateToDelete(null);
  }

  return (
    <div className="fixed inset-0 z-50 bg-white p-4">
      <div className="flex h-full flex-col border border-black bg-white">
        <header className="flex items-center justify-between border-b border-black px-4 py-3">
          <div>
            <h2 className="text-xl font-bold">Шаблоны кастомных блоков</h2>
            <p className="text-sm text-neutral-600">
              Создавай собственные типы учебных блоков.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="border border-black bg-black px-4 py-2 text-sm text-white"
          >
            Закрыть
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[360px_1fr] overflow-hidden">
          <aside className="overflow-auto border-r border-black">
            <div className="border-b border-black bg-neutral-100 px-4 py-3 font-bold">
              Список шаблонов
            </div>

            {templates.length === 0 && (
              <div className="p-4 text-sm text-neutral-600">
                Пока нет шаблонов.
              </div>
            )}

            {templates.map((template) => (
              <div
                key={template.id}
                className={
                  editingId === template.id
                    ? "border-b border-black bg-black p-4 text-white"
                    : "border-b border-black bg-white p-4 text-black"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">
                      [{template.icon || "B"}] {template.name}
                    </h3>

                    <p className="mt-1 text-sm opacity-80">
                      Полей: {template.fields.length}
                    </p>

                    {template.description && (
                      <p className="mt-2 text-sm opacity-80">
                        {template.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(template)}
                    className={
                      editingId === template.id
                        ? "border border-white bg-black px-3 py-1 text-sm text-white"
                        : "border border-black bg-white px-3 py-1 text-sm text-black hover:bg-black hover:text-white"
                    }
                  >
                    Редактировать
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTemplate(template.id)}
                    className={
                      editingId === template.id
                        ? "border border-white bg-white px-3 py-1 text-sm text-black"
                        : "border border-black bg-white px-3 py-1 text-sm text-black hover:bg-black hover:text-white"
                    }
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </aside>

          <main className="min-h-0 overflow-auto p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {editingTemplate ? "Редактирование шаблона" : "Новый шаблон"}
                </h3>

                {editingTemplate && (
                  <p className="text-sm text-neutral-600">
                    ID: {editingTemplate.id}
                  </p>
                )}
              </div>

              {editingTemplate && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="border border-black bg-white px-3 py-2 text-sm hover:bg-black hover:text-white"
                >
                  Создать новый
                </button>
              )}
            </div>

            <section className="border border-black bg-white p-4">
              <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                <label className="block">
                  <span className="mb-1 block text-sm font-bold">Название</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full border border-black bg-white px-3 py-2 outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-bold">Иконка</span>
                  <input
                    value={icon}
                    onChange={(event) => setIcon(event.target.value)}
                    maxLength={3}
                    className="w-full border border-black bg-white px-3 py-2 outline-none"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-bold">Описание</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  className="w-full border border-black bg-white px-3 py-2 outline-none"
                />
              </label>
            </section>

            <section className="mt-5 border border-black bg-white">
              <div className="flex items-center justify-between border-b border-black bg-neutral-100 px-4 py-3">
                <h4 className="font-bold">Поля шаблона</h4>

                <button
                  type="button"
                  onClick={() => setFields((previous) => [...previous, createEmptyField()])}
                  className="border border-black bg-white px-3 py-1 text-sm hover:bg-black hover:text-white"
                >
                  Добавить поле
                </button>
              </div>

              <div>
                {fields.map((field, index) => (
                  <div key={field.id} className="border-b border-black p-4 last:border-b-0">
                    <div className="mb-3 flex items-center justify-between">
                      <h5 className="font-bold">Поле #{index + 1}</h5>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveField(field.id, -1)}
                          className="border border-black bg-white px-2 py-1 text-sm hover:bg-black hover:text-white"
                        >
                          Up
                        </button>

                        <button
                          type="button"
                          onClick={() => moveField(field.id, 1)}
                          className="border border-black bg-white px-2 py-1 text-sm hover:bg-black hover:text-white"
                        >
                          Down
                        </button>

                        <button
                          type="button"
                          onClick={() => removeField(field.id)}
                          className="border border-black bg-white px-2 py-1 text-sm hover:bg-black hover:text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_220px_160px]">
                      <label className="block">
                        <span className="mb-1 block text-sm font-bold">Название поля</span>
                        <input
                          value={field.label}
                          onChange={(event) =>
                            updateField(field.id, {
                              label: event.target.value,
                            })
                          }
                          className="w-full border border-black bg-white px-3 py-2 outline-none"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-bold">Тип</span>
                        <select
                          value={field.type}
                          onChange={(event) =>
                            updateField(field.id, {
                              type: event.target.value as CustomFieldType,
                            })
                          }
                          className="w-full border border-black bg-white px-3 py-2 outline-none"
                        >
                          {fieldTypes.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="mt-7 flex items-center gap-2 border border-black px-3 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(field.required)}
                          onChange={(event) =>
                            updateField(field.id, {
                              required: event.target.checked,
                            })
                          }
                        />
                        <span className="text-sm">Обязательное</span>
                      </label>
                    </div>

                    <label className="mt-3 block">
                      <span className="mb-1 block text-sm font-bold">Placeholder</span>
                      <input
                        value={field.placeholder ?? ""}
                        onChange={(event) =>
                          updateField(field.id, {
                            placeholder: event.target.value,
                          })
                        }
                        className="w-full border border-black bg-white px-3 py-2 outline-none"
                      />
                    </label>

                    {field.type === "select" && (
                      <label className="mt-3 block">
                        <span className="mb-1 block text-sm font-bold">
                          Варианты выбора, каждый с новой строки
                        </span>
                        <textarea
                          value={(field.options ?? []).join("\n")}
                          onChange={(event) =>
                            updateField(field.id, {
                              options: event.target.value.split("\n"),
                            })
                          }
                          rows={4}
                          className="w-full border border-black bg-white px-3 py-2 outline-none"
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={saveTemplate}
                className="border border-black bg-black px-4 py-2 text-sm text-white"
              >
                {editingTemplate ? "Сохранить изменения" : "Создать шаблон"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="border border-black bg-white px-4 py-2 text-sm hover:bg-black hover:text-white"
              >
                Очистить форму
              </button>
            </div>
          </main>
        </div>
      </div>
      <DangerConfirmModal
        open={Boolean(templateToDelete)}
        title="Удалить шаблон"
        message={
          templateToDelete
            ? `Шаблон "${templateToDelete.name}" будет удалён. Уже созданные блоки этого типа останутся, но могут отображаться как блоки без шаблона.`
            : ""
        }
        requiredText={templateToDelete?.name ?? ""}
        confirmLabel="Удалить"
        onCancel={() => setTemplateToDelete(null)}
        onConfirm={confirmDeleteTemplate}
      />
    </div>
  );
}
