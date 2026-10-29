/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      // The job list moved into the admin (behind the sign-in).
      { source: "/", destination: "/admin/jobs", permanent: false },
      // Pages renamed in the 4.0 admin.
      { source: "/admin/scanners", destination: "/admin/sources", permanent: false },
      { source: "/admin/database", destination: "/admin/data", permanent: false },
    ];
  },
};

export default nextConfig;
