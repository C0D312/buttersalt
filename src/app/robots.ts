import type {MetadataRoute} from 'next';
export const dynamic='force-static';
export default function robots():MetadataRoute.Robots{return{rules:{userAgent:'*',...(process.env.INDEXING_ENABLED==='true'?{allow:'/',disallow:['/cart','/checkout','/account','/api/']}:{disallow:'/'})},...(process.env.INDEXING_ENABLED==='true'?{sitemap:`${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`}:{})};}
