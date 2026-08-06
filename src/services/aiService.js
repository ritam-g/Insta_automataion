const axios = require("axios");
const { GEMINI_BASE_URL, GEMINI_API_KEY, TEXT_MODEL } = require("../config/gemini");


async function generateCaption(topicPrompt) {
  const prompt =
    topicPrompt ||
    "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Topic: motivation for daily productivity.";

  try {
    const url = `${GEMINI_BASE_URL}/${TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
    }, { timeout: 20000 });

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return { success: false, error: "No caption text returned from Gemini" };

    return { success: true, caption: text };
  } catch (err) {
    return { success: false, error: err.response?.data?.error?.message || err.message };
  }
}

/**
 * Pollinations already serves the image at a stable, public URL - we don't
 * need to re-host it anywhere for Instagram to be able to fetch it.
 * We still download the bytes here so Cloudinary can be used as a fallback
 * host if the direct URL ever turns out to be unreachable from Meta's side.
 */
async function generateImage(imagePrompt) {
  const prompt =
    imagePrompt ||
    "A clean, minimal, aesthetic photo representing daily motivation and productivity, soft natural lighting, no text.";

  const seed = Math.floor(Math.random() * 1_000_000); // avoids any CDN caching returning yesterday's image
  const baseUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
  const sourceUrl = `${baseUrl}?width=1024&height=1024&nologo=true&seed=${seed}`;

  try {
    const response = await axios.get(baseUrl, {
      params: { width: 1024, height: 1024, nologo: true, seed },
      responseType: "arraybuffer",
      timeout: 30000,
    });

    const base64Data = Buffer.from(response.data).toString("base64");
    const mimeType = response.headers["content-type"] || "image/jpeg";

    return { success: true, base64Data, mimeType, sourceUrl };
  } catch (err) {
    return { success: false, error: err.response?.data?.toString() || err.message };
  }
}

module.exports = { generateCaption, generateImage };