import { useLayoutEffect, useRef, type CSSProperties, type TextareaHTMLAttributes } from "react";

type AutoResizeTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  value: string;
  minRows?: number;
  onChange: (value: string) => void;
};

export function AutoResizeTextarea({
  value,
  minRows = 2,
  onChange,
  style,
  ...props
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  const autoSizeStyle: CSSProperties = {
    overflow: "hidden",
    ...style,
  };

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={minRows}
      value={value}
      style={autoSizeStyle}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
