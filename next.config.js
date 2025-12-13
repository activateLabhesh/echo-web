/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    domains: [
      'remwzcalhvoaubuhuzan.supabase.co',
      'lh3.googleusercontent.com',  // Google profile pictures
      'googleusercontent.com',       // Google images
    ],
  },
};

module.exports = nextConfig
