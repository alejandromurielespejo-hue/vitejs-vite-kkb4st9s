import React, { useState, useEffect, useCallback, useRef } from "react";

// ── CONFIGURACIÓN DE FIREBASE (ADAPTADA PARA VARIABLES DE ENTORNO) ──
const GetFirebaseURL = () => {
  const envUrl = process.env.REACT_APP_FIREBASE_URL || window._env_?.REACT_APP_FIREBASE_URL;
  if (envUrl && envUrl !== "TU_URL_DE_FIREBASE") return envUrl;
  return localStorage.getItem("mctablon_fb_url") || "SIN_CONFIGURAR";
};

async function fbGet(path) {
  const url = GetFirebaseURL();
  if (url === "SIN_CONFIGURAR") return null;
  const r = await fetch(`${url}/${path}.json`);
  return r.ok ? r.json() : null;
}
async function fbSet(path, data) {
  const url = GetFirebaseURL();
  if (url === "SIN_CONFIGURAR") return;
  await fetch(`${url}/${path}.json`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
async function fbPatch(path, data) {
  const url = GetFirebaseURL();
  if (url === "SIN_CONFIGURAR") return;
  await fetch(`${url}/${path}.json`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
async function fbDelete(path) {
  const url = GetFirebaseURL();
  if (url === "SIN_CONFIGURAR") return;
  await fetch(`${url}/${path}.json`, { method: "DELETE" });
}

// ── CONSTANTES Y UTILIDADES ─────────────────────────────────
const USER_ID = Math.random().toString(36).slice(2, 9);

const PALETTE = [
  "#7ec850","#c8a050","#aaaaaa","#50c8c8",
  "#e0c030","#ff6644","#c080ff","#ff8888",
  "#50d0ff","#ffaa44","#80ffaa","#ff50aa",
];
const DEFAULT_CATS = [
  { id:"edificios",   label:"Edificios",   icon:"🏠", color:"#c8a050" },
  { id:"monumentos",  label:"Monumentos",  icon:"🗿", color:"#aaaaaa" },
  { id:"comunidad",   label:"Comunidad",   icon:"👥", color:"#50c8c8" },
  { id:"granjas",     label:"Granjas",     icon:"🌾", color:"#e0c030" },
  { id:"redstone",    label:"Redstone",    icon:"⚡", color:"#ff6644" },
  { id:"exploracion", label:"Exploración", icon:"🧭", color:"#c080ff" },
];
const EMOJIS = ["🏠","🗿","👥","🌾","⚡","🧭","🌲","🏔","🌊","🔥","🛡","⚔","🎯","💎","🪙","🏰","🌙","🎪","🛖","🗺","🐉","🦅","🌟","🏗","🪵","🧱","🪨","🌈"];

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,5); }
function timeAgo(ts) {
  const d = Date.now()-ts;
  if (d<60000) return "ahora";
  if (d<3600000) return `${Math.floor(d/60000)}m`;
  if (d<86400000) return `${Math.floor(d/3600000)}h`;
  return `${Math.floor(d/86400000)}d`;
}

// ── COMPONENTES VISUALES (PIXEL ART) ─────────────────────────
const PixelBg = () => (
  <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
    <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,#1a3a5c 0%,#2d5a8e 40%,#1e3f2a 70%,#162d1e 100%)"}}/>
    {[...Array(30)].map((_,i)=>(
      <div key={i} style={{position:"absolute",width:i%3===0?3:2,height:i%3===0?3:2,
        background:"#fff",top:`${Math.random()*45}%`,left:`${Math.random()*100}%`,
        opacity:0.4+Math.random()*0.6,boxShadow:"0 0 2px #fff"}}/>
    ))}
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:32,display:"flex"}}>
      {[...Array(60)].map((_,i)=>(
        <div key={i} style={{width:"calc(100%/60)",height:"100%",
          background:i%7===0?"#4a7c37":i%5===0?"#6aaa4f":"#5a8e42",
          borderRight:"1px solid rgba(0,0,0,0.2)",borderTop:"2px solid rgba(255,255,255,0.1)"}}/>
      ))}
    </div>
    <div style={{position:"absolute",bottom:32,left:0,right:0,height:24,display:"flex"}}>
      {[...Array(60)].map((_,i)=>(
        <div key={i} style={{width:"calc(100%/60)",height:"100%",
          background:i%6===0?"#7a5230":i%4===0?"#6b4520":"#7a5530",
          borderRight:"1px solid rgba(0,0,0,0.15)"}}/>
      ))}
    </div>
  </div>
);

