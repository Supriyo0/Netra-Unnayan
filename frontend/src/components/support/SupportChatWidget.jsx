import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, MessageCircle, Mail, Phone, Send, 
  Image as ImageIcon, Paperclip, X, Minimize2, Maximize2, 
  Sparkles, Bot, ShieldCheck, CheckCircle2, Clock, Loader2,
  ChevronRight, ArrowUpRight, HelpCircle, User, RefreshCw, Eye
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { uploadToImgBB } from '../../utils/imgbb';

// Preset intelligent Bot Knowledge Base
const BOT_TOPICS = [
  {
    id: 'track_order',
    icon: '📦',
    title: 'Track My Order',
    question: 'How do I track my eyewear order status?',
    answer: 'You can track your order live anytime by visiting our Track Order page with your Order Number (e.g. #NU-9821) or phone number. Orders typically take 2-4 business days for single vision and 3-5 days for progressive lens fitting.',
    action: { label: 'Open Track Order', link: '/track' }
  },
  {
    id: 'doctor_appointment',
    icon: '🩺',
    title: 'Doctor & Clinic Booking',
    question: 'How do I book an eye specialist consultation or home eye checkup?',
    answer: 'We have renowned ophthalmologists and optometrists available at our clinic and for doorstep Home Eye Testing. You can select your preferred specialist and time slot instantly!',
    action: { label: 'View Doctors & Book', link: '/doctors' }
  },
  {
    id: 'rx_power',
    icon: '👓',
    title: 'Prescription & Power Advice',
    question: 'How do I submit or update my eye prescription?',
    answer: 'You can upload a clear photo of your doctor slip during checkout, save it in your Optical Health Vault under your Account, or email it to us at netraunnayan@gmail.com with your Order ID.',
    action: { label: 'My Prescription Vault', link: '/account?tab=prescriptions' }
  },
  {
    id: 'lens_coatings',
    icon: '🔬',
    title: 'Lens Coatings & Blue Cut',
    question: 'What types of lens options are available?',
    answer: 'We offer Premium Blue-Cut Digital Protection, Zero-Glare Anti-Reflective, High-Index Ultra Thin (1.61 / 1.67), Photochromic Auto-Tint Transitions, and Progressive Multifocal lenses.'
  },
  {
    id: 'returns_warranty',
    icon: '🛡️',
    title: 'Returns & 1-Year Warranty',
    question: 'What is your return policy and frame warranty?',
    answer: 'Every Netra Unnayan spectacle comes with a 14-day hassle-free replacement guarantee and a 1-year comprehensive frame & anti-peel coating warranty. For any damages, we offer direct replacement.'
  },
  {
    id: 'talk_human',
    icon: '👨‍💼',
    title: 'Talk to Live Admin / Staff',
    question: 'Connect me with a live support executive right now.',
    answer: 'Connecting you immediately with our Netra Unnayan Live Admin Desk. Please send your message or attach photo below!'
  }
];

