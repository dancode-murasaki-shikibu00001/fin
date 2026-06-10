/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  // output:'export' and the backend/static distDir are only valid for `next build`
  // (static export). During `next dev` they cause Next to write server-runtime
  // artefacts into backend/static, corrupting tracked files and then failing to
  // find its own modules. In dev, fall back to the default .next directory.
  ...(isProd && {
    output: 'export',
    distDir: '../backend/static',
  }),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
