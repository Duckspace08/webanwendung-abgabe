/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@webanwendung/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
