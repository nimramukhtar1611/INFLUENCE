// components/DealInbox.jsx
import React, { useState } from 'react';
import { Search, Send, Paperclip, MoreVertical, Check, X, Clock } from 'lucide-react';

const DealInbox = () => {
  const [selectedChat, setSelectedChat] = useState(1);
  const [message, setMessage] = useState('');

  const conversations = [
    {
      id: 1,
      name: 'Nike',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Thanks for the proposal! When can you start?',
      time: '10:30 AM',
      unread: 2,
      status: 'active'
    },
    {
      id: 2,
      name: 'Sephora',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'We love your content! Let\'s discuss terms.',
      time: 'Yesterday',
      unread: 0,
      status: 'pending'
    },
    {
      id: 3,
      name: 'Apple',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Campaign deliverables approved!',
      time: 'Yesterday',
      unread: 0,
      status: 'completed'
    },
    {
      id: 4,
      name: 'Adidas',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Can you share your rate card?',
      time: '2 days ago',
      unread: 0,
      status: 'negotiating'
    }
  ];

  const messages = [
    {
      id: 1,
      sender: 'brand',
      content: 'Hi Sarah! We love your content and would like to collaborate on our upcoming summer collection.',
      time: '10:00 AM',
      status: 'read'
    },
    {
      id: 2,
      sender: 'creator',
      content: 'Thank you! I\'d love to work with Nike. Can you share more details about the campaign?',
      time: '10:15 AM',
      status: 'read'
    },
    {
      id: 3,
      sender: 'brand',
      content: 'Of course! We\'re looking for 2 Instagram posts and 3 stories featuring our new running shoes. The budget is $500. Let me know if that works for you!',
      time: '10:20 AM',
      status: 'read'
    },
    {
      id: 4,
      sender: 'creator',
      content: 'That sounds perfect! I have some ideas already. When would you need the content by?',
      time: '10:25 AM',
      status: 'read'
    },
    {
      id: 5,
      sender: 'brand',
      content: 'Great! We\'d need it by March 15th. I\'ll send over the formal offer shortly.',
      time: '10:30 AM',
      status: 'delivered'
    }
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'negotiating': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] bg-white rounded-xl shadow-sm flex overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-120px)]">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedChat(conv.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedChat === conv.id ? 'bg-indigo-50' : ''
              }`}
            >
              <div className="flex items-start">
                <img src={conv.avatar} alt={conv.name} className="w-12 h-12 rounded-full" />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">{conv.name}</h3>
                    <span className="text-xs text-gray-500">{conv.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(conv.status)}`}>
                      {conv.status}
                    </span>
                    {conv.unread > 0 && (
                      <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <img src="https://via.placeholder.com/40" alt="Nike" className="w-10 h-10 rounded-full" />
            <div className="ml-3">
              <h3 className="font-semibold text-gray-900">Nike</h3>
              <p className="text-xs text-green-600">● Online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Check className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'creator' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${
                msg.sender === 'creator' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
              } rounded-lg p-3`}>
                <p className="text-sm">{msg.content}</p>
                <div className={`flex items-center justify-end mt-1 text-xs ${
                  msg.sender === 'creator' ? 'text-indigo-200' : 'text-gray-500'
                }`}>
                  {msg.time}
                  {msg.sender === 'creator' && (
                    <span className="ml-2">
                      {msg.status === 'read' ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealInbox;