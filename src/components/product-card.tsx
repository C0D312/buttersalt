import Image from 'next/image';
import Link from 'next/link';
import {formatPrice,type Product} from '@/lib/catalogue';
import {Icon} from './icons';
export function ProductCard({product:p}:{product:Product}){
 return <article className="product-card"><Link href={`/products/${p.slug}`} className="product-picture" style={{background:p.colour}}><Image src={p.image} alt={`${p.name}${p.verified?' packaging':' concept packaging'}`} width={800} height={800} sizes="(max-width: 850px) 45vw, 25vw"/><span className="card-category">{p.category==='bundles'?'The good stuff, together':p.category==='sweet'?'Something sweet':'Something savoury'}</span><span className="picture-arrow"><Icon name="arrow"/></span></Link><div className="product-card-info"><div><h3><Link href={`/products/${p.slug}`}>{p.shortName}</Link></h3><p>{p.note}</p></div><span>{p.variants.length?formatPrice(p.price,p.currencyCode):"Unavailable"}</span></div></article>;
}
