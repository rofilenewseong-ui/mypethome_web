'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { messengerApi } from '@/lib/api';
import { track } from '@/lib/analytics';
import MobileLayout from '@/components/layout/MobileLayout';
import { Skeleton, EmptyState, Avatar, Badge } from '@/components/ui';

// 이모지 세트: 펫 답장용
const emojiSets = {
  happy: ['🐾💛😊', '🤩🐾💕', '🥰🐕💗', '🐾✨😆'],
  walk: ['🐾🌿💚', '🌳🐕🌸', '🏃‍♂️🐾💨', '🌞🐾🎵'],
  food: ['🦴😋💕', '🍖🤤💛', '🐾🍗😊', '🦴💕✨'],
  love: ['💗🐕💗', '🐾❤️🥰', '💕🐾💕', '😘🐕✨'],
  sleep: ['😴🐾💤', '🌙🐕💫', '😪🐾🌟', '💤🛏️🐾'],
  play: ['🎾🐕💨', '🐾🎈🤪', '🧸🐾💛', '🎮🐕🎉'],
};

const allEmojis = Object.values(emojiSets).flat();

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'pet';
  timestamp: Date;
  isRead: boolean;
}

interface ChatRoom {
  id: string;
  petName: string;
  petEmoji: string;
  breed: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  isOnline: boolean;
}

// 데모 데이터
const demoChatRooms: ChatRoom[] = [
  {
    id: '1',
    petName: '코코',
    petEmoji: '🐕',
    breed: '포메라니안',
    lastMessage: '🐾💛😊',
    lastTime: '오후 2:30',
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: '2',
    petName: '나비',
    petEmoji: '🐈',
    breed: '페르시안',
    lastMessage: '😴🐾💤',
    lastTime: '오전 11:20',
    unreadCount: 0,
    isOnline: false,
  },
];

const demoMessages: Message[] = [
  { id: '1', content: '코코야 잘 지내고 있어?', sender: 'user', timestamp: new Date(2026, 2, 3, 14, 20), isRead: true },
  { id: '2', content: '🐾💛😊', sender: 'pet', timestamp: new Date(2026, 2, 3, 14, 25), isRead: true },
  { id: '3', content: '오늘 날씨 좋은데 산책 가고 싶지?', sender: 'user', timestamp: new Date(2026, 2, 3, 14, 27), isRead: true },
  { id: '4', content: '🐾🌿💚', sender: 'pet', timestamp: new Date(2026, 2, 3, 14, 30), isRead: true },
];

export default function MessengerPage() {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(demoChatRooms);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data } = await messengerApi.getRooms();
        if (data?.data && data.data.length > 0) {
          setChatRooms(data.data);
        }
      } catch {
        // API 실패 시 데모 데이터 유지
      } finally {
        setIsLoading(false);
      }
    };
    fetchRooms();
  }, []);

  if (selectedRoom) {
    return (
      <ChatScreen
        room={selectedRoom}
        onBack={() => setSelectedRoom(null)}
      />
    );
  }

  return <ChatRoomList rooms={chatRooms} isLoading={isLoading} onSelectRoom={setSelectedRoom} />;
}

/* ============ 채팅방 목록 ============ */
function ChatRoomList({ rooms, isLoading, onSelectRoom }: { rooms: ChatRoom[]; isLoading: boolean; onSelectRoom: (room: ChatRoom) => void }) {
  return (
    <MobileLayout title="메신저" showMessage={false}>
      <div className="p-5 space-y-2 animate-fade-in">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton height="64px" count={2} />
          </div>
        ) : rooms.length > 0 ? (
          rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room)}
              className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] transition-all duration-200"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
              }}
            >
              <Avatar
                fallback={room.petEmoji}
                size="lg"
                online={room.isOnline}
              />

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {room.petName}
                  </span>
                  <Badge>{room.breed}</Badge>
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                  {room.lastMessage}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {room.lastTime}
                </span>
                {room.unreadCount > 0 && (
                  <Badge variant="count">{room.unreadCount}</Badge>
                )}
              </div>
            </button>
          ))
        ) : (
          <EmptyState
            emoji="💬"
            description={'아직 대화가 없습니다.\n아이를 등록하면 마음을 전할 수 있습니다.'}
          />
        )}
      </div>
    </MobileLayout>
  );
}

