import type {Metadata,Viewport} from 'next';
import localFont from 'next/font/local';
import {Shell} from '@/components/shell';
import {Vitals} from '@/components/vitals';
import {sitePath} from '@/lib/site-path';
import './globals.css';
const sans=localFont({src:'../../public/fonts/DMSans-Latin.woff2',variable:'--font-sans',display:'swap',weight:'100 1000'});
const serif=localFont({src:'../../public/fonts/Fraunces-Latin.woff2',variable:'--font-serif',display:'swap',weight:'450',preload:false});
const origin=process.env.NEXT_PUBLIC_SITE_URL||'https://buttersalt.kamal23q.chatgpt.site';
export const metadata:Metadata={metadataBase:new URL(origin),title:{default:'buttersalt — little kernels. big feelings.',template:'%s | buttersalt'},description:'Popcorn with personality. Explore the buttersalt collection of sweet, savoury and delightfully unexpected flavour concepts.',robots:{index:process.env.INDEXING_ENABLED==='true',follow:process.env.INDEXING_ENABLED==='true'},openGraph:{type:'website',siteName:'buttersalt',locale:'en_AU',images:[{url:new URL(sitePath('/brand/social-card.png'),origin).toString(),width:1200,height:630,alt:'buttersalt — little kernels. big feelings.'}]},twitter:{card:'summary_large_image'},icons:{icon:[{url:sitePath('/brand/favicon.svg'),type:'image/svg+xml'},{url:sitePath('/brand/favicon.ico')}],apple:sitePath('/brand/apple-touch-icon.png')}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#F6CD45'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-AU" className={`${sans.variable} ${serif.variable}`}><body><Shell>{children}</Shell><Vitals/></body></html>;}
