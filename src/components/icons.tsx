import type { SVGProps } from 'react';
export function Icon({name,...props}:SVGProps<SVGSVGElement>&{name:string}) {
 const paths:Record<string,React.ReactNode>={
  arrow:<><path d="M4 12h16M14 6l6 6-6 6"/></>,
  bag:<><path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
  search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  user:<><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  close:<><path d="m6 6 12 12M18 6 6 18"/></>,
  menu:<><path d="M3 7h18M3 12h18M3 17h18"/></>,
  plus:<><path d="M12 5v14M5 12h14"/></>,
  minus:<path d="M5 12h14"/>,
  check:<path d="m4 12 5 5L20 6"/>,
  chevron:<path d="m6 9 6 6 6-6"/>,
  star:<path d="m12 2 2.5 6.7L22 9l-6 4.6 2 7.4-6-4.3L6 21l2-7.4L2 9l7.5-.3L12 2Z"/>,
 };
 return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]??paths.arrow}</svg>;
}
