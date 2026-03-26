'use client';

import { motion } from 'framer-motion';
import type { Conversation } from '@/types/meeting';

interface ConversationListProps {
  conversations: Conversation[];
}

export const ConversationList = ({ conversations }: ConversationListProps) => {
  if (conversations.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-32 left-4 right-4 max-h-48 overflow-y-auto space-y-2">
      {conversations.map((conv, index) => (
        <motion.div
          key={conv.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-gray-200"
        >
          <div className="text-xs text-gray-500 mb-1">
            {new Date(conv.user_sent_at).toLocaleTimeString()}
          </div>
          <div className="text-sm text-gray-700 mb-2">
            <span className="font-semibold">您：</span>
            {conv.user_message_text}
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-semibold text-indigo-600">AI：</span>
            {conv.ai_response_text}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
