/** @type {import('next').NextConfig} */
const remoteImageHosts = [
  "assets.bwbx.io",
  "cloudfront-us-east-2.images.arcpublishing.com",
  "image.cnbcfm.com",
  "images.wsj.net",
  "media.zenfs.com",
  "placehold.co",
  "s.yimg.com",
  "static.reuters.com",
  "static.seekingalpha.com",
];

const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: remoteImageHosts.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
  },
  serverExternalPackages: ["yahoo-finance2"],
};

export default nextConfig;
