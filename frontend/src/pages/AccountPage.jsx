import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  User, Package, FileText, MapPin, Calendar, Eye, EyeOff,
  LogOut, Shield, Plus, Check, Clock, ChevronRight, X, 
  ExternalLink, Truck, CheckCircle2, AlertCircle, Phone, 
  Home as HomeIcon, Stethoscope, Trash2, Star, Sparkles, Edit2,
  Upload, Camera, Lock, Save, Key, Award, Glasses, Heart, RefreshCw,
  MessageCircle, MessageSquare, Tag, Mail, HelpCircle, Bot
} from 'lucide-react';
import api from '../api/client';
import { uploadToImgBB } from '../utils/imgbb';
import { useAuth } from '../context/AuthContext';
import { InvoiceModal } from '../components/common/InvoiceModal';
import { SupportChatWidget } from '../components/support/SupportChatWidget';

export const AccountPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, updateUser } = useAuth();

  // Tab state synced with URL ?tab=
  const initialTab = searchParams.get('tab') || 'orders';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [orders, setOrders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [bookings, setBookings] = useState({ doctor_appointments: [], home_visits: [] });
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invoiceModalData, setInvoiceModalData] = useState(null);

  // Address Modal State (Add & Edit)
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [savingAddr, setSavingAddr] = useState(false);
  const [addrForm, setAddrForm] = useState({
    recipient_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    address_type: 'HOME',
    is_default: false
  });

  // New Prescription Modal
  const [addRxOpen, setAddRxOpen] = useState(false);
  const [newRxLabel, setNewRxLabel] = useState('');
  const [rSph, setRSph] = useState('');
  const [rCyl, setRCyl] = useState('');
  const [rAxis, setRAxis] = useState('');
  const [rPd, setRPd] = useState('');
  const [lSph, setLSph] = useState('');
  const [lCyl, setLCyl] = useState('');
  const [lAxis, setLAxis] = useState('');
  const [lPd, setLPd] = useState('');
  const [rxNotes, setRxNotes] = useState('');

  // Customer Order Cancellation State
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReasonOption, setCancelReasonOption] = useState('Change of mind / Found alternative');
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState({ type: '', text: '' });

  // Customer Prescription Update State
  const [rxUpdateModalOpen, setRxUpdateModalOpen] = useState(false);
  const [rxUpdateOrder, setRxUpdateOrder] = useState(null);
  const [rxUpdateFileUrl, setRxUpdateFileUrl] = useState('');
  const [uploadingUpdateRx, setUploadingUpdateRx] = useState(false);
  const [rxUpdateNotes, setRxUpdateNotes] = useState('');
  const [submittingRxUpdate, setSubmittingRxUpdate] = useState(false);

  const handleUploadNewSlip = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingUpdateRx(true);
    try {
      const res = await uploadToImgBB(file);
      if (res.success && res.url) {
        setRxUpdateFileUrl(res.url);
      } else {
        alert(res.message || 'Failed to upload slip image');
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploadingUpdateRx(false);
    }
  };

  const handleConfirmRxUpdate = async (e) => {
    e.preventDefault();
    if (!rxUpdateOrder) return;
    setSubmittingRxUpdate(true);
    try {
      const res = await api.post('/orders/update_prescription.php', {
        order_id: rxUpdateOrder.id,
        method: rxUpdateFileUrl ? 'IMAGE_UPLOAD' : 'FORM',
        rx_image_url: rxUpdateFileUrl || null,
        file_url: rxUpdateFileUrl || null,
        notes: rxUpdateNotes.trim() || 'Updated prescription slip submitted by customer'
      });
      if (res.success || res.data?.success) {
        setCancelFeedback({
          type: 'success',
          text: `Updated prescription received for Order #${rxUpdateOrder.order_number}! Our optometrist will review it shortly.`
        });
        setRxUpdateModalOpen(false);
        setRxUpdateOrder(null);
        setRxUpdateFileUrl('');
        setRxUpdateNotes('');
        // Refresh orders
        const ordRes = await api.get('/orders/my_orders.php');
        if (ordRes.success) setOrders(ordRes.data || []);
      } else {
        alert(res.message || 'Failed to update prescription');
      }
    } catch (err) {
      alert(err.message || 'Error updating prescription');
    } finally {
      setSubmittingRxUpdate(false);
    }
  };

  const handleCancelCustomerOrder = async (e) => {
    e.preventDefault();
    if (!cancelModalOrder) return;
    const finalReason = cancelReasonOption === 'Other' 
      ? (cancelCustomReason.trim() || 'Customer requested online cancellation')
      : cancelReasonOption + (cancelCustomReason.trim() ? `: ${cancelCustomReason.trim()}` : '');

    try {
      setCancellingOrder(true);
      const res = await api.post('/orders/cancel.php', {
        order_number: cancelModalOrder.order_number,
        reason: finalReason
      });
      if (res.success) {
        setCancelFeedback({ type: 'success', text: res.message || 'Order successfully cancelled and stock restored.' });
        setCancelModalOrder(null);
        setCancelCustomReason('');
        // Refresh orders
        const ordRes = await api.get('/orders/my_orders.php');
        if (ordRes.success) setOrders(ordRes.data || []);
      } else {
        alert(res.message || 'Could not cancel order.');
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel order.');
    } finally {
      setCancellingOrder(false);
    }
  };

  // Customer Profile Form State
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    alternate_phone: '',
    gender: 'Unisex',
    dob: '',
    optical_preference: 'Prescription Eyeglasses',
    avatar_url: user?.avatar_url || ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState({ type: '', message: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Preset Designer Avatars
  const presetAvatars = [
    { name: 'Executive Blue', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
    { name: 'Smart Titanium', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
    { name: 'Chic Cat-Eye', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80' },
    { name: 'Classic Aviator', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
    { name: 'Doctor Specialist', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80' },
    { name: 'Minimalist Wave', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80' }
  ];

  // Sync tab change with URL query param
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadAllAccountData = async () => {
      setLoading(true);
      try {
        const [ordRes, rxRes, bookRes, addrRes, profRes] = await Promise.allSettled([
          api.get('/orders/my_orders.php'),
          api.get('/prescriptions/list.php'),
          api.get('/account/bookings.php'),
          api.get('/account/addresses.php'),
          api.get('/account/profile.php')
        ]);

        if (ordRes.status === 'fulfilled' && ordRes.value?.success) {
          setOrders(ordRes.value.data || []);
        }
        if (rxRes.status === 'fulfilled' && rxRes.value?.success) {
          setPrescriptions(rxRes.value.data || []);
        }
        if (bookRes.status === 'fulfilled' && bookRes.value?.success) {
          setBookings(bookRes.value.data || { doctor_appointments: [], home_visits: [] });
        }
        if (addrRes.status === 'fulfilled' && addrRes.value?.success) {
          setAddresses(addrRes.value.data || []);
        }
        if (profRes.status === 'fulfilled' && profRes.value?.success && profRes.value.data) {
          const d = profRes.value.data;
          setProfileForm({
            full_name: d.full_name || '',
            email: d.email || '',
            phone: d.phone || '',
            alternate_phone: d.alternate_phone || '',
            gender: d.gender || 'Unisex',
            dob: d.dob || '',
            optical_preference: d.optical_preference || 'Prescription Eyeglasses',
            avatar_url: d.avatar_url || ''
          });
        }
      } catch (err) {
        console.error('Error fetching account data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllAccountData();
  }, [user, navigate]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileFeedback({ type: '', message: '' });
    try {
      const res = await api.post('/account/profile.php', profileForm);
      if (res.success) {
        setProfileFeedback({ type: 'success', message: 'Profile details updated successfully!' });
        if (updateUser) {
          updateUser(res.data);
        }
        setTimeout(() => setProfileFeedback({ type: '', message: '' }), 4000);
      } else {
        setProfileFeedback({ type: 'error', message: res.message || 'Failed to update profile' });
      }
    } catch (err) {
      setProfileFeedback({ type: 'error', message: err.message || 'Error updating profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordFeedback({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    setPasswordSaving(true);
    setPasswordFeedback({ type: '', message: '' });
    try {
      const res = await api.post('/account/profile.php', {
        action: 'change_password',
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      if (res.success) {
        setPasswordFeedback({ type: 'success', message: 'Password updated successfully!' });
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        setTimeout(() => setPasswordFeedback({ type: '', message: '' }), 5000);
      } else {
        setPasswordFeedback({ type: 'error', message: res.message || 'Failed to update password.' });
      }
    } catch (err) {
      setPasswordFeedback({ type: 'error', message: err.message || 'Error updating password.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setProfileFeedback({ type: '', message: '' });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload_imgbb.php', formData);
      if (res.success && res.data?.url) {
        const newUrl = res.data.url;
        setProfileForm(prev => ({ ...prev, avatar_url: newUrl }));
        // Automatically persist to backend database immediately so it never disappears
        try {
          const saveRes = await api.post('/account/profile.php', {
            ...profileForm,
            avatar_url: newUrl
          });
          if (saveRes.success) {
            updateUser({ avatar_url: newUrl });
            setProfileFeedback({ type: 'success', message: 'Profile photo updated and saved permanently!' });
            setTimeout(() => setProfileFeedback({ type: '', message: '' }), 4000);
          }
        } catch {
          setProfileFeedback({ type: 'success', message: 'Photo uploaded! Click "Save Profile Changes" below to confirm.' });
        }
      } else {
        setProfileFeedback({ type: 'error', message: res.message || 'Image upload failed. Please try again.' });
      }
    } catch (err) {
      setProfileFeedback({ type: 'error', message: err.message || 'Upload error. Please check your image file.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSelectPresetAvatar = async (url) => {
    setProfileForm(prev => ({ ...prev, avatar_url: url }));
    try {
      const saveRes = await api.post('/account/profile.php', {
        ...profileForm,
        avatar_url: url
      });
      if (saveRes.success) {
        updateUser({ avatar_url: url });
        setProfileFeedback({ type: 'success', message: 'Avatar updated successfully!' });
        setTimeout(() => setProfileFeedback({ type: '', message: '' }), 4000);
      }
    } catch {}
  };

  const handleRemoveAvatar = async () => {
    setProfileForm(prev => ({ ...prev, avatar_url: '' }));
    try {
      const saveRes = await api.post('/account/profile.php', {
        ...profileForm,
        avatar_url: ''
      });
      if (saveRes.success) {
        updateUser({ avatar_url: '' });
        setProfileFeedback({ type: 'success', message: 'Profile photo removed.' });
        setTimeout(() => setProfileFeedback({ type: '', message: '' }), 4000);
      }
    } catch {}
  };

  // Refresh addresses
  const refreshAddresses = async () => {
    try {
      const res = await api.get('/account/addresses.php');
      if (res.success) setAddresses(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Add / Edit Address Handler
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setSavingAddr(true);
    try {
      let res;
      if (editingAddressId) {
        res = await api.put('/account/addresses.php', {
          id: editingAddressId,
          action: 'update',
          ...addrForm
        });
      } else {
        res = await api.post('/account/addresses.php', addrForm);
      }

      if (res.success) {
        setAddressModalOpen(false);
        setEditingAddressId(null);
        setAddrForm({
          recipient_name: '',
          phone: '',
          address_line1: '',
          address_line2: '',
          landmark: '',
          city: '',
          state: '',
          pincode: '',
          address_type: 'HOME',
          is_default: false
        });
        await refreshAddresses();
      } else {
        alert(res.message || 'Failed to save address');
      }
    } catch (err) {
      alert(err.message || 'Failed to save address');
    } finally {
      setSavingAddr(false);
    }
  };

  // Set Address as Default
  const handleSetDefault = async (addrId) => {
    try {
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === addrId ? 1 : 0 })));
      const res = await api.post('/account/addresses.php', { action: 'set_default', id: addrId });
      if (res.success) {
        await refreshAddresses();
      }
    } catch (err) {
      console.error(err);
      await refreshAddresses();
    }
  };

  // Delete Address
  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Are you sure you want to remove this delivery address?')) return;
    try {
      setAddresses(prev => prev.filter(a => a.id !== addrId));
      const res = await api.post('/account/addresses.php', { action: 'delete', id: addrId });
      if (!res.success) {
        // Fallback to delete method
        await api.delete(`/account/addresses.php?id=${addrId}`);
      }
      await refreshAddresses();
    } catch (err) {
      console.error('Failed to delete address:', err);
      await refreshAddresses();
    }
  };

  // Save Prescription Handler
  const handleSavePrescription = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/prescriptions/save.php', {
        label: newRxLabel,
        right_sph: parseFloat(rSph) || 0,
        right_cyl: parseFloat(rCyl) || 0,
        right_axis: parseInt(rAxis) || 0,
        right_pd: parseFloat(rPd) || null,
        left_sph: parseFloat(lSph) || 0,
        left_cyl: parseFloat(lCyl) || 0,
        left_axis: parseInt(lAxis) || 0,
        left_pd: parseFloat(lPd) || null,
        notes: rxNotes
      });
      if (res.success) {
        setAddRxOpen(false);
        const rxRes = await api.get('/prescriptions/list.php');
        if (rxRes.success) setPrescriptions(rxRes.data || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to save prescription');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  const totalBookingsCount = (bookings.doctor_appointments?.length || 0) + (bookings.home_visits?.length || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Profile Overview Header */}
      <div className="glass-card bg-white/95 dark:bg-[#071322]/95 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border border-slate-200 dark:border-white/10 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-2 border-brand-cyan shadow-cyan-glow bg-gradient-to-tr from-brand-cyan to-brand-teal flex items-center justify-center text-slate-950 font-black text-3xl">
              {profileForm.avatar_url || user.avatar_url ? (
                <img 
                  src={profileForm.avatar_url || user.avatar_url} 
                  alt={user.full_name || 'Customer Avatar'} 
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <span>{user.full_name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <button
              onClick={() => handleTabChange('profile')}
              className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-slate-950 shadow-md transition-transform hover:scale-110"
              title="Change Profile Picture"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-teal-700 dark:text-brand-teal uppercase font-black tracking-widest bg-teal-500/15 px-2.5 py-0.5 rounded-full border border-teal-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Verified Optical Profile</span>
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-black tracking-widest bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span>Netra Club Gold Tier</span>
              </span>
              {user.role === 'admin' && (
                <span className="text-[10px] text-cyan-700 dark:text-cyan-300 uppercase font-black tracking-widest bg-cyan-500/15 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                  Staff Administrator
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {profileForm.full_name || user.full_name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-slate-900 dark:text-white font-bold">
                <Phone className="w-3.5 h-3.5 text-brand-cyan" />
                {profileForm.phone || user.phone || 'No phone'}
              </span>
              <span>&bull;</span>
              <span>{profileForm.email || user.email || 'No email'}</span>
              <span>&bull;</span>
              <span className="text-cyan-600 dark:text-brand-cyan font-bold">ID: #NU-CUST-{user.id}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats & Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-3 self-stretch lg:self-auto justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-white/10">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div 
              onClick={() => handleTabChange('orders')}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer hover:border-brand-cyan transition-all"
            >
              <div className="text-base font-black text-slate-900 dark:text-white font-mono">{orders.length}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase">Orders</div>
            </div>
            <div 
              onClick={() => handleTabChange('prescriptions')}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer hover:border-brand-cyan transition-all"
            >
              <div className="text-base font-black text-brand-cyan font-mono">{prescriptions.length}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase">Rx Vault</div>
            </div>
            <div 
              onClick={() => handleTabChange('bookings')}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer hover:border-brand-cyan transition-all"
            >
              <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">{totalBookingsCount}</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase">Bookings</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="btn-primary text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-cyan-glow font-bold"
              >
                <Shield className="w-3.5 h-3.5" /> Staff Panel
              </Link>
            )}
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-600 dark:text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Sign out of account"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-white/10 text-xs scrollbar-none">
        <button
          onClick={() => handleTabChange('orders')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'orders' ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow' : 'glass-nav-pill text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" /> My Orders ({orders.length})
        </button>

        <button
          onClick={() => handleTabChange('bookings')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'bookings' ? 'bg-emerald-400 text-slate-950 shadow-emerald-glow' : 'glass-nav-pill text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" /> My Bookings ({totalBookingsCount})
          {bookings.doctor_appointments?.some(b => b.status === 'Pending') && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('addresses')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'addresses' ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow' : 'glass-nav-pill text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" /> Saved Addresses ({addresses.length})
        </button>

        <button
          onClick={() => handleTabChange('prescriptions')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'prescriptions' ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow' : 'glass-nav-pill text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> Optical Health Vault ({prescriptions.length})
        </button>

        <button
          onClick={() => handleTabChange('profile')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'profile' ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow' : 'glass-nav-pill text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
          }`}
        >
          <User className="w-4 h-4" /> Profile &amp; Settings
        </button>

        <button
          onClick={() => handleTabChange('support')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'support' ? 'bg-gradient-to-r from-brand-cyan to-teal-400 text-slate-950 font-black shadow-cyan-glow' : 'glass-nav-pill text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-500" /> Helpdesk &amp; Live Chat
        </button>
      </div>

      {/* TAB 1: MY ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {cancelFeedback.text && (
            <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold ${
              cancelFeedback.type === 'success' 
                ? 'bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-300' 
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500" />
                <span>{cancelFeedback.text}</span>
              </div>
              <button onClick={() => setCancelFeedback({ type: '', text: '' })} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {orders.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center space-y-3 border border-slate-200 dark:border-white/10">
              <Package className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Eyewear Orders Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Discover our collection of prescription frames and polarized sunglasses.</p>
              <Link to="/catalog" className="btn-primary text-xs py-2 px-4 inline-flex">
                Shop Eyewear Now
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => {
                const rejectionHistory = ord.status_history?.find(h => h.note && h.note.includes('Cancellation Request Rejected'));
                const rejectionNote = rejectionHistory?.note?.replace('Cancellation Request Rejected:', '').trim() || (ord.notes?.includes('[Cancellation Rejected by Admin]:') ? ord.notes.split('[Cancellation Rejected by Admin]:')[1]?.trim() : '');

                return (
                  <div key={ord.id} className="glass-card rounded-2xl p-5 space-y-4 border border-slate-200 dark:border-white/10 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold">Order Number</div>
                        <Link to={`/order-tracking?order=${ord.order_number}`} className="font-extrabold text-slate-900 dark:text-white text-base hover:text-cyan-600 dark:hover:text-brand-cyan transition-colors flex items-center gap-1.5">
                          {ord.order_number}
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </Link>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                          ord.order_status === 'Delivered' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30' :
                          ord.order_status === 'Shipped' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30' :
                          ord.order_status === 'Cancelled' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30' :
                          ord.order_status === 'Processing' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30' :
                          ord.order_status === 'Pending' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30' :
                          'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            ord.order_status === 'Delivered' ? 'bg-emerald-500' :
                            ord.order_status === 'Shipped' ? 'bg-blue-500' :
                            ord.order_status === 'Cancelled' ? 'bg-rose-500' :
                            ord.order_status === 'Pending' ? 'bg-amber-500 animate-pulse' :
                            'bg-cyan-500'
                          }`} />
                          {ord.order_status === 'Pending' ? 'Pending Confirmation' : ord.order_status}
                        </span>

                        {ord.prescription_status === 'Needs Clarification' && (
                          <span className="px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 bg-rose-600 text-white shadow-sm animate-pulse border border-rose-700">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Prescription Clarification Required</span>
                          </span>
                        )}

                        {ord.prescription_status === 'Approved' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Rx Approved for Lab</span>
                          </span>
                        )}

                        <Link 
                          to={`/order-tracking?order=${ord.order_number}`}
                          className="btn-secondary text-[11px] py-1.5 px-3 rounded-lg flex items-center gap-1 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-white/15"
                        >
                          <Truck className="w-3.5 h-3.5 text-brand-cyan" /> Track Shipment
                        </Link>
                      </div>
                    </div>

                    {/* PRESCRIPTION CLARIFICATION RESOLUTION CARD */}
                    {ord.prescription_status === 'Needs Clarification' && (
                      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/30 text-xs space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-extrabold uppercase tracking-wider text-xs">
                            <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                            <span>Action Required: Prescription Needs Clarification</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-500/30">
                            Clinical Lab Flag
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-white/10 space-y-1">
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Optometrist Lab Note:</span>
                          <p className="text-slate-800 dark:text-rose-200 leading-relaxed font-semibold">
                            {ord.prescription?.admin_notes || ord.notes || 'Your prescription slip photo or diopter parameters need verification before laboratory cutting can begin.'}
                          </p>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                          Please re-upload a clear prescription slip photo or resolve directly with our optometrist via WhatsApp so your lenses can be cut and assembled.
                        </p>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRxUpdateOrder(ord);
                              setRxUpdateFileUrl('');
                              setRxUpdateNotes('');
                              setRxUpdateModalOpen(true);
                            }}
                            className="btn-primary bg-rose-600 hover:bg-rose-500 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Update / Re-Upload Prescription Slip</span>
                          </button>

                          <a
                            href={`https://wa.me/919382293614?text=${encodeURIComponent(`Hi Netra Unnayan, here is my updated prescription for Order #${ord.order_number}: `)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Send Slip via WhatsApp (+91 9382293614)</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Rejection Notice Banner (if admin declined cancellation) */}
                    {rejectionNote && ord.order_status !== 'Cancelled' && (
                      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold uppercase text-[10px] tracking-wider">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Cancellation Request Status: Maintained in Production</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                          <strong>Team Note:</strong> {rejectionNote}
                        </p>
                      </div>
                    )}

                    {/* Cancelled Banner */}
                    {ord.order_status === 'Cancelled' && (
                      <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/30 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold uppercase text-[10px] tracking-wider">
                          <X className="w-3.5 h-3.5" />
                          <span>Order Cancelled</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          <strong>Reason:</strong> {ord.cancel_reason || 'Customer requested cancellation'}
                        </p>
                        {ord.payment_status && (
                          <p className="text-slate-500 dark:text-slate-400 text-[11px]">Refund / Payment Status: {ord.payment_status}</p>
                        )}
                      </div>
                    )}

                    {/* Courier & Shipping Tracking Banner (if assigned) */}
                    {(ord.courier_name || ord.tracking_number) && (
                      <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>Dispatched via {ord.courier_name || 'Express Logistics'}</span>
                              {ord.estimated_delivery_date && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-300 font-normal">
                                  (Est. Delivery: {new Date(ord.estimated_delivery_date).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                              AWB Tracking: <strong className="text-cyan-700 dark:text-brand-cyan">{ord.tracking_number}</strong>
                            </div>
                          </div>
                        </div>
                        {ord.tracking_url && (
                          <a
                            href={ord.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary text-[11px] py-1 px-3 rounded-lg flex items-center gap-1 shrink-0"
                          >
                            Courier Portal &rarr;
                          </a>
                        )}
                      </div>
                    )}

                    {/* Preview Items */}
                    <div className="space-y-2 bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 p-3 rounded-xl">
                      {(ord.preview_items || ord.items || []).map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                          <span className="font-medium">{it.product_name} ({it.product_sku || 'Frame'}) &times; {it.quantity}</span>
                          <span className="font-mono text-slate-950 dark:text-white font-bold">₹{parseFloat(it.total_price || (it.unit_price * it.quantity) || 0).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 border-t border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400 gap-2">
                      <span>Placed on: {new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span>Payment: <span className="font-semibold text-slate-800 dark:text-slate-200">{ord.payment_mode}</span></span>
                        <span>Total: <strong className="text-slate-950 dark:text-white text-sm font-mono font-bold text-cyan-600 dark:text-brand-cyan">₹{parseFloat(ord.total_amount || 0).toLocaleString('en-IN')}</strong></span>
                        
                        {/* Cancel Button (if allowed) */}
                        {ord.can_cancel && ord.order_status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelModalOrder(ord);
                              setCancelReasonOption('Change of mind / Found alternative');
                              setCancelCustomReason('');
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/15 hover:bg-rose-200 dark:hover:bg-rose-500/25 border border-rose-300 dark:border-rose-500/30 transition-all cursor-pointer"
                          >
                            Cancel Order
                          </button>
                        )}

                        <button
                          onClick={() => setInvoiceModalData({
                            invoiceNumber: ord.invoice_number || `NU-INV-${ord.order_number?.replace('NU-', '') || ord.id}`,
                            orderNumber: ord.order_number,
                            invoiceDate: ord.created_at ? new Date(ord.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB'),
                            type: ord.order_type === 'POS_OFFLINE' ? 'POS' : 'ORDER',
                            status: ord.order_status,
                            paymentMode: ord.payment_mode,
                            paymentStatus: ord.payment_status || 'Paid',
                            customerName: user.full_name || ord.customer_name,
                            customerPhone: user.phone || ord.customer_phone,
                            customerEmail: user.email || ord.customer_email,
                            customerAddress: `${ord.shipping_address_line1 || ''}, ${ord.shipping_city || ''}, ${ord.shipping_state || ''} - ${ord.shipping_pincode || ''}`,
                            items: (ord.items || ord.preview_items || []).map(it => ({
                              product_name: it.product_name,
                              product_sku: it.product_sku,
                              unit_price: Number(it.unit_price || 0),
                              quantity: Number(it.quantity || 1),
                              lens_type: it.lens_type || 'Standard Optical Lens',
                              lens_price: Number(it.lens_price || 0),
                              total_price: Number(it.total_price || (it.unit_price * it.quantity) || 0)
                            })),
                            subtotal: Number(ord.subtotal || ord.total_amount || 0),
                            discountAmount: Number(ord.discount_amount || 0),
                            shippingFee: Number(ord.shipping_fee || 0),
                            taxAmount: Number(ord.tax_amount || 0),
                            totalAmount: Number(ord.total_amount || 0),
                            warrantyNote: '1-Year Optical Warranty on Frame & Multi-Coat Anti-Glare Optics against manufacturing defects.'
                          })}
                          className="text-[11px] font-bold py-1 px-3 rounded-lg flex items-center gap-1.5 text-cyan-800 dark:text-cyan-300 bg-cyan-100/80 dark:bg-cyan-950/50 border border-cyan-400/60 dark:border-cyan-700 hover:bg-cyan-200 dark:hover:bg-cyan-900/80 shadow-xs transition-all cursor-pointer"
                          title="Download / View Tax Invoice"
                        >
                          <FileText className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-300" />
                          <span>Tax Invoice</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY BOOKINGS (DOCTOR CLINIC & HOME EYE TEST) */}
      {activeTab === 'bookings' && (
        <div className="space-y-8">
          
          {/* Section A: Doctor Consultations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Doctor Clinic Consultations
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bookings with ophthalmologists &amp; optometrists at Netra Unnayan Digha Clinic.</p>
              </div>
              <Link to="/doctors" className="btn-secondary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20">
                <Plus className="w-3.5 h-3.5" /> Book Doctor
              </Link>
            </div>

            {(!bookings.doctor_appointments || bookings.doctor_appointments.length === 0) ? (
              <div className="glass-card rounded-2xl p-8 text-center space-y-2 border border-slate-200 dark:border-white/10">
                <Stethoscope className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">No clinic appointments booked yet.</p>
                <Link to="/doctors" className="btn-primary text-xs py-2 px-4 inline-flex">
                  Explore Doctors &amp; Schedule Slot
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookings.doctor_appointments.map((apt) => {
                  const refNum = apt.appointment_number || apt.booking_number || `DOC-${apt.id}`;
                  return (
                    <div key={apt.id} className="glass-card rounded-2xl p-5 space-y-4 border border-slate-200 dark:border-white/10 relative overflow-hidden shadow-sm hover:border-brand-cyan/40 transition-all">
                      {/* Top Status Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block font-bold">
                              ID: #{refNum}
                            </span>
                            {apt.ticket_no && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/50 text-sky-900 dark:text-sky-300 font-mono text-[10px] font-black border border-sky-300 dark:border-sky-700">
                                <Tag className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400" />
                                Token: #{apt.ticket_no}
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                            {apt.doctor_name || 'Senior Consultant Ophthalmologist'}
                          </h4>
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                            {apt.doctor_specialization || apt.doctor_specialty || 'Comprehensive Eye Care'}
                            {apt.doctor_qualification ? ` • ${apt.doctor_qualification}` : ''}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shrink-0 ${
                          apt.status === 'Confirmed' 
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 shadow-xs'
                            : apt.status === 'Completed'
                            ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/40'
                            : apt.status === 'Cancelled'
                            ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40'
                            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 animate-pulse'
                        }`}>
                          {apt.status === 'Confirmed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {apt.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                          {apt.status}
                        </span>
                      </div>

                      {/* Status Message Info Box */}
                      <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                        apt.status === 'Confirmed' 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-200' 
                          : apt.status === 'Pending'
                          ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300'
                      }`}>
                        {apt.status === 'Confirmed' ? (
                          <div>
                            <strong className="block font-bold mb-0.5 text-emerald-900 dark:text-emerald-100">Booking Confirmed by Clinic</strong>
                            Your consultation slot is confirmed. Please report 10 minutes prior to slot time. Visual acuity screening will be conducted prior to doctor review.
                          </div>
                        ) : apt.status === 'Pending' ? (
                          <div>
                            <strong className="block font-bold mb-0.5 text-amber-900 dark:text-amber-100">Awaiting Clinic Desk Verification</strong>
                            Your booking request is being scheduled with the doctor. As soon as the clinic approves, you will receive an SMS and email notification.
                          </div>
                        ) : (
                          <span>Status: {apt.status}</span>
                        )}
                      </div>

                      {/* SHARED STATUS NOTES / CLINIC DESK INSTRUCTIONS */}
                      {apt.notes && (
                        <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs space-y-1 shadow-xs">
                          <div className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300 font-extrabold text-[11px] uppercase tracking-wider">
                            <MessageSquare className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            <span>Clinic Instructions &amp; Desk Notes</span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                            {apt.notes}
                          </p>
                        </div>
                      )}

                      {/* Slot Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 p-3 rounded-xl">
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Appointment Date</span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-brand-cyan" />
                            {apt.appointment_date}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Time Slot</span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            {apt.appointment_time}
                          </span>
                        </div>
                      </div>

                      {/* Patient & Clinic Details */}
                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Patient Name:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{apt.patient_name || user.full_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Consultation Fee:</span>
                          <span className="font-bold text-cyan-700 dark:text-brand-cyan font-mono">₹{apt.consultation_fee || apt.doctor_fee || 500}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-white/5">
                          <span className="text-slate-400">Clinic Venue:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-200">Netra Unnayan Eye Clinic, Digha Bypass Rd</span>
                        </div>
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => setInvoiceModalData({
                              invoiceNumber: `NU-DOC-${apt.id}`,
                              orderNumber: refNum,
                              ticket_no: apt.ticket_no,
                              ticketNo: apt.ticket_no,
                              invoiceDate: apt.appointment_date || new Date().toISOString().split('T')[0],
                              type: 'DOCTOR',
                              status: apt.status,
                              paymentMode: 'CLINIC_DESK',
                              paymentStatus: apt.status === 'Completed' ? 'Paid' : (apt.payment_status || 'Pending'),
                              customerName: apt.patient_name || user.full_name,
                              customerPhone: apt.patient_phone || user.phone,
                              customerEmail: apt.patient_email || user.email,
                              customerAddress: 'Netra Unnayan Eye Clinic, Digha Bypass Rd, Jatimati, Digha',
                              doctorName: apt.doctor_name,
                              specialty: apt.doctor_specialization || apt.doctor_specialty,
                              appointmentDate: apt.appointment_date,
                              appointmentTime: apt.appointment_time,
                              totalAmount: apt.consultation_fee || apt.doctor_fee || 500,
                              subtotal: apt.consultation_fee || apt.doctor_fee || 500,
                              notes: apt.notes,
                              warrantyNote: 'Official Consultation Slip & Clinical Token'
                            })}
                            className="text-[11px] font-bold py-1 px-3 rounded-lg flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/50 border border-emerald-400/60 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 shadow-xs transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                            <span>Download Slip / Invoice</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Home Eye Test Appointments */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HomeIcon className="w-5 h-5 text-cyan-600 dark:text-brand-cyan" /> Home Eye Test Checkups
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Certified optometrist doorstep vision test &amp; frame trial sessions.</p>
              </div>
              <Link to="/home-eye-checkup" className="btn-secondary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 text-cyan-800 dark:text-brand-cyan border-slate-300 dark:border-brand-cyan/20">
                <Plus className="w-3.5 h-3.5" /> Book Home Visit
              </Link>
            </div>

            {(!bookings.home_visits || bookings.home_visits.length === 0) ? (
              <div className="glass-card rounded-2xl p-8 text-center space-y-2 border border-slate-200 dark:border-white/10">
                <HomeIcon className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">No home eye test visits requested yet.</p>
                <Link to="/home-eye-checkup" className="btn-primary text-xs py-2 px-4 inline-flex">
                  Schedule Free Home Eye Test
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookings.home_visits.map((vis) => {
                  const refNum = vis.booking_number || `HET-${vis.id}`;
                  const custName = vis.customer_name || vis.full_name || user.full_name;
                  const custPhone = vis.customer_phone || vis.phone || user.phone;
                  const servDate = vis.service_date || vis.visit_date;
                  const servSlot = vis.service_slot || vis.time_slot;
                  const servFee = vis.service_fee !== undefined ? vis.service_fee : 0;
                  const fullAddress = `${vis.address_line1 || vis.address || ''}${vis.landmark ? ` (Landmark: ${vis.landmark})` : ''} - PIN: ${vis.pincode || ''}`;

                  return (
                    <div key={vis.id} className="glass-card rounded-2xl p-5 space-y-4 border border-slate-200 dark:border-white/10 shadow-sm hover:border-brand-cyan/40 transition-all">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block font-bold">
                              ID: #{refNum}
                            </span>
                            {vis.ticket_no && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/50 text-teal-900 dark:text-teal-300 font-mono text-[10px] font-black border border-teal-300 dark:border-teal-700">
                                <Tag className="w-2.5 h-2.5 text-teal-600 dark:text-brand-teal" />
                                Token: #{vis.ticket_no}
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">{custName}</h4>
                          <span className="text-[11px] text-cyan-700 dark:text-brand-cyan font-mono font-bold">{custPhone}</span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shrink-0 ${
                          vis.status === 'Confirmed' 
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 shadow-xs'
                            : vis.status === 'Completed'
                            ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/40'
                            : vis.status === 'Cancelled'
                            ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40'
                            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                        }`}>
                          {vis.status === 'Confirmed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {vis.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                          {vis.status}
                        </span>
                      </div>

                      {/* Status Info */}
                      <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                        vis.status === 'Confirmed' 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-200' 
                          : vis.status === 'Pending'
                          ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-200'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300'
                      }`}>
                        {vis.status === 'Confirmed' ? (
                          <div>
                            <strong className="block font-bold mb-0.5 text-emerald-900 dark:text-emerald-100">Optometrist Assigned &amp; Confirmed</strong>
                            {vis.assigned_optometrist ? `Assigned to: ${vis.assigned_optometrist}. ` : ''}Our specialist will arrive with computerized autorefractor and 100+ trial frames.
                          </div>
                        ) : vis.status === 'Pending' ? (
                          <div>
                            <strong className="block font-bold mb-0.5 text-amber-900 dark:text-amber-100">Route Allocation in Progress</strong>
                            Our dispatch team is assigning an optometrist to your area. We will confirm your preferred time slot shortly.
                          </div>
                        ) : (
                          <span>Status: {vis.status}</span>
                        )}
                      </div>

                      {/* SHARED STATUS NOTES / OPTOMETRIST INSTRUCTIONS */}
                      {vis.notes && (
                        <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs space-y-1 shadow-xs">
                          <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 font-extrabold text-[11px] uppercase tracking-wider">
                            <MessageSquare className="w-3.5 h-3.5 text-teal-600 dark:text-brand-teal" />
                            <span>Optometrist &amp; Visit Notes</span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                            {vis.notes}
                          </p>
                        </div>
                      )}

                      {/* Slot & Location */}
                      <div className="space-y-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-transparent p-3 rounded-xl">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Scheduled Date:</span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono">{servDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Time Window:</span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono">{servSlot}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                          <span className="text-slate-500 dark:text-slate-400 block">Address:</span>
                          <span className="text-slate-800 dark:text-slate-200 mt-0.5 block leading-relaxed font-medium">
                            {fullAddress}
                          </span>
                        </div>
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => setInvoiceModalData({
                              invoiceNumber: `NU-HET-${vis.id}`,
                              orderNumber: refNum,
                              ticket_no: vis.ticket_no,
                              ticketNo: vis.ticket_no,
                              invoiceDate: servDate || new Date().toISOString().split('T')[0],
                              type: 'HOME_EYE',
                              status: vis.status,
                              paymentMode: 'DOORSTEP_COD',
                              paymentStatus: vis.status === 'Completed' ? 'Paid' : (vis.payment_status || 'Pending'),
                              customerName: custName,
                              customerPhone: custPhone,
                              customerEmail: vis.customer_email || user.email,
                              customerAddress: fullAddress,
                              zoneName: 'Doorstep Optometry',
                              assigned_optometrist: vis.assigned_optometrist,
                              appointmentDate: servDate,
                              appointmentTime: servSlot,
                              totalAmount: servFee,
                              subtotal: servFee,
                              notes: vis.notes,
                              warrantyNote: 'Doorstep Optometry Eye Exam & 100+ Designer Frame Trial'
                            })}
                            className="text-[11px] font-bold py-1 px-3 rounded-lg flex items-center gap-1.5 text-cyan-800 dark:text-cyan-300 bg-cyan-100/80 dark:bg-cyan-950/50 border border-cyan-400/60 dark:border-cyan-700 hover:bg-cyan-200 dark:hover:bg-cyan-900/80 shadow-xs transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-300" />
                            <span>Download Slip / Invoice</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: SAVED ADDRESSES */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-cyan" /> Saved Delivery Addresses
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage your saved delivery locations for 1-click eyewear shipping and home eye checkups.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingAddressId(null);
                setAddrForm({
                  recipient_name: user?.full_name || '',
                  phone: user?.phone || '',
                  address_line1: '',
                  address_line2: '',
                  landmark: '',
                  city: '',
                  state: '',
                  pincode: '',
                  address_type: 'HOME',
                  is_default: addresses.length === 0
                });
                setAddressModalOpen(true);
              }}
              className="btn-primary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-cyan-glow shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center space-y-3 border-2 border-slate-200 dark:border-white/10">
              <MapPin className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Addresses Saved Yet</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Save your home, clinic, or office address for lightning-fast 1-click checkout.</p>
              <button 
                onClick={() => {
                  setEditingAddressId(null);
                  setAddrForm({
                    recipient_name: user?.full_name || '',
                    phone: user?.phone || '',
                    address_line1: '',
                    address_line2: '',
                    landmark: '',
                    city: '',
                    state: '',
                    pincode: '',
                    address_type: 'HOME',
                    is_default: true
                  });
                  setAddressModalOpen(true);
                }} 
                className="btn-primary text-xs py-2 px-5 inline-flex shadow-cyan-glow"
              >
                <Plus className="w-3.5 h-3.5" /> Save First Address
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div 
                  key={addr.id} 
                  className="glass-card rounded-2xl p-5 space-y-3.5 border-2 border-slate-300 dark:border-white/15 hover:border-brand-cyan/60 transition-all relative shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-[11px] text-brand-cyan tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-brand-cyan/10 border border-brand-cyan/30">
                      {addr.address_type || 'HOME'}
                    </span>
                    <div className="flex items-center gap-2">
                      {addr.is_default == 1 ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300 font-bold border border-teal-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Default
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-cyan transition-colors"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingAddressId(addr.id);
                          setAddrForm({
                            recipient_name: addr.recipient_name,
                            phone: addr.phone,
                            address_line1: addr.address_line1,
                            address_line2: addr.address_line2 || '',
                            landmark: addr.landmark || '',
                            city: addr.city,
                            state: addr.state,
                            pincode: addr.pincode,
                            address_type: addr.address_type || 'HOME',
                            is_default: addr.is_default == 1
                          });
                          setAddressModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-brand-cyan hover:bg-brand-cyan/10 border border-transparent hover:border-brand-cyan/20 transition-colors"
                        title="Edit Address"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                        title="Delete Address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{addr.recipient_name}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-0.5">{addr.phone}</p>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                    {addr.address_line1}
                    {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                    {addr.landmark ? ` (Landmark: ${addr.landmark})` : ''}<br />
                    {addr.city}, {addr.state} - <strong className="font-mono text-slate-900 dark:text-white font-bold">{addr.pincode}</strong>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SAVED PRESCRIPTIONS VAULT */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-600 dark:text-brand-cyan" /> Your Optical Health Vault
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Secure digital archive of your vision corrective prescriptions.</p>
            </div>
            <button
              onClick={() => setAddRxOpen(true)}
              className="btn-primary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-cyan-glow"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Prescription
            </button>
          </div>

          {prescriptions.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center space-y-3 border border-slate-200 dark:border-white/10">
              <Eye className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Prescriptions Vaulted</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Upload your eye power parameters to auto-populate future lens orders.</p>
              <button onClick={() => setAddRxOpen(true)} className="btn-primary text-xs py-2 px-4 inline-flex">
                Save First Prescription
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="glass-card rounded-2xl p-5 space-y-3 border border-slate-200 dark:border-white/10 shadow-sm">
                  <div className="flex justify-between items-start border-b border-slate-200 dark:border-white/10 pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{rx.label}</h4>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{rx.prescription_date || 'Current Active'}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-brand-cyan/20 text-cyan-800 dark:text-brand-cyan border border-cyan-300 dark:border-brand-cyan/30 text-[10px] font-bold">
                      PD: {rx.single_pd ? `${rx.single_pd} mm` : `${rx.right_pd}/${rx.left_pd} mm`}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center font-mono">
                      <thead>
                        <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/5">
                          <th className="py-1 text-left">Eye</th>
                          <th className="py-1">SPH</th>
                          <th className="py-1">CYL</th>
                          <th className="py-1">AXIS</th>
                          <th className="py-1">ADD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                        <tr>
                          <td className="py-1.5 text-left font-bold text-cyan-700 dark:text-brand-cyan">Right (OD)</td>
                          <td>{rx.right_sph ?? '0.00'}</td>
                          <td>{rx.right_cyl ?? '0.00'}</td>
                          <td>{rx.right_axis ? `${rx.right_axis}°` : '-'}</td>
                          <td>{rx.right_add ?? '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-left font-bold text-teal-700 dark:text-brand-teal">Left (OS)</td>
                          <td>{rx.left_sph ?? '0.00'}</td>
                          <td>{rx.left_cyl ?? '0.00'}</td>
                          <td>{rx.left_axis ? `${rx.left_axis}°` : '-'}</td>
                          <td>{rx.left_add ?? '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {rx.notes && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-transparent p-2.5 rounded-lg">
                      {rx.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PROFILE & SETTINGS */}
      {activeTab === 'profile' && (
        <div className="max-w-4xl space-y-6">
          
          {/* Main Profile Info Card */}
          <div className="glass-card bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-200 dark:border-white/10 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-6 h-6 text-brand-cyan" />
                  <span>Optical Identity &amp; Personal Info</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage your personal details, profile picture, WhatsApp notifications, and eyewear preferences
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-brand-cyan border border-cyan-500/20 self-start sm:self-auto">
                Member ID: #NU-CUST-{user.id}
              </span>
            </div>

            {profileFeedback.message && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm ${
                profileFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200'
              }`}>
                {profileFeedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />}
                <span>{profileFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-6">
              
              {/* Profile Photo & Avatar Gallery */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-brand-cyan shadow-cyan-glow bg-gradient-to-tr from-brand-cyan to-brand-teal flex items-center justify-center text-slate-950 text-3xl font-black">
                      {profileForm.avatar_url ? (
                        <img 
                          src={profileForm.avatar_url} 
                          alt={profileForm.full_name || 'Avatar'} 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <span>{profileForm.full_name?.charAt(0) || 'U'}</span>
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-slate-950 cursor-pointer shadow-lg transition-transform hover:scale-110">
                      <Camera className="w-4 h-4 stroke-[2.5]" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarFileChange} 
                        className="hidden" 
                        disabled={uploadingAvatar}
                      />
                    </label>
                  </div>

                  <div className="space-y-2 flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-between flex-wrap gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Profile Photo &amp; Avatar</h3>
                      {profileForm.avatar_url && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload a portrait from your device or paste any image link directly.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        placeholder="Paste image URL (https://...)"
                        value={profileForm.avatar_url}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                        className="glass-input rounded-xl px-3 py-2 text-xs flex-1 font-mono"
                      />
                      <label className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-cyan-glow">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingAvatar ? 'Uploading...' : 'Upload Image'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleAvatarFileChange} 
                          className="hidden" 
                          disabled={uploadingAvatar}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Preset Avatar Gallery */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                    Or Choose an Eyewear Designer Avatar:
                  </span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {presetAvatars.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPresetAvatar(av.url)}
                        className={`group flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all cursor-pointer ${
                          profileForm.avatar_url === av.url
                            ? 'bg-cyan-500/15 border-brand-cyan text-cyan-800 dark:text-brand-cyan font-bold shadow-sm'
                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-brand-cyan/50'
                        }`}
                      >
                        <img src={av.url} alt={av.name} className="w-6 h-6 rounded-full object-cover" />
                        <span className="text-[11px]">{av.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Rahul Sen"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Primary Phone (WhatsApp &amp; OTP) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="9830123456"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Alternate / Delivery Phone
                  </label>
                  <input
                    type="tel"
                    value={profileForm.alternate_phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, alternate_phone: e.target.value }))}
                    placeholder="Secondary contact for couriers"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Account Email Address
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="rahul.sen@example.com"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Date of Birth</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">★ Birthday Frame Perks</span>
                  </label>
                  <input
                    type="date"
                    value={profileForm.dob}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Gender Identity
                  </label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs font-bold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unisex">Unisex / All Frames</option>
                    <option value="Other">Prefer not to specify</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Primary Eyewear Preference / Requirement
                  </label>
                  <select
                    value={profileForm.optical_preference}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, optical_preference: e.target.value }))}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs font-bold"
                  >
                    <option value="Prescription Eyeglasses">Prescription Eyeglasses (CR-39 Single Vision)</option>
                    <option value="Progressive / Bifocal">Progressive / Bifocal Multi-Focus</option>
                    <option value="Blue-Cut Screen Glasses">Blue-Cut Digital Screen Protection (0 Power / Powered)</option>
                    <option value="Polarized Sunglasses">Polarized UV400 Sunglasses</option>
                    <option value="Pure Titanium Designer Frames">Pure Japanese Titanium Designer Frames</option>
                    <option value="Contact Lenses">Daily / Monthly Soft Contact Lenses</option>
                  </select>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Helps our optometry team suggest ideal lens coatings and frame dimensions.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="btn-primary text-xs py-3 px-8 rounded-xl font-bold flex items-center gap-2 shadow-cyan-glow cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Security & Password Change Card */}
          <div className="glass-card bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-200 dark:border-white/10 shadow-xl">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-white/10 pb-4">
              <Key className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Security &amp; Account Password</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update your account login password</p>
              </div>
            </div>

            {passwordFeedback.message && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm ${
                passwordFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200'
              }`}>
                {passwordFeedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Current Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      required
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      required
                      minLength={6}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                      placeholder="Min 6 characters"
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                    placeholder="Repeat new password"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{passwordSaving ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* VIP Membership Perks & Digital Warranty Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-brand-cyan/10 to-teal-500/10 border border-amber-500/30 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Netra Clarity Club — Gold Privileges</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              As a registered optical customer at Netra Unnayan, you enjoy complimentary clinic services at our Digha Eye Care Center:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-cyan" />
                  <span>Free Ultrasonic Clean</span>
                </div>
                <p className="text-[11px] text-slate-500">Deep ultrasonic wave cleansing for all frames</p>
              </div>

              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Frame Alignment</span>
                </div>
                <p className="text-[11px] text-slate-500">Free screw tightening &amp; soft nose pad replacement</p>
              </div>

              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span>1-Year Lens Warranty</span>
                </div>
                <p className="text-[11px] text-slate-500">Guaranteed optical anti-reflection coatings</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 6: CUSTOMER SUPPORT, DIRECT WHATSAPP, EMAIL & LIVE CHATBOT */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          
          {/* Quick Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Direct WhatsApp Card */}
            <a
              href="https://wa.me/919382293614?text=Hi%20Netra%20Unnayan%20Team,%20I%20need%20assistance%20with%20an%20eyewear%20order%20or%20eye%20care."
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 hover:border-emerald-500 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
                  <MessageCircle className="w-5 h-5 fill-slate-950 stroke-none" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors flex items-center gap-1.5">
                    <span>Direct WhatsApp Chat</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Instant reply on order tracking, prescription verification &amp; lens guidance.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-emerald-500/20 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                +91 9382293614 &bull; 1-Tap Connect
              </div>
            </a>

            {/* Direct Mail Card */}
            <a
              href="mailto:netraunnayan@gmail.com?subject=Netra%20Unnayan%20Customer%20Support%20Inquiry"
              className="p-5 rounded-3xl bg-gradient-to-br from-brand-cyan/15 via-brand-cyan/5 to-transparent border border-brand-cyan/30 hover:border-brand-cyan transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-brand-cyan text-slate-950 flex items-center justify-center font-bold shadow-md">
                  <Mail className="w-5 h-5 stroke-[2.4]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-brand-cyan transition-colors flex items-center gap-1.5">
                    <span>Direct Email Support</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Send detailed inquiries, attachments, or optical prescription cards.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-brand-cyan/20 text-xs font-mono font-bold text-cyan-600 dark:text-brand-cyan">
                netraunnayan@gmail.com
              </div>
            </a>

            {/* Helpline Call Card */}
            <a
              href="tel:9382293614"
              className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 hover:border-amber-500 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
                  <Phone className="w-5 h-5 stroke-[2.4]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors flex items-center gap-1.5">
                    <span>Optical Clinic Hotline</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Speak directly with clinic reception (Mon–Sat, 10 AM–8 PM IST).
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-500/20 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                +91 9382293614 &bull; Call Now
              </div>
            </a>

          </div>

          {/* Embedded Interactive Live Helpdesk & Chatbot */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-cyan" />
                  <span>Optical AI Assistant &amp; Live Admin Desk</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chat with our smart bot for instant guidance or message an admin live. Attach photos of prescription slips or frames anytime.
                </p>
              </div>
            </div>

            <SupportChatWidget isEmbedded={true} />
          </div>

        </div>
      )}

      {/* ADD / EDIT ADDRESS MODAL */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-white dark:bg-[#0A192F] border-2 border-slate-300 dark:border-white/15 rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingAddressId ? 'Edit Delivery Address' : 'Add Delivery Address'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingAddressId ? 'Update your saved delivery address details.' : 'Save destination for orders and optometrist home visits.'}
                </p>
              </div>
              <button onClick={() => setAddressModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Recipient Name *</label>
                  <input 
                    type="text" 
                    required
                    value={addrForm.recipient_name} 
                    onChange={(e) => setAddrForm({...addrForm, recipient_name: e.target.value})} 
                    placeholder="Full name"
                    className="w-full glass-input rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone Number *</label>
                  <input 
                    type="tel" 
                    required
                    value={addrForm.phone} 
                    onChange={(e) => setAddrForm({...addrForm, phone: e.target.value})} 
                    placeholder="10-digit mobile number"
                    className="w-full glass-input rounded-xl px-3 py-2.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Street Address / Flat No *</label>
                <input 
                  type="text" 
                  required
                  value={addrForm.address_line1} 
                  onChange={(e) => setAddrForm({...addrForm, address_line1: e.target.value})} 
                  placeholder="e.g. Flat 302, Sea Pearl Heights, Foreshore Road"
                  className="w-full glass-input rounded-xl px-3 py-2.5"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Area / Locality</label>
                  <input 
                    type="text" 
                    value={addrForm.address_line2} 
                    onChange={(e) => setAddrForm({...addrForm, address_line2: e.target.value})} 
                    placeholder="e.g. Sea Beach Market"
                    className="w-full glass-input rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Landmark (Optional)</label>
                  <input 
                    type="text" 
                    value={addrForm.landmark} 
                    onChange={(e) => setAddrForm({...addrForm, landmark: e.target.value})} 
                    placeholder="e.g. Near New Digha Railway Station"
                    className="w-full glass-input rounded-xl px-3 py-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">City *</label>
                  <input 
                    type="text" 
                    required
                    value={addrForm.city} 
                    onChange={(e) => setAddrForm({...addrForm, city: e.target.value})} 
                    placeholder="e.g. Digha"
                    className="w-full glass-input rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">State *</label>
                  <input 
                    type="text" 
                    required
                    value={addrForm.state} 
                    onChange={(e) => setAddrForm({...addrForm, state: e.target.value})} 
                    placeholder="e.g. West Bengal"
                    className="w-full glass-input rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Pincode *</label>
                  <input 
                    type="text" 
                    required
                    value={addrForm.pincode} 
                    onChange={(e) => setAddrForm({...addrForm, pincode: e.target.value})} 
                    placeholder="e.g. 721428"
                    className="w-full glass-input rounded-xl px-3 py-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex gap-2">
                  {['HOME', 'OFFICE', 'OTHER'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddrForm({...addrForm, address_type: type})}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[10px] border transition-all ${
                        addrForm.address_type === type 
                          ? 'bg-brand-cyan text-slate-950 font-black border-brand-cyan shadow-sm' 
                          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input 
                    type="checkbox" 
                    checked={addrForm.is_default}
                    onChange={(e) => setAddrForm({...addrForm, is_default: e.target.checked})}
                    className="rounded border-slate-300 dark:border-white/20 text-brand-cyan focus:ring-0"
                  />
                  <span className="font-medium">Make default address</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button 
                  type="button" 
                  onClick={() => setAddressModalOpen(false)} 
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingAddr}
                  className="btn-primary text-xs py-2 px-5 rounded-xl shadow-cyan-glow"
                >
                  {savingAddr ? 'Saving...' : editingAddressId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW PRESCRIPTION MODAL */}
      {addRxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-white dark:bg-[#0A192F] border border-slate-200 dark:border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-600 dark:text-brand-cyan" /> Save Prescription to Vault
              </h3>
              <button onClick={() => setAddRxOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Prescription Label *</label>
                <input 
                  type="text" 
                  required
                  value={newRxLabel} 
                  onChange={(e) => setNewRxLabel(e.target.value)} 
                  placeholder="e.g. Daily Screen Rx"
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold"
                />
              </div>

              {/* Right Eye */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                <span className="font-bold text-cyan-700 dark:text-brand-cyan block">Right Eye (OD)</span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">SPH</span>
                    <input type="text" value={rSph} onChange={(e) => setRSph(e.target.value)} placeholder="0.00" className="w-full glass-input rounded-lg px-1 text-center py-1.5 font-mono text-xs font-bold" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">CYL</span>
                    <input type="text" value={rCyl} onChange={(e) => setRCyl(e.target.value)} placeholder="0.00" className="w-full glass-input rounded-lg px-1 text-center py-1.5 font-mono text-xs font-bold" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">AXIS</span>
                    <input type="number" value={rAxis} onChange={(e) => setRAxis(e.target.value)} placeholder="90" className="w-full glass-input rounded-lg px-1 text-center py-1.5 font-mono text-xs font-bold" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">PD</span>
                    <input type="text" value={rPd} onChange={(e) => setRPd(e.target.value)} placeholder="31.5" className="w-full glass-input rounded-lg px-1 text-center py-1.5 font-mono text-xs font-bold" />
                  </div>
                </div>
              </div>

              {/* Left Eye */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                <span className="font-bold text-teal-700 dark:text-brand-teal block">Left Eye (OS)</span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">SPH</span>
                    <input type="text" value={lSph} onChange={(e) => setLSph(e.target.value)} placeholder="0.00" className="w-full glass-input rounded-lg px-1 text-center py-1.5 font-mono text-xs font-bold" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">CYL</span>
                    <input type="text" value={lCyl} onChange={(e) => setLCyl(e.target.value)} placeholder="0.00" className="w-full glass-input rounded-lg px-1 text-center py-1.5 font-mono text-xs font-bold" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">AXIS</span>
                    <input type="number" value={lAxis} onChange={(e) => setLAxis(e.target.value)} placeholder="90" className="w-full glass-input rounded-lg px-1 text-center py-1.5 font-mono text-xs font-bold" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">PD</span>
                    <input type="text" value={lPd} onChange={(e) => setLPd(e.target.value)} placeholder="31.5" className="w-full glass-input rounded-lg px-1 text-center py-1.5 font-mono text-xs font-bold" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Doctor / Clinic Notes</label>
                <input 
                  type="text" 
                  value={rxNotes} 
                  onChange={(e) => setRxNotes(e.target.value)} 
                  placeholder="e.g. Anti-glare coating recommended..."
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
                <button type="button" onClick={() => setAddRxOpen(false)} className="px-4 py-2 font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer">Cancel</button>
                <button type="submit" className="btn-primary text-xs py-2 px-5 rounded-xl cursor-pointer shadow-cyan-glow">Save to Vault</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Order Cancellation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-[#0A192F] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <X className="w-5 h-5" /> Cancel Order #{cancelModalOrder.order_number}
              </h3>
              <button 
                onClick={() => setCancelModalOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Cancellation is permitted at this stage before precision lens cutting starts. If you paid online, a full refund of <strong className="text-cyan-700 dark:text-brand-cyan">₹{cancelModalOrder.total_amount}</strong> will be initiated.
            </p>

            <form onSubmit={handleCancelCustomerOrder} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Reason for Cancellation *
                </label>
                <select
                  value={cancelReasonOption}
                  onChange={(e) => setCancelReasonOption(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  <option value="Change of mind / Found alternative">Change of mind / Found alternative</option>
                  <option value="Entered incorrect delivery address">Entered incorrect delivery address</option>
                  <option value="Need to change optical frame model or color">Need to change optical frame model or color</option>
                  <option value="Incorrect prescription entered">Incorrect prescription entered</option>
                  <option value="Delivery timeframe does not suit">Delivery timeframe does not suit</option>
                  <option value="Other">Other reason (specify below)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Additional Details / Notes
                </label>
                <textarea
                  rows="2"
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  placeholder="Optional details for our optical team..."
                  className="w-full glass-input rounded-xl p-3 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setCancelModalOrder(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={cancellingOrder}
                  className="btn-primary bg-rose-600 hover:bg-rose-500 text-white text-xs px-5 py-2.5 rounded-xl font-black shadow-lg cursor-pointer"
                >
                  {cancellingOrder ? 'Processing Cancellation...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Prescription Update Modal */}
      {rxUpdateModalOpen && rxUpdateOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#0A192F] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Update Prescription for Order #{rxUpdateOrder.order_number}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Submit clear slip photo or diopter note for our clinical lab
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRxUpdateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Optometrist clarification note alert */}
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-xs">
              <span className="font-bold text-rose-700 dark:text-rose-400 block mb-1">Optometrist's Clarification Note:</span>
              <p className="text-slate-700 dark:text-slate-200 font-medium">
                {rxUpdateOrder.prescription?.admin_notes || rxUpdateOrder.notes || 'Clarification required before laboratory lens cutting.'}
              </p>
            </div>

            <form onSubmit={handleConfirmRxUpdate} className="space-y-4">
              {/* Slip upload section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Upload New Prescription Slip Photo (Optional if providing note)
                </label>
                
                {rxUpdateFileUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={rxUpdateFileUrl} 
                        alt="Updated prescription" 
                        className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-white/10" 
                      />
                      <div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Slip Uploaded Successfully
                        </span>
                        <a 
                          href={rxUpdateFileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] text-cyan-600 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          View full slip image <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRxUpdateFileUrl('')}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-brand-cyan/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50 dark:bg-white/[0.02]">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {uploadingUpdateRx ? 'Uploading to secure server...' : 'Click to select prescription photo or PDF'}
                    </span>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WEBP, PDF up to 10MB</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleUploadNewSlip}
                      disabled={uploadingUpdateRx}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Message / diopter clarification notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Message / Diopter Details for Optometrist
                </label>
                <textarea
                  rows="3"
                  value={rxUpdateNotes}
                  onChange={(e) => setRxUpdateNotes(e.target.value)}
                  placeholder="e.g. Confirming SPH is -2.25 and AXIS is 90 for right eye. Attached the latest prescription slip."
                  className="w-full glass-input rounded-xl p-3 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10">
                <a
                  href={`https://wa.me/919382293614?text=${encodeURIComponent(`Hi Netra Unnayan Optometrist, regarding prescription clarification for Order #${rxUpdateOrder.order_number}: `)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-500 inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp instead</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRxUpdateModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRxUpdate || uploadingUpdateRx || (!rxUpdateFileUrl && !rxUpdateNotes.trim())}
                    className="btn-primary text-xs px-5 py-2.5 rounded-xl font-black shadow-cyan-glow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingRxUpdate ? 'Submitting to Lab...' : 'Submit Updated Rx'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Watermarked Tax Invoice & Guarantee Certificate Modal */}
      <InvoiceModal
        isOpen={!!invoiceModalData}
        onClose={() => setInvoiceModalData(null)}
        invoiceData={invoiceModalData}
      />

    </div>
  );
};
