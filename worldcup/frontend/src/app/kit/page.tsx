'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { KitConfig, KitJersey, KitPiece, KitPattern, CollarStyle, SleeveLength, DEFAULT_KIT } from '@/types';
import { KitSVG } from '@/components/KitSVG';
import { authApi } from '@/lib/api';

const PATTERNS: { id: KitPattern; label: string }[] = [
  { id: 'solid',        label: 'Solid' },
  { id: 'stripes',      label: 'Stripes' },
  { id: 'hoops',        label: 'Hoops' },
  { id: 'checkerboard', label: 'Check' },
  { id: 'diagonal',     label: 'Diagonal' },
];

const COLLAR_STYLES: { id: CollarStyle; label: string; desc: string }[] = [
  { id: 'vneck', label: 'V-Neck',  desc: 'Classic deep V' },
  { id: 'round', label: 'Round',   desc: 'Crew neck' },
  { id: 'polo',  label: 'Polo',    desc: 'Collar lapels' },
];

const KIT_COLORS = [
  '#e3342f','#f6993f','#f6c90e','#38c172','#4dc0b5',
  '#3490dc','#6574cd','#9561e2','#f66d9b','#ffffff',
  '#1a1a1a','#888888','#b45309','#065f46','#1e3a5f',
];

type Section = 'jersey' | 'shorts' | 'socks';

function ColorSwatch({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <label className="relative cursor-pointer group">
      <div
        className="w-8 h-8 rounded border-2 border-[#30363d] group-hover:border-green-500 transition-colors"
        style={{ backgroundColor: value }}
      />
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
      />
    </label>
  );
}

