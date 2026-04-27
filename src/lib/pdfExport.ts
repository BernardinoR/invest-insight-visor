import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface PdfExportOptions {
  clientName: string;
  competencia?: string;
  /**
   * Optional ordered list of section titles to look up via
   * `[data-pdf-section="<title>"]`. If omitted, all sections found
   * in the document are exported in DOM order.
   */
  sectionTitles?: string[];
  /** Filename without extension. */
  fileName?: string;
}

interface CapturedSection {
  title: string;
  canvas: HTMLCanvasElement;
}

const A4_LANDSCAPE_WIDTH_MM = 297;
const A4_LANDSCAPE_HEIGHT_MM = 210;
const PAGE_MARGIN_MM = 10;
const HEADER_HEIGHT_MM = 14;
const FOOTER_HEIGHT_MM = 8;

const CONTENT_WIDTH_MM = A4_LANDSCAPE_WIDTH_MM - PAGE_MARGIN_MM * 2;
const CONTENT_TOP_MM = PAGE_MARGIN_MM + HEADER_HEIGHT_MM;
const CONTENT_BOTTOM_MM = A4_LANDSCAPE_HEIGHT_MM - PAGE_MARGIN_MM - FOOTER_HEIGHT_MM;
const CONTENT_HEIGHT_MM = CONTENT_BOTTOM_MM - CONTENT_TOP_MM;

function getThemeBackgroundColor(): string {
  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue("--background").trim();
  if (bg) {
    return `hsl(${bg})`;
  }
  return getComputedStyle(document.body).backgroundColor || "#ffffff";
}

async function captureElement(
  el: HTMLElement,
  backgroundColor: string,
): Promise<HTMLCanvasElement> {
  // Temporarily expand overflow so wide/tall content is fully captured.
  const originalOverflow = el.style.overflow;
  el.style.overflow = "visible";

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor,
      useCORS: true,
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });
    return canvas;
  } finally {
    el.style.overflow = originalOverflow;
  }
}

function drawHeader(
  pdf: jsPDF,
  clientName: string,
  competencia: string | undefined,
  sectionTitle: string,
): void {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(20, 20, 20);
  pdf.text(`Relatório de Performance — ${clientName}`, PAGE_MARGIN_MM, PAGE_MARGIN_MM + 5);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  const meta = competencia
    ? `Competência: ${competencia}  •  Gerado em ${new Date().toLocaleDateString("pt-BR")}`
    : `Gerado em ${new Date().toLocaleDateString("pt-BR")}`;
  pdf.text(meta, PAGE_MARGIN_MM, PAGE_MARGIN_MM + 10);

  pdf.setFontSize(10);
  pdf.setTextColor(40, 40, 40);
  pdf.text(sectionTitle, A4_LANDSCAPE_WIDTH_MM - PAGE_MARGIN_MM, PAGE_MARGIN_MM + 5, {
    align: "right",
  });

  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(
    PAGE_MARGIN_MM,
    PAGE_MARGIN_MM + HEADER_HEIGHT_MM - 2,
    A4_LANDSCAPE_WIDTH_MM - PAGE_MARGIN_MM,
    PAGE_MARGIN_MM + HEADER_HEIGHT_MM - 2,
  );
}

function drawFooter(pdf: jsPDF, pageNum: number, totalPages: number): void {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(140, 140, 140);
  pdf.text(
    `Página ${pageNum} de ${totalPages}`,
    A4_LANDSCAPE_WIDTH_MM - PAGE_MARGIN_MM,
    A4_LANDSCAPE_HEIGHT_MM - PAGE_MARGIN_MM,
    { align: "right" },
  );
}

function addSectionToPdf(
  pdf: jsPDF,
  section: CapturedSection,
  clientName: string,
  competencia: string | undefined,
  startPageNum: number,
): number {
  const { canvas, title } = section;
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  // Calculate scaled dimensions to fit content area width.
  const ratio = canvas.height / canvas.width;
  const renderWidth = CONTENT_WIDTH_MM;
  const renderHeight = renderWidth * ratio;

  if (renderHeight <= CONTENT_HEIGHT_MM) {
    // Fits in a single page.
    if (startPageNum > 1) pdf.addPage();
    drawHeader(pdf, clientName, competencia, title);
    pdf.addImage(imgData, "JPEG", PAGE_MARGIN_MM, CONTENT_TOP_MM, renderWidth, renderHeight);
    return 1;
  }

  // Section taller than one page — slice it.
  // Convert mm → px in the source canvas based on width scale.
  const pxPerMm = canvas.width / CONTENT_WIDTH_MM;
  const slicePxHeight = Math.floor(CONTENT_HEIGHT_MM * pxPerMm);
  let consumedPx = 0;
  let slicesAdded = 0;

  while (consumedPx < canvas.height) {
    const remainingPx = canvas.height - consumedPx;
    const thisSlicePx = Math.min(slicePxHeight, remainingPx);

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = thisSlicePx;
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(
      canvas,
      0,
      consumedPx,
      canvas.width,
      thisSlicePx,
      0,
      0,
      canvas.width,
      thisSlicePx,
    );

    const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.92);
    const sliceHeightMm = thisSlicePx / pxPerMm;

    if (startPageNum > 1 || slicesAdded > 0) pdf.addPage();
    drawHeader(
      pdf,
      clientName,
      competencia,
      slicesAdded === 0 ? title : `${title} (cont.)`,
    );
    pdf.addImage(sliceData, "JPEG", PAGE_MARGIN_MM, CONTENT_TOP_MM, renderWidth, sliceHeightMm);

    consumedPx += thisSlicePx;
    slicesAdded += 1;
  }

  return slicesAdded;
}

export async function exportDashboardToPDF(options: PdfExportOptions): Promise<void> {
  const { clientName, competencia, sectionTitles, fileName } = options;

  // Find sections in the DOM.
  const allSectionEls = Array.from(
    document.querySelectorAll<HTMLElement>("[data-pdf-section]"),
  );

  let orderedSections: HTMLElement[];
  if (sectionTitles && sectionTitles.length > 0) {
    orderedSections = sectionTitles
      .map((title) =>
        allSectionEls.find((el) => el.dataset.pdfSection === title),
      )
      .filter((el): el is HTMLElement => Boolean(el));
  } else {
    orderedSections = allSectionEls;
  }

  if (orderedSections.length === 0) {
    throw new Error("Nenhuma seção marcada com data-pdf-section foi encontrada.");
  }

  const backgroundColor = getThemeBackgroundColor();

  // Capture all sections sequentially to keep memory predictable.
  const captured: CapturedSection[] = [];
  for (const el of orderedSections) {
    // Wait for next frame to make sure layout is stable.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const title = el.dataset.pdfSection || "Seção";
    const canvas = await captureElement(el, backgroundColor);
    captured.push({ title, canvas });
  }

  // Build PDF.
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  let pageCounter = 0;
  for (let i = 0; i < captured.length; i++) {
    const pagesAdded = addSectionToPdf(pdf, captured[i], clientName, competencia, i === 0 ? 1 : 2);
    pageCounter += pagesAdded;
  }

  // Re-iterate to draw footers with correct totals.
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    drawFooter(pdf, p, totalPages);
  }

  const safeClient = clientName.replace(/[^\w\-]+/g, "_");
  const safeComp = (competencia || "").replace(/[^\w\-]+/g, "_");
  const finalName =
    fileName ||
    `Relatorio_${safeClient}${safeComp ? `_${safeComp}` : ""}.pdf`;

  pdf.save(finalName);
}
