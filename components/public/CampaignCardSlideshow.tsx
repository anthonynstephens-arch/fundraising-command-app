"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"

type Slide = {
  src: string
  alt: string
  fit?: "contain" | "cover"
}

const passthroughLoader = ({ src }: { src: string }) => src

export function CampaignCardSlideshow({ slides,href,label }: { slides: Slide[];href:string;label:string }) {
  const [active, setActive] = useState(0)
  const [paused,setPaused]=useState(false)
  const [reduced,setReduced]=useState(false)
  useEffect(()=>{const media=window.matchMedia("(prefers-reduced-motion: reduce)");const sync=()=>setReduced(media.matches);sync();media.addEventListener("change",sync);return()=>media.removeEventListener("change",sync)},[])

  useEffect(() => {
    if (slides.length < 2 || paused || reduced) return
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length)
    }, 3600)
    return () => window.clearInterval(timer)
  }, [slides.length,paused,reduced])

  if (!slides.length) {
    return <Link href={href} aria-label={label} className="pub-campaign-image"><span>FUNDRAISER</span></Link>
  }

  return (
    <div className="pub-campaign-image pub-campaign-slideshow">
      {slides.map((slide, index) => (
        <Image
          key={slide.src}
          className={[index === active ? "is-active" : "", slide.fit === "contain" ? "is-logo" : ""].filter(Boolean).join(" ")}
          src={slide.src}
          alt={index===active?slide.alt:""}
          aria-hidden={index!==active}
          fill
          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
          loader={passthroughLoader}
          unoptimized
        />
      ))}
      <Link href={href} aria-label={label} className="pub-slide-link"/>
      {slides.length > 1 && <button type="button" className="pub-slide-pause" onClick={event=>{event.preventDefault();event.stopPropagation();reduced?setActive(current=>(current+1)%slides.length):setPaused(p=>!p)}} aria-label={reduced?"Next image":paused?"Resume slideshow":"Pause slideshow"}>{reduced?"Next image":paused?"Play":"Pause"}</button>}
      {slides.length > 1 && (
        <div className="pub-slide-dots" aria-hidden="true">
          {slides.map((slide, index) => <i className={index === active ? "is-active" : ""} key={slide.src} />)}
        </div>
      )}
    </div>
  )
}
