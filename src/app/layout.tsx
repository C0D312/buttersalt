import type {Metadata,Viewport} from 'next';
import localFont from 'next/font/local';
import {Shell} from '@/components/shell';
import {Vitals} from '@/components/vitals';
import './globals.css';
const sans=localFont({src:'../../public/fonts/DMSans-Variable.woff2',variable:'--font-sans',display:'swap',weight:'100 1000'});
const serif=localFont({src:'../../public/fonts/Fraunces-Variable.woff2',variable:'--font-serif',display:'swap',weight:'100 900',preload:true});
const origin=process.env.NEXT_PUBLIC_SITE_URL||'https://buttersalt.kamal23q.chatgpt.site';
export const metadata:Metadata={metadataBase:new URL(origin),title:{default:'buttersalt — little kernels. big feelings.',template:'%s | buttersalt'},description:'Popcorn with personality. Explore the buttersalt collection of sweet, savoury and delightfully unexpected flavour concepts.',robots:{index:process.env.INDEXING_ENABLED==='true',follow:process.env.INDEXING_ENABLED==='true'},openGraph:{type:'website',siteName:'buttersalt',locale:'en_AU',images:[{url:'/brand/social-card.png',width:1200,height:630,alt:'buttersalt — little kernels. big feelings.'}]},twitter:{card:'summary_large_image'},icons:{icon:[{url:'/brand/favicon.svg',type:'image/svg+xml'},{url:'/brand/favicon.ico'}],apple:'/brand/apple-touch-icon.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#F6CD45'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-AU" className={`${sans.variable} ${serif.variable}`}><body><Shell>{children}</Shell><Vitals/></body></html>;}
