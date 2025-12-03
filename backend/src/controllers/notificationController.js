import Notification from "../models/Notification.js";
import User from "../models/User.js";

export async function listNotifications(req,res,next){
  try{
    const userId = req.user.id;
    console.log('📋 Fetching notifications for user:', userId);

    const list = await Notification.find({ user: userId }).sort({ createdAt: -1 });

    console.log(`📋 Found ${list.length} notifications for user ${userId}`);
    if (list.length > 0) {
      console.log('📋 Notification IDs:', list.map(n => ({
        id: n._id,
        idType: typeof n._id,
        title: n.title,
        type: n.type
      })));
    }

    res.json(list);
  }catch(e){
    console.error('❌ Error fetching notifications:', e);
    next(e);
  }
}

export async function markRead(req,res,next){
  try{
    const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { read: true }, { new: true });
    if (!n) return res.status(404).json({ message: "Not found" });
    res.json(n);
  }catch(e){ next(e); }
}

export async function markAllRead(req,res,next){
  try{
    await Notification.updateMany({ user: req.user.id }, { $set: { read: true } });
    res.json({ message: "All read" });
  }catch(e){ next(e); }
}

export async function deleteNotification(req,res,next){
  try{
    const notificationId = req.params.id;
    const userId = req.user.id;

    console.log('🗑️ Attempting to delete notification:', {
      notificationId,
      userId,
      userIdType: typeof userId,
      notificationIdLength: notificationId?.length,
      isValidObjectId: /^[0-9a-fA-F]{24}$/.test(notificationId)
    });

    // Check if it's a valid MongoDB ObjectId format
    if (!notificationId || !/^[0-9a-fA-F]{24}$/.test(notificationId)) {
      console.log('❌ Invalid notification ID format:', notificationId);
      return res.status(400).json({ message: "Invalid notification ID format" });
    }

    // First check if notification exists at all
    const existingNotification = await Notification.findById(notificationId);
    if (!existingNotification) {
      console.log('❌ Notification not found in database:', notificationId);

      // Debug: Check what notifications exist for this user
      const userNotifications = await Notification.find({ user: userId }).select('_id title type createdAt');
      console.log('🔍 User notifications in database:', userNotifications.map(n => ({
        id: n._id.toString(),
        title: n.title,
        type: n.type,
        createdAt: n.createdAt
      })));

      // Debug: Check if any notification with similar ID exists
      const allNotifications = await Notification.find({}).select('_id user').limit(10);
      console.log('🔍 Recent notifications in database:', allNotifications.map(n => ({
        id: n._id.toString(),
        userId: n.user.toString()
      })));

      return res.status(404).json({ message: "Notification not found" });
    }

    console.log('📋 Found notification:', {
      id: existingNotification._id,
      userId: existingNotification.user,
      userIdType: typeof existingNotification.user,
      title: existingNotification.title,
      type: existingNotification.type
    });

    // Check if user owns this notification
    if (String(existingNotification.user) !== String(userId)) {
      console.log('❌ User does not own this notification:', {
        notificationUserId: existingNotification.user,
        requestUserId: userId
      });
      return res.status(404).json({ message: "Notification not found" });
    }

    const n = await Notification.findOneAndDelete({ _id: notificationId, user: userId });
    if (!n) {
      console.log('❌ Failed to delete notification despite checks');
      return res.status(404).json({ message: "Failed to delete notification" });
    }

    console.log('✅ Notification deleted successfully:', notificationId);
    res.json({ message: "Deleted" });
  }catch(e){
    console.error('❌ Error deleting notification:', e);
    next(e);
  }
}

export async function clearNotifications(req,res,next){
  try{
    await Notification.deleteMany({ user: req.user.id });
    res.json({ message: "Cleared" });
  }catch(e){ next(e); }
}

export async function getSettings(req,res,next){
  try{
    const user = req.user;
    // In a real app, stored on User model
    res.json({ email: true, push: true });
  }catch(e){ next(e); }
}

export async function updateSettings(req,res,next){
  try{
    // Here you would persist on User.notificationSettings
    res.json({ ...req.body });
  }catch(e){ next(e); }
}

// Subscribe to push notifications
export async function subscribeToPush(req,res,next){
  try{
    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({ message: "Subscription data required" });
    }

    // Store subscription in user model (you might want to create a separate PushSubscription model)
    await User.findByIdAndUpdate(req.user.id, {
      $set: { pushSubscription: subscription }
    });

    console.log(`🔔 Push subscription saved for user: ${req.user.name}`);
    res.json({ message: "Push subscription saved successfully" });
  }catch(e){ next(e); }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(req,res,next){
  try{
    // Remove subscription from user model
    await User.findByIdAndUpdate(req.user.id, {
      $unset: { pushSubscription: 1 }
    });

    console.log(`🔔 Push subscription removed for user: ${req.user.name}`);
    res.json({ message: "Push subscription removed successfully" });
  }catch(e){ next(e); }
}

// Clean up invalid notifications (missing required fields)
export async function cleanupNotifications(req,res,next){
  try{
    // Remove notifications without type or title
    const result = await Notification.deleteMany({
      $or: [
        { type: { $exists: false } },
        { type: null },
        { title: { $exists: false } },
        { title: null },
        { title: "" }
      ]
    });

    res.json({
      message: "Cleanup completed",
      deletedCount: result.deletedCount
    });
  }catch(e){ next(e); }
}
