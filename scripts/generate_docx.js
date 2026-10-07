#!/usr/bin/env node
/**
 * Resume .docx generator.
 *
 * Usage:
 *   node scripts/generate_docx.js <input.json> <output.docx>
 *
 * Also exports buildDocument(data) -> Promise<Buffer> for programmatic use.
 *
 * Input JSON shape:
 * {
 *   "name": "MARIE-ÈVE CÔTÉ-TREMBLAY",
 *   "contact": "555-0100 • marie.cote@example.com • Montréal, QC",
 *   "focusHeader": { "track": "QUALITY TECHNICIAN", "line": "One-sentence positioning line." },  // optional
 *   "summary": "Quality Technician with five years ...",
 *   "sections": [
 *     { "title": "CERTIFICATIONS", "type": "text", "text": "ASQ Certified Quality Inspector ..." },
 *     { "title": "CORE COMPETENCIES", "type": "labeled-list",
 *       "items": [ { "label": "Inspection: ", "text": "CMM, calipers, micrometers, ..." } ] },
 *     { "title": "EXPERIENCE", "type": "experience",
 *       "jobs": [
 *         { "title": "Quality Technician", "dates": "Mar 2022 – Present",
 *           "subtitle": "Atelier Exemple Inc., Montréal, QC",
 *           "bullets": [
 *             "Plain bullet text.",
 *             { "label": "Corrective Action: ", "text": "Labeled bullet text." }
 *           ] }
 *       ] },
 *     { "title": "EDUCATION", "type": "text-lines", "lines": [ "Diploma, Collège Exemple, Montréal, QC" ] },
 *     { "title": "AFFILIATIONS", "type": "text-lines", "lines": [ "Member, Example Quality Society" ] }
 *   ]
 * }
 *
 * Section titles (name, CERTIFICATIONS/EXPERIENCE/etc., job title lines) are tagged with
 * real Word heading styles (Heading 1/2/3) instead of bold-on-Normal paragraphs, so the
 * hierarchy is machine-readable (screen readers, Word's Navigation Pane, docx auditors)
 * while the rendered look is unchanged from the previous bold-Normal formatting.
 */

const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TabStopType,
  BorderStyle,
} = require("docx");

const FONT = "Arial";
const BODY_SIZE = 21; // 10.5pt, half-points
const SECTION_BORDER_COLOR = "444444";
const SECTION_TITLE_COLOR = "1F1F1F";
const DATE_TAB_POSITION = 10800;

// Heading1 = candidate name, Heading2 = major section titles, Heading3 = job title/dates
// line within EXPERIENCE. Visual properties match what the previous bold-Normal
// paragraphs used, so existing resumes' look is preserved exactly.
//
// These must be supplied via `styles.default.heading1/2/3` (which overrides the
// built-in Heading1/2/3 style definitions in place) rather than `styles.paragraphStyles`
// (which appends a second, duplicate <w:style> element with the same styleId - invalid
// OOXML that different Word versions can resolve inconsistently).
const defaultStyles = {
  heading1: {
    run: { font: FONT, bold: true, size: 30 },
    paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 40 } },
  },
  heading2: {
    run: { font: FONT, bold: true, size: 22, color: SECTION_TITLE_COLOR },
    paragraph: {
      spacing: { before: 160, after: 60 },
      border: {
        bottom: { style: BorderStyle.SINGLE, color: SECTION_BORDER_COLOR, size: 4, space: 2 },
      },
      keepNext: true,
      keepLines: true,
    },
  },
  heading3: {
    run: { font: FONT, bold: true, size: BODY_SIZE },
    paragraph: {
      spacing: { before: 100, after: 10 },
      tabStops: [{ type: TabStopType.RIGHT, position: DATE_TAB_POSITION }],
      keepNext: true,
      keepLines: true,
    },
  },
};

function bodyRun(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: BODY_SIZE, ...opts });
}

function nameParagraph(name) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: name, font: FONT, bold: true, size: 30 })],
  });
}

function contactParagraph(contact) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [bodyRun(contact)],
  });
}

