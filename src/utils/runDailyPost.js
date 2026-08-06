const Account = require("../models/Account");
const Post = require("../models/Post");
const { decrypt } = require("./encryption");
const { runDailyPostPipeline } = require("../graph/postPipeline");

async function resolveAccount() {
  try {
    const account = await Account.findOne({ isActive: true });
    if (account) {
      return {
        igUserId: account.igUserId,
        accessToken: decrypt(account.accessToken),
        accountId: account._id.toString(),
      };
    }
  } catch (err) {
    console.error("[runDailyPost] Account lookup failed, falling back to env vars:", err.message);
  }

  if (process.env.FALLBACK_IG_USER_ID && process.env.FALLBACK_IG_ACCESS_TOKEN) {
    return {
      igUserId: process.env.FALLBACK_IG_USER_ID,
      accessToken: process.env.FALLBACK_IG_ACCESS_TOKEN,
      accountId: null,
    };
  }

  throw new Error("No Instagram account available (DB down and no FALLBACK_IG_* env vars set).");
}

async function createPostRecord(accountId) {
  try {
    const post = await Post.create({
      accountId: accountId || undefined,
      status: "processing",
      scheduledTime: new Date(),
    });
    return post._id.toString();
  } catch (err) {
    console.error("[runDailyPost] Could not create Post record, continuing without DB logging:", err.message);
    return `local-${Date.now()}`;
  }
}

async function runDailyPost() {
  const { igUserId, accessToken, accountId } = await resolveAccount();
  const postId = await createPostRecord(accountId);

  return runDailyPostPipeline({ accountId, postId, igUserId, accessToken });
}

module.exports = { runDailyPost };