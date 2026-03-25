// utils/socketEvents.js
module.exports = {
  // Messages
  NEW_MESSAGE:        'new_message',
  MESSAGE_DELIVERED:  'message_delivered',
  MESSAGE_READ:       'messages_read',
  MESSAGE_EDITED:     'message_edited',
  MESSAGE_DELETED:    'message_deleted',
  MESSAGE_REACTION:   'message_reaction',

  // Typing
  TYPING_START:       'typing_start',
  TYPING_STOP:        'typing_stop',
  USER_TYPING:        'user_typing',

  // Conversations
  CONVERSATION_JOINED: 'conversation_joined',
  CONVERSATION_LEFT:   'conversation_left',

  // Online status
  ONLINE_USERS_UPDATE: 'online_users_update',

  // Notifications
  NOTIFICATION_NEW:     'notification:new',
  NOTIFICATION_READ:    'notification:read',
  NOTIFICATIONS_CLEARED: 'notifications:cleared',
};