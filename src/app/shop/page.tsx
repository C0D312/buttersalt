import {Shop} from '@/components/shop';
import {getCatalogue} from '@/lib/catalogue-server';
export const metadata={title:'Shop all popcorn',description:'Explore the buttersalt flavour family: sweet, savoury and good things together.',alternates:{canonical:'/shop'}};
export default async function Page(){const{products}=await getCatalogue();return <><section className="page-intro"><span className="eyebrow">A WHOLE WORLD OF HAPPY HANDFULS</span><h1>Good taste.<br/><em>Great company.</em></h1><p>From beautifully simple to gloriously unexpected.<br/>Find the flavour that feels like you.</p></section><Shop products={products}/></>;}
