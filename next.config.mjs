/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/pending': ['./credit-card/**/*'],
      '/pending/[yyyymm]': ['./credit-card/**/*'],
    },
  },
};

export default nextConfig;
