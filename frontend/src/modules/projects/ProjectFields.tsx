import type { Project } from "../../types";

export function ProjectFields({
  value,
  onChange,
  excludeMethodology = false,
}: {
  excludeMethodology?: boolean;
  value?: Project;
  onChange?: (value: Project) => void;
}) {
  const update = (key: keyof Project, next: string | null) => {
    if (value && onChange) onChange({ ...value, [key]: next });
  };
  return (
    <div className="form-grid">
      {(
        [
          [
            "methodology",
            "Metodología",
            ["Agile", "Waterfall", "Hybrid"],
            "Hybrid",
          ],
          [
            "priority",
            "Prioridad",
            ["Baja", "Media", "Alta", "Crítica"],
            "Media",
          ],
          ["status", "Estado", ["Activo", "En pausa", "Cerrado"], "Activo"],
        ] as const
      )
        .filter(([key]) => !excludeMethodology || key !== "methodology")
        .map(([key, label, options, fallback]) => (
          <label key={key}>
            {label}
            <select
              name={key}
              {...(value ? { value: value[key] } : { defaultValue: fallback })}
              onChange={(e) => update(key, e.target.value)}
            >
              {options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        ))}
      {(
        [
          ["start_date", "Fecha de inicio"],
          ["target_date", "Fecha objetivo"],
          ["go_live", "Go Live objetivo"],
          ["close_date", "Fecha de cierre"],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            name={key}
            type="date"
            {...(value ? { value: value[key] ?? "" } : {})}
            onChange={(e) => update(key, e.target.value || null)}
          />
        </label>
      ))}
    </div>
  );
}
