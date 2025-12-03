import { useState, useRef, type FC, type DragEvent } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
  type: 'text' | 'file';
}

export const ChatSystem: FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Simulate typing indicator
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      const message: Message = {
        id: Date.now().toString(),
        text: `📁 ${file.name}`,
        sender: 'user',
        timestamp: new Date(),
        type: 'file'
      };
      setMessages(prev => [...prev, message]);
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto h-96 flex flex-col bg-glass-light backdrop-blur-md border-gray-300">
      {/* Chat Header */}
      <div className="p-4 border-b border-glass-border">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full animate-avatar-glow"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-chat-online rounded-full border-2 border-white animate-status-blink"></div>
          </div>
          <div>
            <h3 className="font-semibold">Host Support</h3>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-message-slide`}
          >
            <div
              className={`max-w-xs p-3 rounded-2xl shadow-chat-bubble ${
                message.sender === 'user'
                  ? 'bg-chat-bubble-sent text-white'
                  : 'bg-chat-bubble-received'
              } ${message.type === 'file' ? 'animate-file-upload' : ''}`}
            >
              <p className="text-sm">{message.text}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-chat-bubble-received p-3 rounded-2xl">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-chat-typing rounded-full animate-typing-dots"></div>
                <div className="w-2 h-2 bg-chat-typing rounded-full animate-typing-dots" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-chat-typing rounded-full animate-typing-dots" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Drop Zone Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-chat-file-zone/20 border-2 border-dashed border-chat-file-zone rounded-lg flex items-center justify-center z-10 animate-scale-in">
          <div className="text-center">
            <div className="text-4xl mb-2">📁</div>
            <p className="text-lg font-semibold">Drop files here</p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div
        className="p-4 border-t border-glass-border"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach(file => {
                const message: Message = {
                  id: Date.now().toString(),
                  text: `📁 ${file.name}`,
                  sender: 'user',
                  timestamp: new Date(),
                  type: 'file'
                };
                setMessages(prev => [...prev, message]);
              });
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="px-3"
          >
            📎
          </Button>
          <Button onClick={sendMessage} className="px-6">
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
};
