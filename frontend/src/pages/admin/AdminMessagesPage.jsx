import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, MessageCircle, Mail, Phone, Search, 
  Send, Image as ImageIcon, Paperclip, CheckCircle2, Clock, 
  AlertCircle, RefreshCw, User, ShieldCheck, Trash2, Filter,
  ArrowUpRight, Eye, Sparkles, X, ChevronRight, Check, Loader2,
  ExternalLink, CornerDownLeft, CheckCheck, ArrowLeft, MoreVertical
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { uploadToImgBB } from '../../utils/imgbb';

// WhatsApp-style timestamp helper
const formatWhatsAppTimestamp = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (isYesterday) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }
};

export const AdminMessagesPage = () => {
  const { user } = useAuth();

  // Conversations List & Metrics
  const [conversations, setConversations] = useState([]);
  const [metrics, setMetrics] = useState({ total_unread: 0, total_open: 0, total_resolved: 0, total_all: 0 });
  const [loadingList, setLoadingList] = useState(true);
  
  // Selected Conversation & Messages
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'unread', 'open', 'resolved'
  
  // Reply Form State
  const [replyText, setReplyText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Canned Quick Responses
  const cannedResponses = [
    "Hello! How can we assist you with your eyewear today?",
    "Your order is currently undergoing precision optical glazing and will dispatch soon.",
    "Could you please upload a clear photo of your doctor's prescription slip?",
    "Your eye specialist appointment is confirmed. Please arrive 10 minutes prior.",
    "We have initiated your refund. It will reflect in your account within 24-48 hours."
  ];

  // Auto scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch conversations list
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (activeFilter !== 'all') params.append('filter', activeFilter);

      const res = await api.get(`/admin/messages.php?${params.toString()}`);
      if (res.success && res.data) {
        const convs = res.data.conversations || [];
        setConversations(convs);
        if (res.data.metrics) setMetrics(res.data.metrics);

        // Auto select first conversation on desktop if none selected
        if (!selectedConvId && convs.length > 0 && !silent && window.innerWidth >= 768) {
          setSelectedConvId(convs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      if (!silent) setLoadingList(false);
    }
  };

  // Fetch specific conversation details & messages
  const fetchConversationMessages = async (convId, silent = false) => {
    if (!convId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const res = await api.get(`/admin/messages.php?conversation_id=${convId}`);
      if (res.success && res.data) {
        setActiveConversation(res.data.conversation);
        setMessages(res.data.messages || []);
        
        // Mark conversation as read in local state
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_admin_count: 0 } : c));
      }
    } catch (err) {
      console.error('Failed to load conversation thread:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [activeFilter]);

  useEffect(() => {
    if (selectedConvId) {
      fetchConversationMessages(selectedConvId);
    } else {
      setActiveConversation(null);
      setMessages([]);
    }
  }, [selectedConvId]);

  // Polling every 4 seconds for live incoming messages
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true);
      if (selectedConvId) {
        fetchConversationMessages(selectedConvId, true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedConvId, searchTerm, activeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchConversations();
  };

  // Image Upload Handler
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WEBP).');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await uploadToImgBB(file);
      if (res.success && res.url) {
        setSelectedImage({
          url: res.url,
          name: file.name
        });
      } else {
        alert(res.message || 'Image upload failed. Please try again.');
      }
    } catch (err) {
      alert('Error uploading image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Send Reply Handler
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    const text = replyText.trim();
    const attachedUrl = selectedImage?.url || '';

    if (!text && !attachedUrl) return;
    if (!selectedConvId) return;

    setSendingReply(true);
    try {
      const res = await api.post('/admin/messages.php', {
        action: 'reply',
        conversation_id: selectedConvId,
        message: text,
        attachment_url: attachedUrl
      });

      if (res.success && res.data) {
        setMessages(res.data.messages || []);
        setReplyText('');
        setSelectedImage(null);
        fetchConversations(true);
      } else {
        alert(res.message || 'Failed to dispatch reply.');
      }
    } catch (err) {
      alert(err.message || 'Error sending reply to customer.');
    } finally {
      setSendingReply(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedConvId) return;
    try {
      const res = await api.post('/admin/messages.php', {
        action: 'update_status',
        conversation_id: selectedConvId,
        status: newStatus
      });
      if (res.success) {
        setActiveConversation(prev => prev ? { ...prev, status: newStatus } : null);
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, status: newStatus } : c));
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async () => {
    if (!selectedConvId) return;
    if (!window.confirm('Are you sure you want to delete this customer support thread permanently?')) return;

    try {
      const res = await api.post('/admin/messages.php', {
        action: 'delete_conversation',
        conversation_id: selectedConvId
      });
      if (res.success) {
        setSelectedConvId(null);
        setActiveConversation(null);
        fetchConversations();
      }
    } catch (err) {
      alert('Failed to delete conversation.');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto flex flex-col h-[calc(100vh-6rem)] min-h-[640px]">
      
      {/* 1. Header Bar with Real-time Counters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 glass-card bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center relative">
            <MessageCircle className="w-5 h-5 stroke-[2.4]" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Customer Live Support Desk</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold">
                WhatsApp Live View
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live customer messaging, WhatsApp escalations &amp; image verification
            </p>
          </div>
        </div>

        {/* Unread & Action Metrics */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-black">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{metrics.total_unread || 0} New Messages</span>
          </div>

          <button
            onClick={() => { fetchConversations(); if (selectedConvId) fetchConversationMessages(selectedConvId); }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
            title="Refresh Inbox"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin text-brand-cyan' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Main Inbox Workspace (WhatsApp Web 2-Column Responsive Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0 relative">
        
        {/* LEFT COLUMN: WhatsApp Chats List (Hidden on mobile when a chat is open) */}
        <div className={`md:col-span-5 lg:col-span-4 glass-card bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg flex flex-col overflow-hidden ${
          selectedConvId ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-white/10 space-y-2.5 shrink-0 bg-slate-50/70 dark:bg-white/[0.02]">
            
            {/* Real-time Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer, phone, text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800"
              />
            </form>

            {/* WhatsApp Filter Tabs */}
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'all' 
                    ? 'bg-slate-900 text-white dark:bg-brand-cyan dark:text-slate-950 font-black shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({metrics.total_all || conversations.length})
              </button>
              
              <button
                type="button"
                onClick={() => setActiveFilter('unread')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeFilter === 'unread' 
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Unread</span>
                {metrics.total_unread > 0 && (
                  <span className="min-w-[18px] h-4 px-1 rounded-full bg-emerald-700 text-white text-[9.5px] font-black flex items-center justify-center">
                    {metrics.total_unread}
                  </span>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setActiveFilter('open')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'open' 
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Open ({metrics.total_open || 0})
              </button>
              
              <button
                type="button"
                onClick={() => setActiveFilter('resolved')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeFilter === 'resolved' 
                    ? 'bg-teal-500 text-slate-950 font-black shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Resolved
              </button>
            </div>

          </div>

          {/* Conversations Scrollable WhatsApp List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 scrollbar-thin">
            {loadingList && conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-cyan" />
                Loading WhatsApp inbox...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-500" />
                No messages found.
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConvId === conv.id;
                const unreadCount = parseInt(conv.unread_admin_count, 10) || 0;
                const isUnread = unreadCount > 0;
                const displayName = conv.registered_name || conv.guest_name || 'Customer';
                const displayContact = conv.registered_phone || conv.guest_phone || conv.registered_email || conv.guest_email || 'Live Chat';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-3.5 transition-all cursor-pointer relative group flex items-start gap-3 ${
                      isSelected 
                        ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-l-4 border-emerald-500' 
                        : isUnread
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/30 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* WhatsApp Avatar with Online Badge */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-sm uppercase shadow-sm">
                        {displayName.charAt(0)}
                      </div>
                      {isUnread && (
                        <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 absolute -top-0.5 -right-0.5 animate-pulse" />
                      )}
                    </div>

                    {/* WhatsApp Chat Card Content */}
                    <div className="flex-1 min-w-0">
                      
                      {/* Top Row: Name + Time */}
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className={`text-xs truncate ${isUnread ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-800 dark:text-slate-200'}`}>
                          {displayName}
                        </h4>
                        
                        <span className={`text-[10px] font-mono shrink-0 ${isUnread ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                          {formatWhatsAppTimestamp(conv.last_message_at)}
                        </span>
                      </div>

                      {/* Middle Row: Phone / Guest Subtitle */}
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate mb-1 flex items-center gap-1">
                        <span>{displayContact}</span>
                        {conv.customer_id && (
                          <span className="text-[9px] px-1 rounded bg-brand-cyan/15 text-brand-cyan font-bold">VIP</span>
                        )}
                      </div>

                      {/* Bottom Row: Message Snippet + WhatsApp Round 1,2,3 Unread Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] truncate flex items-center gap-1 ${isUnread ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                          {conv.unread_customer_count > 0 ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{conv.last_message_text || 'Started inquiry'}</span>
                        </p>

                        {/* WhatsApp-Style Circular Green Unread Badge (1, 2, 3...) */}
                        {isUnread && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white font-black text-[10.5px] flex items-center justify-center shadow-xs shrink-0 animate-scaleIn">
                            {unreadCount}
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Active WhatsApp Live Chat Pane */}
        <div className={`md:col-span-7 lg:col-span-8 glass-card bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg flex flex-col overflow-hidden ${
          selectedConvId ? 'flex' : 'hidden md:flex'
        }`}>
          
          {selectedConvId && activeConversation ? (
            <>
              {/* WhatsApp Active Header */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-slate-950/80 shrink-0 flex items-center justify-between gap-2">
                
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile Back Button to Return to Chats List */}
                  <button
                    type="button"
                    onClick={() => setSelectedConvId(null)}
                    className="md:hidden p-2 rounded-xl bg-slate-200/80 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-300 transition-colors shrink-0"
                    title="Back to Conversations List"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="relative shrink-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-sm sm:text-base uppercase shadow-sm">
                      {(activeConversation.registered_name || activeConversation.guest_name || 'C').charAt(0)}
                    </div>
                    <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 absolute -bottom-0.5 -right-0.5"></span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      <span className="truncate">{activeConversation.registered_name || activeConversation.guest_name || 'Customer'}</span>
                      {activeConversation.customer_id && (
                        <span className="px-1.5 py-0.2 rounded-md bg-brand-cyan/20 text-brand-cyan text-[9px] font-mono font-bold shrink-0">
                          Registered
                        </span>
                      )}
                    </h3>
                    
                    <p className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Online &bull; Live Customer Session</span>
                    </p>
                  </div>
                </div>

                {/* WhatsApp Action Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  
                  {/* Direct WhatsApp Callout */}
                  {(activeConversation.registered_phone || activeConversation.guest_phone) && (
                    <a
                      href={`https://wa.me/91${(activeConversation.registered_phone || activeConversation.guest_phone).replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(activeConversation.registered_name || 'Customer')},%20this%20is%20Netra%20Unnayan%20Support.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-sm"
                      title="Open Direct WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4 fill-slate-950 stroke-none" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  )}

                  {/* Status Dropdown */}
                  <select
                    value={activeConversation.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="glass-input rounded-xl px-2 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-white/10"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleDeleteConversation}
                    className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs transition-colors cursor-pointer"
                    title="Delete Thread"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>

              {/* WhatsApp Messages Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]/30 dark:bg-[#0b141a] scrollbar-thin">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    <span>Loading messages...</span>
                  </div>
                ) : (
                  <>
                    {/* Centered Date Badge */}
                    <div className="flex justify-center my-2">
                      <span className="px-3 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[10px] font-bold shadow-xs">
                        TODAY'S CONVERSATION
                      </span>
                    </div>

                    {messages.map((msg, idx) => {
                      const isAdmin = msg.sender_type === 'admin';
                      const isBot = msg.sender_type === 'bot';

                      return (
                        <div 
                          key={msg.id || idx}
                          className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                        >
                          {/* WhatsApp Bubble */}
                          <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs shadow-xs space-y-1.5 ${
                            isAdmin
                              ? 'bg-[#005c4b] text-white rounded-tr-xs shadow-sm'
                              : isBot
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200 dark:border-white/10'
                              : 'bg-white dark:bg-[#202c33] border border-slate-200/80 dark:border-transparent text-slate-900 dark:text-white rounded-tl-xs shadow-sm'
                          }`}>
                            
                            {/* Sender Label for Bot or Multi-user */}
                            {!isAdmin && (
                              <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                {isBot ? <Sparkles className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                <span>{msg.sender_name}</span>
                              </div>
                            )}

                            {/* Message Text */}
                            {msg.message && (
                              <p className="leading-relaxed whitespace-pre-line text-xs">
                                {msg.message}
                              </p>
                            )}

                            {/* Attached Photo */}
                            {msg.attachment_url && (
                              <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 mt-1.5">
                                <img 
                                  src={msg.attachment_url} 
                                  alt="Attached proof" 
                                  className="w-full max-h-60 object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => setLightboxImage(msg.attachment_url)}
                                />
                              </div>
                            )}

                            {/* WhatsApp Timestamp & Blue Double Checkmarks */}
                            <div className={`flex items-center justify-end gap-1 text-[9px] pt-0.5 ${
                              isAdmin ? 'text-teal-200' : 'text-slate-400 dark:text-slate-400'
                            }`}>
                              <span>
                                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              {isAdmin && (
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Quick Canned Responses Bar */}
              <div className="p-2 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-white/10 overflow-x-auto flex items-center gap-1.5 scrollbar-none shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-1 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-500" /> 1-Tap Quick:
                </span>
                {cannedResponses.map((cr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReplyText(cr)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 text-[10px] font-semibold transition-all shrink-0 border border-slate-200 dark:border-white/10 text-left max-w-xs truncate cursor-pointer"
                  >
                    {cr}
                  </button>
                ))}
              </div>

              {/* Reply Input Area */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 shrink-0 space-y-2">
                
                {/* Attached Image Preview */}
                {selectedImage && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <img src={selectedImage.url} alt="Attached" className="w-8 h-8 rounded-lg object-cover" />
                      <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate font-mono">{selectedImage.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                  
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
                    disabled={uploadingImage || sendingReply}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                    title="Attach Photo / Lens Slip"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    ) : (
                      <ImageIcon className="w-4 h-4 stroke-[2.2]" />
                    )}
                  </button>

                  <input
                    type="text"
                    placeholder="Type live message to customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={sendingReply}
                    className="flex-1 glass-input rounded-xl px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-emerald-500"
                  />

                  <button
                    type="submit"
                    disabled={sendingReply || (!replyText.trim() && !selectedImage)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black disabled:opacity-40 shadow-sm shrink-0 flex items-center gap-1.5 transition-transform active:scale-95 text-xs cursor-pointer"
                  >
                    {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 stroke-[2.5]" />}
                    <span>Send</span>
                  </button>
                </form>

              </div>

            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                <MessageCircle className="w-8 h-8 stroke-[2.2]" />
              </div>
              <h3 className="text-base font-black text-slate-700 dark:text-slate-300">Netra WhatsApp Live Desk</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Tap on any customer chat on the left to enter the thread, inspect attachments, and reply instantly.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Lightbox Modal for Attached Image Zoom */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxImage} alt="Enlarged proof" className="rounded-2xl max-w-full max-h-[85vh] object-contain shadow-2xl" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 text-white hover:bg-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
