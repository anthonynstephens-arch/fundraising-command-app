import { permanentRedirect } from "next/navigation"

// Keep this campaign-specific short URL stable for shared posts and printed QR codes.
export function GET() {
  permanentRedirect("/fundraisers/bcfd-breast-cancer-fundraiser-2026")
}
