import { useState, useEffect, useCallback, useRef } from "react";

// ─── TYPES ───────────────────────────────────────────────
type Priority = "low" | "medium" | "high";
type Filter   = "all" | "active" | "completed";
type SortBy   = "date" | "priority" | "alpha";
type Lang     = "en" | "tr" | "fr";

interface Todo {
  id:        string;
  text:      string;
  done:      boolean;
  priority:  Priority;
  createdAt: number;
  tag:       string;
  pinned:    boolean;
  dueDate:   string;
}

interface NewTodoForm {
  text:     string;
  priority: Priority;
  tag:      string;
  dueDate:  string;
}

// ─── TRANSLATIONS ─────────────────────────────────────────
const T = {
  en: {
    appName: "NOTES",
    total: "Total", active: "Active", done: "Done",
    progress: "Progress",
    searchPlaceholder: "Search...",
    formPlaceholder: "What needs to be done? (Ctrl+Enter to add)",
    tagPlaceholder: "tag",
    addBtn: "✦ Add",
    all: "All", activeF: "Active", completed: "Completed",
    sortDate: "↓D", sortPrio: "↓P", sortAlpha: "A-Z",
    clear: "Clear",
    pinTitle: "Pin", unpinTitle: "Unpin", editTitle: "Edit", deleteTitle: "Delete",
    empty: "No notes yet · press + to Add",
    emptySearch: "No results found",
    remaining: "tasks remaining · saved to localStorage",
    low: "Low", medium: "Medium", high: "High",
    allTags: "All",
    settingsTitle: "Settings",
    languageLabel: "Language",
    welcomeTitle: "Welcome to Notes",
    welcomeSub: "Your minimal, beautiful task manager",
    chooseLang: "Choose your language to get started",
    continueBtn: "Continue",
  },
  tr: {
    appName: "NOTLAR",
    total: "Toplam", active: "Aktif", done: "Bitti",
    progress: "İlerleme",
    searchPlaceholder: "Ara...",
    formPlaceholder: "Ne yapılacak? (Ctrl+Enter ile ekle)",
    tagPlaceholder: "etiket",
    addBtn: "✦ Ekle",
    all: "Hepsi", activeF: "Aktif", completed: "Tamamlanan",
    sortDate: "↓T", sortPrio: "↓Ö", sortAlpha: "A-Z",
    clear: "Temizle",
    pinTitle: "Sabitle", unpinTitle: "Sabitlemeyi kaldır", editTitle: "Düzenle", deleteTitle: "Sil",
    empty: "Henüz not yok · + ile ekle",
    emptySearch: "Sonuç bulunamadı",
    remaining: "görev kaldı · localStorage'a kaydedildi",
    low: "düşük", medium: "orta", high: "yüksek",
    allTags: "tümü",
    settingsTitle: "Ayarlar",
    languageLabel: "Dil",
    welcomeTitle: "Notlar'a Hoş Geldiniz",
    welcomeSub: "Minimal ve şık görev yöneticiniz",
    chooseLang: "Başlamak için dilinizi seçin",
    continueBtn: "Devam Et",
  },
  fr: {
    appName: "NOTES",
    total: "Total", active: "Actif", done: "Fait",
    progress: "Progression",
    searchPlaceholder: "Rechercher...",
    formPlaceholder: "Que faire ? (Ctrl+Entrée pour ajouter)",
    tagPlaceholder: "étiquette",
    addBtn: "✦ Ajouter",
    all: "Tous", activeF: "Actif", completed: "Terminé",
    sortDate: "↓D", sortPrio: "↓P", sortAlpha: "A-Z",
    clear: "effacer",
    pinTitle: "Épingler", unpinTitle: "Désépingler", editTitle: "Modifier", deleteTitle: "Supprimer",
    empty: "Aucune note · appuyez sur + pour ajouter",
    emptySearch: "Aucun résultat",
    remaining: "tâches restantes · sauvegardé",
    low: "faible", medium: "moyen", high: "élevé",
    allTags: "tous",
    settingsTitle: "Paramètres",
    languageLabel: "Langue",
    welcomeTitle: "Bienvenue dans Notes",
    welcomeSub: "Votre gestionnaire de tâches élégant",
    chooseLang: "Choisissez votre langue pour commencer",
    continueBtn: "Continuer",
  },
};

const LANG_OPTIONS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English",   flag: "🇬🇧" },
  { code: "tr", label: "Türkçe",    flag: "🇹🇷" },
  { code: "fr", label: "Français",  flag: "🇫🇷" },
];

