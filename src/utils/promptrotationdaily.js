/**
 * Daily prompt rotation.
 *
 * 30 explicitly hand-written days - each one built around a real,
 * specific fact, with its own matching caption instruction and image
 * scene. Nothing here is combined/generated from smaller pieces, so
 * no two days can accidentally end up feeling structurally similar.
 *
 * `fact` is the short, human-readable version of that day's fact -
 * this is what gets drawn directly onto the image as a text overlay
 * (see imageComposeService.js). `caption` is a separate instruction
 * for Gemini to write the actual Instagram caption text.
 *
 * getDailyPrompt() - deterministic, day-indexed. Used by cron AND by
 * the default (no query param) /run-now hit, so your real daily
 * automation always follows the fixed 30-day order.
 *
 * getRandomPrompt() - picks a random day's theme on every call. Used
 * ONLY when /run-now is hit with ?random=true, for manual testing -
 * never touches the real daily rotation.
 */

const DAILY_THEMES = [
  {
    fact: "Willpower behaves like a muscle - it depletes with use but also strengthens with practice over time.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: willpower works like a muscle - it gets tired with overuse but grows stronger with consistent practice. Connect it to daily discipline.",
    image: "a single dumbbell resting beside an open notebook on a wooden desk, soft morning light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "It takes an average of 66 days, not 21, for a new habit to become automatic (University College London study).",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: a UCL study found habits take an average of 66 days to become automatic, not the commonly cited 21. Encourage patience with the process.",
    image: "a wall calendar with several days circled in soft red ink, warm afternoon light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "The human brain burns roughly 20% of the body's daily energy despite being only about 2% of body weight.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: the brain uses about 20% of the body's energy despite being only 2% of its weight. Tie it to protecting focus and mental energy.",
    image: "a steaming cup of coffee beside a closed laptop at sunrise, soft golden light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Elite athletes consistently use vivid mental visualization before performing, not just physical practice.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: elite athletes consistently use vivid mental visualization before performing. Apply it to preparing for an ordinary day's goals.",
    image: "a lone running track stretching toward a rising sun, soft warm light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "People who write goals by hand are significantly more likely to achieve them than those who only think about them (Dominican University study).",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: a Dominican University study found people who write goals by hand are significantly more likely to achieve them. Encourage journaling today's goal.",
    image: "a fountain pen resting on an open handwritten journal page, soft natural window light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Bamboo can grow 35 inches in a single day, but first spends years quietly building its root system underground.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: bamboo can grow 35 inches in a day, but first spends years quietly building roots underground. Connect it to unseen effort before visible results.",
    image: "tall bamboo stalks seen from below against a bright sky, crisp natural light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "A short 10-20 minute midday nap measurably improves alertness without the grogginess of longer naps.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: a short 10-20 minute nap can boost alertness without the grogginess longer naps cause. Frame rest as a performance tool, not laziness.",
    image: "a cozy blanket folded on a sunlit windowsill chair, soft warm afternoon light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "The 'Zeigarnik effect' shows unfinished tasks stay mentally active and drain focus far more than completed ones.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: the Zeigarnik effect explains why unfinished tasks quietly drain your focus more than finished ones. Encourage closing small open loops today.",
    image: "a clean minimal desk with a single checklist and pen, soft diffused light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Just 20 minutes in nature, even a city park, measurably lowers cortisol, the body's main stress hormone.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: just 20 minutes in nature has been shown to meaningfully lower stress hormone levels. Encourage a short outdoor reset today.",
    image: "a quiet park path lined with trees in soft dappled light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Some redwood trees have lived over 2,000 years, growing almost imperceptibly slowly the entire time.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: some redwood trees have lived over 2,000 years, growing almost imperceptibly slow the whole time. Connect it to trusting slow, steady progress.",
    image: "sunlight filtering through tall redwood trees from below, soft green-tinted light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "What feels like multitasking is really rapid task-switching, and every switch costs real time and accuracy.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: what feels like multitasking is really rapid task-switching, and each switch costs time and accuracy. Encourage single-tasking today.",
    image: "a single open notebook and pen on an otherwise empty desk, soft natural light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "A few minutes of daily gratitude journaling is linked to measurable, lasting improvements in life satisfaction.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: studies link a few minutes of daily gratitude journaling to real, lasting improvements in life satisfaction. Invite the reader to name one thing they're grateful for.",
    image: "a small handwritten note beside a warm cup of tea by a window, soft golden light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Mount Everest grows about 4 millimeters taller every year due to shifting tectonic plates beneath it.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: Mount Everest actually grows about 4mm taller every year from tectonic movement. Connect it to how small, steady effort compounds into something massive.",
    image: "a distant snow-capped mountain peak under a clear sky, crisp bright light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "The two-minute rule: if a task takes under two minutes, doing it now is faster than the mental cost of postponing it.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: the two-minute rule says any task under two minutes is faster to just do now than to postpone. Encourage clearing one small task today.",
    image: "a clean minimal workspace with a small stack of papers and a pen, soft diffused light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Sunlight within the first hour of waking helps regulate your body clock and can improve mood and sleep quality.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: getting sunlight within the first hour of waking helps regulate your body clock and can improve mood and sleep. Encourage an early morning outdoor moment.",
    image: "soft sunrise light streaming across an empty balcony, warm natural tones, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Oysters can change their sex multiple times over their lifespan depending on environmental conditions.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: oysters can change sex multiple times in their life depending on their environment. Connect it to the value of adapting rather than resisting change.",
    image: "gentle ocean waves rolling onto a quiet shoreline, soft blue-hour light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "The Pomodoro Technique is literally named after a tomato-shaped kitchen timer its inventor used as a student.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: the Pomodoro Technique is literally named after a tomato-shaped kitchen timer. Encourage trying one focused 25-minute work block today.",
    image: "a simple kitchen timer sitting beside an open book on a desk, soft warm light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "A study of over 700,000 people found regular walkers had lower mortality risk, no matter their pace.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: a large study of over 700,000 people found regular walkers had lower mortality risk, no matter their pace. Encourage a short walk today.",
    image: "a quiet tree-lined path stretching into the distance, soft afternoon light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Deep-sea anglerfish generate their own light through bioluminescence to lure prey in total darkness.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: deep-sea anglerfish generate their own light in total darkness thousands of meters underwater. Connect it to creating your own motivation in hard moments.",
    image: "a single small light glowing in a dark quiet room, warm candlelight tones, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Deciding in advance exactly when and where you'll do something roughly doubles your odds of following through.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: deciding in advance exactly when and where you'll do a task roughly doubles your odds of following through. Encourage planning tomorrow's first task tonight.",
    image: "a simple daily planner open on a clean desk, soft morning light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Octopuses have three hearts, and two of them stop beating entirely when the octopus swims.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: octopuses have three hearts, and two stop beating when they swim - so they mostly prefer to crawl instead. Connect it to conserving energy for what actually matters.",
    image: "calm turquoise shallow water over sand, soft bright daylight, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "A brief cold shower can trigger a natural spike in alertness and mood via norepinephrine.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: a brief cold shower can trigger a natural spike in alertness and mood. Frame it as a small daily discomfort worth choosing on purpose.",
    image: "water droplets on a frosted window with soft cool light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "The Wright brothers' first powered flight in 1903 covered just 120 feet - shorter than a modern jet's wingspan.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: the Wright brothers' first flight covered just 120 feet, shorter than a modern jet's wingspan. Connect it to how small first steps can start something enormous.",
    image: "a clear open sky with a single small bird in flight, soft bright light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Ongoing low-grade stress quietly impairs memory and decision-making, but short structured breaks help restore both.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: ongoing low-grade stress quietly impairs memory and decision-making, but short structured breaks help restore both. Encourage one real break today.",
    image: "an empty park bench under a shady tree, soft dappled afternoon light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Honey found in 3,000-year-old Egyptian tombs was still perfectly edible thanks to its low moisture and acidity.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: honey found in 3,000-year-old Egyptian tombs was still perfectly edible. Connect it to building things - habits, work, relationships - meant to last.",
    image: "a warm jar of golden honey with soft light through a kitchen window, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "Just one night of poor sleep can measurably reduce willpower and increase impulsive decisions the next day.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: just one night of poor sleep can measurably reduce willpower and increase impulsive decisions the next day. Encourage protecting tonight's sleep.",
    image: "a softly made bed near a window at dusk, calm blue-hour light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "The Japanese concept of 'kaizen' is built on tiny, continuous 1% improvements compounding over time.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: the Japanese concept of kaizen is built entirely on tiny, continuous 1% improvements compounding over time. Encourage one small improvement today.",
    image: "a single small green sprout in a simple clay pot, soft natural window light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "'Runner's high' is driven partly by the body's own endocannabinoids, which is why steady movement genuinely lifts mood.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: 'runner's high' is driven partly by the body's own endocannabinoids, which is why steady movement genuinely lifts mood. Encourage 20 minutes of movement today.",
    image: "an empty scenic running trail winding through open fields, soft bright daylight, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "The Great Wall of China was built in stages across centuries by many dynasties, not as one continuous project.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: the Great Wall of China was actually built in stages across many centuries and dynasties, not all at once. Connect it to trusting a long-term goal built in stages.",
    image: "a winding stone path disappearing over a distant hill, soft early morning light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
  {
    fact: "A five-minute nightly reflection has been linked to sharper focus and clearer priorities the next day.",
    caption: "Write a short, engaging Instagram caption (max 2 sentences) with 3-5 relevant hashtags. Open with this fact: a five-minute nightly reflection has been linked to sharper focus and clearer priorities the next day. Invite the reader to reflect on one win from today.",
    image: "a single lit candle beside a closed journal on a quiet nightstand, warm low light, clean minimal aesthetic photo, no people, no watermark, high quality.",
  },
]; // 30 explicit days - no combining, no repeats within the cycle

function buildPromptFromTheme(theme, index, extra = {}) {
  return {
    captionTopic: theme.caption,
    imagePrompt: theme.image,
    factText: theme.fact,
    themeKey: `day-${index + 1}`,
    cycleDay: index + 1,
    cycleLength: DAILY_THEMES.length,
    ...extra,
  };
}

/**
 * Continuous day counter - days since the Unix epoch (UTC).
 * Never resets on a calendar boundary (month/year), unlike day-of-year.
 */
function getDayIndex() {
  return Math.floor(Date.now() / 86400000);
}

/**
 * DETERMINISTIC - used by cron and by the default (no query param)
 * /run-now hit. This is what keeps your real daily automation locked
 * to the fixed 30-day order.
 */
function getDailyPrompt() {
  const day = getDayIndex();
  const index = day % DAILY_THEMES.length;
  return buildPromptFromTheme(DAILY_THEMES[index], index);
}

/**
 * RANDOM - used ONLY for manual testing via /run-now?random=true.
 * Never touches the real day-indexed rotation.
 */
function getRandomPrompt() {
  const index = Math.floor(Math.random() * DAILY_THEMES.length);
  return buildPromptFromTheme(DAILY_THEMES[index], index, {
    themeKey: `day-${index + 1}-random-test`,
  });
}

module.exports = {
  getDailyPrompt,
  getRandomPrompt,
  DAILY_THEMES,
};