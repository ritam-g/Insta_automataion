const TOPICS = [
  { key: "morning", caption: "morning motivation and starting the day with intention", image: "a sunrise over a calm landscape" },
  { key: "discipline", caption: "discipline and consistency in daily habits", image: "a journal, coffee cup, and pen on a wooden desk" },
  { key: "focus", caption: "focus and deep work", image: "a quiet workspace with a laptop and a plant" },
  { key: "growth", caption: "growth mindset and learning from setbacks", image: "a single plant sprouting through cracked pavement" },
  { key: "gratitude", caption: "gratitude and appreciating small wins", image: "hands holding a small cup of tea by a window" },
  { key: "ambition", caption: "ambition and chasing long-term goals", image: "a mountain trail leading toward a distant peak" },
  { key: "balance", caption: "rest, balance, and recharging", image: "a cozy reading nook with soft blankets and warm light" },
  { key: "resilience", caption: "resilience and bouncing back stronger", image: "a tree bending in strong wind but still standing tall" },
  { key: "clarity", caption: "clarity and cutting out distractions", image: "a clean minimal desk with a single open notebook" },
  { key: "self-belief", caption: "self-belief and trusting your own path", image: "a lone figure walking a quiet path toward open sky" },
];

const ANGLES = [
  { key: "calm", tone: "calm, reflective tone", light: "soft warm natural lighting" },
  { key: "bold", tone: "bold, energetic tone", light: "high-contrast golden hour lighting" },
  { key: "poetic", tone: "gentle, poetic tone", light: "soft diffused overcast lighting" },
];

// TOPICS.length * ANGLES.length = 30 unique combinations, one per day of a ~30-day cycle
function getDailyPrompt(date = new Date()) {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - startOfYear) / 86400000);

  const cycleLength = TOPICS.length * ANGLES.length; // 30
  const index = dayOfYear % cycleLength;

  const topic = TOPICS[index % TOPICS.length];
  const angle = ANGLES[Math.floor(index / TOPICS.length) % ANGLES.length];

  return {
    captionTopic: `Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags, in a ${angle.tone}. Topic: ${topic.caption}.`,
    imagePrompt: `A clean, minimal aesthetic photo of ${topic.image}, ${angle.light}, no text, no people.`,
    themeKey: `${topic.key}-${angle.key}`,
    cycleDay: index + 1,
    cycleLength,
  };
}

module.exports = { getDailyPrompt, TOPICS, ANGLES };