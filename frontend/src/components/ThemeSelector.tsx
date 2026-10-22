import React, { useEffect, useRef, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentTheme = themes.find(t => t.id === theme);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        title="Change theme"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs font-mono border border-transparent hover:border-white/10"
      >
        <Palette size={15} />
        <span className="hidden sm:inline">Theme</span>
        {/* swatch dot for current theme */}
        <span
          className="w-2.5 h-2.5 rounded-full border border-white/20"
          style={{ backgroundColor: currentTheme?.swatch }}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="px-3 py-2 border-b text-[10px] font-mono font-bold uppercase tracking-widest"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            Select Theme
          </div>
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
              style={{
                background: t.id === theme ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = t.id === theme ? 'rgba(255,255,255,0.06)' : 'transparent')}
            >
              <span
                className="w-4 h-4 rounded-full flex-shrink-0 border border-white/20"
                style={{ backgroundColor: t.swatch }}
              />
              <span className="text-xs font-mono flex-1">{t.label}</span>
              {t.id === theme && <Check size={13} style={{ color: t.swatch }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};