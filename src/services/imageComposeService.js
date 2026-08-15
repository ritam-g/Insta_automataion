/**
 * Draws the day's real fact directly onto the AI-generated background
 * image as a clean, quote-card style text banner.
 *
 * Why this exists: AI image models (including free ones like Flux)
 * are unreliable at rendering legible text - letters come out warped
 * or misspelled. Instead, we generate a plain background photo with
 * AI, then draw the text ourselves in code with `sharp`. This gives
 * perfect, crisp, correctly-spelled text every single day.
 *
 * Requires the `sharp` package:
 *   npm install sharp
 */

const sharp = require("sharp");

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Simple greedy word-wrap by character count per line.
 */
function wrapText(text, maxCharsPerLine) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Overlays a clean, semi-transparent quote-card banner containing the
 * day's fact text near the bottom of the image.
 *
 * @param {Buffer} imageBuffer - raw background image bytes
 * @param {string} factText - the real fact to draw on the image
 * @param {number} width - target output width (default 1024)
 * @param {number} height - target output height (default 1024)
 * @returns {Promise<Buffer>} composited JPEG image buffer
 */
async function overlayFactOnImage({ imageBuffer, factText, width = 1024, height = 1024 }) {
  const maxCharsPerLine = 34;
  const fontSize = 34;
  const lineHeight = 44;
  const paddingY = 44;
  const paddingX = 48;
  const marginBottom = 64;
  const marginSide = 40;

  const lines = wrapText(factText, maxCharsPerLine).slice(0, 6); // safety cap

  const bannerHeight = lines.length * lineHeight + paddingY * 2;
  const bannerWidth = width - marginSide * 2;
  const bannerY = height - bannerHeight - marginBottom;

  const textLinesSvg = lines
    .map((line, i) => {
      const y = paddingY + i * lineHeight + fontSize * 0.8;
      return `<text x="${bannerWidth / 2}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="600" fill="#ffffff" text-anchor="middle">${escapeXml(line)}</text>`;
    })
    .join("\n");

  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="bannerClip">
          <rect x="0" y="0" width="${bannerWidth}" height="${bannerHeight}" rx="22" ry="22" />
        </clipPath>
      </defs>
      <g transform="translate(${marginSide}, ${bannerY})">
        <rect x="0" y="0" width="${bannerWidth}" height="${bannerHeight}"
              rx="22" ry="22" fill="rgba(0,0,0,0.58)" />
        ${textLinesSvg}
      </g>
    </svg>
  `;

  const composedBuffer = await sharp(imageBuffer)
    .resize(width, height, { fit: "cover" })
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return composedBuffer;
}

module.exports = { overlayFactOnImage };