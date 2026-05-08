import Link from 'next/link';
import { Package, Trophy, Star, Users, Shield, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

const features = [
  { icon: Package, title: 'Collection Tracker', desc: 'Catalog every set and minifigure you own, with condition, completeness, and acquisition details.' },
  { icon: Star, title: 'Collection Valuation', desc: 'Estimate your collection\'s secondary market value using aggregated pricing data.' },
  { icon: Trophy, title: 'Gamification & Achievements', desc: 'Earn XP, unlock badges, and climb leaderboards as you grow your collection.' },
  { icon: Users, title: 'Community Showcases', desc: 'Share your LEGO room, favorite builds, and MOCs with fellow collectors.' },
  { icon: Zap, title: 'Retirement Tracking', desc: 'Get alerts for retiring sets so you never miss adding a classic to your wishlist.' },
  { icon: Shield, title: 'Privacy Controls', desc: 'Full control over what you share. Keep your collection public, private, or anything in between.' },
];

const archetypes = [
  { emoji: '⚔️', name: 'Castle Master', desc: 'Medieval kingdoms dominate' },
  { emoji: '🚀', name: 'Star Wars Fanatic', desc: 'UCS sets & Clone Armies' },
  { emoji: '🏙️', name: 'Modular Architect', desc: 'Building the perfect city' },
  { emoji: '🦸', name: 'Marvel Champion', desc: 'Superhero collection goals' },
  { emoji: '🔩', name: 'Technic Engineer', desc: 'Gears, motors & complexity' },
  { emoji: '🎭', name: 'Minifigure Hunter', desc: 'CMF completionist life' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient opacity-80" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(218,41,28,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0,108,183,0.15) 0%, transparent 50%)' }} />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-lego-red/20 border border-lego-red/40 rounded-full px-4 py-1.5 text-sm text-lego-red mb-6">
            <Zap size={14} className="fill-current" /> Fan-made LEGO Companion App
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            Your LEGO Collection,
            <br />
            <span className="text-gradient">Brilliantly Organized</span>
          </h1>
          <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            BrickVault is the ultimate companion for LEGO collectors. Track sets, discover rare finds, earn achievements, and showcase your collection to the world.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-yellow text-lg px-8 py-4 flex items-center justify-center gap-2">
              Start Your Collection <ArrowRight size={20} />
            </Link>
            <Link href="/catalog" className="btn-secondary text-lg px-8 py-4">
              Browse Catalog
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/30">
            Free forever · No credit card required · Unofficial fan app
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/10 bg-white/5 py-8 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[['10,000+', 'LEGO Sets'], ['5,000+', 'Minifigures'], ['50+', 'Themes'], ['100+', 'Achievements']].map(([val, label]) => (
            <div key={label}>
              <div className="text-3xl font-black text-white">{val}</div>
              <div className="text-sm text-white/50 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="section-title text-center mb-4 text-4xl">Everything a Collector Needs</h2>
          <p className="text-muted text-center mb-16 text-lg">Built by LEGO fans, for LEGO fans.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-lego-red/20 flex items-center justify-center mb-4">
                  <Icon size={24} className="text-lego-red" />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">{title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Archetypes */}
      <section className="py-24 px-4 bg-white/5 border-y border-white/10">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="section-title text-4xl mb-4">Discover Your Collector Archetype</h2>
          <p className="text-muted mb-16 text-lg">Your collection tells a story. What kind of collector are you?</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {archetypes.map(({ emoji, name, desc }) => (
              <div key={name} className="card p-4 hover:bg-white/10 transition-all hover:-translate-y-1">
                <div className="text-4xl mb-3">{emoji}</div>
                <div className="font-bold text-white text-sm mb-1">{name}</div>
                <div className="text-white/50 text-xs">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-6">Ready to Build Your Digital Collection?</h2>
          <p className="text-white/60 mb-10 text-lg">Join thousands of LEGO enthusiasts tracking their collections on BrickVault.</p>
          <Link href="/register" className="btn-yellow text-xl px-10 py-5 inline-flex items-center gap-3">
            Create Free Account <ArrowRight size={22} />
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="bg-black/30 border-t border-white/10 py-6 px-4 text-center text-xs text-white/30">
        <p>BrickVault is an unofficial LEGO fan application and is NOT affiliated with, endorsed by, or connected to the LEGO Group, BrickLink, or any official LEGO entity. LEGO® is a registered trademark of the LEGO Group. This app is not a marketplace and does not facilitate buying or selling.</p>
      </div>
    </div>
  );
}
