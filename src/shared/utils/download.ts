/**
 * Download utilities
 * Handles downloading CV and cover letter in various formats
 */

import { Document, Packer, Paragraph, TextRun } from 'docx';
import jsPDF from 'jspdf';

/**
 * Download text as TXT file
 */
export function downloadAsTXT(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download text as PDF file
 */
export function downloadAsPDF(content: string, filename: string): void {
  const pdf = new jsPDF();
  
  // Split content into lines that fit the page
  const lines = pdf.splitTextToSize(content, 180); // 180mm width
  let y = 20;
  const pageHeight = pdf.internal.pageSize.height;
  const lineHeight = 7;

  for (let i = 0; i < lines.length; i++) {
    if (y + lineHeight > pageHeight - 20) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(lines[i], 15, y);
    y += lineHeight;
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Download text as DOCX file
 */
export async function downloadAsDOCX(content: string, filename: string): Promise<void> {
  try {
    // Split content into paragraphs
    const paragraphs = content.split('\n\n').filter((p) => p.trim().length > 0);
    
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs.map(
            (para) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: para.replace(/\n/g, ' '),
                    size: 24, // 12pt
                  }),
                ],
                spacing: {
                  after: 200, // 10pt spacing
                },
              })
          ),
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    // Fallback to TXT if DOCX fails
    downloadAsTXT(content, filename);
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}
