import {notFound} from 'next/navigation';
import {getStoreContent} from '@/lib/catalogue-server';
import type {PolicyKey} from '@/lib/content';
const keys=['shipping','returns','privacy','terms'];
export function generateStaticParams(){return keys.map(policy=>({policy}));}
export async function generateMetadata({params}:{params:Promise<{policy:string}>}){const{policy}=await params;return{title:policy.charAt(0).toUpperCase()+policy.slice(1),alternates:{canonical:`/${policy}`}};}
export default async function Page({params}:{params:Promise<{policy:string}>}){const{policy}=await params;if(!keys.includes(policy))notFound();const{policies}=await getStoreContent(),p=policies[policy as PolicyKey];return <section className="section policy-page"><span className="eyebrow">THE DETAILS</span><h1>{p.title}</h1><span className="policy-status">{p.status}</span>{p.paragraphs.map((s,i)=><p key={i}>{s}</p>)}</section>;}
