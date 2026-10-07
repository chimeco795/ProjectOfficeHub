export function fitPage(
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number,
  margin = 8,
) {
  const scale = Math.min(
    (pageWidth - margin * 2) / width,
    (pageHeight - margin * 2) / height,
  );
  return {
    width: width * scale,
    height: height * scale,
    x: (pageWidth - width * scale) / 2,
    y: (pageHeight - height * scale) / 2,
  };
}
export async function exportReport(
  node: HTMLElement,
  format: "png" | "pdf",
  filename: string,
) {
  await document.fonts.ready;
  const { toPng } = await import("html-to-image");
  const width = node.offsetWidth,
    height = Math.max(node.offsetHeight, node.scrollHeight);
  const image = await toPng(node, {
    width,
    height,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    style: { transform: "none", margin: "0", boxShadow: "none" },
    filter: (node) =>
      !(node instanceof HTMLElement && node.dataset.exportExclude === "true"),
  });
  if (format === "png") {
    const a = document.createElement("a");
    a.href = image;
    a.download = filename + ".png";
    a.click();
    return;
  }
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    compress: true,
    orientation: width >= height ? "landscape" : "portrait",
    unit: "mm",
    format: "a3",
  });
  const size = fitPage(
    width,
    height,
    pdf.internal.pageSize.getWidth(),
    pdf.internal.pageSize.getHeight(),
  );
  pdf.addImage(
    image,
    "PNG",
    size.x,
    size.y,
    size.width,
    size.height,
    undefined,
    "FAST",
  );
  pdf.save(filename + ".pdf");
}
