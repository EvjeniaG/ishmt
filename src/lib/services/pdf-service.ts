import PDFDocument from "pdfkit";
import { assertPdfkitFontsAvailable } from "@/lib/pdf/pdfkit-setup";
import { DEFAULT_CHIEF_INSPECTOR_NAME } from "@/lib/ishmt/chief-inspector";

function createPdfDocument(options: PDFKit.PDFDocumentOptions) {
  assertPdfkitFontsAvailable();
  return new PDFDocument(options);
}

export type PdfTemplateVariables = Record<string, string>;

export type CertificatePdfVariables = {
  certificateNumber: string;
  registryNumber: string;
  ownerName: string;
  municipality: string;
  buildingAddress: string;
  applicationNumber: string;
  issuedDate: string;
  elevatorType?: string;
  manufacturer?: string;
  serialNumber?: string;
  installerName?: string;
  usagePurpose?: string;
  responsibleIdentifier?: string;
  omiNumber?: string;
  examinationType?: string;
  chiefInspectorName?: string;
};

export type ForwardingLetterPdfVariables = CertificatePdfVariables;

export type RequestFormType =
  | "REGISTRATION_NEW"
  | "REGISTRATION_EXISTING"
  | "CHANGE"
  | "UPDATE"
  | "DEREGISTRATION";

export type RequestFormPdfVariables = {
  formType: RequestFormType;
  issuedDate: string;
  nipt: string;
  ownerName: string;
  address: string;
  phone: string;
  email: string;
  representedBy?: string;
  /** Adresa ku është instaluar ashensori (regjistrim). */
  installAddress?: string;
  /** Lista e ashensorëve për regjistrim të ri (numra serialë ose përshkrim). */
  elevators?: string[];
  /** Të dhënat ekzistuese (ndryshim / përditësim / çregjistrim). */
  certificateNumber?: string;
  registryNumber?: string;
  registrationDate?: string;
  serialNumber?: string;
  protocolNumber?: string;
  /** Specifikat e ndryshimit/përditësimit. */
  changeFrom?: string;
  changeTo?: string;
  changeReason?: string;
  newResponsiblePerson?: string;
  newSerialNumber?: string;
  /** Arsyeja e çregjistrimit (njëra nga 3 alternativat). */
  deregistrationReason?: "DISMANTLED" | "REPLACED" | "STRUCTURAL";
};

const REQUEST_FORM_SUBJECTS: Record<RequestFormType, string> = {
  REGISTRATION_NEW: "Kërkesë për regjistrimin e ashensorit/ëve",
  REGISTRATION_EXISTING: "Kërkesë për regjistrimin e ashensorit/ëve ekzistues",
  CHANGE: "Kërkesë për ndryshimin e të dhënave të ashensorit/ëve të regjistruar",
  UPDATE: "Kërkesë për përditësimin e të dhënave të ashensorit/ëve të regjistruar",
  DEREGISTRATION: "Kërkesë për cregjistrimin e ashensorit/ëve",
};

function renderTemplate(content: string, variables: PdfTemplateVariables) {
  return content.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => variables[key] ?? "");
}

function drawOfficialFrame(doc: PDFKit.PDFDocument) {
  const margin = 40;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  doc.lineWidth(1.5);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2).stroke();
  doc.lineWidth(0.5);
  doc.rect(margin + 6, margin + 6, pageWidth - (margin + 6) * 2, pageHeight - (margin + 6) * 2).stroke();
}

function drawHeaderBlock(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  doc.font("Helvetica-Bold").fontSize(11).text("REPUBLIKA E SHQIPËRISË", { align: "center" });
  doc.fontSize(10).text("INSPEKTORATI SHTETËROR I MBIKËQYRJES SË TREGUT", { align: "center" });
  doc.moveDown(0.5);
  doc.moveTo(80, doc.y).lineTo(doc.page.width - 80, doc.y).stroke();
  doc.moveDown(0.8);
  doc.fontSize(14).text(title, { align: "center", underline: true });
  if (subtitle) {
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9).text(subtitle, { align: "center" });
  }
  doc.moveDown(1);
}