const PixelBtn = ({children,onClick,color="#4a7c37",small,disabled})=>(
  <button onClick={onClick} disabled={disabled} style={{
    background:color,border:"none",outline:"none",
    cursor:disabled?"not-allowed":"pointer",
    fontFamily:"'Press Start 2P',monospace",fontSize:small?8:10,
    color:"#fff",padding:small?"6px 10px":"10px 18px",
    boxShadow:"inset -3px -3px 0 rgba(0,0,0,0.4),inset 3px 3px 0 rgba(255,255,255,0.2),3px 3px 0 rgba(0,0,0,0.5)",
    lineHeight:1.4,transition:"transform 0.08s,box-shadow 0.08s",opacity:disabled?0.5:1,
  }}
  >{children}</button>
);

const MCInput=({value,onChange,placeholder,multiline,rows})=>{
  const s={width:"100%",boxSizing:"border-box",background:"#1a1a1a",
    border:"3px solid #555",borderRightColor:"#888",borderBottomColor:"#888",
    outline:"none",color:"#fff",fontFamily:"'Press Start 2P',monospace",
    fontSize:9,lineHeight:1.8,padding:"10px 12px",resize:"none",caretColor:"#7ec850"};
  return multiline
    ?<textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows||2} style={s}/>
    :<input value={value} onChange={onChange} placeholder={placeholder} style={s}/>;
};