// ─── CUSTOM HOOK ──────────────────────────────────────────
function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    try { const s = localStorage.getItem("todos-v3"); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  const [filter,    setFilter]    = useState<Filter>("all");
  const [search,    setSearch]    = useState("");
  const [sortBy,    setSortBy]    = useState<SortBy>("date");
  const [tagFilter, setTagFilter] = useState("");

  useEffect(() => { try { localStorage.setItem("todos-v3", JSON.stringify(todos)); } catch {} }, [todos]);

  const addTodo = useCallback((form: NewTodoForm) => {
    if (!form.text.trim()) return;
    setTodos(prev => [{ id: Date.now().toString(36)+Math.random().toString(36).slice(2),
      text: form.text.trim(), done: false, priority: form.priority,
      createdAt: Date.now(), tag: form.tag || "general", pinned: false, dueDate: form.dueDate || "" }, ...prev]);
  }, []);

  const toggleTodo    = useCallback((id: string) => setTodos(p => p.map(t => t.id===id ? {...t, done:!t.done} : t)), []);
  const deleteTodo    = useCallback((id: string) => setTodos(p => p.filter(t => t.id!==id)), []);
  const updateTodo    = useCallback((id: string, text: string) => setTodos(p => p.map(t => t.id===id ? {...t, text} : t)), []);
  const pinTodo       = useCallback((id: string) => setTodos(p => p.map(t => t.id===id ? {...t, pinned:!t.pinned} : t)), []);
  const clearCompleted = useCallback(() => setTodos(p => p.filter(t => !t.done)), []);

  const allTags = Array.from(new Set(todos.map(t => t.tag)));
  const prioOrder: Record<Priority,number> = { high:0, medium:1, low:2 };

  const filteredTodos = todos
    .filter(t => filter==="active" ? !t.done : filter==="completed" ? t.done : true)
    .filter(t => t.text.toLowerCase().includes(search.toLowerCase()) || t.tag.toLowerCase().includes(search.toLowerCase()))
    .filter(t => tagFilter ? t.tag===tagFilter : true)
    .sort((a,b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortBy==="priority") return prioOrder[a.priority]-prioOrder[b.priority];
      if (sortBy==="alpha")    return a.text.localeCompare(b.text);
      return b.createdAt - a.createdAt;
    });

  const stats = todos.reduce((acc,t) => ({
    total: acc.total+1, done: acc.done+(t.done?1:0), active: acc.active+(t.done?0:1)
  }), { total:0, done:0, active:0 });

  return { todos: filteredTodos, filter, setFilter, search, setSearch,
           sortBy, setSortBy, tagFilter, setTagFilter, allTags,
           stats, addTodo, toggleTodo, deleteTodo, updateTodo, pinTodo, clearCompleted };
}

// ─── HELPERS ─────────────────────────────────────────────
function isDueOverdue(d: string) { return d ? new Date(d) < new Date(new Date().toDateString()) : false; }
function isDueSoon(d: string)    { if (!d) return false; const diff=new Date(d).getTime()-Date.now(); return diff>=0 && diff<172800000; }
function fmtDate(d: string)      { return d ? new Date(d).toLocaleDateString(undefined,{day:"numeric",month:"short"}) : ""; }

