import { buildPdfElement, PDF_CONTENT_WIDTH_PX } from "@/lib/build-print-document";

export function slugifyReportFilename(topic: string): string {
  const slug = topic
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

  return slug || "research-report";
}

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

type Html2PdfOptions = {
  margin: number[];
  filename: string;
  image: { type: string; quality: number };
  html2canvas: {
    scale: number;
    useCORS: boolean;
    logging: boolean;
    scrollY: number;
    windowWidth: number;
  };
  jsPDF: { unit: string; format: string; orientation: string };
  pagebreak: { mode: string[]; avoid: string[] };
};

export async function downloadReportPdf(
  markdown: string,
  topic: string,
  filename: string,
): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;

  const element = buildPdfElement(markdown, topic);

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";
  wrapper.style.width = `${PDF_CONTENT_WIDTH_PX}px`;
  wrapper.appendChild(element);
  document.body.appendChild(wrapper);

  const pdfFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

  try {
    await waitForLayout();

    const options: Html2PdfOptions = {
      margin: [15, 15, 15, 15],
      filename: pdfFilename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0,
        windowWidth: PDF_CONTENT_WIDTH_PX,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: {
        mode: ["avoid-all", "css", "legacy"],
        avoid: ["h2", "h3", "h4", "p", "li", "tr", "table"],
      },
    };

    await html2pdf()
      .set(options as never)
      .from(element)
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
}