function QuickPalette({ onChange }: { onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {KIT_COLORS.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="w-5 h-5 rounded border border-[#30363d] hover:scale-110 transition-transform"
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  const [showPalette, setShowPalette] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-28 shrink-0">{label}</span>
        <ColorSwatch value={value} onChange={onChange} />
        <span className="text-xs font-mono text-gray-500">{value.toUpperCase()}</span>
        <button
          onClick={() => setShowPalette(p => !p)}
          className="text-xs text-gray-500 hover:text-gray-300 ml-auto"
        >
          {showPalette ? '▲' : '▼'} Quick
        </button>
      </div>
      {showPalette && <QuickPalette onChange={c => { onChange(c); setShowPalette(false); }} />}
    </div>
  );
}

function PatternSelect({ value, onChange }: { value: KitPattern; onChange: (p: KitPattern) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PATTERNS.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
            value === p.id
              ? 'bg-green-600/20 border-green-500 text-green-400'
              : 'border-[#30363d] text-gray-400 hover:border-gray-500 hover:text-white'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function PieceEditor({ piece, onChange, label }: {
  piece: KitPiece;
  onChange: (p: KitPiece) => void;
  label: string;
}) {
  const set = <K extends keyof KitPiece>(k: K, v: KitPiece[K]) => onChange({ ...piece, [k]: v });
  return (
    <div className="space-y-3">
      <ColorRow label="Primary" value={piece.color1} onChange={v => set('color1', v)} />
      <ColorRow label="Secondary" value={piece.color2} onChange={v => set('color2', v)} />
      <div className="flex items-start gap-3">
        <span className="text-xs text-gray-400 w-28 shrink-0 pt-1">Pattern</span>
        <PatternSelect value={piece.pattern} onChange={v => set('pattern', v)} />
      </div>
    </div>
  );
}

function JerseyEditor({ jersey, onChange }: {
  jersey: KitJersey;
  onChange: (j: KitJersey) => void;
}) {
  const set = <K extends keyof KitJersey>(k: K, v: KitJersey[K]) => onChange({ ...jersey, [k]: v });
  return (
    <div className="space-y-3">
      <ColorRow label="Primary" value={jersey.color1} onChange={v => set('color1', v)} />
      <ColorRow label="Secondary" value={jersey.color2} onChange={v => set('color2', v)} />
      <div className="flex items-start gap-3">
        <span className="text-xs text-gray-400 w-28 shrink-0 pt-1">Pattern</span>
        <PatternSelect value={jersey.pattern} onChange={v => set('pattern', v)} />
      </div>

      <div className="border-t border-[#30363d] pt-3 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Collar</p>
        <div className="flex items-center gap-2">
          {COLLAR_STYLES.map(cs => (
            <button
              key={cs.id}
              onClick={() => set('collarStyle', cs.id)}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                jersey.collarStyle === cs.id
                  ? 'bg-green-600/20 border-green-500 text-green-400'
                  : 'border-[#30363d] text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
              title={cs.desc}
            >
              {cs.label}
            </button>
          ))}
        </div>
        <ColorRow label="Collar color" value={jersey.collarColor} onChange={v => set('collarColor', v)} />
      </div>

      <div className="border-t border-[#30363d] pt-3 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Sleeve accents</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-28 shrink-0">Sleeve length</span>
          <div className="flex gap-2">
            {(['short', 'long'] as SleeveLength[]).map(sl => (
              <button
                key={sl}
                onClick={() => set('sleeveLength', sl)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  (jersey.sleeveLength ?? 'short') === sl
                    ? 'bg-green-600/20 border-green-500 text-green-400'
                    : 'border-[#30363d] text-gray-400 hover:border-gray-500 hover:text-white'
                }`}
              >
                {sl === 'short' ? '💪 Short' : '🧥 Long'}
              </button>
            ))}
          </div>
        </div>
        <ColorRow label="Cuff & stripe" value={jersey.sleeveAccentColor} onChange={v => set('sleeveAccentColor', v)} />
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-28 shrink-0">Shoulder stripes</span>
          <button
            onClick={() => set('shoulderStripes', !jersey.shoulderStripes)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors ${
              jersey.shoulderStripes ? 'bg-green-600 border-green-600' : 'bg-[#30363d] border-[#30363d]'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${jersey.shoulderStripes ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <span className="text-xs text-gray-500">{jersey.shoulderStripes ? 'On' : 'Off'}</span>
        </div>
      </div>
    </div>
  );
}

function randomColor(): string {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

function randomKit(): KitConfig {
  const pats: KitPattern[] = ['solid', 'stripes', 'hoops', 'checkerboard', 'diagonal'];
  const collars: CollarStyle[] = ['vneck', 'round', 'polo'];
  const sleeves: SleeveLength[] = ['short', 'long'];
  const rp = () => pats[Math.floor(Math.random() * pats.length)];
  return {
    jersey: {
      color1: randomColor(), color2: randomColor(), pattern: rp(),
      collarStyle: collars[Math.floor(Math.random() * collars.length)],
      collarColor: randomColor(),
      sleeveAccentColor: randomColor(),
      shoulderStripes: Math.random() > 0.5,
      sleeveLength: sleeves[Math.floor(Math.random() * sleeves.length)],
    },
    shorts: { color1: randomColor(), color2: randomColor(), pattern: rp() },
    socks:  { color1: randomColor(), color2: randomColor(), pattern: rp() },
  };
}

export default function KitPage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const [kit, setKit] = useState<KitConfig>(DEFAULT_KIT);
  const [section, setSection] = useState<Section>('jersey');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.kit) setKit(user.kit as KitConfig);
  }, [user]);

  async function save() {
    setSaving(true);
    setSavedMsg('');
    try {
      const res = await authApi.updateKit(kit);
      setUser({ ...user!, kit });
      setSavedMsg('Kit saved!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch {
      setSavedMsg('Save failed — try again');
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Uniform</h1>
        <p className="text-sm text-gray-500 mt-1">Design your uniform — it shows next to your name on the leaderboard.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* ── Preview ── */}
        <div className="flex flex-col items-center gap-4">
          <div className="card p-6 flex flex-col items-center gap-3">
            <KitSVG kit={kit} width={160} />
            <p className="text-xs text-gray-500">{user.display_name}</p>
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setKit(randomKit())}
              className="flex-1 btn-secondary text-sm py-2"
            >
              🎲 Randomize
            </button>
            <button
              onClick={() => setKit(DEFAULT_KIT)}
              className="flex-1 btn-secondary text-sm py-2"
            >
              ↩ Reset
            </button>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="flex-1 card overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[#30363d]">
            {(['jersey', 'shorts', 'socks'] as Section[]).map(s => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                  section === s
                    ? 'border-b-2 border-green-500 text-green-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {s === 'jersey' ? '🎽 Jersey' : s === 'shorts' ? '🩳 Shorts' : '🧦 Socks'}
              </button>
            ))}
          </div>

          <div className="p-4">
            {section === 'jersey' && (
              <JerseyEditor jersey={kit.jersey} onChange={j => setKit(k => ({ ...k, jersey: j }))} />
            )}
            {section === 'shorts' && (
              <PieceEditor
                piece={kit.shorts}
                label="Shorts"
                onChange={p => setKit(k => ({ ...k, shorts: p }))}
              />
            )}
            {section === 'socks' && (
              <PieceEditor
                piece={kit.socks}
                label="Socks"
                onChange={p => setKit(k => ({ ...k, socks: p }))}
              />
            )}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-4">
        {savedMsg && (
          <span className={`text-sm ${savedMsg.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>
            {savedMsg}
          </span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary px-8 py-2.5"
        >
          {saving ? '⏳ Saving…' : '💾 Save Kit'}
        </button>
      </div>
    </div>
  );
}
