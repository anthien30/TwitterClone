const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userTo: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    userFrom: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    notificationType: String,
    opened: {
      type: Boolean,
      default: false,
    },
    entityId: mongoose.SchemaTypes.ObjectId,
  },
  {
    timestamps: true,
  }
);

notificationSchema.statics.insertNotification = async (
  userTo,
  userFrom,
  notificationType,
  entityId
) => {
  const data = { userTo, userFrom, notificationType, entityId };
  await Notification.deleteOne(data).catch((error) => console.log(error));
  return Notification.create(data);
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
