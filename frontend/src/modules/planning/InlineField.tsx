import type { Choice } from "../../components/SearchPicker";
import { ContextField } from "../../components/ContextField";
export function InlineField({
  label,
  value,
  display,
  options,
  choices,
  searchable = false,
  className = "",
  onSave,
}: {
  choices?: Choice[];
  label: string;
  value: string;
  display?: string;
  options?: Record<string, string>;
  searchable?: boolean;
  className?: string;
  onSave: (value: string) => Promise<void>;
}) {
  return (
    <ContextField
      label={label}
      value={value}
      display={display}
      options={
        choices ||
        (options
          ? Object.entries(options).map(([value, label]) => ({ value, label }))
          : undefined)
      }
      search={searchable}
      className={className}
      type={options ? "text" : "date"}
      showLabel={false}
      onSave={onSave}
    />
  );
}
