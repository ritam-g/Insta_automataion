/**
 * Post controller - handles manually triggering the pipeline and
 * managing post history. Routes stay thin; logic lives here.
 */

const Post = require("../models/Post");
const Log = require("../models/Log");
const { triggerDailyPost } = require("../cron/scheduler");

/**
 * GET /api/posts/run-now
 * GET /api/posts/run-now?random=true
 *
 * Manually/automatically runs the posting pipeline immediately.
 *
 * - No query param (what UptimeRobot pings) -> "daily" mode, follows
 *   the fixed 30-day rotation, guarded against same-day duplicates.
 *   This is your real production trigger.
 * - ?random=true -> "random" mode, picks a random day's theme, skips
 *   the duplicate guard. For manual testing only - never hit this
 *   from UptimeRobot or anything automated.
 *
 * Responds immediately (202) instead of waiting for the full pipeline
 * (caption -> image -> upload -> Instagram publish) to finish, so
 * slow runs or Render cold-starts can't make UptimeRobot time out and
 * falsely report the service as down. The pipeline keeps running in
 * the background; check GET /api/posts or /api/posts/:id for the
 * real outcome.
 */
async function runNow(req, res) {
  const promptMode = req.query.random === "true" ? "random" : "daily";

  res.status(202).json({
    success: true,
    message: `Pipeline triggered in background (promptMode: ${promptMode})`,
  });

  triggerDailyPost({ promptMode }).catch((err) => {
    console.error("[runNow] Unhandled pipeline error:", err.message);
  });
}

/**
 * GET /api/posts
 * Lists all posts, most recent first.
 */
async function listPosts(req, res) {
  const posts = await Post.find().sort({ createdAt: -1 });
  res.json({ success: true, posts });
}

/**
 * GET /api/posts/:id
 * Gets a single post along with its pipeline logs.
 */
async function getPostById(req, res) {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }

  const logs = await Log.find({ postId: post._id }).sort({ createdAt: 1 });

  res.json({ success: true, post, logs });
}

/**
 * DELETE /api/posts/:id
 * Removes a post record (does NOT delete the live Instagram post itself -
 * Instagram's API does not support deleting published media via this flow).
 */
async function deletePost(req, res) {
  const post = await Post.findByIdAndDelete(req.params.id);

  if (!post) {
    return res.status(404).json({ success: false, error: "Post not found" });
  }

  res.json({ success: true, message: "Post record deleted" });
}

module.exports = {
  runNow,
  listPosts,
  getPostById,
  deletePost,
};