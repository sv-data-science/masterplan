'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Save, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    setDisplayName(user.display_name || '');
    setBio(user.bio || '');
    setIsPublic(user.is_public ?? true);
  }, [user, router]);

  const saveMutation = useMutation({
    mutationFn: () =>
      usersApi.updateProfile({ display_name: displayName, bio, is_public: isPublic }).then((r) => r.data),
    onSuccess: (data) => {
      setUser(data);
      toast.success('Settings saved');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to save');
    },
  });

  if (!user) return null;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-white mb-2">Settings</h1>
        <p className="text-white/50 mb-8">Manage your profile and privacy preferences</p>

        <div className="space-y-6">
          {/* Profile */}
          <div className="card p-6">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <UserIcon size={16} /> Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={100}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Username</label>
                <input
                  type="text"
                  value={`@${user.username}`}
                  disabled
                  className="input-field w-full opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-white/40 mt-1">Usernames cannot be changed.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Tell other collectors about yourself..."
                  className="input-field w-full resize-none"
                />
                <p className="text-xs text-white/40 mt-1">{bio.length} / 500</p>
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="card p-6">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              {isPublic ? <Eye size={16} /> : <EyeOff size={16} />} Privacy
            </h2>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className="w-full flex items-center justify-between text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div>
                <div className="font-medium text-white">Public profile</div>
                <div className="text-sm text-white/50 mt-0.5">
                  {isPublic
                    ? 'Anyone can view your profile, collection, and MOCs'
                    : 'Only you can see your profile and collection'}
                </div>
              </div>
              <div
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  isPublic ? 'bg-lego-red' : 'bg-white/20'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    isPublic ? 'translate-x-5' : ''
                  }`}
                />
              </div>
            </button>
            <p className="text-xs text-white/40 mt-3">
              You can hide collection values, individual rare items, and your wishlist on your profile page (coming soon).
            </p>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !displayName.trim()}
              className="btn-primary flex items-center gap-2 px-6 disabled:opacity-50"
            >
              <Save size={16} />
              {saveMutation.isPending ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
