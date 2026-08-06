const mongoose = require("mongoose");

const Post = require("../models/Post");
const Log = require("../models/Log");
const { getDailyPrompt } = require("../utils/promptrotationdaily");
const { generateCaption, generateImage } = require("../services/aiService");
const { uploadImageToCloudinary } = require("../services/uploadService");
const { postImageToInstagram } = require("../services/instagramService");

function isValidPostId(postId) {
  return Boolean(postId) && mongoose.isValidObjectId(postId);
}

function normalizeMessage(message) {
  if (message == null) return "";
  if (typeof message === "string") return message;

  try {
    return JSON.stringify(message);
  } catch (_) {
    return String(message);
  }
}

// Logging and post updates are best-effort. A DB write problem should not stop the post.
async function writeLog(postId, stage, status, message) {
  if (!isValidPostId(postId)) {
    return null;
  }

  try {
    return await Log.create({
      postId,
      stage,
      status,
      message: normalizeMessage(message).slice(0, 1000),
    });
  } catch (err) {
    console.error(`[Pipeline] Failed to write ${stage} log:`, err.message);
    return null;
  }
}

async function updatePost(postId, update) {
  if (!isValidPostId(postId)) {
    return null;
  }

  try {
    return await Post.findByIdAndUpdate(postId, update, { new: true });
  } catch (err) {
    console.error(`[Pipeline] Failed to update post ${postId}:`, err.message);
    return null;
  }
}

async function failPipeline({ postId, stage, error, postUpdate = {}, details = {} }) {
  await writeLog(postId, stage, "failure", error);
  await updatePost(postId, {
    ...postUpdate,
    status: "failed",
    errorMessage: error,
  });

  return {
    success: false,
    failedStage: stage,
    error,
    ...details,
  };
}

async function runDailyPostPipeline({ postId, igUserId, accessToken, accountId = null }) {
  if (!postId) {
    throw new Error("postId is required");
  }

  if (!igUserId) {
    throw new Error("igUserId is required");
  }

  if (!accessToken) {
    throw new Error("accessToken is required");
  }

  const dailyPrompt = getDailyPrompt();
  const pipelineDetails = {
    postId,
    accountId,
    themeKey: dailyPrompt.themeKey,
    cycleDay: dailyPrompt.cycleDay,
    cycleLength: dailyPrompt.cycleLength,
  };

  try {
    await updatePost(postId, {
      status: "processing",
      errorMessage: "",
    });

    const captionResult = await generateCaption(dailyPrompt.captionTopic);
    if (!captionResult.success) {
      return failPipeline({
        postId,
        stage: "caption_generation",
        error: captionResult.error,
        details: pipelineDetails,
      });
    }

    await writeLog(
      postId,
      "caption_generation",
      "success",
      `Generated caption for ${dailyPrompt.themeKey}`
    );
    await updatePost(postId, {
      caption: captionResult.caption,
    });

    const imageResult = await generateImage(dailyPrompt.imagePrompt);
    if (!imageResult.success) {
      return failPipeline({
        postId,
        stage: "image_generation",
        error: imageResult.error,
        postUpdate: { caption: captionResult.caption },
        details: pipelineDetails,
      });
    }

    await writeLog(
      postId,
      "image_generation",
      "success",
      `Generated image for ${dailyPrompt.themeKey}`
    );

    const uploadResult = await uploadImageToCloudinary({
      base64Data: imageResult.base64Data,
      mimeType: imageResult.mimeType,
    });

    if (!uploadResult.success) {
      return failPipeline({
        postId,
        stage: "image_upload",
        error: uploadResult.error,
        postUpdate: { caption: captionResult.caption },
        details: pipelineDetails,
      });
    }

    await writeLog(postId, "image_upload", "success", "Uploaded image to Cloudinary");
    await updatePost(postId, {
      imageUrl: uploadResult.publicUrl,
    });

    const publishResult = await postImageToInstagram({
      igUserId,
      accessToken,
      imageUrl: uploadResult.publicUrl,
      caption: captionResult.caption,
    });

    if (!publishResult.success) {
      return failPipeline({
        postId,
        stage: publishResult.stage || "media_publish",
        error: publishResult.error,
        postUpdate: {
          caption: captionResult.caption,
          imageUrl: uploadResult.publicUrl,
        },
        details: pipelineDetails,
      });
    }

    await writeLog(
      postId,
      "media_container",
      "success",
      `Created Instagram container ${publishResult.creationId}`
    );
    await writeLog(
      postId,
      "media_publish",
      "success",
      `Published Instagram media ${publishResult.igMediaId}`
    );

    const publishedAt = new Date();
    await updatePost(postId, {
      caption: captionResult.caption,
      imageUrl: uploadResult.publicUrl,
      igCreationId: publishResult.creationId,
      igMediaId: publishResult.igMediaId,
      status: "posted",
      publishedAt,
      errorMessage: "",
    });

    return {
      success: true,
      ...pipelineDetails,
      caption: captionResult.caption,
      imageUrl: uploadResult.publicUrl,
      igCreationId: publishResult.creationId,
      igMediaId: publishResult.igMediaId,
      publishedAt,
    };
  } catch (err) {
    const errorMessage = err.message || String(err);
    console.error("[Pipeline] Unexpected failure:", errorMessage);

    await updatePost(postId, {
      status: "failed",
      errorMessage,
    });

    return {
      success: false,
      failedStage: "pipeline",
      error: errorMessage,
      ...pipelineDetails,
    };
  }
}

module.exports = { runDailyPostPipeline };
