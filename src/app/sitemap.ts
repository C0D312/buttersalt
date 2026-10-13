import type {MetadataRoute} from 'next';
import {products} from '@/lib/catalogue';
export const dynamic='force-static';
export default function sitemap():MetadataRoute.Sitemap{if(process.env.INDEXING_ENABLED!=='true')return[];const origin=process.env.NEXT_PUBLIC_SITE_URL;return['','/shop','/bundles','/gifts','/about','/faq','/contact','/build-a-box',...products.filter(p=>p.verified).map(p=>`/products/${p.slug}`)].map(path=>({url:`${origin}${path}`}));}
