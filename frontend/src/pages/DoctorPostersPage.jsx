import React, { useEffect, useState } from 'react';
import { Download, Calendar, Phone, MapPin, Eye, Sparkles } from 'lucide-react';
import api from '../api/client';

export const DoctorPostersPage = () => {
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosters = async () => {
      try {
        const res = await api.get('/admin/posters.php');
        if (res.success) {
          setPosters(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load doctor posters:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosters();
  }, []);

  const handlePrint = (posterId) => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Title */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="inline-block px-3 py-1 rounded-full bg-brand-cyan/20 text-brand-cyan text-xs font-bold uppercase tracking-wider">
          Clinic Camp &amp; Doctor Posters
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          Doctor Posters &amp; Clinical Announcements
        </h1>
        <p className="text-xs sm:text-sm text-slate-300">
          Official promotional announcements for visiting eye specialists, diagnostic camps, and surgical consultations at Netra Unnayan Digha Clinic.
        </p>
      </div>

      {/* Posters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {posters.map((p) => (
          <div 
            key={p.id} 
            className="glass-card-glow rounded-3xl overflow-hidden border border-brand-cyan/40 shadow-2xl flex flex-col justify-between"
          >
            {/* Poster Canvas Header */}
            <div className="bg-gradient-to-r from-[#060D17] via-[#0A192F] to-[#060D17] p-6 border-b border-brand-cyan/30 text-center space-y-2">
              <img 
                src="/logo_horizontal_white.png" 
                alt="Netra Unnayan" 
                className="h-10 mx-auto object-contain"
                onError={(e) => { e.target.onerror = null; e.target.src = '/logo_symbol.png'; }}
              />
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-brand-cyan">
                {p.tagline || 'Clarity You Can Trust'}
              </div>
            </div>

            {/* Poster Content Body */}
            <div className="p-6 sm:p-8 space-y-6 bg-gradient-to-b from-[#091629] to-[#060D17]">
              
              <div className="text-center space-y-2">
                <span className="px-3 py-1 rounded-full bg-brand-teal/20 text-brand-teal text-xs font-extrabold uppercase tracking-wider">
                  Specialist Consultation Camp
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                  {p.title}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                  {p.headline}
                </p>
              </div>

              {/* Doctor Details */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                <img 
                  src={p.photo_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80'} 
                  alt={p.doctor_name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-brand-cyan shrink-0"
                />
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-sm text-white">{p.doctor_name}</h3>
                  <div className="text-xs text-brand-cyan font-bold">{p.specialization}</div>
                  <div className="text-[11px] text-slate-400">{p.qualification}</div>
                  {p.experience_years && (
                    <div className="text-[10px] text-brand-teal font-medium">{p.experience_years}+ Years Clinical Practice</div>
                  )}
                </div>
              </div>

              {/* Schedules & Venue */}
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-teal shrink-0" />
                  <span><strong>Dates &amp; Time:</strong> {p.dates_text}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
                  <span><strong>Venue:</strong> {p.venue_text}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-teal shrink-0" />
                  <span><strong>Helpline &amp; Appointments:</strong> {p.contact_phone || '9382293614'}</span>
                </div>
              </div>

            </div>

            {/* Poster Footer CTA */}
            <div className="p-4 bg-[#050A12] border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Netra Unnayan Clinic Notice
              </span>
              <button
                type="button"
                onClick={() => handlePrint(p.id)}
                className="btn-secondary text-xs py-1.5 px-4 rounded-xl inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Print / Save Poster
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