/* ============ 채팅 화면 ============ */
function ChatScreen({ room, onBack }: { room: ChatRoom; onBack: () => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(demoMessages);
  const [inputText, setInputText] = useState('');
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [delayNotice, setDelayNotice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    track('chat_room_open', { chatRoomId: room.id, petId: room.id });
  }, [room.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback(() => {
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      content: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
      isRead: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    track('message_send', {
      chatRoomId: room.id,
      petId: room.id,
      contentLength: inputText.trim().length,
      hasEmoji: /[\p{Emoji}]/u.test(inputText),
    });
    messengerApi.sendMessage(room.id, inputText.trim()).catch(() => {});
    setInputText('');
    setShowEmojiPanel(false);

    setDelayNotice(true);
    setTimeout(() => setDelayNotice(false), 3000);

    const delay = 5000 + Math.random() * 10000;
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        const randomEmoji = allEmojis[Math.floor(Math.random() * allEmojis.length)];
        const petReply: Message = {
          id: (Date.now() + 1).toString(),
          content: randomEmoji,
          sender: 'pet',
          timestamp: new Date(),
          isRead: false,
        };
        setMessages((prev) => [...prev, petReply]);
        setIsTyping(false);
      }, 2000);
    }, delay);
  }, [inputText, room.id]);

  const quickEmojis = ['❤️', '🐾', '😊', '💕', '🥰', '😢', '🌈', '🌸'];

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'var(--bg-warm)' }}>
      {/* 채팅 탑바 */}
      <header
        className="flex items-center gap-3 px-4 flex-shrink-0"
        style={{
          height: '60px',
          background: 'rgba(245, 241, 234, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-card)',
        }}
      >
        <button onClick={onBack} className="text-lg p-1" style={{ color: 'var(--text-secondary)' }}>
          ←
        </button>
        <Avatar fallback={room.petEmoji} size="sm" />
        <div className="flex-1">
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {room.petName}
          </span>
          <p className="text-[10px]" style={{ color: 'var(--accent-green)' }}>
            {room.isOnline ? '온라인' : '오프라인'}
          </p>
        </div>
        <button
          onClick={() => router.push(`/player/${room.id}`)}
          className="text-sm p-1"
          style={{ color: 'var(--text-muted)' }}
        >
          ⋯
        </button>
      </header>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-center">
          <span
            className="inline-block px-3 py-1 rounded-full text-[10px]"
            style={{ background: 'rgba(74,52,42,0.05)', color: 'var(--text-muted)' }}
          >
            2026년 3월 3일 월요일
          </span>
        </div>

        {delayNotice && (
          <div
            className="text-center py-2 rounded-[var(--radius-sm)] animate-fade-in"
            style={{ background: 'rgba(196,137,77,0.08)' }}
          >
            <p className="text-[10px]" style={{ color: 'var(--accent-orange)' }}>
              보내신 마음에, 작은 온기가 돌아올 거예요.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'pet' && (
              <Avatar fallback={room.petEmoji} size="xs" className="mr-2 mt-1" />
            )}
            <div>
              <div
                className={`px-3.5 py-2.5 rounded-[var(--radius-md)] text-sm max-w-[240px] ${
                  msg.sender === 'pet' ? 'text-lg' : ''
                }`}
                style={{
                  background: msg.sender === 'user' ? 'var(--accent-warm)' : 'rgba(74,52,42,0.06)',
                  color: msg.sender === 'user' ? '#fff' : 'var(--text-primary)',
                  borderBottomRightRadius: msg.sender === 'user' ? '4px' : undefined,
                  borderBottomLeftRadius: msg.sender === 'pet' ? '4px' : undefined,
                }}
              >
                {msg.content}
              </div>
              <div
                className={`text-[9px] mt-0.5 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}
                style={{ color: 'var(--text-muted)' }}
              >
                {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                {msg.sender === 'user' && msg.isRead && ' ✓'}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2">
            <Avatar fallback={room.petEmoji} size="xs" />
            <div className="px-3 py-2 rounded-[var(--radius-md)]" style={{ background: 'rgba(74,52,42,0.06)' }}>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 이모지 패널 */}
      {showEmojiPanel && (
        <div
          className="border-t px-4 py-3"
          style={{ height: '200px', background: 'var(--bg-warm)', borderColor: 'var(--border-card)' }}
        >
          <div className="grid grid-cols-8 gap-2">
            {quickEmojis.map((emoji, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                  track('emoji_select', { chatRoomId: room.id, emoji });
                }}
                className="text-xl p-2 rounded-lg transition-all active:scale-90"
                style={{ background: 'var(--bg-card)' }}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
            {room.petName}에게 전하고 싶은 마음을 담아보세요.
          </p>
        </div>
      )}

      {/* 입력 바 */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-t flex-shrink-0"
        style={{ height: '56px', background: 'rgba(245, 241, 234, 0.98)', borderColor: 'var(--border-card)' }}
      >
        <button
          onClick={() => {
            const opening = !showEmojiPanel;
            setShowEmojiPanel(opening);
            if (opening) track('emoji_panel_open', { chatRoomId: room.id });
          }}
          className="text-xl p-1.5 rounded-full"
          style={{ background: showEmojiPanel ? 'var(--accent-warm-bg)' : 'transparent' }}
        >
          😊
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={`${room.petName}에게 마음을 전해 보세요`}
          className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
        />
        <button
          onClick={sendMessage}
          disabled={!inputText.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all"
          style={{
            background: inputText.trim() ? 'var(--accent-warm)' : 'var(--bg-card)',
            color: inputText.trim() ? '#fff' : 'var(--text-muted)',
          }}
        >
          ▲
        </button>
      </div>
    </div>
  );
}
