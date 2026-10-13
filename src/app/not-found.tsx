import Link from 'next/link';
import {Icon} from '@/components/icons';
export default function NotFound(){return <section className="section narrow-section"><span className="eyebrow">404 · ONE THAT GOT AWAY</span><span className="pop-flower">✳</span><h1>A little<br/><em>off the trail.</em></h1><p>We couldn’t find that page. There’s plenty of good stuff back this way.</p><Link className="button" href="/shop">Find your flavour<Icon name="arrow"/></Link></section>;}
