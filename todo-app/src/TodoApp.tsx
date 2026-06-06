/**
 * ╔══════════════════════════════════════════════════════╗
 *  DARK TODO UYGULAMASI — React + TypeScript
 *  Mülakat için açıklamalı, tam tiplenmiş örnek proje
 * ╚══════════════════════════════════════════════════════╝
 *
 *  Kullanılan kavramlar:
 *  ✦ Interface & Union Type   → veri şekilleri
 *  ✦ useState<T>              → tipli state yönetimi
 *  ✦ Custom Hook              → tekrar kullanılabilir mantık
 *  ✦ Props ile bileşen iletişimi
 *  ✦ .map() / .filter() / .reduce()
 *  ✦ Koşullu render
 *  ✦ localStorage ile kalıcı veri
 */

import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────
//  1. TİP TANIMLAMALARI (TypeScript Interface & Union)
// ─────────────────────────────────────────────────────────

// Union Type: öncelik sadece bu 3 değerden biri olabilir
type Priority = "düşük" | "orta" | "yüksek";

// Union Type: filtre seçenekleri
type Filter = "hepsi" | "aktif" | "tamamlanan";

// Interface: bir notun tam veri şekli
interface Todo {
  id: string;           // benzersiz kimlik (string — Date.now().toString())
  text: string;         // not metni
  done: boolean;        // tamamlandı mı?
  priority: Priority;   // öncelik seviyesi
  createdAt: number;    // oluşturma zamanı (timestamp)
  tag: string;          // etiket / kategori
}

// Interface: yeni todo formu için geçici state şekli
interface NewTodoForm {
  text: string;
  priority: Priority;
  tag: string;
}

// ─────────────────────────────────────────────────────────
//  2. CUSTOM HOOK — useTodos
//     Tüm todo mantığı burada — App temiz kalır
//     Mülakatta: "Custom Hook nedir?" sorusuna bu örnek
// ─────────────────────────────────────────────────────────
function useTodos() {
  // localStorage'dan başlangıç verisini oku
  // useState'e fonksiyon vermek "lazy initialization" — sadece 1 kez çalışır
  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      const saved = localStorage.getItem("todos-ts");
      return saved ? (JSON.parse(saved) as Todo[]) : [];
    } catch {
      return [];
    }
  });

  const [filter, setFilter] = useState<Filter>("hepsi");
  const [search, setSearch] = useState<string>("");

  // todos her değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem("todos-ts", JSON.stringify(todos));
  }, [todos]); // bağımlılık: todos değişince çalış

  // useCallback: fonksiyonu gereksiz yeniden oluşturmayı önler
  const addTodo = useCallback((form: NewTodoForm) => {
    if (!form.text.trim()) return;

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: form.text.trim(),
      done: false,
      priority: form.priority,
      createdAt: Date.now(),
      tag: form.tag || "genel",
    };

    // Immutability: spread ile yeni dizi oluştur, push kullanma!
    setTodos((prev) => [newTodo, ...prev]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
        //             ↑ spread ile kopyala, sadece done'ı değiştir
      )
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((t) => !t.done));
  }, []);

  // Filtrelenmiş + aranmış liste — derived state (state'ten türetilen değer)
  // Bu değeri state'e koymaya gerek yok, her render'da hesaplanır
  const filteredTodos = todos
    .filter((t) => {
      if (filter === "aktif") return !t.done;
      if (filter === "tamamlanan") return t.done;
      return true;
    })
    .filter((t) =>
      t.text.toLowerCase().includes(search.toLowerCase()) ||
      t.tag.toLowerCase().includes(search.toLowerCase())
    );

  // İstatistikler — .reduce() ile tek geçişte hesapla
  const stats = todos.reduce(
    (acc, t) => ({
      total: acc.total + 1,
      done: acc.done + (t.done ? 1 : 0),
      active: acc.active + (t.done ? 0 : 1),
    }),
    { total: 0, done: 0, active: 0 }
  );

  return {
    todos: filteredTodos,
    filter, setFilter,
    search, setSearch,
    stats,
    addTodo, toggleTodo, deleteTodo, clearCompleted,
  };
}

