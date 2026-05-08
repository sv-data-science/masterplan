/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.brickset.com', 'img.bricklink.com', 'cdn.rebrickable.com', 'localhost'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.brickset.com' },
      { protocol: 'https', hostname: '**.rebrickable.com' },
    ],
  },
};
export default nextConfig;
