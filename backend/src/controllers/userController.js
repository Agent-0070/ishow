import mongoose from "mongoose";
import User from "../models/User.js";
import Comment from "../models/Comment.js";

async function listUsers(req,res,next){
  try{
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  }catch(e){ next(e); }
}

async function getUser(req,res,next){
  try{
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Fetch comments from Comment collection and populate receivedComments
    // Only get top-level comments (not replies)
    const comments = await Comment.find({
      targetType: 'user',
      targetId: req.params.id,
      isReply: false
    })
    .populate('user', 'name displayPicture avatar')
    .populate({
      path: 'replies',
      populate: {
        path: 'user',
        select: 'name displayPicture avatar'
      }
    })
    .sort({ createdAt: -1 });

    // Transform comments to match the expected format
    const receivedComments = comments.map(comment => ({
      id: comment._id,
      fromUserId: comment.user._id,
      fromUserName: comment.user.name,
      fromUserAvatar: comment.user.displayPicture || comment.user.avatar,
      text: comment.text,
      rating: comment.rating,
      eventId: comment.eventId,
      eventName: comment.eventName,
      createdAt: comment.createdAt,
      replies: comment.replies.map(reply => ({
        id: reply._id,
        fromUserId: reply.user._id,
        fromUserName: reply.user.name,
        fromUserAvatar: reply.user.displayPicture || reply.user.avatar,
        text: reply.text,
        createdAt: reply.createdAt,
        parentComment: reply.parentComment
      }))
    }));

    // Hide private fields from other users
    const isOwner = req.user && (String(req.user.id) === String(user._id));
    const userObj = user.toObject();
    if (!isOwner) {
      delete userObj.homeAddress;
      delete userObj.companyAddress;
    }

    // Add the dynamically fetched comments
    userObj.receivedComments = receivedComments;

    res.json(userObj);
  }catch(e){ next(e); }
}

async function updateUser(req,res,next){
  try{
    const updates = {}; ["name","avatar","role","isBanned"].forEach(k=>{ if (k in req.body) updates[k]=req.body[k]; });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  }catch(e){ next(e); }
}

async function deleteUser(req,res,next){
  try{
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  }catch(e){ next(e); }
}

async function banUser(req,res,next){
  try{
    const user = await User.findByIdAndUpdate(req.params.id, { isBanned: true }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  }catch(e){ next(e); }
}

async function addUserComment(req,res,next){
  // Validate inputs for user comment
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid target user id" });
  }
  const commentText = req.body.text || req.body.comment;
  if (!req.body || typeof commentText !== 'string' || !commentText.trim()) {
    return res.status(400).json({ message: "Comment text is required" });
  }
  const rating = req.body.rating;
  if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
    return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
  }

  // Enforce rate limit: max 2 comments per (from user, target user, eventId)
  const { eventId, eventName } = req.body;
  const query = { targetType: 'user', targetId: req.params.id, user: req.user.id };
  if (eventId && mongoose.isValidObjectId(eventId)) query.eventId = eventId;
  const existingCount = await Comment.countDocuments(query);
  if (existingCount >= 2) {
    return res.status(429).json({ message: "You've reached the comment limit for this user/event." });
  }

  try{
    const payload = {
      targetType: "user",
      targetId: req.params.id,
      user: req.user.id,
      text: commentText.trim(),
    };
    if (rating !== undefined) payload.rating = rating;
    if (eventId && mongoose.isValidObjectId(eventId)) payload.eventId = eventId;
    if (eventName) payload.eventName = eventName;

    const c = await Comment.create(payload);

    // Populate response with fromUserName/fromUserAvatar for immediate rendering
    const from = await User.findById(req.user.id).select('name displayPicture avatar');
    const response = {
      id: c._id,
      text: c.text,
      rating: c.rating,
      eventId: c.eventId,
      eventName: c.eventName,
      createdAt: c.createdAt,
      fromUserId: req.user.id,
      fromUserName: from?.name || 'User',
      fromUserAvatar: from?.displayPicture || from?.avatar || null,
    };

    res.status(201).json(response);
  }catch(e){ next(e); }
}

async function addCommentReply(req,res,next){
  try{
    const { commentId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    // Find the parent comment
    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Create the reply
    const reply = await Comment.create({
      targetType: parentComment.targetType,
      targetId: parentComment.targetId,
      user: req.user.id,
      text: text.trim(),
      parentComment: commentId,
      isReply: true
    });

    // Add reply to parent comment's replies array
    parentComment.replies.push(reply._id);
    await parentComment.save();

    // Populate response with user data
    const populatedReply = await Comment.findById(reply._id)
      .populate('user', 'name displayPicture avatar');

    const response = {
      id: populatedReply._id,
      fromUserId: populatedReply.user._id,
      fromUserName: populatedReply.user.name,
      fromUserAvatar: populatedReply.user.displayPicture || populatedReply.user.avatar,
      text: populatedReply.text,
      createdAt: populatedReply.createdAt,
      parentComment: populatedReply.parentComment
    };

    res.status(201).json(response);
  }catch(e){ next(e); }
}

async function deleteUserComment(req,res,next){
  try{
    const { commentId } = req.params;
    const userId = req.params.id;

    // Find the comment to verify ownership
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if the user owns this comment or is an admin
    const isOwner = String(comment.user) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You can only delete your own comments" });
    }

    // Delete the comment
    await Comment.findByIdAndDelete(commentId);

    res.json({ message: "Comment deleted successfully" });
  }catch(e){ next(e); }
}

async function userStats(req,res,next){
  try{
    const total = await User.countDocuments();
    const banned = await User.countDocuments({ isBanned: true });
    res.json({ total, banned, active: total - banned });
  }catch(e){ next(e); }
}

export {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  banUser,
  addUserComment,
  addCommentReply,
  deleteUserComment,
  userStats
};