export type InspectionMemoPdfVariables = {
  applicationNumber: string;
  applicationType: string;
  ownerName: string;
  registryNumber?: string;
  buildingAddress?: string;
  submittedAt: string;
  issuedDate: string;
  inspectorName?: string;
  chiefInspectorName?: string;
  recommendation?: string;
  summary?: string;
};

export class PdfService {
  static async generateRegistrationCertificatePdf(
    variables: CertificatePdfVariables,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = createPdfDocument({ size: "A4", margin: 0 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const left = 60;
      const right = doc.page.width - 60;
      const contentWidth = right - left;

      // ── Header: institutional identity (left) + ISHMT (right) ──
      doc.font("Helvetica").fontSize(7).fillColor("#333333");
      doc.text("REPUBLIKA E SHQIPËRISË", left, 42, { width: 220 });
      doc.text("MINISTRIA E EKONOMISË, KULTURËS DHE INOVACIONIT", left, doc.y, { width: 220 });

      doc.font("Helvetica-Bold").fontSize(20).fillColor("#1a3a6b");
      doc.text("ISHMT", right - 160, 40, { width: 160, align: "right" });
      doc.font("Helvetica").fontSize(6).fillColor("#555555");
      doc.text("Inspektorati Shtetëror i Mbikëqyrjes së Tregut", right - 200, doc.y, {
        width: 200,
        align: "right",
      });

      doc.fillColor("#000000");

      // ── Title ──
      doc.font("Helvetica-Bold").fontSize(16);
      doc.text("CERTIFIKATË REGJISTRIMI PËR ASHENSORIN", left, 95, {
        width: contentWidth,
        align: "center",
      });
      doc.moveDown(0.6);

      doc.font("Helvetica-Bold").fontSize(12);
      doc.text(`Nr. i Regjistrimit: ${variables.registryNumber}`, left, doc.y, {
        width: contentWidth,
        align: "center",
      });
      doc.moveDown(0.4);
      doc.font("Helvetica-Bold").fontSize(11);
      doc.text(`Certifikatë: ${variables.certificateNumber}`, left, doc.y, {
        width: contentWidth,
        align: "center",
      });
      doc.moveDown(0.8);

      // ── Legal basis ──
      doc.font("Helvetica").fontSize(9.5);
      doc.text(
        'Është regjistruar në zbatim të Ligjit nr.10489/2011 "Për tregtimin dhe mbikëqyrjen e tregut ' +
          'të produkteve joushqimore" i ndryshuar dhe VKM Nr. 1056, datë 23.12.2015 "Për miratimin e rregullit teknik ' +
          '"Për sigurinë e ashensorëve në përdorim" i ndryshuar, si dhe Udhëzimi ISHMT për procedurën e regjistrimit.',
        left,
        doc.y,
        { width: contentWidth, align: "center", lineGap: 2 },
      );
      doc.moveDown(1);

      doc.font("Helvetica-Bold").fontSize(11);
      doc.text(`Data e regjistrimit: ${variables.issuedDate}`, left, doc.y, {
        width: contentWidth,
        align: "center",
      });
      doc.moveDown(1.4);

      // ── Registration fields ──
      const fieldLeft = 70;
      const labelWidth = 250;
      const valueLeft = fieldLeft + labelWidth;
      const valueWidth = right - valueLeft;

      const field = (label: string, value?: string, italicLabel?: string) => {
        const y = doc.y;
        if (italicLabel) {
          doc.font("Helvetica-Oblique").fontSize(10).text(italicLabel, valueLeft - 140, y, {
            width: 140,
            align: "right",
          });
          doc.font("Helvetica").fontSize(10).text(value || "________________", valueLeft, y, {
            width: valueWidth,
          });
        } else {
          doc.font("Helvetica").fontSize(10).text(label, fieldLeft, y, { width: labelWidth });
          doc.font("Helvetica").fontSize(10).text(value || "________________", valueLeft, y, {
            width: valueWidth,
          });
        }
        doc.moveDown(0.9);
      };

      field("Nr. Serial i Ashensorit:", variables.serialNumber);
      field("Marka:", variables.manufacturer);
      // Instaluesi / Mirëmbajtësi appears as an italic inline label in the template
      doc.font("Helvetica-Oblique").fontSize(10).text(
        `Instaluesi/Mirëmbajtësi: ${variables.installerName ?? "________________"}`,
        fieldLeft,
        doc.y,
        { width: contentWidth - 10 },
      );
      doc.moveDown(0.9);
      field("Qëllimi i Përdorimit të Ashensorit:", variables.usagePurpose);
      field("Vendndodhja e Ashensorit (adresa):", variables.buildingAddress);
      field("Personi Përgjegjës:", variables.ownerName);
      field("NIPT/NID:", variables.responsibleIdentifier);
      field("Numri i identifikimit të Organit të Miratuar (OMI):", variables.omiNumber);
      field("Lloji i ekzaminimit:", variables.examinationType);

      doc.moveDown(1.2);

      // ── Signature ──
      doc.font("Helvetica-Bold").fontSize(11);
      doc.text("KRYEINSPEKTOR", left, doc.y, { width: contentWidth, align: "center" });
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(10);
      doc.text(`(${variables.chiefInspectorName ?? DEFAULT_CHIEF_INSPECTOR_NAME})`, left, doc.y, {
        width: contentWidth,
        align: "center",
      });

      // ── Footer note + address + certificate number ──
      const noteY = doc.page.height - 110;
      doc.font("Helvetica-BoldOblique").fontSize(8).fillColor("#000000");
      doc.text("Shënim:", left, noteY, { continued: true });
      doc.font("Helvetica-Oblique").fontSize(8);
      doc.text(
        " Për çdo ndryshim që prek të dhënat e kësaj certifikate regjistrimi, personi përgjegjës duhet të njoftojë " +
          "Inspektoratin Shtetëror të Mbikëqyrjes së Tregut.",
        { width: contentWidth, lineGap: 1 },
      );

      const footerY = doc.page.height - 55;
      doc.moveTo(left, footerY - 6).lineTo(right, footerY - 6).lineWidth(0.5).stroke();
      doc.font("Helvetica-Oblique").fontSize(7.5).fillColor("#333333");
      doc.text('Rruga "Shyqyri Bërxolli" Nr.65, Tiranë. Kontakt: info@ishmt.gov.al', left, footerY, {
        width: contentWidth - 80,
      });
      doc.font("Helvetica").fontSize(7.5).fillColor("#333333");
      doc.text(variables.certificateNumber, right - 90, footerY, { width: 90, align: "right" });

      doc.end();
    });
  }

