import {ImageResponse} from 'next/og'
export const size={width:512,height:512}
export const contentType='image/png'
export default function Icon(){return new ImageResponse(<svg width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#071b30"/><path d="M126 96h260v76H214v62h146v76H214v106h-88z" fill="#fff"/><circle cx="379" cy="386" r="55" fill="#1677d2"/><path d="m353 386 18 18 36-42" fill="none" stroke="#fff" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round"/></svg>,size)}
