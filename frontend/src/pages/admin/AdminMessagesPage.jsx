import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, MessageCircle, Mail, Phone, Search, 
  Send, Image as ImageIcon, Paperclip, CheckCircle2, Clock, 
  AlertCircle, RefreshCw, User, ShieldCheck, Trash2, Filter,
  ArrowUpRight, Eye, Sparkles, X, ChevronRight, Check, Loader2,
  ExternalLink, CornerDownLeft
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { uploadToImgBB } from '../../utils/imgbb';

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
    "Could you please upload a clear photo of your ophthalmologist prescription slip?",
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

        // Auto select first conversation if none selected
        if (!selectedConvId && convs.length > 0 && !silent) {
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
        
        // Update unread badge in local list
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

  // Admin Send Live Reply Handler
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    const text = replyText.trim();
    const attachedUrl = selectedImage?.url || '';

    if (!selectedConvId || (!text && !attachedUrl)) return;

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
      alert(err.message || 'Error dispatching message.');
    } finally {
      setSendingReply(false);
    }
  };

  // Update Status Handler (Open / Resolved / Closed)
  const handleUpdateStatus = async (nextStatus) => {
    if (!selectedConvId) return;
    try {
      const res = await api.post('/admin/messages.php', {
        action: 'update_status',
        conversation_id: selectedConvId,
        status: nextStatus
      });
      if (res.success) {
        setActiveConversation(prev => prev ? { ...prev, status: nextStatus } : null);
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, status: nextStatus } : c));
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // Delete Conversation Handler
  const handleDeleteConversation = async () => {
    if (!selectedConvId) return;
    if (!window.confirm('Are you sure you want to permanently delete this customer chat thread?')) return;

    try {
      const res = await api.post('/admin/messages.php', {
        action: 'delete_conversation',
        conversation_id: selectedConvId
      });
      if (res.success) {
        setConversations(prev => prev.filter(c => c.id !== selectedConvId));
        setSelectedConvId(null);
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      alert('Failed to delete conversation');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-[calc(100vh-140px)] min-h-[620px] flex flex-col">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3 shrink-0">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
            Optical Client Care &amp; Support
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-brand-cyan" />
            Live Customer Messages &amp; Chat Inbox
          </h1>
        </div>

        {/* Global Quick Stats */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{metrics.total_unread || 0} Unread Live</span>
          </div>

          <button
            onClick={() => { fetchConversations(); if (selectedConvId) fetchConversationMessages(selectedConvId); }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-all text-xs flex items-center gap-1.5"
            title="Refresh Inbox"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin text-brand-cyan' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Main Inbox Workspace (Split 2-Column SaaS Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0">
        
        {/* LEFT COLUMN: Conversation Threads List (4 cols) */}
        <div className="md:col-span-5 lg:col-span-4 glass-card bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg flex flex-col overflow-hidden">
          
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-white/10 space-y-2.5 shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
            
            {/* Real-time Search */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, phone, message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs"
              />
            </form>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeFilter === 'all' 
                    ? 'bg-brand-cyan text-slate-950 font-black' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({metrics.total_all || conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('unread')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  activeFilter === 'unread' 
                    ? 'bg-emerald-500 text-slate-950 font-black' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Unread</span>
                {metrics.total_unread > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px]">
                    {metrics.total_unread}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('open')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeFilter === 'open' 
                    ? 'bg-amber-400 text-slate-950 font-black' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Open ({metrics.total_open || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('resolved')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeFilter === 'resolved' 
                    ? 'bg-teal-500 text-slate-950 font-black' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Resolved
              </button>
            </div>

          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 scrollbar-thin">
            {loadingList && conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-cyan" />
                Loading message threads...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-brand-cyan" />
                No customer messages found.
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConvId === conv.id;
                const isUnread = conv.unread_admin_count > 0;
                const displayName = conv.registered_name || conv.guest_name || 'Customer';
                const displayContact = conv.registered_phone || conv.guest_phone || conv.registered_email || conv.guest_email || 'Direct Chat';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-3.5 transition-all cursor-pointer relative group ${
                      isSelected 
                        ? 'bg-slate-100 dark:bg-white/10 border-l-4 border-brand-cyan' 
                        : isUnread
                        ? 'bg-emerald-500/10 dark:bg-emerald-950/20 hover:bg-emerald-500/15'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Unread Glowing Dot */}
                    {isUnread && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute top-3.5 right-3.5 animate-pulse shadow-sm" />
                    )}

                    <div className="flex items-start gap-3">
                      
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-2xl bg-brand-cyan/15 text-brand-cyan flex items-center justify-center font-black text-sm shrink-0 uppercase border border-brand-cyan/30">
                        {displayName.charAt(0)}
                      </div>

                      {/* Content Snippet */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                            {displayName}
                          </h4>
                        </div>

                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {displayContact}
                        </div>

                        <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate mt-1">
                          {conv.last_message_text || 'Active support thread'}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-400">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          <span>&bull;</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                            conv.status === 'resolved' 
                              ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400' 
                              : conv.status === 'in_progress'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}>
                            {conv.status}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Active Chat & Live Replay Pane (8 cols) */}
        <div className="md:col-span-7 lg:col-span-8 glass-card bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg flex flex-col overflow-hidden">
          
          {selectedConvId && activeConversation ? (
            <>
              {/* Active Conversation Top Bar */}
              <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] shrink-0 flex flex-wrap items-center justify-between gap-3">
                
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-brand-cyan/20 text-brand-cyan flex items-center justify-center font-black text-base shrink-0 border border-brand-cyan/30">
                    {(activeConversation.registered_name || activeConversation.guest_name || 'C').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{activeConversation.registered_name || activeConversation.guest_name || 'Customer'}</span>
                      {activeConversation.customer_id && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-[10px] font-mono font-bold">
                          Registered Shopper
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                      <span>{activeConversation.registered_phone || activeConversation.guest_phone || '—'}</span>
                      <span>&bull;</span>
                      <span>{activeConversation.registered_email || activeConversation.guest_email || '—'}</span>
                    </p>
                  </div>
                </div>

                {/* Shortcuts & Status Actions */}
                <div className="flex items-center gap-2">
                  
                  {/* Direct WhatsApp Callout */}
                  {(activeConversation.registered_phone || activeConversation.guest_phone) && (
                    <a
                      href={`https://wa.me/91${(activeConversation.registered_phone || activeConversation.guest_phone).replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(activeConversation.registered_name || 'Customer')},%20this%20is%20Netra%20Unnayan%20Support.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Open Direct WhatsApp Chat"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  )}

                  {/* Status Dropdown / Action */}
                  <select
                    value={activeConversation.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="glass-input rounded-xl px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-800"
                  >
                    <option value="open">Status: Open</option>
                    <option value="in_progress">Status: In Progress</option>
                    <option value="resolved">Status: Resolved</option>
                    <option value="closed">Status: Closed</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleDeleteConversation}
                    className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs transition-colors"
                    title="Delete Thread"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50 dark:bg-[#07101C]/80 scrollbar-thin">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-cyan" />
                    <span>Loading conversation history...</span>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isAdmin = msg.sender_type === 'admin';
                      const isBot = msg.sender_type === 'bot';

                      return (
                        <div 
                          key={msg.id || idx}
                          className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 px-1 flex items-center gap-1">
                            {isAdmin ? <ShieldCheck className="w-3 h-3 text-amber-500" /> : <User className="w-3 h-3 text-brand-cyan" />}
                            <span>{msg.sender_name}</span>
                          </span>

                          <div className={`max-w-[78%] rounded-2xl p-3.5 text-xs shadow-sm space-y-2 ${
                            isAdmin
                              ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-xs shadow-amber-500/10'
                              : isBot
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-300 dark:border-white/10'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-tl-xs'
                          }`}>
                            {msg.message && (
                              <p className="leading-relaxed whitespace-pre-line">{msg.message}</p>
                            )}

                            {msg.attachment_url && (
                              <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 mt-1">
                                <img 
                                  src={msg.attachment_url} 
                                  alt="Attached proof" 
                                  className="w-full max-h-56 object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => setLightboxImage(msg.attachment_url)}
                                />
                              </div>
                            )}
                          </div>

                          <span className="text-[9px] text-slate-400 px-1 mt-0.5">
                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Quick Canned Responses Bar */}
              <div className="p-2 bg-slate-100 dark:bg-slate-800/60 border-t border-slate-200 dark:border-white/10 overflow-x-auto flex items-center gap-1.5 scrollbar-none shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-1 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-cyan" /> Quick:
                </span>
                {cannedResponses.map((cr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReplyText(cr)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 hover:bg-brand-cyan hover:text-slate-950 text-slate-700 dark:text-slate-300 text-[10px] font-semibold transition-all shrink-0 border border-slate-200 dark:border-white/10 text-left max-w-xs truncate"
                  >
                    {cr}
                  </button>
                ))}
              </div>

              {/* Reply Input Area */}
              <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 shrink-0 space-y-2">
                
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
                      className="p-1 text-slate-400 hover:text-rose-500"
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
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors shrink-0 disabled:opacity-50"
                    title="Attach Image / Lens Certificate / Photo"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin text-brand-cyan" />
                    ) : (
                      <ImageIcon className="w-4 h-4 stroke-[2.2]" />
                    )}
                  </button>

                  <input
                    type="text"
                    placeholder="Type live reply to customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={sendingReply}
                    className="flex-1 glass-input rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-brand-cyan"
                  />

                  <button
                    type="submit"
                    disabled={sendingReply || (!replyText.trim() && !selectedImage)}
                    className="btn-primary px-4 py-2.5 rounded-xl text-slate-950 font-bold disabled:opacity-40 shadow-cyan-glow shrink-0 flex items-center gap-1.5 transition-transform active:scale-95 text-xs"
                  >
                    {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 stroke-[2.5]" />}
                    <span>Reply Live</span>
                  </button>
                </form>

              </div>

            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 mb-3 text-brand-cyan opacity-30" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Select a Conversation Thread</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Choose a customer from the left inbox queue to view live chat history and reply in real time.
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
