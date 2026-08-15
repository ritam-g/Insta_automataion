/**
 * Cron scheduler - triggers the daily Instagram posting pipeline
 * at a configured time. Also exposes a `triggerDailyPost()` helper
 * used by the manual "run now" API route.
 */

const cron = require("node-cron");

const Account = require("../models/Account");
const Post = require("../models/Post");
const { runDailyPostPipeline } = require("../graph/postPipeline");
const { decrypt } = require("../utils/encryption");
const { refreshExpiringTokens } = require("../controllers/tokenController");

/**
 * Guards against double-posting the same day - e.g. if UptimeRobot
 * fires twice close together, or someone hits the real (non-random)
 * /run-now endpoint after the cron/UptimeRobot trigger already ran.
 * Only checked for the deterministic daily flow, never for random
 * test runs (see triggerDailyPost below).
 */
async function hasAlreadyPostedToday() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await Post.findOne({
    status: { $in: ["processing", "posted"] },
    createdAt: { $gte: startOfDay },
  });

  return Boolean(existing);
}

/**
 * Creates a "processing" Post document, runs the pipeline against it,
 * and returns the final state. Used by both the cron job and the
 * manual "run now" route so the logic only lives in one place.
 *
 * @param {object} options
 * @param {"daily"|"random"} [options.promptMode] - "daily" (default)
 *   follows the fixed 30-day rotation and is subject to the same-day
 *   duplicate guard. "random" is for manual testing via
 *   /run-now?random=true - skips the duplicate guard since it's not
 *   meant to represent the real daily post.
 */
async function triggerDailyPost(options = {}) {
  const { promptMode = "daily" } = options;

  if (promptMode === "daily" && (await hasAlreadyPostedToday())) {
    console.log("[Cron] Already posted/processing today - skipping duplicate trigger");
    return { success: true, skipped: true, reason: "Already posted today" };
  }

  /**
   * For now this app manages a single Instagram account.
   * We just grab the first active one.
   */
  const account = await Account.findOne({ isActive: true });

  if (!account) {
    console.error("[Cron] No active Instagram account found - skipping run");
    return { success: false, error: "No active account connected" };
  }

  /**
   * Check token expiry before attempting to post.
   * Long-lived tokens last ~60 days - if it's already expired,
   * fail fast instead of wasting AI generation calls.
   */
  if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
    console.error("[Cron] Access token expired - reconnect the account");
    return { success: false, error: "Access token expired" };
  }

  const post = await Post.create({
    accountId: account._id,
    status: "processing",
    scheduledTime: new Date(),
  });

  console.log(`[Cron] Starting pipeline for post ${post._id} (promptMode: ${promptMode})`);

  /**
   * Decrypt the stored token right before use - it should never sit
   * in memory unencrypted for longer than necessary.
   */
  let decryptedToken;
  try {
    decryptedToken = decrypt(account.accessToken);
  } catch (err) {
    console.error("[Cron] Failed to decrypt access token:", err.message);
    await Post.findByIdAndUpdate(post._id, {
      status: "failed",
      errorMessage: "Failed to decrypt stored access token",
    });
    return { success: false, error: "Failed to decrypt access token" };
  }

  const finalState = await runDailyPostPipeline({
    postId: post._id.toString(),
    igUserId: account.igUserId,
    accessToken: decryptedToken,
    promptMode,
  });

  if (finalState.error) {
    console.error(`[Cron] Pipeline failed at ${finalState.failedStage}:`, finalState.error);
  } else {
    console.log(`[Cron] Pipeline succeeded - IG media ID: ${finalState.igMediaId}`);
  }

  return finalState;
}

/**
 * Registers the recurring daily cron job.
 * Cron expression is configurable via DAILY_POST_CRON in .env
 * (defaults to 9:00 AM server time if not set).
 */
function startDailyPostCron() {
  const cronExpression = process.env.DAILY_POST_CRON || "0 9 * * *";

  if (!cron.validate(cronExpression)) {
    console.error(`[Cron] Invalid cron expression: ${cronExpression} - job not scheduled`);
    return;
  }

  cron.schedule(cronExpression, async () => {
    console.log(`[Cron] Daily post job triggered at ${new Date().toISOString()}`);
    await triggerDailyPost(); // always "daily" mode - real automated post
  });

  console.log(`[Cron] Daily post job scheduled with expression: ${cronExpression}`);
}

/**
 * Registers the recurring weekly token refresh job.
 * Runs every Monday at 3 AM by default - refreshes any account
 * whose token is within 10 days of expiring.
 */
function startTokenRefreshCron() {
  const cronExpression = process.env.TOKEN_REFRESH_CRON || "0 3 * * 1";

  if (!cron.validate(cronExpression)) {
    console.error(`[Cron] Invalid cron expression: ${cronExpression} - token refresh not scheduled`);
    return;
  }

  cron.schedule(cronExpression, async () => {
    console.log(`[Cron] Token refresh job triggered at ${new Date().toISOString()}`);
    await refreshExpiringTokens();
  });

  console.log(`[Cron] Token refresh job scheduled with expression: ${cronExpression}`);
}

module.exports = {
  startDailyPostCron,
  startTokenRefreshCron,
  triggerDailyPost,
};