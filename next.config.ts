import type { NextConfig } from 'next';
const staticPreview = process.env.BUTTERSALT_STATIC === '1';
const config: NextConfig = {
  ...(staticPreview ? { output: 'export', trailingSlash: true } : {}),
  images: { ...(staticPreview ? { loader: 'custom', loaderFile: './src/lib/static-image-loader.ts' } : {}), remotePatterns: [{protocol:'https',hostname:'cdn.shopify.com'}] },
  poweredByHeader: false,
  async headers() { return staticPreview ? [] : [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://cdn.shopify.com data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.myshopify.com"}]}]; }
};
export default config;