function focusHeaderParagraphs(focusHeader) {
  if (!focusHeader) return [];
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [bodyRun(focusHeader.track, { bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [bodyRun(focusHeader.line)],
    }),
  ];
}

function summaryParagraph(summary) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [bodyRun(summary)],
  });
}

function sectionTitleParagraph(title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: title, font: FONT, bold: true, size: 22, color: SECTION_TITLE_COLOR })],
  });
}

function textParagraph(text) {
  return new Paragraph({ spacing: { after: 40 }, children: [bodyRun(text)] });
}

function labeledListParagraphs(items) {
  return items.map(
    (item) =>
      new Paragraph({
        spacing: { after: 50 },
        children: [bodyRun(item.label, { bold: true }), bodyRun(item.text)],
      })
  );
}

function textLinesParagraphs(lines) {
  return lines.map((line) => new Paragraph({ spacing: { after: 40 }, children: [bodyRun(line)] }));
}

function bulletParagraph(bullet, numberingRef) {
  const children =
    typeof bullet === "string"
      ? [bodyRun(bullet)]
      : [bodyRun(bullet.label, { bold: true }), bodyRun(bullet.text)];
  return new Paragraph({
    numbering: { reference: numberingRef, level: 0 },
    spacing: { after: 30 },
    children,
  });
}

function jobParagraphs(job, numberingRef) {
  const paragraphs = [
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      tabStops: [{ type: TabStopType.RIGHT, position: DATE_TAB_POSITION }],
      children: [
        new TextRun({ text: job.title, font: FONT, bold: true, size: BODY_SIZE }),
        new TextRun({ text: `\t${job.dates}`, font: FONT, bold: true, size: BODY_SIZE }),
      ],
    }),
  ];
  if (job.subtitle) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 40 },
        keepNext: true,
        keepLines: true,
        children: [bodyRun(job.subtitle, { italics: true })],
      })
    );
  }
  for (const bullet of job.bullets || []) {
    paragraphs.push(bulletParagraph(bullet, numberingRef));
  }
  return paragraphs;
}

function experienceParagraphs(section, numberingRef) {
  const paragraphs = [sectionTitleParagraph(section.title)];
  for (const job of section.jobs) {
    paragraphs.push(...jobParagraphs(job, numberingRef));
  }
  return paragraphs;
}

function buildSection(section, numberingRef) {
  switch (section.type) {
    case "text":
      return [sectionTitleParagraph(section.title), textParagraph(section.text)];
    case "labeled-list":
      return [sectionTitleParagraph(section.title), ...labeledListParagraphs(section.items)];
    case "experience":
      return experienceParagraphs(section, numberingRef);
    case "text-lines":
      return [sectionTitleParagraph(section.title), ...textLinesParagraphs(section.lines)];
    default:
      throw new Error(`Unknown section type: ${section.type}`);
  }
}

function build(data) {
  const numberingRef = "resume-bullets";
  const children = [nameParagraph(data.name), contactParagraph(data.contact)];
  children.push(...focusHeaderParagraphs(data.focusHeader));
  if (data.summary) children.push(summaryParagraph(data.summary));
  for (const section of data.sections || []) {
    children.push(...buildSection(section, numberingRef));
  }

  return new Document({
    styles: { default: defaultStyles },
    numbering: {
      config: [
        {
          reference: numberingRef,
          levels: [
            {
              level: 0,
              format: "bullet",
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 792, right: 936, bottom: 792, left: 936 },
          },
        },
        children,
      },
    ],
  });
}

async function buildDocument(data) {
  return Packer.toBuffer(build(data));
}

async function main() {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error("Usage: node generate_docx.js <input.json> <output.docx>");
    process.exit(1);
  }
  const resolvedInput = path.resolve(inputPath);
  let raw;
  try {
    raw = fs.readFileSync(resolvedInput, "utf8");
  } catch (err) {
    console.error(`Cannot read input file: ${resolvedInput} (${err.code || err.message})`);
    process.exit(1);
  }
  const buffer = await buildDocument(JSON.parse(raw));
  fs.writeFileSync(path.resolve(outputPath), buffer);
  console.log(`Wrote ${outputPath}`);
}

module.exports = { buildDocument };

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
