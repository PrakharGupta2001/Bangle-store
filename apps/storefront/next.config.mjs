/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@daya/catalogue"],
  poweredByHeader: false,
  experimental: { globalNotFound: true },
};
export default config;
