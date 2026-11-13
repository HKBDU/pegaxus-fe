import { useCallback, useState } from "react"
import { sendAssistantMessage } from "../services"
import type { AssistantMessage } from "../types"
const now = () => new Date().toISOString()
export function useAssistantChat(bookingId?: string) {
 const [messages,setMessages]=useState<AssistantMessage[]>([])
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState<string|null>(null)
 const [retryText,setRetryText]=useState<string|null>(null)
 const send=useCallback(async(content:string,retryExisting=false)=>{
  const text=content.trim();if(!text||loading)return
  setError(null);setRetryText(null)
  const next=retryExisting?messages:[...messages,{role:"user" as const,content:text,createdAt:now()}]
  setMessages(next);setLoading(true)
  try{
   const requestMessages=next.slice(-20).map(({role,content:body})=>({role,content:body}))
   const result=await sendAssistantMessage({messages:requestMessages,...(bookingId?{bookingId}:{})})
   setMessages([...next,{role:"model",content:result.reply,createdAt:now(),references:result.references}])
  }catch(cause){
   const code=cause instanceof Error?cause.message:"ASSISTANT_ERROR"
   setError(code==="GEMINI_TIMEOUT"?"Pegaxus AI is taking too long. Try again.":code==="GEMINI_UNAVAILABLE"?"Pegaxus AI is temporarily unavailable. Try again.":"Your message could not be sent. Please try again.")
   setRetryText(text)
  }finally{setLoading(false)}
 },[bookingId,loading,messages])
 const retry=useCallback(()=>retryText&&send(retryText,true),[retryText,send])
 return{messages,loading,error,send,retry}
}
