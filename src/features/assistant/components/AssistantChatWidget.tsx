import {useState,type FormEvent,type KeyboardEvent} from "react"
import {LoaderCircle,MessageCircle,RotateCcw,Send,Sparkles} from "lucide-react"
import {useParams,useLocation} from "react-router-dom"
import {useAssistantChat} from "../hooks/useAssistantChat"
import {formatAssistantMessage,shouldShowAssistantReferences} from "../formatMessage"
import {ReferenceLinks} from "./ReferenceLinks"
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from "@/shared/components/ui/sheet"
const prompts=["What is the status of my latest booking?","What documents are still missing?","Where is my transport now?"]
export function AssistantChatWidget(){
 const {bookingId}=useParams<{bookingId?:string}>(),location=useLocation(),[open,setOpen]=useState(location.pathname==="/assistant"),[draft,setDraft]=useState("")
 const {messages,loading,error,send,retry}=useAssistantChat(bookingId)
 async function submit(e?:FormEvent){e?.preventDefault();const text=draft.trim();if(!text||loading||text.length>1000)return;setDraft("");await send(text)}
 function keyDown(e:KeyboardEvent<HTMLTextAreaElement>){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void submit()}}
 return <>
 <button type="button" onClick={()=>setOpen(true)} aria-label="Open Pegaxus AI assistant" className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-[#f39200] text-white shadow-lg hover:scale-105 hover:bg-[#db8000] focus-visible:outline-2"><MessageCircle className="size-6"/></button>
 <Sheet open={open} onOpenChange={setOpen}><SheetContent side="right" aria-describedby="assistant-description" className="w-full gap-0 p-0 sm:max-w-[440px]">
 <SheetHeader className="border-b border-slate-200 pr-12"><SheetTitle className="flex items-center gap-2"><Sparkles className="size-4 text-orange-600"/>Pegaxus AI</SheetTitle><SheetDescription id="assistant-description">Ask about your bookings, required documents, or transport progress.</SheetDescription></SheetHeader>
 <div className="flex min-h-0 flex-1 flex-col"><div className="flex-1 space-y-4 overflow-y-auto px-4 py-5" role="log" aria-live="polite" aria-label="Chat messages">
 {!messages.length?<div className="space-y-4 pt-3"><p className="text-sm text-slate-600">I can look up your bookings, dossier requirements, and transport updates.</p>{prompts.map(p=><button key={p} type="button" onClick={()=>void send(p)} disabled={loading} className="mb-2 block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-orange-50">{p}</button>)}</div>:messages.map((m,i)=><article key={m.createdAt+i} className={m.role==="user"?"ml-8 rounded-2xl bg-orange-500 px-3.5 py-3 text-sm text-white":"mr-3 rounded-2xl bg-slate-100 px-3.5 py-3 text-sm text-slate-800"}><p className="whitespace-pre-wrap break-words">{m.role==="model"?formatAssistantMessage(m.content):m.content}</p>{m.references?.length&&shouldShowAssistantReferences(m.content)?<ReferenceLinks references={m.references}/>:null}<time className="mt-2 block text-[10px] opacity-70" dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</time></article>)}
 {loading?<div className="flex items-center gap-2 text-sm text-slate-500" role="status"><LoaderCircle className="size-4 animate-spin"/>Checking your Pegaxus records...</div>:null}</div>
 <div className="border-t border-slate-200 p-4">{error?<div className="mb-3 flex justify-between rounded bg-red-50 p-2 text-xs text-red-800" role="alert"><span>{error}</span><button type="button" onClick={()=>void retry()} disabled={loading} className="underline"><RotateCcw className="inline size-3"/> Retry</button></div>:null}
 <form onSubmit={e=>void submit(e)} className="flex items-end gap-2"><label htmlFor="assistant-message" className="sr-only">Your message</label><textarea id="assistant-message" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={keyDown} maxLength={1000} rows={2} placeholder="Ask Pegaxus AI..." disabled={loading} className="min-h-11 flex-1 resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 disabled:bg-slate-50"/><button type="submit" disabled={loading||!draft.trim()||draft.length>1000} aria-label="Send message" className="flex size-11 items-center justify-center rounded-lg bg-[#f39200] text-white disabled:opacity-50">{loading?<LoaderCircle className="size-4 animate-spin"/>:<Send className="size-4"/>}</button></form><p className="mt-1.5 text-right text-[10px] text-slate-500">{draft.length}/1000 | Enter to send, Shift+Enter for new line</p></div></div>
 </SheetContent></Sheet></>}