  static async generateForwardingLetterPdf(
    variables: ForwardingLetterPdfVariables,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = createPdfDocument({ size: "A4", margin: 0 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const left = 60;
      const right = doc.page.width - 60;
      const contentWidth = right - left;

      // ── Protocol header: Nr. prot. (left) + Tiranë, më (right) ──
      doc.font("Helvetica").fontSize(10).fillColor("#000000");
      doc.text(`Nr. ${variables.applicationNumber} prot.`, left, 55, { width: contentWidth / 2 });
      doc.text(`Tiranë, më ${variables.issuedDate}`, left + contentWidth / 2, 55, {
        width: contentWidth / 2,
        align: "right",
      });
      doc.moveDown(1.6);

      // ── Subject line ──
      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("Lënda:", left, doc.y, { continued: true });
      doc.font("Helvetica").text("  Përcillet çertifikata e regjistrimit");
      doc.moveDown(1.4);

      // ── Recipient ──
      doc.font("Helvetica-Bold").fontSize(11).text("SUBJEKTI", left, doc.y, {
        width: contentWidth,
        align: "center",
      });
      doc.font("Helvetica").fontSize(10).text(variables.ownerName, left, doc.y, {
        width: contentWidth,
        align: "center",
      });
      doc.text(`Adresa: ${variables.buildingAddress}`, left, doc.y, {
        width: contentWidth,
        align: "center",
      });
      doc.moveDown(1.4);

      // ── Body paragraph ──
      doc.font("Helvetica").fontSize(10).text(
        "Në bazë të dokumentacionit të paraqitur pranë Inspektoratit Shtetëror të Mbikëqyrjes së Tregut, " +
          "bashkëlidhur po ju dërgojmë çertifikatën/at e regjistrimit të ashensorit/ëve sipas tabelës më poshtë.",
        left,
        doc.y,
        { width: contentWidth, align: "justify", lineGap: 3 },
      );
      doc.moveDown(1);

      // ── Table: Nr | Marka | Nr. Serial | Adresa | Nr. i Certifikatës ──
      const cols = [
        { label: "Nr.", width: 34 },
        { label: "Marka e ashensorit", width: 110 },
        { label: "Nr. Serial i ashensorit", width: 110 },
        { label: "Adresa", width: 130 },
        { label: "Nr. i Certifikatës", width: contentWidth - 34 - 110 - 110 - 130 },
      ];
      const rowHeight = 34;
      const headerHeight = 26;
      let x = left;
      const tableTop = doc.y;

      const drawCell = (text: string, cellX: number, cellY: number, width: number, height: number, bold = false) => {
        doc.lineWidth(0.7).rect(cellX, cellY, width, height).stroke();
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
        doc.text(text, cellX + 3, cellY + 5, { width: width - 6, align: "center" });
      };

      cols.forEach((c) => {
        drawCell(c.label, x, tableTop, c.width, headerHeight, true);
        x += c.width;
      });

      const dataTop = tableTop + headerHeight;
      const values = [
        "1.",
        variables.manufacturer ?? "",
        variables.serialNumber ?? "",
        variables.buildingAddress ?? "",
        variables.certificateNumber ?? "",
      ];
      x = left;
      values.forEach((value, i) => {
        drawCell(value, x, dataTop, cols[i].width, rowHeight);
        x += cols[i].width;
      });

      doc.y = dataTop + rowHeight + 16;

      // ── Periodic inspection legal paragraph (Pika 7/4 & 7/5, VKM 1056) ──
      doc.font("Helvetica").fontSize(9.5).text(
        'Gjithashtu ju bëjmë me dije zbatimin e detyrimeve ligjore; kryesisht Pika 7/4 dhe 7/5 e VKM Nr.1056/2015 ' +
          '"Për miratimin e rregullit teknik "Për sigurinë e ashensorëve në përdorim"", të kryerjes së inspektimeve ' +
          "periodike nga një organ i miratuar në intervale kohore. Në rastin e ashensorëve ekzistues dhe të rinj të " +
          "instaluar në një vend pune, inspektimet periodike kryhen një herë në çdo 6 muaj, dhe në rastin e ashensorëve " +
          "ekzistues dhe të rinj të instaluar në ndërtesa banimi në bashkëpronësi ose në ambiente shtëpiake, inspektimet " +
          "periodike kryhen një herë në çdo 12 muaj.",
        left,
        doc.y,
        { width: contentWidth, align: "justify", lineGap: 3 },
      );
      doc.moveDown(1.2);
      doc.text("Duke ju falënderuar për bashkëpunimin,", left, doc.y, { width: contentWidth });
      doc.moveDown(2);

      // ── Signature ──
      doc.font("Helvetica-Bold").fontSize(10).text("KRYEINSPEKTOR", left + contentWidth / 2, doc.y, {
        width: contentWidth / 2,
        align: "center",
      });
      doc.font("Helvetica").fontSize(10).text(`(${variables.chiefInspectorName ?? DEFAULT_CHIEF_INSPECTOR_NAME})`, left + contentWidth / 2, doc.y, {
        width: contentWidth / 2,
        align: "center",
      });

      // ── Footer: Konceptoi / Pranoi / Miratoi ──
      const footerY = doc.page.height - 95;
      doc.font("Helvetica").fontSize(9).fillColor("#000000");
      doc.text("Konceptoi:", left, footerY);
      doc.text("Pranoi:", left, footerY + 14);
      doc.text("Miratoi:", left, footerY + 28);

      doc.end();
    });
  }

