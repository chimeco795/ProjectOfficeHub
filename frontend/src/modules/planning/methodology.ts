export const roadmapLabel = (methodology: string) =>
  methodology === "Agile"
    ? "Sprints"
    : methodology === "Waterfall"
      ? "Fases y entregables"
      : "Iteraciones y entregas";
export const planningViews = (methodology: string) =>
  methodology === "Waterfall"
    ? [
        ["gantt", "Cronograma"],
        ["roadmap", roadmapLabel(methodology)],
        ["board", "Trabajo"],
      ]
    : [
        ["board", "Trabajo"],
        ["gantt", "Cronograma"],
        ["roadmap", roadmapLabel(methodology)],
      ];
