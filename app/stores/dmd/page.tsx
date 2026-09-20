import {redirect} from "next/navigation"
import {DMD_SLUG} from "@/lib/branding/dmd"
export default function Page(){redirect("/fundraisers/"+DMD_SLUG)}
