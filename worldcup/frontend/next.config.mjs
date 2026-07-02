/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable build cache to force clean output on every Vercel deployment
  generateBuildId: async () => 'wc2026-' + process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || 'local',
};
export default nextConfig;