// ─── TODO ITEM ────────────────────────────────────────────
function TodoItem({ todo, onToggle, onDelete, onUpdate, onPin, lang }:
  { todo:Todo; onToggle:(id:string)=>void; onDelete:(id:string)=>void;
    onUpdate:(id:string,text:string)=>void; onPin:(id:string)=>void; lang:Lang }) {
  const t = T[lang];
  const [editing,  setEditing]  = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [hovered,  setHovered]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const pc: Record<Priority,{border:string;badge:string;text:string}> = {
    low:    { border:"#10b981", badge:"rgba(16,185,129,.13)",  text:"#10b981" },
    medium: { border:"#f59e0b", badge:"rgba(245,158,11,.13)",  text:"#f59e0b" },
    high:   { border:"#ef4444", badge:"rgba(239,68,68,.13)",   text:"#ef4444" },
  };
  const c = pc[todo.priority];
  const overdue = isDueOverdue(todo.dueDate);
  const soon    = isDueSoon(todo.dueDate);

  function saveEdit() {
    const s = editText.trim();
    if (s && s !== todo.text) onUpdate(todo.id, s); else setEditText(todo.text);
    setEditing(false);
  }

  const prioLabel: Record<Priority,string> = { low: t.low, medium: t.medium, high: t.high };

  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} style={{
      display:"flex", alignItems:"flex-start", gap:11, padding:"13px 15px",
      borderRadius:13, marginBottom:8, transition:"all .2s ease", animation:"slideIn .3s ease",
      background: todo.done ? "rgba(255,255,255,.02)" : todo.pinned ? "rgba(99,102,241,.08)" : "rgba(255,255,255,.04)",
      border:`1px solid ${todo.pinned?"rgba(99,102,241,.3)":todo.done?"rgba(255,255,255,.05)":"rgba(255,255,255,.09)"}`,
      borderLeft:`3px solid ${todo.done?"rgba(255,255,255,.08)":c.border}`,
      opacity: todo.done ? .45 : 1,
      transform: hovered && !todo.done ? "translateY(-1px)" : "translateY(0)",
      boxShadow: hovered && !todo.done ? "0 6px 24px rgba(0,0,0,.3)" : "none",
    }}>
      <button onClick={()=>onToggle(todo.id)} style={{
        width:20, height:20, borderRadius:6, flexShrink:0, marginTop:2, cursor:"pointer",
        border:`2px solid ${todo.done?"#6366f1":"rgba(255,255,255,.18)"}`,
        background: todo.done ? "#6366f1" : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s",
      }}>
        {todo.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>}
      </button>

      <div style={{flex:1,minWidth:0}}>
        {editing ? (
          <input ref={inputRef} value={editText} onChange={e=>setEditText(e.target.value)}
            onBlur={saveEdit} onKeyDown={e=>{ if(e.key==="Enter")saveEdit(); if(e.key==="Escape"){setEditText(todo.text);setEditing(false);} }}
            style={{ width:"100%", background:"rgba(255,255,255,.08)", border:"1px solid rgba(99,102,241,.5)",
              borderRadius:8, color:"#fff", fontSize:14, padding:"4px 8px", outline:"none", fontFamily:"inherit" }}/>
        ) : (
          <p style={{ margin:0, fontSize:14, fontWeight:500, lineHeight:1.5, wordBreak:"break-word",
            color: todo.done ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.9)",
            textDecoration: todo.done ? "line-through" : "none" }}>
            {todo.pinned && <span style={{marginRight:5,fontSize:10}}>📌</span>}
            {todo.text}
          </p>
        )}
        <div style={{display:"flex",gap:5,marginTop:7,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20,
            background:c.badge, color:c.text, letterSpacing:".4px", textTransform:"uppercase",
            display:"flex", alignItems:"center", gap:3 }}>
            <span style={{width:4,height:4,borderRadius:"50%",background:c.text,display:"inline-block"}}/>
            {prioLabel[todo.priority]}
          </span>
          <span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,background:"rgba(99,102,241,.14)",color:"#818cf8"}}>
            #{todo.tag}
          </span>
          {todo.dueDate && (
            <span style={{ fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:20,
              background: overdue?"rgba(239,68,68,.15)":soon?"rgba(245,158,11,.15)":"rgba(255,255,255,.06)",
              color: overdue?"#ef4444":soon?"#f59e0b":"rgba(255,255,255,.4)" }}>
              {overdue?"⚠ ":"📅 "}{fmtDate(todo.dueDate)}
            </span>
          )}
        </div>
      </div>

      <div style={{display:"flex",gap:3,flexShrink:0,opacity:hovered?1:0,transition:"opacity .15s"}}>
        {[
          { icon: todo.pinned?"🗂":"📌", action:()=>onPin(todo.id),    title:todo.pinned?t.unpinTitle:t.pinTitle },
          { icon: "✏",                   action:()=>setEditing(true),  title:t.editTitle },
          { icon: "×",                    action:()=>onDelete(todo.id), title:t.deleteTitle, danger:true },
        ].map(({icon,action,title,danger})=>(
          <button key={title} onClick={action} title={title}
            style={{ background:"none", border:"none", cursor:"pointer", padding:"2px 4px",
              borderRadius:6, fontSize:icon==="×"?20:13, lineHeight:1, transition:"color .1s",
              color: danger?"rgba(239,68,68,.5)":"rgba(255,255,255,.3)" }}
            onMouseEnter={e=>e.currentTarget.style.color=danger?"#ef4444":"rgba(255,255,255,.85)"}
            onMouseLeave={e=>e.currentTarget.style.color=danger?"rgba(239,68,68,.5)":"rgba(255,255,255,.3)"}>
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── WELCOME SCREEN ───────────────────────────────────────
function WelcomeScreen({ onSelect }: { onSelect:(lang:Lang)=>void }) {
  const [selected, setSelected] = useState<Lang>("en");

  return (
    <div style={{
      minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"#080810", fontFamily:"'Sora','Segoe UI',sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        @keyframes floatOrb1{0%{transform:translate(0,0) scale(1);}33%{transform:translate(60px,-80px) scale(1.1);}66%{transform:translate(-40px,40px) scale(.95);}100%{transform:translate(0,0) scale(1);}}
        @keyframes floatOrb2{0%{transform:translate(0,0);}33%{transform:translate(-70px,50px) scale(1.05);}66%{transform:translate(50px,-60px) scale(1.1);}100%{transform:translate(0,0);}}
        @keyframes twinkle{0%,100%{opacity:0;transform:scale(0);}50%{opacity:1;transform:scale(1);}}
        @keyframes welcomeFade{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
      `}</style>

      {/* Arka plan orb'lar */}
      {[
        {top:"5%",left:"8%",w:380,color:"rgba(99,102,241,.2)",anim:"floatOrb1 28s ease-in-out infinite"},
        {top:"auto",left:"auto",bottom:"8%",right:"5%",w:320,color:"rgba(139,92,246,.18)",anim:"floatOrb2 34s ease-in-out infinite"},
        {top:"40%",left:"50%",w:240,color:"rgba(79,70,229,.13)",anim:"floatOrb1 22s ease-in-out infinite reverse"},
      ].map((o,i)=>(
        <div key={i} style={{
          position:"absolute", width:o.w, height:o.w, borderRadius:"50%", pointerEvents:"none",
          top:o.top, left:o.left, bottom:(o as any).bottom, right:(o as any).right,
          background:`radial-gradient(circle,${o.color} 0%,transparent 70%)`,
          filter:"blur(60px)", animation:o.anim,
        }}/>
      ))}

      {/* Grid */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)",
        backgroundSize:"60px 60px"}}/>

      {/* İçerik */}
      <div style={{position:"relative",zIndex:1,textAlign:"center",animation:"welcomeFade .7s ease",padding:"0 24px",maxWidth:440}}>
        <div style={{
          width:64,height:64,borderRadius:18,margin:"0 auto 24px",
          background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:28,boxShadow:"0 8px 32px rgba(99,102,241,.5)",
          animation:"pulse 3s ease-in-out infinite",
        }}>✦</div>

        <h1 style={{
          fontSize:32,fontWeight:800,marginBottom:8,letterSpacing:"-0.5px",
          background:"linear-gradient(135deg,#fff 30%,rgba(167,139,250,.9))",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
        }}>Notes</h1>

        <p style={{color:"rgba(255,255,255,.35)",fontSize:14,marginBottom:8}}>
          {selected === "en" ? "Your minimal, beautiful task manager" :
           selected === "tr" ? "Minimal ve şık görev yöneticiniz" :
           "Votre gestionnaire de tâches élégant"}
        </p>
        <p style={{color:"rgba(255,255,255,.2)",fontSize:12,marginBottom:36}}>
          {selected === "en" ? "Choose your language to get started" :
           selected === "tr" ? "Başlamak için dilinizi seçin" :
           "Choisissez votre langue pour commencer"}
        </p>

        {/* Dil seçenekleri */}
        <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:32,flexWrap:"wrap"}}>
          {LANG_OPTIONS.map(l=>(
            <button key={l.code} onClick={()=>setSelected(l.code)} style={{
              padding:"14px 22px", borderRadius:14, cursor:"pointer",
              fontFamily:"inherit", fontSize:14, fontWeight:600,
              transition:"all .2s", display:"flex", flexDirection:"column", alignItems:"center", gap:6,
              border: selected===l.code ? "2px solid #6366f1" : "1px solid rgba(255,255,255,.1)",
              background: selected===l.code ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)",
              color: selected===l.code ? "#a5b4fc" : "rgba(255,255,255,.5)",
              boxShadow: selected===l.code ? "0 0 20px rgba(99,102,241,.3)" : "none",
              transform: selected===l.code ? "scale(1.05)" : "scale(1)",
            }}>
              <span style={{fontSize:28}}>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>

        <button onClick={()=>onSelect(selected)} style={{
          padding:"13px 48px", borderRadius:12, cursor:"pointer",
          fontFamily:"inherit", fontSize:15, fontWeight:700,
          background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none",
          color:"#fff", boxShadow:"0 6px 24px rgba(99,102,241,.4)",
          transition:"all .2s", letterSpacing:".3px",
        }}
        onMouseEnter={e=>{ e.currentTarget.style.transform="scale(1.04)"; e.currentTarget.style.boxShadow="0 10px 32px rgba(99,102,241,.5)"; }}
        onMouseLeave={e=>{ e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="0 6px 24px rgba(99,102,241,.4)"; }}>
          {selected === "en" ? "Continue →" : selected === "tr" ? "Devam Et →" : "Continuer →"}
        </button>
      </div>
    </div>
  );
}

// ─── SETTINGS PANEL ───────────────────────────────────────
function SettingsPanel({ lang, onLangChange, onClose }:
  { lang:Lang; onLangChange:(l:Lang)=>void; onClose:()=>void }) {
  const t = T[lang];
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:100}}/>
      <div style={{
        position:"fixed", bottom:70, left:20, zIndex:101,
        background:"rgba(18,18,32,.97)", border:"1px solid rgba(99,102,241,.3)",
        borderRadius:16, padding:"20px 22px", minWidth:220,
        boxShadow:"0 16px 48px rgba(0,0,0,.6)",
        backdropFilter:"blur(20px)", animation:"slideIn .2s ease",
        fontFamily:"'Sora','Segoe UI',sans-serif",
      }}>
        <p style={{color:"rgba(255,255,255,.9)",fontWeight:700,fontSize:14,marginBottom:16}}>
          ⚙ {t.settingsTitle}
        </p>
        <p style={{color:"rgba(255,255,255,.4)",fontSize:11,marginBottom:10,textTransform:"uppercase",letterSpacing:".5px"}}>
          {t.languageLabel}
        </p>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {LANG_OPTIONS.map(l=>(
            <button key={l.code} onClick={()=>{ onLangChange(l.code); onClose(); }} style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"9px 12px", borderRadius:10, cursor:"pointer",
              fontFamily:"inherit", fontSize:13, fontWeight: lang===l.code ? 700 : 400,
              border: lang===l.code ? "1px solid rgba(99,102,241,.5)" : "1px solid rgba(255,255,255,.07)",
              background: lang===l.code ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)",
              color: lang===l.code ? "#a5b4fc" : "rgba(255,255,255,.5)",
              transition:"all .15s",
            }}>
              <span style={{fontSize:18}}>{l.flag}</span>
              {l.label}
              {lang===l.code && <span style={{marginLeft:"auto",fontSize:11,color:"#6366f1"}}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("app-lang") as Lang;
    return saved || null as any;
  });
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem("app-lang"));
  const [showSettings, setShowSettings] = useState(false);

  const { todos, filter, setFilter, search, setSearch,
          sortBy, setSortBy, tagFilter, setTagFilter, allTags,
          stats, addTodo, toggleTodo, deleteTodo, updateTodo, pinTodo, clearCompleted } = useTodos();

  const [form, setForm] = useState<NewTodoForm>({ text:"", priority:"medium", tag:"", dueDate:"" });
  const [showForm, setShowForm] = useState(false);

  function handleSelectLang(l: Lang) {
    setLang(l);
    localStorage.setItem("app-lang", l);
    setShowWelcome(false);
  }

  function handleLangChange(l: Lang) {
    setLang(l);
    localStorage.setItem("app-lang", l);
  }

  function handleSubmit() {
    addTodo(form);
    setForm({ text:"", priority:"medium", tag:"", dueDate:"" });
    setShowForm(false);
  }

  useEffect(() => {
    document.title = "Notes ✦";
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
      || document.createElement("link");
    link.rel = "icon";
    link.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%236366f1'/><text y='.9em' font-size='70' x='12'>✦</text></svg>`;
    document.head.appendChild(link);
  }, []);

  if (showWelcome || !lang) return <WelcomeScreen onSelect={handleSelectLang}/>;

  const t = T[lang];
  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div style={{
      minHeight:"100vh", background:"#080810",
      display:"flex", justifyContent:"center", alignItems:"flex-start",
      padding:"40px 16px 80px",
      fontFamily:"'Sora','Segoe UI',sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;}
        body{background:#080810;}
        @keyframes floatOrb1{0%{transform:translate(0,0) scale(1);}33%{transform:translate(60px,-80px) scale(1.1);}66%{transform:translate(-40px,40px) scale(.95);}100%{transform:translate(0,0) scale(1);}}
        @keyframes floatOrb2{0%{transform:translate(0,0);}33%{transform:translate(-70px,50px) scale(1.05);}66%{transform:translate(50px,-60px) scale(1.1);}100%{transform:translate(0,0);}}
        @keyframes floatOrb3{0%{transform:translate(0,0);}50%{transform:translate(30px,70px) scale(1.08);}100%{transform:translate(0,0);}}
        @keyframes twinkle{0%,100%{opacity:0;transform:scale(0);}50%{opacity:1;transform:scale(1);}}
        @keyframes drift{0%{transform:translateY(0) translateX(0);opacity:0;}10%{opacity:1;}90%{opacity:.6;}100%{transform:translateY(-120px) translateX(20px);opacity:0;}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
        ::placeholder{color:rgba(255,255,255,.18)!important;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(99,102,241,.3);border-radius:2px;}
        select option{background:#1a1a2e;}
      `}</style>

      {/* Arka plan */}
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 20% 20%,rgba(99,102,241,.12) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(139,92,246,.10) 0%,transparent 60%)"}}/>
        {[
          {top:"8%",left:"12%",w:420,color:"rgba(99,102,241,.18)",blur:60,anim:"floatOrb1 28s ease-in-out infinite"},
          {top:"auto",left:"auto",bottom:"10%",right:"8%",w:360,color:"rgba(139,92,246,.15)",blur:70,anim:"floatOrb2 35s ease-in-out infinite"},
          {top:"50%",left:"55%",w:280,color:"rgba(79,70,229,.12)",blur:50,anim:"floatOrb3 22s ease-in-out infinite"},
          {top:"30%",right:"25%",left:"auto",w:200,color:"rgba(167,139,250,.10)",blur:40,anim:"floatOrb1 18s ease-in-out infinite reverse"},
        ].map((o,i)=>(
          <div key={i} style={{position:"absolute",borderRadius:"50%",
            top:o.top,left:o.left,right:(o as any).right,bottom:(o as any).bottom,
            width:o.w,height:o.w,
            background:`radial-gradient(circle,${o.color} 0%,transparent 70%)`,
            filter:`blur(${o.blur}px)`,animation:o.anim}}/>
        ))}
        {Array.from({length:30},(_,i)=>(
          <div key={i} style={{position:"absolute",borderRadius:"50%",
            width:i%5===0?2.5:1.5,height:i%5===0?2.5:1.5,
            background:i%3===0?"rgba(167,139,250,.7)":"rgba(255,255,255,.4)",
            top:`${(i*31+7)%95}%`,left:`${(i*47+13)%95}%`,
            animation:`twinkle ${3+(i%4)}s ease-in-out infinite`,animationDelay:`${(i*.4)%5}s`}}/>
        ))}
        {Array.from({length:8},(_,i)=>(
          <div key={`d${i}`} style={{position:"absolute",width:3,height:3,borderRadius:"50%",
            background:"rgba(99,102,241,.5)",
            bottom:`${(i*13+5)%80}%`,left:`${(i*17+10)%90}%`,
            animation:`drift ${8+i*2}s linear infinite`,animationDelay:`${i*1.5}s`}}/>
        ))}
        <div style={{position:"absolute",inset:0,
          backgroundImage:"linear-gradient(rgba(99,102,241,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.03) 1px,transparent 1px)",
          backgroundSize:"60px 60px"}}/>
      </div>

      {/* Ana içerik */}
      <div style={{width:"100%",maxWidth:540,position:"relative",zIndex:1,animation:"fadeIn .6s ease"}}>

        {/* Başlık */}
        <div style={{marginBottom:26,animation:"slideIn .5s ease"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:2}}>
            <div style={{width:38,height:38,borderRadius:11,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,
              boxShadow:"0 4px 20px rgba(99,102,241,.4)"}}>✦</div>
            <h1 style={{fontSize:28,fontWeight:800,letterSpacing:"-.6px",
              background:"linear-gradient(135deg,#fff 30%,rgba(167,139,250,.9))",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              {t.appName}
            </h1>
          </div>
        </div>

        {/* İstatistikler */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:16,animation:"slideIn .5s ease .05s both"}}>
          {[
            {label:t.total,  value:stats.total,  color:"#6366f1", glow:"rgba(99,102,241,.2)"},
            {label:t.active, value:stats.active, color:"#f59e0b", glow:"rgba(245,158,11,.2)"},
            {label:t.done,   value:stats.done,   color:"#10b981", glow:"rgba(16,185,129,.2)"},
          ].map(s=>(
            <div key={s.label} style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",
              borderRadius:13,padding:"13px 8px",textAlign:"center",boxShadow:`0 0 20px ${s.glow}`}}>
              <div style={{fontSize:24,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.28)",marginTop:2,fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* İlerleme */}
        {stats.total > 0 && (
          <div style={{marginBottom:16,animation:"slideIn .5s ease .1s both"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:10,color:"rgba(255,255,255,.28)",textTransform:"uppercase",letterSpacing:".5px"}}>
              <span>{t.progress}</span>
              <span style={{color:"#6366f1"}}>{progress}%</span>
            </div>
            <div style={{height:5,background:"rgba(255,255,255,.05)",borderRadius:10,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progress}%`,borderRadius:10,transition:"width .5s ease",
                background:"linear-gradient(90deg,#6366f1,#a78bfa)",boxShadow:"0 0 10px rgba(99,102,241,.5)"}}/>
            </div>
          </div>
        )}

        {/* Arama + Ekle */}
        <div style={{display:"flex",gap:8,marginBottom:12,animation:"slideIn .5s ease .15s both"}}>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{flex:1,padding:"10px 14px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.09)",
              borderRadius:10,color:"#fff",fontSize:13,outline:"none",fontFamily:"inherit",transition:"border-color .2s"}}
            onFocus={e=>e.target.style.borderColor="rgba(99,102,241,.5)"}
            onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.09)"}/>
          <button onClick={()=>setShowForm(v=>!v)} style={{
            padding:"10px 18px",border:"none",borderRadius:10,color:"#fff",fontSize:20,cursor:"pointer",lineHeight:1,transition:"all .2s",
            background:showForm?"rgba(99,102,241,.25)":"linear-gradient(135deg,#6366f1,#8b5cf6)",
            boxShadow:showForm?"none":"0 4px 15px rgba(99,102,241,.35)",
          }}>
            {showForm?"×":"+"}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.22)",
            borderRadius:16,padding:16,marginBottom:12,animation:"slideIn .2s ease",backdropFilter:"blur(10px)"}}>
            <textarea value={form.text} onChange={e=>setForm({...form,text:e.target.value})}
              onKeyDown={e=>{ if(e.ctrlKey && e.key==="Enter") handleSubmit(); }}
              placeholder={t.formPlaceholder} rows={2}
              style={{width:"100%",padding:"10px 14px",background:"rgba(255,255,255,.05)",
                border:"1px solid rgba(255,255,255,.09)",borderRadius:10,color:"#fff",
                fontSize:13,resize:"none",outline:"none",fontFamily:"inherit"}}/>
            <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
              <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value as Priority})}
                style={{flex:"1 1 120px",padding:"9px 10px",background:"rgba(255,255,255,.05)",
                  border:"1px solid rgba(255,255,255,.09)",borderRadius:10,color:"#fff",fontSize:12,outline:"none",fontFamily:"inherit"}}>
                <option value="low">🟢 {t.low}</option>
                <option value="medium">🟡 {t.medium}</option>
                <option value="high">🔴 {t.high}</option>
              </select>
              <input type="text" value={form.tag} onChange={e=>setForm({...form,tag:e.target.value})}
                placeholder={t.tagPlaceholder}
                style={{flex:"1 1 90px",padding:"9px 10px",background:"rgba(255,255,255,.05)",
                  border:"1px solid rgba(255,255,255,.09)",borderRadius:10,color:"#fff",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
              <input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}
                style={{flex:"1 1 130px",padding:"9px 10px",background:"rgba(255,255,255,.05)",
                  border:"1px solid rgba(255,255,255,.09)",borderRadius:10,color:"#fff",fontSize:12,outline:"none",
                  fontFamily:"inherit",colorScheme:"dark"}}/>
            </div>
            <button onClick={handleSubmit} disabled={!form.text.trim()}
              style={{width:"100%",marginTop:12,padding:11,border:"none",borderRadius:10,color:"#fff",
                fontSize:13,fontWeight:700,cursor:form.text.trim()?"pointer":"not-allowed",transition:"all .2s",
                background:form.text.trim()?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(99,102,241,.15)",
                boxShadow:form.text.trim()?"0 4px 15px rgba(99,102,241,.3)":"none",fontFamily:"inherit"}}>
              {t.addBtn}
            </button>
          </div>
        )}

        {/* Kategori filtreleri */}
        {allTags.length > 0 && (
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:11,animation:"slideIn .5s ease .2s both"}}>
            {[t.allTags, ...allTags].map(tag=>{
              const isAll = tag === t.allTags;
              const active = isAll ? tagFilter==="" : tagFilter===tag;
              return (
                <button key={tag} onClick={()=>setTagFilter(isAll?"":tag===tagFilter?"":tag)}
                  style={{padding:"4px 11px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",
                    border:`1px solid ${active?"#6366f1":"rgba(255,255,255,.08)"}`,
                    background:active?"rgba(99,102,241,.18)":"transparent",
                    color:active?"#818cf8":"rgba(255,255,255,.28)"}}>
                  {isAll ? tag : "#"+tag}
                </button>
              );
            })}
          </div>
        )}

        {/* Filtre + Sıralama */}
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center",animation:"slideIn .5s ease .25s both"}}>
          {([["all",t.all],["active",t.activeF],["completed",t.completed]] as [Filter,string][]).map(([f,label])=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{padding:"5px 13px",borderRadius:20,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",
                fontWeight:filter===f?700:400,
                border:`1px solid ${filter===f?"#6366f1":"rgba(255,255,255,.08)"}`,
                background:filter===f?"rgba(99,102,241,.18)":"transparent",
                color:filter===f?"#818cf8":"rgba(255,255,255,.28)"}}>
              {label}
            </button>
          ))}
          <div style={{marginLeft:"auto",display:"flex",gap:4}}>
            {([["date",t.sortDate],["priority",t.sortPrio],["alpha",t.sortAlpha]] as [SortBy,string][]).map(([s,label])=>(
              <button key={s} onClick={()=>setSortBy(s)}
                style={{padding:"5px 10px",borderRadius:8,fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",
                  fontWeight:sortBy===s?700:500,
                  border:`1px solid ${sortBy===s?"rgba(99,102,241,.5)":"rgba(255,255,255,.07)"}`,
                  background:sortBy===s?"rgba(99,102,241,.15)":"transparent",
                  color:sortBy===s?"#818cf8":"rgba(255,255,255,.22)"}}>
                {label}
              </button>
            ))}
          </div>
          {stats.done > 0 && (
            <button onClick={clearCompleted}
              style={{padding:"5px 11px",borderRadius:20,fontSize:10,fontWeight:600,cursor:"pointer",
                fontFamily:"inherit",border:"1px solid rgba(239,68,68,.25)",
                background:"transparent",color:"rgba(239,68,68,.55)",transition:"color .15s"}}
              onMouseEnter={e=>e.currentTarget.style.color="#ef4444"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(239,68,68,.55)"}>
              {t.clear} ({stats.done})
            </button>
          )}
        </div>

        {/* Liste */}
        <div style={{animation:"slideIn .5s ease .3s both"}}>
          {todos.length === 0 ? (
            <div style={{textAlign:"center",padding:"60px 0",color:"rgba(255,255,255,.13)",fontSize:13}}>
              <div style={{fontSize:36,marginBottom:14,animation:"pulse 2.5s infinite"}}>✦</div>
              {search||tagFilter ? t.emptySearch : t.empty}
            </div>
          ) : todos.map(todo=>(
            <TodoItem key={todo.id} todo={todo} lang={lang}
              onToggle={toggleTodo} onDelete={deleteTodo}
              onUpdate={updateTodo} onPin={pinTodo}/>
          ))}
        </div>

        {stats.total > 0 && (
          <p style={{textAlign:"center",fontSize:10,color:"rgba(255,255,255,.12)",marginTop:28,fontWeight:500}}>
            {stats.active} {t.remaining}
          </p>
        )}
      </div>

      {/* Ayarlar butonu */}
      <button onClick={()=>setShowSettings(v=>!v)}
        title={t.settingsTitle}
        style={{
          position:"fixed",bottom:24,left:24,zIndex:200,
          width:44,height:44,borderRadius:"50%",cursor:"pointer",
          background:"rgba(18,18,32,.9)",border:"1px solid rgba(99,102,241,.3)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:18,transition:"all .2s",
          boxShadow:"0 4px 20px rgba(0,0,0,.4)",
          color:"rgba(255,255,255,.6)",
        }}
        onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(99,102,241,.6)"; e.currentTarget.style.color="#fff"; }}
        onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(99,102,241,.3)"; e.currentTarget.style.color="rgba(255,255,255,.6)"; }}>
        ⚙
      </button>

      {/* Ayarlar paneli */}
      {showSettings && (
        <SettingsPanel lang={lang} onLangChange={handleLangChange} onClose={()=>setShowSettings(false)}/>
      )}
    </div>
  );
}