/** @type {import('next').NextConfig} */
const BACKEND_PORT = process.env.VITE_BACKEND_PORT || process.env.BACKEND_PORT || "8080"
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`

const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  output: "export",
  distDir: "dist",
  // Dev-only: proxy /api/* and auth endpoints to the Spring backend.
  // Rewrites are ignored by `next build --export` but active during `next dev`.
  async rewrites() {
    return [
      // Strip /api prefix, matching nginx: rewrite ^/api(/.*) $1 break
      { source: "/api/:path*", destination: `${BACKEND_URL}/:path*` },
      { source: "/login/:path*", destination: `${BACKEND_URL}/login/:path*` },
      { source: "/logout", destination: `${BACKEND_URL}/logout` },
      { source: "/oauth2/:path*", destination: `${BACKEND_URL}/oauth2/:path*` },
    ]
  },
}

export default nextConfig
