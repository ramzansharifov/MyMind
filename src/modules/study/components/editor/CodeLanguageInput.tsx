import { POPULAR_CODE_LANGUAGES } from "../../utils/codeLanguages";

interface CodeLanguageInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function CodeLanguageInput({
  value,
  onChange,
}: CodeLanguageInputProps) {
  const datalistId = "code-language-suggestions";

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">Language</span>

      <input
        value={value ?? ""}
        list={datalistId}
        onChange={(event) => {
          const nextValue = event.target.value.trim();
          onChange(nextValue || undefined);
        }}
        placeholder="e.g.: javascript, python, cpp, sql..."
        className="w-full border border-black bg-white px-3 py-2 outline-none"
      />

      <datalist id={datalistId}>
        {POPULAR_CODE_LANGUAGES.map((language) => (
          <option key={language} value={language} />
        ))}
      </datalist>

      <p className="mt-1 text-xs text-neutral-600">
        Start typing for suggestions. You can also enter a custom value.
      </p>
    </label>
  );
}
