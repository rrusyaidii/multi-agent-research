export function slugifyReportFilename(topic: string): string {
  const slug = topic
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

  return slug || "research-report";
}

export async function downloadReportPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;

  const clone = element.cloneNode(true) as HTMLElement;
  clone.classList.add("pdf-export-root");

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";
  wrapper.style.width = "210mm";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  const pdfFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

  try {
    await html2pdf()
      .set({
        margin: [12, 12, 12, 12],
        filename: pdfFilename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(clone)
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
}
