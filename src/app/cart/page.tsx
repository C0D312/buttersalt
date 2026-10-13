import {CartPage} from '@/components/cart-page';
export const metadata={title:'Your bag',robots:{index:false,follow:false},alternates:{canonical:'/cart'}};
export default function Page(){return <><section className="page-intro compact"><span className="eyebrow">GOOD CHOICES, ALL ROUND.</span><h1>Your <em>bag.</em></h1></section><CartPage/></>;}
