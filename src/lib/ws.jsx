import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const Ctx = createContext(null);
export const useWs = () => useContext(Ctx);
const KEY = "kairo-ws";
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* stockage indisponible */ } };

export function WsProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [list, setList] = useState(null);
  const [current, setCurrent] = useState(read());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    if (!session) { setList(null); return; }
    const { data } = await supabase.from("workspaces").select("*").order("created_at");
    setList(data ?? []);
  }, [session]);
  useEffect(() => { reload(); }, [reload]);

  const ws = list?.find((w) => w.id === current) ?? list?.[0] ?? null;
  const select = (id) => { setCurrent(id); write(id); };
  const create = async (name, website) => {
    const { data, error } = await supabase.rpc("create_workspace", { p_name: name ?? "", p_website: website ?? "" });
    if (error) throw new Error(error.message);
    select(data);
    await reload();
    return data;
  };
  const patch = async (fields) => {
    if (!Object.keys(fields).length) { await reload(); return; }
    const { error } = await supabase.from("workspaces").update(fields).eq("id", ws.id);
    if (error) throw new Error(error.message);
    await reload();
  };
  return <Ctx.Provider value={{ session, list, ws, select, create, reload, patch }}>{children}</Ctx.Provider>;
}
