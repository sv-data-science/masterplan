'use client';
import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

const EMOJIS = ['❤️', '😂', '🔥', '🙈', '😮'];

interface MemeData {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  image_data: string;
  created_at: string;
  reactions: Record<string, number>;
  my_reactions: string[];
}

async function compressImage(file: File, maxBytes = 1_800_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const max = 1200;
      if (width > max || height > max) {
        const ratio = Math.min(max / width, max / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      const tryEncode = () => {
        const data = canvas.toDataURL('image/jpeg', quality);
        if (data.length <= maxBytes || quality <= 0.3) {
          resolve(data);
        } else {
          quality -= 0.1;
          tryEncode();
        }
      };
      tryEncode();
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function MemesPage() {
  const { user, token } = useAuthStore();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const { data: memes = [], isLoading } = useQuery<MemeData[]>({
    queryKey: ['memes'],
    queryFn: () => api.get('/memes').then(r => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const reactMutation = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) =>
      api.post(`/memes/${id}/react`, { emoji }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/memes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memes'] }),
  });

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file.');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const data = await compressImage(file);
      await api.post('/memes', { image_data: data });
      qc.invalidateQueries({ queryKey: ['memes'] });
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail ?? 'Upload failed. Try a smaller image.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [qc]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">😂 Memes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Upload football memes · React with emoji · No text</p>
        </div>
        {user && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-primary flex items-center gap-2"
            >
              {uploading ? (
                <><span className="animate-spin">⏳</span> Uploading…</>
              ) : (
                <>📤 Upload Meme</>
              )}
            </button>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg px-4 py-3 text-red-400 text-sm">
          {uploadError}
        </div>
      )}

      {!user && (
        <div className="card p-6 text-center text-gray-400">
          <div className="text-3xl mb-2">🔐</div>
          <p>Log in to upload memes and react.</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12 text-gray-500">Loading memes…</div>
      )}

      {!isLoading && memes.length === 0 && (
        <div className="card p-10 text-center text-gray-500">
          <div className="text-5xl mb-3">😶</div>
          <p className="text-lg font-medium">No memes yet!</p>
          <p className="text-sm mt-1">Be the first to upload one.</p>
        </div>
      )}

      {memes.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {memes.map(meme => (
            <div key={meme.id} className="break-inside-avoid card overflow-hidden">
              {/* Image */}
              <div className="relative group">
                <img
                  src={meme.image_data}
                  alt="meme"
                  className="w-full object-cover"
                  loading="lazy"
                />
                {/* Delete overlay for own memes */}
                {(user?.id === meme.user_id || user?.is_admin) && (
                  <button
                    onClick={() => { if (confirm('Delete this meme?')) deleteMutation.mutate(meme.id); }}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-red-700 text-white rounded-full w-7 h-7 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Footer: uploader + reactions */}
              <div className="p-3">
                <div className="text-xs text-gray-500 mb-2">
                  <span className="text-gray-400 font-medium">{meme.display_name}</span>
                  {' · '}
                  {new Date(meme.created_at).toLocaleDateString()}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJIS.map(emoji => {
                    const count = meme.reactions[emoji] ?? 0;
                    const active = meme.my_reactions.includes(emoji);
                    return (
                      <button
                        key={emoji}
                        onClick={() => user && reactMutation.mutate({ id: meme.id, emoji })}
                        disabled={!user}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition-all ${
                          active
                            ? 'border-green-500 bg-green-900/30 text-green-300'
                            : count > 0
                            ? 'border-[#30363d] bg-[#21262d] text-gray-300 hover:border-gray-500'
                            : 'border-[#21262d] bg-transparent text-gray-600 hover:border-[#30363d] hover:text-gray-400'
                        } ${!user ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span className="text-xs font-medium">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