export default function App() {
  const [items,setItems]           = useState([]);
  const [cats,setCats]             = useState(DEFAULT_CATS);
  const [activeTab,setActiveTab]   = useState("all");
  const [showForm,setShowForm]     = useState(false);
  const [showCatMgr,setShowCatMgr] = useState(false);
  const [newTitle,setNewTitle]     = useState("");
  const [newDesc,setNewDesc]       = useState("");
  const [newCat,setNewCat]         = useState("edificios");
  const [ncLabel,setNcLabel]       = useState("");
  const [ncIcon,setNcIcon]         = useState("🏠");
  const [ncColor,setNcColor]       = useState(PALETTE[0]);
  const [loading,setLoading]       = useState(true);
  const [toast,setToast]           = useState(null);
  const [pulseId,setPulseId]       = useState(null);
  const [confirmDel,setConfirmDel] = useState(null);
  const [online,setOnline]         = useState(true);
  const [inputUrl, setInputUrl]    = useState("");
  const pollRef = useRef(null);

  const fbUrlStatus = GetFirebaseURL();

  const loadAll = useCallback(async () => {
    if (GetFirebaseURL() === "SIN_CONFIGURAR") {
      setLoading(false);
      return;
    }
    try {
      const [rawItems, rawCats] = await Promise.all([
        fbGet("items"), fbGet("cats"),
      ]);
      if (rawItems) {
        const arr = Object.entries(rawItems).map(([id,v])=>({...v,id}));
        arr.sort((a,b)=>b.votes-a.votes);
        setItems(arr);
      } else { setItems([]); }
      if (rawCats) {
        const arr = Object.entries(rawCats).map(([id,v])=>({...v,id}));
        arr.sort((a,b)=>(a.order||0)-(b.order||0));
        setCats(arr);
      } else {
        const patch = {};
        DEFAULT_CATS.forEach((c,i)=>{ patch[c.id]={...c,order:i}; });
        await fbPatch("cats", patch);
        setCats(DEFAULT_CATS);
      }
      setOnline(true);
    } catch { setOnline(false); }
    setLoading(false);
  }, []);

  useEffect(()=>{
    loadAll();
    pollRef.current = setInterval(loadAll, 3000);
    return ()=>clearInterval(pollRef.current);
  },[loadAll]);

  const showToast=(msg,ok=true)=>{ setToast({msg,ok}); setTimeout(()=>setToast(null),2500); };

  const handleSaveManualUrl = () => {
    if(!inputUrl.trim()) return;
    let cleanUrl = inputUrl.trim();
    if(cleanUrl.endsWith("/")) cleanUrl = cleanUrl.slice(0, -1);
    localStorage.setItem("mctablon_fb_url", cleanUrl);
    showToast("¡Base de datos guardada!");
    setTimeout(() => window.location.reload(), 1000);
  };

  const addCategory = async () => {
    if (!ncLabel.trim()) return;
    const id = ncLabel.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")+"-"+generateId().slice(0,4);
    const nc = { id, label:ncLabel.trim(), icon:ncIcon, color:ncColor, order:cats.length };
    await fbSet(`cats/${id}`, nc);
    setNcLabel(""); setNcIcon("🏠"); setNcColor(PALETTE[0]);
    showToast("¡Categoría creada!");
    loadAll();
  };

  const deleteCategory = async (id) => {
    await fbDelete(`cats/${id}`);
    const remaining = cats.filter(c=>c.id!==id);
    const fallback = remaining[0]?.id || "misc";
    const orphans = items.filter(i=>i.cat===id);
    await Promise.all(orphans.map(i=>fbPatch(`items/${i.id}`,{cat:fallback})));
    setConfirmDel(null);
    if (activeTab===id) setActiveTab("all");
    showToast("Categoría eliminada",false);
    loadAll();
  };

  const addItem = async () => {
    if (!newTitle.trim()) return;
    const id = generateId();
    const item = { id, text:newTitle.trim(), desc:newDesc.trim(),
      cat:effectiveNewCat, votes:0, voters:{}, author:USER_ID, createdAt:Date.now() };
    await fbSet(`items/${id}`, item);
    setNewTitle(""); setNewDesc(""); setShowForm(false);
    showToast("¡Propuesta añadida!");
    loadAll();
  };

  const vote = async (id, dir) => {
    const item = items.find(i=>i.id===id);
    if (!item) return;
    const voters = item.voters || {};
    const existing = voters[USER_ID];
    let newVoters = {...voters};
    let delta;
    if (existing !== undefined) {
      if (existing === dir) { delete newVoters[USER_ID]; delta = -dir; }
      else { newVoters[USER_ID] = dir; delta = dir*2; }
    } else { newVoters[USER_ID] = dir; delta = dir; }
    const newVotes = (item.votes||0) + delta;
    await fbPatch(`items/${id}`, { votes:newVotes, voters:newVoters });
    setPulseId(id); setTimeout(()=>setPulseId(null),500);
    loadAll();
  };

  const deleteItem = async (id) => {
    await fbDelete(`items/${id}`);
    showToast("Eliminado",false);
    loadAll();
  };

  const getUserVote = (item) => {
    if (!item.voters) return 0;
    return item.voters[USER_ID] ?? 0;
  };

  const allCats = [{id:"all",label:"Todo",icon:"🗺️",color:"#7ec850"},...cats];
  const filtered = (activeTab==="all" ? items : items.filter(i=>i.cat===activeTab))
    .sort((a,b)=>b.votes-a.votes);
  const effectiveNewCat = cats.find(c=>c.id===newCat) ? newCat : cats[0]?.id;

  return (
    <div style={{minHeight:"100vh",fontFamily:"'Press Start 2P',monospace",color:"#fff",paddingBottom:80,position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:8px} ::-webkit-scrollbar-track{background:#1a1a1a} ::-webkit-scrollbar-thumb{background:#4a7c37}
      `}</style>

      <PixelBg/>

      {toast&&(
        <div style={{position:"fixed",top:16,right:16,zIndex:9999,background:toast.ok?"#2d5a1e":"#5a1e1e",border:`3px solid ${toast.ok?"#7ec850":"#ff6666"}`,padding:"12px 18px",fontSize:9,boxShadow:"4px 4px 0 rgba(0,0,0,0.7)"}}>{toast.ok?"✔ ":"✖ "}{toast.msg}</div>
      )}

      {confirmDel&&(
        <div style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#1a1a1a",border:"4px solid #ff6666",padding:24,maxWidth:340,textAlign:"center"}}>
            <div style={{fontSize:9,marginBottom:16}}>¿Eliminar esta categoría?</div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <PixelBtn onClick={()=>deleteCategory(confirmDel)} color="#8b0000" small>✖ BORRAR</PixelBtn>
              <PixelBtn onClick={()=>setConfirmDel(null)} color="#333" small>CANCELAR</PixelBtn>
            </div>
          </div>
        </div>
      )}

      <div style={{position:"relative",zIndex:1,maxWidth:720,margin:"0 auto",padding:"0 12px"}}>
        <div style={{textAlign:"center",paddingTop:36,paddingBottom:24}}>
          <div style={{display:"inline-block",background:"#2d5a1e",border:"4px solid #7ec850",padding:"4px 16px",marginBottom:12,fontSize:8,color:"#a0e060"}}>⛏ COMUNIDAD MINECRAFT ⛏</div>
          <h1 style={{margin:"0 0 6px",fontSize:"clamp(18px,4vw,28px)",textShadow:"3px 3px 0 #000,4px 4px 0 #2d5a1e"}}>📋 TABLÓN DE PROPUESTAS</h1>
          <div style={{fontSize:8,marginTop:8}}>
            <span style={{color:fbUrlStatus !== "SIN_CONFIGURAR" && online?"#7ec850":"#ff6666"}}>■ {fbUrlStatus === "SIN_CONFIGURAR" ? "FALTA BASE DE DATOS" : online ? "EN VIVO" : "SIN CONEXIÓN"} · {items.length} propuestas</span>
          </div>
        </div>

        {fbUrlStatus === "SIN_CONFIGURAR" && (
          <div style={{background:"#2b1a1a", border:"4px solid #ff6666", padding:20, marginBottom:20, boxShadow:"4px 4px 0 #000"}}>
            <div style={{fontSize:9, color:"#ff6666", marginBottom:10}}>⚙️ ASISTENTE DE CONFIGURACIÓN</div>
            <MCInput value={inputUrl} onChange={e=>setInputUrl(e.target.value)} placeholder="Pega tu enlace https://... de Firebase aquí" />
            <div style={{marginTop:12}}><PixelBtn onClick={handleSaveManualUrl} color="#ff6666" small>CONECTAR ENLACE</PixelBtn></div>
          </div>
        )}

        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16,justifyContent:"center"}}>
          {allCats.map(c=>(
            <button key={c.id} onClick={()=>setActiveTab(c.id)} style={{background:activeTab===c.id?c.color:"#1a1a1a",border:`3px solid ${activeTab===c.id?"#fff":"#444"}`,color:activeTab===c.id?"#000":"#999",fontFamily:"'Press Start 2P',monospace",fontSize:8,padding:"7px 10px",cursor:"pointer"}}>{c.icon} {c.label}</button>
          ))}
        </div>

        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:14}}>
          <PixelBtn onClick={()=>{setShowCatMgr(!showCatMgr);setShowForm(false);}} color="#1a4a7a" small>{showCatMgr?"✖ CERRAR":"⚙ CATEGORÍAS"}</PixelBtn>
          <PixelBtn onClick={()=>{setShowForm(!showForm);setShowCatMgr(false);}} color="#2d6e2d">{showForm?"✖ CERRAR":"+ NUEVA PROPUESTA"}</PixelBtn>
        </div>

        {showCatMgr&&(
          <div style={{background:"#0e1a2e",border:"4px solid #3a7abf",padding:20,marginBottom:16}}>
            <div style={{fontSize:9,color:"#50aaff",marginBottom:16}}>⚙ GESTIONAR CATEGORÍAS</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
              {cats.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,background:"#111",padding:"8px 12px",fontSize:8}}>
                  <span>{c.icon}</span><span style={{flex:1,color:c.color}}>{c.label}</span>
                  <button onClick={()=>setConfirmDel(c.id)} style={{background:"none",border:"none",color:"#ff6666",cursor:"pointer"}}>✖</button>
                </div>
              ))}
            </div>
            <MCInput value={ncLabel} onChange={e=>setNcLabel(e.target.value)} placeholder="Nueva categoría..." />
            <div style={{marginTop:10}}><PixelBtn onClick={addCategory} color="#1a4a7a" small disabled={!ncLabel.trim()}>✔ CREAR</PixelBtn></div>
          </div>
        )}

        {showForm&&(
          <div style={{background:"#1a1a1a",border:"4px solid #7ec850",padding:20,marginBottom:16}}>
            <div style={{fontSize:8,color:"#888",marginBottom:6}}>TÍTULO:</div>
            <MCInput value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Ej: Granja de Endermans..." />
            <div style={{fontSize:8,color:"#888",margin:"10px 0 6px"}}>DESCRIPCIÓN / COORDENADAS:</div>
            <MCInput value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Coordenadas..." multiline rows={2} />
            <div style={{marginTop:12}}><PixelBtn onClick={addItem} disabled={!newTitle.trim()}>✔ ENVIAR</PixelBtn></div>
          </div>
        )}

        {loading ? (
          <div style={{textAlign:"center",padding:40,fontSize:10,color:"#7ec850"}}>CARGANDO...</div>
        ) : filtered.length === 0 ? (
          <div style={{textAlign:"center",padding:40,background:"rgba(0,0,0,0.4)",border:"3px dashed #444",fontSize:8,color:"#666"}}>NO HAY PROPUESTAS</div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {filtered.map(item => {
              const cInfo = cats.find(c => c.id === item.cat) || { label: "Misc", icon: "📦", color: "#888" };
              const userVote = getUserVote(item);
              return (
                <div key={item.id} style={{background:"#151515", border:"3px solid #333", borderLeft:`6px solid ${cInfo.color}`, padding:12, display:"flex", gap:12, alignItems:"center"}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:36}}>
                    <button onClick={() => vote(item.id, 1)} style={{background:userVote===1?"#4a7c37":"#222", border:"2px solid #444", color:"#fff", padding:"4px", fontSize:8}}>▲</button>
                    <span style={{fontSize:9, color:item.votes>0?"#7ec850":item.votes<0?"#ff6666":"#aaa"}}>{item.votes||0}</span>
                    <button onClick={() => vote(item.id, -1)} style={{background:userVote===-1?"#8b0000":"#222", border:"2px solid #444", color:"#fff", padding:"4px", fontSize:8}}>▼</button>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:7, color:cInfo.color, marginBottom:4}}>{cInfo.icon} {cInfo.label.toUpperCase()} · {timeAgo(item.createdAt||Date.now())}</div>
                    <div style={{fontSize:9, color:"#fff", lineHeight:1.4}}>{item.text}</div>
                    {item.desc && <div style={{fontSize:8, color:"#888", marginTop:4, background:"#0a0a0a", padding:6, border:"1px solid #222"}}>{item.desc}</div>}
                  </div>
                  {item.author === USER_ID && <button onClick={() => deleteItem(item.id)} style={{background:"none", border:"none", color:"#444", fontSize:9, cursor:"pointer"}}>✖</button>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}