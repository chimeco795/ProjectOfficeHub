import {
  Children,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Eye, Grid3X3, GripVertical, Maximize2, X } from "lucide-react";
import { useLocalPersonId } from "../../components/LocalIdentity";
import {
  arrange,
  defaultLayout,
  restoreLayout,
  widgetIds,
  type WidgetLayout,
} from "./dashboardModel";
const labels = [
  "Trabajos activos",
  "Cerrados / resueltos",
  "Compromisos vencidos",
  "Bloqueados",
  "Trabajo que necesita atención",
  "Seguimiento ejecutivo",
  "Objetivo / fechas",
  "Accesos de operación",
];
export function Dashboard(props: { projectId: string; children: ReactNode }) {
  const person = useLocalPersonId();
  const preferenceKey = `pohub.dashboard.${person || "local"}.${props.projectId}`;
  return (
    <DashboardGrid key={preferenceKey} preferenceKey={preferenceKey}>
      {props.children}
    </DashboardGrid>
  );
}
function DashboardGrid({
  preferenceKey: key,
  children,
}: {
  preferenceKey: string;
  children: ReactNode;
}) {
  const read = () => {
    try {
      return restoreLayout(JSON.parse(localStorage.getItem(key) || "null"));
    } catch {
      return defaultLayout();
    }
  };
  const [layout, setLayout] = useState(read),
    [design, setDesign] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(layout));
  }, [key, layout]);
  const nodes = Children.toArray(children);
  const change = (item: WidgetLayout, patch: Partial<WidgetLayout>) =>
    setLayout((old) => arrange(old, { ...item, ...patch }));
  const interact = (
    e: ReactPointerEvent<HTMLButtonElement>,
    item: WidgetLayout,
    mode: "move" | "resize",
  ) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const x = e.clientX,
      y = e.clientY,
      width = (grid.current!.getBoundingClientRect().width + 12) / 12,
      target = e.currentTarget;
    const move = (event: PointerEvent) => {
      const dx = Math.round((event.clientX - x) / width),
        dy = Math.round((event.clientY - y) / 72);
      setLayout(
        arrange(layout, {
          ...item,
          ...(mode === "move"
            ? { x: item.x + dx, y: item.y + dy }
            : { w: item.w + dx, h: item.h + dy }),
        }),
      );
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };
  return (
    <>
      <div className="dashboard-toolbar">
        <span>{design ? "Mueve y ajusta tus widgets" : "Vista general"}</span>
        <div className="view-switch">
          <button aria-pressed={!design} onClick={() => setDesign(false)}>
            <Eye size={16} /> Lectura
          </button>
          <button aria-pressed={design} onClick={() => setDesign(true)}>
            <Grid3X3 size={16} /> Diseño
          </button>
        </div>
        {design && (
          <>
            <label>
              Agregar widget
              <select
                value=""
                onChange={(e) => {
                  const item = layout.find((i) => i.id === e.target.value);
                  if (item) change(item, { visible: true });
                }}
              >
                <option value="">Seleccionar…</option>
                {layout
                  .filter((i) => !i.visible)
                  .map((i) => (
                    <option value={i.id} key={i.id}>
                      {labels[widgetIds.indexOf(i.id)]}
                    </option>
                  ))}
              </select>
            </label>
            <button onClick={() => setLayout(defaultLayout())}>
              Restaurar diseño
            </button>
          </>
        )}
      </div>
      <div
        ref={grid}
        className={"dashboard-grid" + (design ? " dashboard-design" : "")}
      >
        {layout
          .filter((i) => i.visible)
          .map((item) => (
            <div
              key={item.id}
              className={'dashboard-widget widget-' + item.id}
              style={{
                gridColumn: `${item.x + 1} / span ${item.w}`,
                gridRow: `${item.y + 1} / span ${item.h}`,
              }}
            >
              {design && (
                <div className="widget-controls">
                  <button
                    onPointerDown={(e) => interact(e, item, "move")}
                    onKeyDown={(e) => {
                      const delta = {
                        ArrowLeft: [-1, 0],
                        ArrowRight: [1, 0],
                        ArrowUp: [0, -1],
                        ArrowDown: [0, 1],
                      }[e.key];
                      if (delta) {
                        e.preventDefault();
                        change(item, {
                          x: item.x + delta[0],
                          y: item.y + delta[1],
                        });
                      }
                    }}
                    aria-label={"Mover " + labels[widgetIds.indexOf(item.id)]}
                  >
                    <GripVertical size={16} />
                  </button>
                  <span>{labels[widgetIds.indexOf(item.id)]}</span>
                  <button
                    aria-label={"Ocultar " + labels[widgetIds.indexOf(item.id)]}
                    onClick={() => change(item, { visible: false })}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="widget-content">
                {nodes[widgetIds.indexOf(item.id)]}
              </div>
              {design && (
                <div className="widget-size">
                  <button
                    aria-label={"Reducir ancho " + labels[widgetIds.indexOf(item.id)]}
                    onClick={() => change(item, { w: item.w - 1 })}
                  >
                    −
                  </button>
                  <span>
                    {item.w} × {item.h}
                  </span>
                  <button
                    aria-label={"Aumentar ancho " + labels[widgetIds.indexOf(item.id)]}
                    onClick={() => change(item, { w: item.w + 1 })}
                  >
                    +
                  </button>
                  <button
                    aria-label={"Reducir alto " + labels[widgetIds.indexOf(item.id)]}
                    onClick={() => change(item, { h: item.h - 1 })}
                  >
                    ↥
                  </button>
                  <button
                    aria-label={"Aumentar alto " + labels[widgetIds.indexOf(item.id)]}
                    onClick={() => change(item, { h: item.h + 1 })}
                  >
                    ↧
                  </button>
                  <button
                    aria-label={"Redimensionar " + labels[widgetIds.indexOf(item.id)]}
                    onPointerDown={(e) => interact(e, item, "resize")}
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </>
  );
}
