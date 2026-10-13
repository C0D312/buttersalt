import {ContactForm} from '@/components/contact-form';
export const metadata={title:'Say hello',description:'Get in touch with buttersalt for questions, ideas and enquiries.',alternates:{canonical:'/contact'}};
export default function Page(){return <section className="section enquiry-section contact-page"><div><span className="eyebrow">WE’RE ALL EARS.</span><h1>A little<br/><em>hello.</em></h1><p>A question, a bright idea, or just a love of popcorn. Leave us a note.</p><p className="fineprint">Business contact details will be added before public launch.</p></div><ContactForm/></section>;}
