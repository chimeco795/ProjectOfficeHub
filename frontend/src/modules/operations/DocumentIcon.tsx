import {
  FileText,
  FileSpreadsheet,
  Presentation,
  File,
  Image,
  FileType,
} from "lucide-react";
export function fileKind(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["doc", "docx", "odt"].includes(ext)) return "Word";
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "Excel";
  if (["ppt", "pptx", "odp"].includes(ext)) return "PowerPoint";
  if (ext === "pdf") return "PDF";
  if (["txt", "md", "log", "json"].includes(ext)) return "Texto";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"].includes(ext))
    return "Imagen";
  return "Archivo";
}
export function DocumentIcon({ filename }: { filename: string }) {
  const kind = fileKind(filename),
    Icon =
      kind === "Excel"
        ? FileSpreadsheet
        : kind === "PowerPoint"
          ? Presentation
          : kind === "Imagen"
            ? Image
            : kind === "PDF"
              ? FileType
              : ["Word", "Texto"].includes(kind)
                ? FileText
                : File;
  return (
    <span
      className={"document-icon document-" + kind.toLowerCase()}
      title={kind}
    >
      <Icon size={24} aria-hidden="true" />
    </span>
  );
}
