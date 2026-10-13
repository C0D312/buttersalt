import {getCatalogue} from '@/lib/catalogue-server';
import {BoxBuilder} from '@/components/box-builder';
export const metadata={title:'Build your own box',description:'Choose six buttersalt popcorn bags and create a collection that is entirely your taste.',alternates:{canonical:'/build-a-box'}};
export default async function Page(){const{products}=await getCatalogue();return <><section className="page-intro compact"><span className="eyebrow">THE BEST KIND OF PICK & MIX</span><h1>Your box.<br/><em>Your happy place.</em></h1><p>Six bags. Eight flavour concepts. Endless good combinations.</p></section><BoxBuilder products={products.filter(p=>!p.isBundle)}/></>;}
