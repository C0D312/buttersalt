'use client';
import {useReportWebVitals} from 'next/web-vitals';
export function Vitals(){useReportWebVitals(metric=>{const endpoint=process.env.NEXT_PUBLIC_VITALS_ENDPOINT;if(!endpoint)return;try{const url=new URL(endpoint,window.location.origin);if(url.origin!==window.location.origin)return;navigator.sendBeacon(url.pathname,JSON.stringify({name:metric.name,value:metric.value,rating:metric.rating,id:metric.id,path:window.location.pathname}));}catch{/* Telemetry never blocks shopping. */}});return null;}
