import Navbar from './Navbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/30 px-4">
        <p>BrickVault is an unofficial LEGO fan app. Not affiliated with, endorsed by, or connected to the LEGO Group, BrickLink, or any official LEGO entity.</p>
        <p className="mt-1">LEGO® is a trademark of the LEGO Group. All set images are property of their respective owners.</p>
        <p className="mt-2">© 2024 BrickVault · <a href="/privacy" className="hover:text-white/60">Privacy</a> · <a href="/terms" className="hover:text-white/60">Terms</a></p>
      </footer>
    </div>
  );
}