  static async generateRequestFormPdf(variables: RequestFormPdfVariables): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = createPdfDocument({ size: "A4", margin: 0 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const left = 60;
      const right = doc.page.width - 60;
      const contentWidth = right - left;
      const bottomLimit = doc.page.height - 90;

      // Adds a new page when the cursor is too close to the bottom margin, so long
      // content (e.g. many elevators, long addresses) never runs off the page.
      const ensureSpace = (needed = 40) => {
        if (doc.y + needed > bottomLimit) {
          doc.addPage();
          doc.y = 60;
        }
      };

      const labeled = (label: string, value?: string, gap = 0.7) => {
        ensureSpace();
        const y = doc.y;
        doc.font("Helvetica-Bold").fontSize(10).text(label, left, y, { continued: true });
        doc.font("Helvetica").fontSize(10).text(value && value.trim() ? ` ${value}` : " ______________________________");
        doc.moveDown(gap);
      };

      const paragraph = (text: string, gap = 0.8) => {
        ensureSpace(doc.heightOfString(text, { width: contentWidth, lineGap: 3 }));
        doc.font("Helvetica").fontSize(10).text(text, left, doc.y, { width: contentWidth, align: "justify", lineGap: 3 });
        doc.moveDown(gap);
      };

      const checkbox = (text: string, checked: boolean) => {
        ensureSpace();
        const y = doc.y;
        doc.font(checked ? "Helvetica-Bold" : "Helvetica").fontSize(10).text(checked ? "[X]" : "[  ]", left, y, {
          continued: true,
        });
        doc.font("Helvetica").fontSize(10).text(`  ${text}`, { width: contentWidth - 20, lineGap: 2 });
        doc.moveDown(0.5);
      };

      // ── Top-right date ──
      doc.font("Helvetica").fontSize(10);
      doc.text(`Tiranë, më ${variables.issuedDate || "____.____.______"}`, left, 50, {
        width: contentWidth,
        align: "right",
      });
      doc.moveDown(1.4);

      // ── Subject ──
      doc.font("Helvetica-Bold").fontSize(10).text("Lënda:", left, doc.y, { continued: true });
      doc.font("Helvetica").text(`  ${REQUEST_FORM_SUBJECTS[variables.formType]}`, { width: contentWidth });
      doc.moveDown(1.4);

      // ── Recipient ──
      doc.font("Helvetica-Bold").fontSize(11).text("INSPEKTORATIT SHTETËROR TË MBIKËQYRJES SË TREGUT (ISHMT)", left, doc.y, {
        width: contentWidth,
        align: "center",
      });
      doc.font("Helvetica").fontSize(10).text('Rruga "Shyqyri Bërxolli" Nr.65, Tiranë', left, doc.y, {
        width: contentWidth,
        align: "center",
      });
      doc.moveDown(1.4);

      doc.font("Helvetica").fontSize(10).text(
        variables.formType === "CHANGE" || variables.formType === "UPDATE"
          ? "Unë personi përgjegjës me të dhënat si më poshtë:"
          : "Unë kërkuesi me të dhënat si më poshtë:",
        left,
        doc.y,
        { width: contentWidth },
      );
      doc.moveDown(0.8);

      // ── Applicant block ──
      labeled("NIPT:", variables.nipt);
      labeled("Adresa:", variables.address);
      labeled("Tel:", variables.phone);
      labeled("E-mail:", variables.email);
      labeled("Përfaqësuar nga:", variables.representedBy, 1.2);

      // ── Legal basis intro ──
      const legalBase =
        "Në zbatim të dispozitave të ligjit nr. 10489/2011 i ndryshuar, VKM-së 1056/2015 i ndryshuar, si dhe " +
        "procedurës së miratuar të publikuar në faqen tuaj zyrtare, ju paraqesim ";

      if (variables.formType === "REGISTRATION_NEW") {
        paragraph(`${legalBase}kërkesën për regjistrimin për herë të parë pranë ISHMT-së të ashensorit/ëve si më poshtë:`);
        const list = variables.elevators && variables.elevators.length > 0 ? variables.elevators : ["", "", ""];
        list.forEach((item, idx) => {
          labeled(`${idx + 1}) Ashensori ${idx + 1}:`, item, 0.5);
        });
        doc.moveDown(0.6);
        paragraph(
          "Bashkëlidhur kërkesës gjeni dokumentat përkatëse sipas legjislacionit në fuqi dhe procedurës mbi " +
            "regjistrimin e ashensorëve pranë ISHMT-së.",
        );
      } else if (variables.formType === "REGISTRATION_EXISTING") {
        paragraph(
          `${legalBase}kërkesën për regjistrimin për herë të parë pranë ISHMT-së të ashensorit/ëve ekzistues ` +
            "të instaluar në adresën:",
        );
        labeled("Adresa e instalimit:", variables.installAddress ?? variables.address, 1);
        paragraph(
          "Bashkëlidhur kërkesës gjeni dokumentat përkatëse sipas legjislacionit në fuqi, duke përfshirë kopjen e " +
            "Raportit të Ekzaminimit të Parë të Plotë të ashensorit ekzistues të lëshuar nga një Organ i Miratuar.",
        );
      } else if (variables.formType === "DEREGISTRATION") {
        paragraph(`${legalBase}kërkesën për cregjistrimin e ashensorit/ëve të instaluar në adresën:`);
        labeled("Adresa e instalimit:", variables.installAddress ?? variables.address, 1);
        checkbox("Ashensori është çmontuar përfundimisht nga objekti ku ishte instaluar;", variables.deregistrationReason === "DISMANTLED");
        checkbox("Ashensori zëvendësohet me një njësi tjetër të re me parametra të ndryshëm teknik;", variables.deregistrationReason === "REPLACED");
        checkbox("Për shkak të ndryshimeve strukturore në objekt;", variables.deregistrationReason === "STRUCTURAL");
        doc.moveDown(0.6);
        paragraph(
          "Bashkëlidhur gjeni dokumentat përkatëse sipas legjislacionit në fuqi dhe procedurës së miratuar të " +
            "publikuar në faqen tuaj zyrtare.",
        );
      } else if (variables.formType === "CHANGE") {
        paragraph(`${legalBase}kërkesën për ndryshimin e të dhënave të ashensorit të regjistruar.`);
        doc.font("Helvetica-Bold").fontSize(10).text("Të dhënat ekzistuese të ashensorit:", left, doc.y);
        doc.moveDown(0.5);
        labeled("Numri unik i certifikatës së regjistrimit:", variables.certificateNumber, 0.5);
        labeled("Adresa e instalimit të ashensorit:", variables.installAddress ?? variables.address, 0.5);
        labeled("Data e regjistrimit të ashensorit:", variables.registrationDate, 0.5);
        labeled("Nr Prot i shkresës përcjellëse:", variables.protocolNumber, 1);
        doc.font("Helvetica-Bold").fontSize(10).text("Të dhënat që kërkohen të ndryshohen:", left, doc.y);
        doc.moveDown(0.5);
        labeled("Nga (të dhëna ekzistuese):", variables.changeFrom, 0.5);
        labeled("Në (të dhëna të reja):", variables.changeTo, 0.5);
        labeled("Arsyeja e ndryshimit:", variables.changeReason, 1);
        paragraph(
          "Bashkëlidhur gjeni dokumentat përkatëse sipas legjislacionit në fuqi dhe procedurës së miratuar të " +
            "publikuar në faqen tuaj zyrtare.",
        );
      } else {
        // UPDATE
        paragraph(`${legalBase}kërkesën për përditësimin e të dhënave të ashensorit të regjistruar.`);
        doc.font("Helvetica-Bold").fontSize(10).text("Të dhënat e ashensorit të regjistruar:", left, doc.y);
        doc.moveDown(0.5);
        labeled("Numri unik i certifikatës së regjistrimit:", variables.certificateNumber, 0.5);
        labeled("Adresa e instalimit të ashensorit:", variables.installAddress ?? variables.address, 0.5);
        labeled("Data e regjistrimit të ashensorit:", variables.registrationDate, 0.5);
        labeled("Nr Prot i shkresës përcjellëse:", variables.protocolNumber, 1);
        doc.font("Helvetica-Bold").fontSize(10).text("Të dhënat që kërkohen të përditësohen:", left, doc.y);
        doc.moveDown(0.5);
        labeled("Person përgjegjës i ri:", variables.newResponsiblePerson, 0.5);
        labeled("Nr serial i ashensorit:", variables.newSerialNumber ?? variables.serialNumber, 0.5);
        labeled("Të tjera:", variables.changeReason, 1);
        paragraph(
          "Bashkëlidhur gjeni dokumentat përkatëse sipas akteve ligjore, nënligjore dhe procedurës së miratuar të " +
            "publikuar në faqen tuaj zyrtare.",
        );
      }

      // ── Signature block ──
      doc.moveDown(1.5);
      ensureSpace(40);
      doc.font("Helvetica-Bold").fontSize(10).text(
        variables.formType === "REGISTRATION_NEW" ? "Kërkuesi" : "Personi Përgjegjës",
        left,
        doc.y,
      );
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(10).text("(Emër, Mbiemër)", left, doc.y);

      doc.end();
    });
  }

  static async generateInspectionMemoPdf(
    variables: InspectionMemoPdfVariables,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = createPdfDocument({ size: "A4", margin: 0 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const left = 60;
      const right = doc.page.width - 60;
      const contentWidth = right - left;

      doc.font("Helvetica").fontSize(10);
      doc.text(`Nr. ${variables.applicationNumber} prot.`, left, 55);
      doc.text(`Tiranë, më ${variables.issuedDate}`, left, 55, {
        width: contentWidth,
        align: "right",
      });
      doc.moveDown(2);

      drawHeaderBlock(doc, "MEMO", "Sipas Aneksit 1 - Udhëzimi ISHMT për regjistrimin e ashensorëve");

      doc.font("Helvetica").fontSize(10);
      doc.text(`Lloji i aplikimit: ${variables.applicationType}`, left, doc.y);
      doc.text(`Subjekti: ${variables.ownerName}`, left, doc.y);
      if (variables.registryNumber) {
        doc.text(`Nr. regjistri: ${variables.registryNumber}`, left, doc.y);
      }
      if (variables.buildingAddress) {
        doc.text(`Adresa: ${variables.buildingAddress}`, left, doc.y);
      }
      doc.text(`Data e parashtrimit: ${variables.submittedAt}`, left, doc.y);
      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("Përmbledhje e shqyrtimit", left, doc.y);
      doc.moveDown(0.4);
      doc.font("Helvetica").text(
        variables.summary ??
          "Dokumentacioni u verifikua nga grupi i inspektorëve të Sektorit të Produkteve Mekanike.",
        left,
        doc.y,
        { width: contentWidth, lineGap: 3 },
      );
      doc.moveDown(1);

      if (variables.recommendation) {
        doc.font("Helvetica-Bold").text("Rekomandimi:", left, doc.y, { continued: true });
        doc.font("Helvetica").text(` ${variables.recommendation}`);
        doc.moveDown(1);
      }

      doc.font("Helvetica").fontSize(10);
      doc.text("Përgjegjësi i Sektorit të Produkteve Mekanike", left, doc.y + 40);
      doc.text("Drejtori i Drejtorisë së Mbikëqyrjes së Produkteve", left, doc.y + 20);
      doc.text("Kryeinspektori", left, doc.y + 20);
      doc.text(
        `(${variables.chiefInspectorName ?? DEFAULT_CHIEF_INSPECTOR_NAME})`,
        left,
        doc.y + 4,
      );
      if (variables.inspectorName) {
        doc.moveDown(2);
        doc.text(`Inspektori: ${variables.inspectorName}`, left, doc.y);
      }

      doc.end();
    });
  }

  static async generateFromTemplate(
    templateContent: string,
    variables: PdfTemplateVariables,
    options?: { title?: string; documentKind?: "certificate" | "letter" },
  ): Promise<Buffer> {
    if (options?.documentKind === "certificate") {
      return this.generateRegistrationCertificatePdf(variables as CertificatePdfVariables);
    }
    if (options?.documentKind === "letter") {
      return this.generateForwardingLetterPdf(variables as ForwardingLetterPdfVariables);
    }

    const text = renderTemplate(templateContent, variables);

    return new Promise((resolve, reject) => {
      const doc = createPdfDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      drawOfficialFrame(doc);
      doc.x = 60;
      doc.y = 60;

      if (options?.title) {
        drawHeaderBlock(doc, options.title);
      }

      doc.font("Helvetica").fontSize(11).text(text, { align: "left", lineGap: 4 });
      doc.end();
    });
  }

  static defaultRegistrationCertificateTemplate() {
    return `{{certificateNumber}}|{{registryNumber}}|{{ownerName}}|{{municipality}}|{{buildingAddress}}|{{issuedDate}}`;
  }

  static defaultForwardingLetterTemplate() {
    return `{{applicationNumber}}|{{registryNumber}}|{{ownerName}}|{{municipality}}|{{buildingAddress}}|{{issuedDate}}|{{certificateNumber}}`;
  }

  static async generateTabularReportPdf(input: {
    title: string;
    subtitle?: string;
    columns: { label: string }[];
    rows: string[][];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = createPdfDocument({ size: "A4", layout: "landscape", margin: 36 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      drawOfficialFrame(doc);
      doc.x = 48;
      doc.y = 48;
      drawHeaderBlock(doc, input.title, input.subtitle);

      const colCount = input.columns.length;
      const tableWidth = doc.page.width - 96;
      const colWidth = tableWidth / Math.max(colCount, 1);
      const startX = 48;
      let y = doc.y;
      const rowHeight = 18;
      const fontSize = colCount > 6 ? 7 : 8;

      doc.font("Helvetica-Bold").fontSize(fontSize);
      input.columns.forEach((col, i) => {
        doc.text(col.label, startX + i * colWidth, y, {
          width: colWidth - 4,
          lineBreak: false,
          ellipsis: true,
        });
      });
      y += rowHeight;
      doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke();
      y += 4;

      doc.font("Helvetica").fontSize(fontSize);
      for (const row of input.rows) {
        if (y > doc.page.height - 72) {
          doc.addPage({ layout: "landscape", margin: 36 });
          drawOfficialFrame(doc);
          y = 48;
        }
        row.forEach((cell, i) => {
          doc.text(cell, startX + i * colWidth, y, {
            width: colWidth - 4,
            lineBreak: false,
            ellipsis: true,
          });
        });
        y += rowHeight;
      }

      doc.end();
    });
  }
}