// ─────────────────────────────────────────────────────────
//  3. ALT BİLEŞEN — TodoItem Props Interface
// ─────────────────────────────────────────────────────────
interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  // Önceliğe göre renk — Record<K,V> tip güvenli obje tipi
  const priorityColors: Record<Priority, { bg: string; text: string; dot: string }> = {
    düşük:  { bg: "rgba(16,185,129,0.12)",  text: "#10b981", dot: "#10b981" },
    orta:   { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", dot: "#f59e0b" },
    yüksek: { bg: "rgba(239,68,68,0.12)",   text: "#ef4444", dot: "#ef4444" },
  };

  const pc = priorityColors[todo.priority];

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      padding: "16px 18px",
      borderRadius: 12,
      background: todo.done ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
      border: `1px solid ${todo.done ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)"}`,
      marginBottom: 10,
      transition: "all 0.2s ease",
      opacity: todo.done ? 0.5 : 1,
      animation: "fadeIn 0.3s ease",
    }}>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo.id)}
        style={{
          width: 22, height: 22, borderRadius: 6, border: "2px solid",
          borderColor: todo.done ? "#6366f1" : "rgba(255,255,255,0.2)",
          background: todo.done ? "#6366f1" : "transparent",
          cursor: "pointer", flexShrink: 0, marginTop: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s ease",
        }}
      >
        {todo.done && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* İçerik */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 14.5, fontWeight: 500,
          color: todo.done ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.9)",
          textDecoration: todo.done ? "line-through" : "none",
          lineHeight: 1.5, wordBreak: "break-word",
          fontFamily: "'Sora', sans-serif",
        }}>
          {todo.text}
        </p>

        {/* Etiketler */}
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {/* Öncelik etiketi */}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px",
            borderRadius: 20, background: pc.bg, color: pc.text,
            letterSpacing: "0.5px", textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: pc.dot, display: "inline-block" }} />
            {todo.priority}
          </span>

          {/* Kategori etiketi */}
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "2px 8px",
            borderRadius: 20, background: "rgba(99,102,241,0.15)",
            color: "#818cf8", letterSpacing: "0.3px",
          }}>
            #{todo.tag}
          </span>
        </div>
      </div>

      {/* Sil butonu */}
      <button
        onClick={() => onDelete(todo.id)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.2)", fontSize: 18, lineHeight: 1,
          padding: "0 2px", transition: "color 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
        title="Sil"
      >
        ×
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  4. ANA BİLEŞEN — App
// ─────────────────────────────────────────────────────────
export default function App() {

  // Custom hook'tan tüm state ve işlevleri al
  const {
    todos, filter, setFilter, search, setSearch,
    stats, addTodo, toggleTodo, deleteTodo, clearCompleted,
  } = useTodos();

  // Form state — NewTodoForm interface kullanıyoruz
  const [form, setForm] = useState<NewTodoForm>({
    text: "",
    priority: "orta",
    tag: "",
  });

  const [showForm, setShowForm] = useState<boolean>(false);

  // Form submit handler
  function handleSubmit() {
    addTodo(form);
    setForm({ text: "", priority: "orta", tag: "" }); // formu sıfırla
    setShowForm(false);
  }

  // İlerleme yüzdesi — derived value
  const progress = stats.total > 0
    ? Math.round((stats.done / stats.total) * 100)
    : 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      padding: "40px 16px 80px",
      fontFamily: "'Sora', 'Segoe UI', sans-serif",
    }}>

      {/* CSS animasyonları ve font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; }
        ::placeholder { color: rgba(255,255,255,0.2) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 2px; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* ── BAŞLIK ── */}
        <div style={{ marginBottom: 32, animation: "fadeIn 0.5s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "#6366f1",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>
              ✦
            </div>
            <h1 style={{
              fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px",
            }}>
              notlar
            </h1>
          </div>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
            React + TypeScript · kalıcı depolama
          </p>
        </div>

        {/* ── İSTATİSTİK KARTLARI ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10, marginBottom: 20, animation: "fadeIn 0.5s ease 0.1s both",
        }}>
          {[
            { label: "Toplam", value: stats.total, color: "#6366f1" },
            { label: "Aktif",  value: stats.active, color: "#f59e0b" },
            { label: "Bitti",  value: stats.done,   color: "#10b981" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: "14px 16px", textAlign: "center",
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2, fontWeight: 600 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── İLERLEME ÇUBUĞU ── */}
        {stats.total > 0 && (
          <div style={{ marginBottom: 20, animation: "fadeIn 0.4s ease" }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginBottom: 6, fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600,
            }}>
              <span>İlerleme</span>
              <span style={{ color: "#6366f1" }}>{progress}%</span>
            </div>
            <div style={{
              height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${progress}%`,
                background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                borderRadius: 10, transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        )}

        {/* ── ARAMA + EKLE BUTONU ── */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 16,
          animation: "fadeIn 0.5s ease 0.2s both",
        }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)} // controlled input
            placeholder="Ara..."
            style={{
              flex: 1, padding: "10px 14px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, color: "#fff", fontSize: 13, outline: "none",
            }}
          />
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: "10px 18px",
              background: showForm ? "rgba(99,102,241,0.3)" : "#6366f1",
              border: "none", borderRadius: 10, color: "#fff",
              fontSize: 20, cursor: "pointer", lineHeight: 1,
              transition: "all 0.2s ease",
            }}
          >
            {showForm ? "×" : "+"}
          </button>
        </div>

        {/* ── YENİ TODO FORMU (koşullu render) ── */}
        {showForm && (
          <div style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: 14, padding: 18, marginBottom: 16,
            animation: "fadeIn 0.25s ease",
          }}>

            {/* Metin alanı */}
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Ne yapılacak?"
              rows={2}
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, color: "#fff", fontSize: 14,
                padding: "10px 14px", outline: "none", resize: "none",
                fontFamily: "inherit",
              }}
            />

            {/* Öncelik + Etiket satırı */}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {/* Öncelik seçici — TypeScript: değeri Priority tipine cast et */}
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                style={{
                  flex: 1, padding: "9px 12px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10, color: "#fff", fontSize: 12,
                  outline: "none", cursor: "pointer",
                }}
              >
                <option value="düşük">🟢 Düşük</option>
                <option value="orta">🟡 Orta</option>
                <option value="yüksek">🔴 Yüksek</option>
              </select>

              <input
                type="text"
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                placeholder="etiket (ör: iş)"
                style={{
                  flex: 1, padding: "9px 12px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10, color: "#fff", fontSize: 12, outline: "none",
                }}
              />
            </div>

            {/* Ekle butonu */}
            <button
              onClick={handleSubmit}
              disabled={!form.text.trim()}
              style={{
                width: "100%", marginTop: 12, padding: "11px",
                background: form.text.trim() ? "#6366f1" : "rgba(99,102,241,0.2)",
                border: "none", borderRadius: 10, color: "#fff",
                fontSize: 13, fontWeight: 700, cursor: form.text.trim() ? "pointer" : "not-allowed",
                transition: "background 0.2s",
              }}
            >
              + Ekle
            </button>
          </div>
        )}

        {/* ── FİLTRE BUTONLARI ── */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 16,
          animation: "fadeIn 0.5s ease 0.3s both",
        }}>
          {(["hepsi", "aktif", "tamamlanan"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px", borderRadius: 20,
                border: "1px solid",
                borderColor: filter === f ? "#6366f1" : "rgba(255,255,255,0.1)",
                background: filter === f ? "rgba(99,102,241,0.2)" : "transparent",
                color: filter === f ? "#818cf8" : "rgba(255,255,255,0.35)",
                fontSize: 12, fontWeight: filter === f ? 700 : 400,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {f}
            </button>
          ))}

          {/* Tamamlananları temizle — koşullu render */}
          {stats.done > 0 && (
            <button
              onClick={clearCompleted}
              style={{
                marginLeft: "auto", padding: "6px 12px", borderRadius: 20,
                border: "1px solid rgba(239,68,68,0.3)",
                background: "transparent", color: "rgba(239,68,68,0.6)",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
            >
              temizle ({stats.done})
            </button>
          )}
        </div>

        {/* ── TODO LİSTESİ ── */}
        <div style={{ animation: "fadeIn 0.5s ease 0.4s both" }}>
          {todos.length === 0 ? (
            // Boş durum — koşullu render
            <div style={{
              textAlign: "center", padding: "50px 0",
              color: "rgba(255,255,255,0.15)", fontSize: 13,
            }}>
              <div style={{ fontSize: 36, marginBottom: 12, animation: "pulse 2s infinite" }}>
                ✦
              </div>
              {search ? "Arama sonucu bulunamadı" : "Henüz not yok"}
            </div>
          ) : (
            // .map() ile her todo'yu TodoItem bileşenine dönüştür
            // key prop: React'in listeyi takip etmesi için zorunlu
            todos.map((todo) => (
              <TodoItem
                key={todo.id}       // benzersiz id — index kullanma!
                todo={todo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
              />
            ))
          )}
        </div>

        {/* ── ALT BİLGİ ── */}
        {stats.total > 0 && (
          <p style={{
            textAlign: "center", fontSize: 11,
            color: "rgba(255,255,255,0.15)", marginTop: 24, fontWeight: 500,
          }}>
            {stats.active} kaldı · localStorage'a kaydedildi
          </p>
        )}

      </div>
    </div>
  );
}
