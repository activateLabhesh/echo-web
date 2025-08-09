/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    domains: ['remwzcalhvoaubuhuzan.supabase.co'],
  },
};

module.exports = nextConfig
