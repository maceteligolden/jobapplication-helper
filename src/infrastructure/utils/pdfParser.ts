/**
 * PDF Parser Utility
 * Wrapper for pdf-parse to handle ESM/CJS compatibility issues
 */

/**
 * Setup polyfills for browser APIs that pdf-parse needs in Node.js
 * These must be set up before pdf-parse is loaded
 */
function setupPolyfills(): void {
  // Polyfill DOMMatrix (required by pdf-parse)
  // Set on both globalThis and global for maximum compatibility
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    const DOMMatrixPolyfill = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      constructor(init?: string | number[]) {
        // Minimal implementation
      }
      static fromMatrix() {
        return new DOMMatrixPolyfill();
      }
    };
    (globalThis as any).DOMMatrix = DOMMatrixPolyfill;
    (global as any).DOMMatrix = DOMMatrixPolyfill;
  }

  // Polyfill ImageData (required by pdf-parse)
  if (typeof (globalThis as any).ImageData === 'undefined') {
    const ImageDataPolyfill = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(
        dataOrWidth: Uint8ClampedArray | number,
        widthOrHeight?: number
      ) {
        if (dataOrWidth instanceof Uint8ClampedArray) {
          this.data = dataOrWidth;
          this.width = widthOrHeight || 0;
          this.height = (dataOrWidth.length / (this.width * 4)) || 0;
        } else {
          this.width = dataOrWidth;
          this.height = widthOrHeight || 0;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        }
      }
    };
    (globalThis as any).ImageData = ImageDataPolyfill;
    (global as any).ImageData = ImageDataPolyfill;
  }

  // Polyfill Path2D (required by pdf-parse)
  if (typeof (globalThis as any).Path2D === 'undefined') {
    const Path2DPolyfill = class Path2D {
      constructor(path?: string | Path2D) {
        // Minimal implementation
      }
    };
    (globalThis as any).Path2D = Path2DPolyfill;
    (global as any).Path2D = Path2DPolyfill;
  }
}

// Setup polyfills immediately when module loads
// This ensures they're available before pdf-parse is required
setupPolyfills();

/**
 * Parse PDF buffer to text
 * Uses dynamic import to avoid bundling issues with Next.js
 */
export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    // Use dynamic import - this is the recommended approach for Next.js
    // This avoids bundling issues and ensures proper module resolution
    const pdfParseModule = await import('pdf-parse');
    
    // pdf-parse exports the function as the default export
    // Try default export first, then fallback to module itself
    // Use type assertion to handle complex export structure
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    
    if (typeof pdfParse !== 'function') {
      throw new Error(
        'pdf-parse did not export a function. ' +
        'Please ensure pdf-parse is properly installed: npm install pdf-parse'
      );
    }
    
    // Call the parsing function with the buffer
    const data = await pdfParse(buffer);
    
    if (!data || typeof data.text !== 'string') {
      throw new Error('pdf-parse returned invalid data structure');
    }
    
    return data.text;
  } catch (error) {
    // If dynamic import fails, try require() as fallback (for Node.js runtime)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const pdfParseReq = require('pdf-parse');
      const pdfParse = pdfParseReq.default || pdfParseReq;
      
      if (typeof pdfParse !== 'function') {
        throw new Error('pdf-parse function not found in require() fallback');
      }
      
      const data = await pdfParse(buffer);
      
      if (!data || typeof data.text !== 'string') {
        throw new Error('pdf-parse returned invalid data structure');
      }
      
      return data.text;
    } catch (fallbackError) {
      throw new Error(
        `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}. ` +
        'Please ensure the PDF file is not corrupted or password-protected.'
      );
    }
  }
}
