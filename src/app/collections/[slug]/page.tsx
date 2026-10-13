import {notFound} from 'next/navigation';
import {Shop} from '@/components/shop';
import {getCatalogue} from '@/lib/catalogue-server';
export function generateStaticParams(){return[{slug:'sweet'},{slug:'savoury'}];}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const{slug}=await params;return{title:`Something ${slug}`,description:`Discover buttersalt ${slug} popcorn flavours.`,alternates:{canonical:`/collections/${slug}`}};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const{slug}=await params;if(!['sweet','savoury'].includes(slug))notFound();const{products}=await getCatalogue();return <><section className={`page-intro ${slug==='sweet'?'pink':''}`}><span className="eyebrow">FOLLOW YOUR FLAVOUR</span><h1>Something<br/><em>{slug}.</em></h1><p>{slug==='sweet'?'For the sweet tooth in all of us. A little indulgence, by the handful.':'Bold, bright and beautifully moreish. Meet your savoury side.'}</p></section><Shop products={products} initial={slug}/></>;}
