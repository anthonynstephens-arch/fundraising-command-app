"use client"
import {useEffect,useRef} from "react"
export function useDialogAccessibility<T extends HTMLElement>(open:boolean,onClose:()=>void){
 const ref=useRef<T>(null)
 const closeRef=useRef(onClose)
 closeRef.current=onClose
 useEffect(()=>{
  if(!open)return
  const previous=document.activeElement as HTMLElement|null
  const dialog=ref.current
  if(!dialog)return
  const priorOverflow=document.body.style.overflow
  document.body.style.overflow="hidden"
  const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex="0"]')).filter(el=>el.getClientRects().length>0)
  controls()[0]?.focus()
  const key=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();closeRef.current();return}
   if(event.key!=="Tab")return
   const list=controls(),first=list[0],last=list[list.length-1]
   if(!first){event.preventDefault();return}
   if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus()}
  }
  document.addEventListener("keydown",key)
  return ()=>{document.removeEventListener("keydown",key);document.body.style.overflow=priorOverflow;previous?.focus()}
 },[open])
 return ref
}
