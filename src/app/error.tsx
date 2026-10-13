'use client';
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <section className="section narrow-section"><span className="eyebrow">A LITTLE HICCUP</span><h1>Let’s try<br/>that again.</h1><p>We couldn’t load this page. Your saved bag is still in your browser.</p><button className="button" onClick={reset}>Try again</button></section>;}