export const SupportChatWidget = ({ 
  isOpen = false, 
  onClose = () => {}, 
  isEmbedded = false,
  startInLiveMode = false 
}) => {
  const { user } = useAuth();
  
  // Widget State
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Mode: 'bot' (Bot Q&A Assistant) or 'live' (Direct Admin Chat)
  const [chatMode, setChatMode] = useState(startInLiveMode ? 'live' : 'bot');
  const [queryCount, setQueryCount] = useState(0); // Tracks 5 distinct questions before auto-escalation
  const [isEscalated, setIsEscalated] = useState(startInLiveMode);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });
  const [showGuestForm, setShowGuestForm] = useState(!user && chatMode === 'live');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatMode]);

  // Load existing conversation on open
  useEffect(() => {
    if (isOpen || isEmbedded) {
      loadActiveConversation();
    }
  }, [isOpen, isEmbedded, user]);

  // Polling for live admin replies when in live mode
  useEffect(() => {
    if (!isOpen && !isEmbedded) return;
    if (chatMode !== 'live' || !conversationId) return;

    const interval = setInterval(() => {
      fetchLatestMessages(conversationId);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, isEmbedded, chatMode, conversationId]);

  const loadActiveConversation = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/support/index.php');
      if (res.success && res.data?.conversation) {
        setConversationId(res.data.conversation.id);
        setMessages(res.data.messages || []);
        setChatMode('live');
        setIsEscalated(true);
      } else {
        // Initial bot welcoming messages
        if (messages.length === 0) {
          setMessages([
            {
              id: 'init-1',
              sender_type: 'bot',
              sender_name: 'Netra Optical AI',
              message: `Hello ${user?.full_name ? user.full_name.split(' ')[0] : 'there'}! 👋 Welcome to Netra Unnayan Customer Care. How can we assist with your eyewear or appointments today?`,
              created_at: new Date().toISOString()
            }
          ]);
        }
      }
    } catch (err) {
      console.warn('Support history lookup error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchLatestMessages = async (convId) => {
    if (!convId) return;
    try {
      const res = await api.get(`/support/index.php?conversation_id=${convId}`);
      if (res.success && res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.warn('Polling error:', err);
    }
  };

  // Handle clicking a Bot Topic Pill
  const handleSelectTopic = (topic) => {
    const nextCount = queryCount + 1;
    setQueryCount(nextCount);

    // 1. Add user query message
    const userMsg = {
      id: `usr-${Date.now()}`,
      sender_type: 'customer',
      sender_name: user?.full_name || 'You',
      message: topic.question,
      created_at: new Date().toISOString()
    };

    // 2. Add bot answer message
    const botMsg = {
      id: `bot-${Date.now() + 1}`,
      sender_type: 'bot',
      sender_name: 'Netra Optical AI',
      message: topic.answer,
      action: topic.action,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg, botMsg]);

    // Check Escalation condition: 5 queries reached OR user clicked "Talk to Live Human"
    if (nextCount >= 5 || topic.id === 'talk_human') {
      triggerEscalationToAdmin([userMsg, botMsg], `Customer inquiry: ${topic.title}`);
    }
  };

  // Escalate to Live Admin Desk
  const triggerEscalationToAdmin = async (recentMsgs = [], subject = 'Live Customer Inquiry') => {
    setIsEscalated(true);
    setChatMode('live');

    const escalationNotice = {
      id: `sys-${Date.now()}`,
      sender_type: 'bot',
      sender_name: 'Netra Support Desk',
      message: '🔔 You are now connected to the Netra Unnayan Live Admin Desk! An optical administrator has received your session and can reply to your messages directly.',
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, escalationNotice]);

    // Send initial escalation message to backend to create support ticket in database
    try {
      const res = await api.post('/support/index.php', {
        action: 'send_message',
        conversation_id: conversationId || 0,
        message: `[AI Escalation] Customer started live chat session after ${queryCount + 1} queries.`,
        subject: subject,
        guest_name: guestInfo.name,
        guest_email: guestInfo.email,
        guest_phone: guestInfo.phone,
        is_bot: 1
      });

      if (res.success && res.data?.conversation_id) {
        setConversationId(res.data.conversation_id);
      }
    } catch (err) {
      console.error('Escalation creation failed:', err);
    }
  };

  // Image Upload Handler
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WEBP).');
      return;
    }

    setUploadingImg(true);
    try {
      const res = await uploadToImgBB(file);
      if (res.success && res.url) {
        setSelectedFile({
          url: res.url,
          name: file.name
        });
      } else {
        alert(res.message || 'Image upload failed. Please try again.');
      }
    } catch (err) {
      alert('Error uploading image: ' + err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  // Send Message Handler
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    const attachedUrl = selectedFile?.url || '';

    if (!text && !attachedUrl) return;

    // If still in bot mode and user typed a freeform message
    if (chatMode === 'bot') {
      const nextCount = queryCount + 1;
      setQueryCount(nextCount);

      const userMsg = {
        id: `usr-${Date.now()}`,
        sender_type: 'customer',
        sender_name: user?.full_name || 'You',
        message: text || '[Sent an image]',
        attachment_url: attachedUrl,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMsg]);
      setInputText('');
      setSelectedFile(null);

      if (nextCount >= 5) {
        triggerEscalationToAdmin([userMsg], `Live Customer Inquiry: "${text.substring(0, 40)}..."`);
        return;
      } else {
        // Bot smart acknowledgment
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: `bot-${Date.now()}`,
              sender_type: 'bot',
              sender_name: 'Netra Optical AI',
              message: `Thank you for your question! We have logged "${text}". Choose a topic below or tap "Talk to Live Admin" anytime to message our executive directly.`,
              created_at: new Date().toISOString()
            }
          ]);
        }, 600);
        return;
      }
    }

    // Live Mode: Direct Message to Database & Admin
    setSending(true);
    try {
      const res = await api.post('/support/index.php', {
        action: 'send_message',
        conversation_id: conversationId || 0,
        message: text,
        attachment_url: attachedUrl,
        guest_name: guestInfo.name,
        guest_email: guestInfo.email,
        guest_phone: guestInfo.phone,
        subject: `Live Support Inquiry - ${user?.full_name || guestInfo.name || 'Shopper'}`
      });

      if (res.success && res.data) {
        setConversationId(res.data.conversation_id);
        setMessages(res.data.messages || []);
        setInputText('');
        setSelectedFile(null);
      } else {
        alert(res.message || 'Failed to send message.');
      }
    } catch (err) {
      alert(err.message || 'Could not send message. Please check connection.');
    } finally {
      setSending(false);
    }
  };

  const containerClasses = isEmbedded
    ? "w-full rounded-3xl bg-white dark:bg-[#0A192F] border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col h-[600px]"
    : "fixed bottom-5 right-5 z-[999] w-[95vw] sm:w-[420px] max-w-[440px] rounded-3xl bg-white dark:bg-[#0A192F] border border-slate-200 dark:border-white/20 shadow-2xl overflow-hidden flex flex-col h-[580px] sm:h-[640px] max-h-[90vh] animate-slideUp";

  return (
    <div className={containerClasses}>
      
      {/* 1. Header with Direct Contact Shortcuts */}
      <div className="bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-700 dark:from-slate-950 dark:via-brand-dark dark:to-slate-900 text-white p-4 shrink-0 border-b border-cyan-500/30 dark:border-white/10 space-y-3 shadow-sm">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 dark:bg-brand-cyan/20 border border-white/30 dark:border-brand-cyan/30 flex items-center justify-center text-white dark:text-brand-cyan relative shadow-inner">
              <MessageSquare className="w-5 h-5 stroke-[2.4]" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 absolute -top-0.5 -right-0.5 ring-2 ring-cyan-800 dark:ring-slate-950 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>Netra Support &amp; Care</span>
                <span className="px-1.5 py-0.5 rounded-md bg-white/20 dark:bg-brand-cyan/20 text-white dark:text-brand-cyan text-[9px] font-mono font-bold">
                  {chatMode === 'live' ? 'LIVE ADMIN DESK' : 'OPTICAL AI'}
                </span>
              </h3>
              <p className="text-[11px] text-cyan-100 dark:text-slate-300 font-medium">
                Direct Help &bull; WhatsApp &bull; Email
              </p>
            </div>
          </div>

          {!isEmbedded && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              title="Close Support Window"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2. DIRECT WHATSAPP & MAIL ONE-CLICK BUTTONS */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href="https://wa.me/919382293614?text=Hi%20Netra%20Unnayan%20Team,%20I%20need%20assistance%20with%20an%20eyewear%20order%20or%20eye%20care."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-slate-950 font-black text-xs transition-all shadow-sm group"
          >
            <MessageCircle className="w-4 h-4 fill-slate-950 stroke-none" />
            <span>Direct WhatsApp</span>
          </a>

          <a
            href="mailto:netraunnayan@gmail.com?subject=Netra%20Unnayan%20Customer%20Support%20Inquiry"
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs transition-all shadow-sm group"
          >
            <Mail className="w-4 h-4 stroke-[2.4] text-cyan-700" />
            <span>Direct Email</span>
          </a>
        </div>
      </div>

      {/* Mode Switcher Bar */}
      <div className="bg-slate-100 dark:bg-slate-800/90 px-4 py-2 flex items-center justify-between border-b border-slate-200 dark:border-white/5 text-[11px] font-bold">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setChatMode('bot')}
            className={`px-3 py-1 rounded-lg transition-all ${
              chatMode === 'bot' 
                ? 'bg-brand-cyan text-slate-950 font-black shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🤖 AI Q&amp;A Assistant ({queryCount}/5)
          </button>
          <button
            type="button"
            onClick={() => { setChatMode('live'); setIsEscalated(true); }}
            className={`px-3 py-1 rounded-lg transition-all ${
              chatMode === 'live' 
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            👨‍💼 Live Admin Chat
          </button>
        </div>

        {chatMode === 'live' && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Admin Live</span>
          </span>
        )}
      </div>

      {/* 3. Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50 dark:bg-[#07101C] scrollbar-thin">
        
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-cyan" />
            <span>Loading support conversation...</span>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isUser = msg.sender_type === 'customer';
              const isBot = msg.sender_type === 'bot';
              const isAdmin = msg.sender_type === 'admin';

              // Sanitize sender name display
              let senderDisplayName = msg.sender_name || (isUser ? 'You' : 'Netra Support');
              if (senderDisplayName.includes('Mahapatra') && isUser) {
                senderDisplayName = user?.full_name || 'Customer';
              }

              return (
                <div 
                  key={msg.id || index}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender Tag */}
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1 px-1 flex items-center gap-1">
                    {isBot && <Bot className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />}
                    {isAdmin && <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                    {isUser && <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                    <span>{senderDisplayName}</span>
                  </span>

                  {/* Message Bubble */}
                  <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-sm space-y-2 ${
                    isUser
                      ? 'bg-gradient-to-r from-brand-cyan to-teal-400 text-slate-950 font-bold rounded-tr-xs shadow-xs'
                      : isAdmin
                      ? 'bg-amber-500/15 border border-amber-500/30 text-slate-900 dark:text-amber-100 rounded-tl-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-tl-xs shadow-xs'
                  }`}>
                    
                    {/* Text */}
                    {msg.message && (
                      <p className="leading-relaxed whitespace-pre-line text-slate-900 dark:text-slate-100 font-medium">{msg.message}</p>
                    )}

                    {/* Image Attachment */}
                    {msg.attachment_url && (
                      <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 mt-1.5">
                        <img 
                          src={msg.attachment_url} 
                          alt="Attachment" 
                          className="w-full max-h-48 object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(msg.attachment_url, '_blank')}
                        />
                      </div>
                    )}

                    {/* Action Button inside Bot Answer (Vibrant Luminous Cyan Pill) */}
                    {msg.action && (
                      <a
                        href={msg.action.link}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-cyan to-teal-400 text-slate-950 font-black text-[11px] shadow-sm hover:brightness-105 hover:scale-102 transition-all mt-1"
                      >
                        <span>{msg.action.label}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[9px] text-slate-400 px-1 mt-0.5 font-mono">
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              );
            })}

            {/* Quick Bot FAQ Suggestions (Visible in Bot mode or when conversation is fresh) */}
            {chatMode === 'bot' && (
              <div className="pt-2 space-y-2">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-cyan" />
                  <span>Frequently Asked Optical Questions</span>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {BOT_TOPICS.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => handleSelectTopic(topic)}
                      className="text-left p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 transition-all flex items-center justify-between gap-2 group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{topic.icon}</span>
                        <span className="text-xs font-bold truncate group-hover:text-cyan-700 dark:group-hover:text-brand-cyan">{topic.title}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}

      </div>

      {/* 4. Footer Input & Image Attachment */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 shrink-0 space-y-2">
        
        {/* Selected Image Thumbnail Preview */}
        {selectedFile && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
            <div className="flex items-center gap-2 truncate">
              <img src={selectedFile.url} alt="Upload" className="w-8 h-8 rounded-lg object-cover" />
              <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate font-mono">{selectedFile.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          
          {/* Image Upload Trigger */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            className="hidden" 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImg || sending}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            title="Attach Prescription or Defect Photo"
          >
            {uploadingImg ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand-cyan" />
            ) : (
              <ImageIcon className="w-4 h-4 stroke-[2.2]" />
            )}
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder={chatMode === 'live' ? "Type message to Admin..." : "Ask a question or type message..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            className="flex-1 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={sending || (!inputText.trim() && !selectedFile)}
            className="p-2.5 rounded-xl bg-gradient-to-r from-brand-cyan to-teal-400 text-slate-950 font-bold disabled:opacity-40 shadow-sm shrink-0 transition-transform active:scale-95 cursor-pointer"
            title="Send Message"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1 font-mono">
          <span>Helpline: <strong>+91 9382293614</strong></span>
          <span>netraunnayan@gmail.com</span>
        </div>
      </div>

    </div>
  );
};
