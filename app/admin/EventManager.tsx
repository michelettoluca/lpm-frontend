"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminError, ManagedEvent, Season } from "@/app/lib/adminTypes";
import { callAdmin } from "./client";
import { ErrorPanel } from "./ErrorPanel";
import { CONTROL } from "./fields";

export function EventManager({apiKey, seasons, seasonId, events, onEvents}: {
 apiKey:string; seasons:Season[]; seasonId:number|null; events:ManagedEvent[]; onEvents:(events:ManagedEvent[])=>void;
}) {
 const [editing,setEditing]=useState<ManagedEvent|null>(null);
 const [name,setName]=useState("");
 const [format,setFormat]=useState("Pauper");
 const [date,setDate]=useState("");
 const [targetSeason,setTargetSeason]=useState("");
 const [pending,setPending]=useState(false);
 const [error,setError]=useState<AdminError|null>(null);
 const [message,setMessage]=useState("");
 const [deleting,setDeleting]=useState<ManagedEvent|null>(null);
 function clear() {setEditing(null);setName("");setDate("");setFormat("Pauper");setTargetSeason("");}
 async function refresh() {
  setPending(true);setError(null);
  const res=await callAdmin<ManagedEvent[]>("/api/admin/events",apiKey,{method:"GET"});
  setPending(false);if(res.ok) {onEvents(res.data);setMessage("Elenco aggiornato.");} else setError(res.error);
 }
 async function save(e:React.FormEvent) {
  e.preventDefault();setPending(true);setError(null);setMessage("");
  const res=await callAdmin<ManagedEvent>(`/api/admin/events${editing ? `?id=${editing.id}` : ""}`,apiKey,{
   method:editing ? "PUT":"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({name,format,played_at:new Date(date).toISOString(),season_id:Number(targetSeason || seasonId)}),
  });
  setPending(false);if(res.ok){onEvents([...events.filter(e=>e.id!==res.data.id),res.data]);clear();setMessage("Evento salvato.");}else setError(res.error);
 }
 async function remove() {
  if(!deleting)return;setPending(true);setError(null);
  const res=await callAdmin<{deleted_event_id:number}>(`/api/admin/events?id=${deleting.id}`,apiKey,{method:"DELETE"});
  setPending(false);if(res.ok){onEvents(events.filter(e=>e.id!==deleting.id));if(editing?.id===deleting.id)clear();setDeleting(null);setMessage("Evento eliminato.");}else setError(res.error);
 }
 function edit(event:ManagedEvent) {
  setEditing(event);setName(event.name);setFormat(event.format??"");setTargetSeason(String(event.season_id));
  const d=new Date(event.played_at);setDate(new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16));
 }
 return <section className="mb-10">
  <h2 className="text-[16px] font-extrabold uppercase tracking-[0.08em]">Gestione eventi</h2>
  <p className="mt-2 text-[13px] text-ink/55">Crea le prossime tappe, poi seleziona l&apos;evento per importarne i risultati.</p>
  <button type="button" className="my-3 font-bold text-accent disabled:opacity-40" disabled={!apiKey||pending} onClick={()=>void refresh()}>Carica / aggiorna eventi</button>
  <ul className="space-y-3">
   {[...events].sort((a,b)=>a.played_at.localeCompare(b.played_at)).map(event=><li key={event.id} className="card p-3 text-sm">
    <Link href={`/events/${event.id}`} className="font-bold">{event.name}</Link>
    <p className="text-ink/55">{new Date(event.played_at).toLocaleString("it-IT")} · {seasons.find(s=>s.id===event.season_id)?.name} · {event.has_results?"Risultati importati":"Senza risultati"}</p>
    <div className="mt-2 flex gap-4"><button type="button" disabled={pending} onClick={()=>edit(event)}>Modifica</button><button type="button" disabled={pending||!apiKey} className="text-accent" onClick={()=>setDeleting(event)}>Elimina</button></div>
   </li>)}
  </ul>
  {deleting && <div role="alert" className="card mt-3 p-4"><p>Eliminare “{deleting.name}”? Anche i suoi match e risultati saranno eliminati.</p><div className="mt-3 flex gap-4"><button disabled={pending} onClick={()=>setDeleting(null)}>Annulla</button><button disabled={pending||!apiKey} className="font-bold text-accent" onClick={()=>void remove()}>Conferma eliminazione</button></div></div>}
  <form onSubmit={save} className="card mt-4 space-y-3 p-4">
   <h3 className="font-bold">{editing ? "Modifica evento":"Nuovo evento"}</h3>
   <label className="block text-sm">Stagione<select className={CONTROL} value={targetSeason||seasonId||""} onChange={e=>setTargetSeason(e.target.value)} required disabled={pending}><option value="">Seleziona stagione</option>{seasons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label className="block text-sm">Nome<input className={CONTROL} required value={name} onChange={e=>setName(e.target.value)} disabled={pending}/></label>
   <label className="block text-sm">Formato<input className={CONTROL} value={format} onChange={e=>setFormat(e.target.value)} disabled={pending}/></label>
   <label className="block text-sm">Data e ora<input className={CONTROL} type="datetime-local" required value={date} onChange={e=>setDate(e.target.value)} disabled={pending}/></label>
   <button type="submit" className="rounded-xl bg-accent px-4 py-3 font-bold text-white disabled:opacity-40" disabled={pending||!apiKey||!name.trim()||!(targetSeason||seasonId)}>{pending?"Salvataggio…":"Salva evento"}</button>
   {editing&&<button type="button" className="ml-3" onClick={clear} disabled={pending}>Annulla</button>}
  </form>
  {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
  {error&&<ErrorPanel error={error}/>}
 </section>;
}
