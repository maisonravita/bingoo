import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Input } from "./ui";

export default function ProspectPicker({ value, onChange, placeholder = "Prospect (nom ou e-mail)" }) {
  const { ws } = useWs();
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(async () => {
      const s = q.replace(/[%,()]/g, "");
      const { data } = await supabase.from("prospects").select("*").eq("workspace_id", ws.id).or(`name.ilike.%${s}%,email.ilike.%${s}%,contact_name.ilike.%${s}%`).limit(6);
      setFound(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, ws.id]);
  if (value) return <p className="text-sm py-2">Prospect : <b>{value.name}</b> <button type="button" className="text-ink-soft underline ml-2" onClick={() => onChange(null)}>changer</button></p>;
  return (
    <div className="relative">
      <Input placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      {found.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-line rounded-xl shadow-lg overflow-hidden">
          {found.map((f) => <button type="button" key={f.id} className="block w-full text-left px-3 py-2 text-sm hover:bg-paper" onClick={() => { onChange(f); setFound([]); setQ(""); }}>{f.name} <span className="text-ink-soft">· {f.email || f.city}</span></button>)}
        </div>
      )}
    </div>
  );
}
