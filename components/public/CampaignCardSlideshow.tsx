"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

type Slide = {
  src: string
  alt: string
  fit?: "contain" | "cover"
}

const passthroughLoader = ({ src }: { src: string }) => src

export function CampaignCardSlideshow({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (slides.length < 2) return
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length)
    }, 3600)
    return () => window.clearInterval(timer)
  }, [slides.length])

  if (!slides.length) {
    return <div className="pub-campaign-image"><span>FUNDRAISER</span></div>
  }

  return (
    <div className="pub-campaign-image pub-campaign-slideshow">
      {slides.map((slide, index) => (
        <Image
          key={slide.src}
          className={[index === active ? "is-active" : "", slide.fit === "contain" ? "is-logo" : ""].filter(Boolean).join(" ")}
          src={slide.src}
          alt={slide.alt}
          fill
          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
          loader={passthroughLoader}
          unoptimized
        />
      ))}
      {slides.length > 1 && (
        <div className="pub-slide-dots" aria-hidden="true">
          {slides.map((slide, index) => <i className={index === active ? "is-active" : ""} key={slide.src} />)}
        </div>
      )}
    </div>
  )
}
