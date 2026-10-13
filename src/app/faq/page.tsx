import Link from 'next/link';
import {faqs} from '@/lib/content';
import {Icon} from '@/components/icons';
export const metadata={title:'A few good questions',description:'Answers about buttersalt popcorn concepts, mixed boxes, dietary information and delivery.',alternates:{canonical:'/faq'}};
export default function Page(){return <section className="section faq-page"><div><span className="eyebrow">A LITTLE HELP</span><h1>Good<br/><em>questions.</em></h1><p>The things you might be wondering.</p><Link className="text-link arrow-link" href="/contact">Still curious? Get in touch<Icon name="arrow"/></Link></div><div className="detail-accordions">{faqs.map((f,i)=><details key={f.question} open={i===0}><summary>{f.question}<Icon name="plus"/></summary><p>{f.answer}</p></details>)}</div></section>;}
