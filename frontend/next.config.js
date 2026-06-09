/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: '../backend/static',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
