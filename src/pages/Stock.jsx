// ─────────────────────────────────────────────────────────────────────────────
// Stock.jsx — Module Gestion des Stocks pour GestApp
// ─────────────────────────────────────────────────────────────────────────────
import { useContext, useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { ThemeCtx } from "../App";

// ─── HELPERS INLINE ──────────────────────────────────────────────────────────
const makeG = (C) => ({
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 },
  btn:(v="default")=>({
    padding:"9px 18px", borderRadius:8, border:"none", cursor:"pointer",
    fontSize:13, fontWeight:600, transition:"all .15s",
    background:v==="primary"?C.accent:v==="danger"?C.red:v==="green"?C.green:v==="blue"?C.blue:v==="purple"?C.purple:v==="orange"?"#f97316":C.border,
    color:v==="primary"?"#000":C.text
  }),
  badge:(color)=>({ background:color+"22", color, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }),
  input:{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:13, width:"100%", boxSizing:"border-box", outline:"none" },
  label:{ fontSize:12, color:C.muted, marginBottom:6, display:"block", textTransform:"uppercase", letterSpacing:.8 },
  th:{ textAlign:"left", padding:"10px 14px", fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:.8, borderBottom:`1px solid ${C.border}` },
  td:{ padding:"12px 14px", fontSize:13, borderBottom:`1px solid ${C.border}` },
});

function formatDA(n){ try{ return (parseFloat(n)||0).toLocaleString("fr-DZ")+" DA"; }catch{ return "0 DA"; } }
function formatDate(d){ try{ return new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}); }catch{ return "—"; } }
function formatDateTime(d){ try{ const dt=new Date(d); return dt.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"})+" "+dt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}); }catch{ return "—"; } }
function todayISO(){ return new Date().toISOString().split("T")[0]; }
function parseNum(v,f=0){ const n=parseFloat(v); return isNaN(n)?f:n; }
function textMatch(t,q){ try{ return (t||"").toLowerCase().includes((q||"").toLowerCase()); }catch{ return false; } }
function generateRef(prefix,list){ try{ return `${prefix}-${String((list||[]).length+1).padStart(4,"0")}`; }catch{ return `${prefix}-0001`; } }

// ─── CONSTANTES MOUVEMENTS ────────────────────────────────────────────────────
const MOVEMENT_TYPES = {
  ENTRY:          { label:"Entrée stock",     color:"#00c896", sign:"+" },
  SALE_RETAIL:    { label:"Vente détail",      color:"#4d8fff", sign:"-" },
  SALE_WHOLESALE: { label:"Vente gros",        color:"#a855f7", sign:"-" },
  INTERNAL_EXIT:  { label:"Sortie interne",    color:"#f97316", sign:"-" },
  INVENTORY_ADJ:  { label:"Ajust. inventaire", color:"#f0a500", sign:"±" },
};
const INTERNAL_EXIT_REASONS = ["Perte","Casse","Don","Usage interne","Péremption","Autre"];

// ─── COMPOSANTS UI INLINE ─────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide=false }) {
  const C = useContext(ThemeCtx);
  const s = makeG(C);
  return (
    <div role="dialog" aria-modal="true"
      style={{position:"fixed",inset:0,background:"#00000099",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{...s.card,width:wide?960:520,maxHeight:"92vh",overflowY:"auto",animation:"fadeIn .2s ease"}}
           onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:17,fontWeight:800,color:C.text}}>{title}</div>
          <button aria-label="Fermer" style={{...s.btn(),padding:"4px 10px",fontSize:16}} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

function EmptyState({ icon="📭", message="Aucune donnée" }) {
  const C = useContext(ThemeCtx);
  return <div style={{textAlign:"center",padding:"60px 20px",color:C.muted,fontSize:13}}><div style={{fontSize:40,marginBottom:12}}>{icon}</div><div>{message}</div></div>;
}

function SearchBar({ value, onChange, placeholder="🔍 Rechercher..." }) {
  const C = useContext(ThemeCtx);
  const s = makeG(C);
  return <input style={{...s.input,maxWidth:300}} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>;
}

function StatCard({ label, value, color, icon, delta, positive=true }) {
  const C = useContext(ThemeCtx);
  const s = makeG(C);
  return (
    <div style={{...s.card,borderTop:`3px solid ${color}`}}>
      {icon&&<div style={{fontSize:22,marginBottom:8}}>{icon}</div>}
      <div style={{fontSize:24,fontWeight:800,color}}>{value}</div>
      <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginTop:4}}>{label}</div>
      {delta&&<div style={{fontSize:12,color:positive?C.green:C.red,marginTop:6}}>{positive?"↑":"↓"} {delta}</div>}
    </div>
  );
}

function PageHeader({ title, subtitle, actions }) {
  const C = useContext(ThemeCtx);
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
      <div>
        <div style={{fontSize:20,fontWeight:800,color:C.text}}>{title}</div>
        {subtitle&&<div style={{fontSize:13,color:C.muted,marginTop:4}}>{subtitle}</div>}
      </div>
      {actions&&<div style={{display:"flex",gap:8}}>{actions}</div>}
    </div>
  );
}

// ─── COLONNES DU MODÈLE EXCEL ─────────────────────────────────────────────────
const EXCEL_COLUMNS = [
  { key: "name",           label: "Désignation *",        required: true,  type: "string"  },
  { key: "category",       label: "Catégorie",             required: false, type: "string"  },
  { key: "unit",           label: "Unité",                 required: false, type: "string"  },
  { key: "barcode",        label: "Code-barres",           required: false, type: "string"  },
  { key: "buyPrice",       label: "Prix achat (DA)",       required: false, type: "number"  },
  { key: "retailPrice",    label: "Prix détail (DA)",      required: false, type: "number"  },
  { key: "wholesalePrice", label: "Prix gros (DA)",        required: false, type: "number"  },
  { key: "stock",          label: "Stock actuel",          required: false, type: "number"  },
  { key: "minStock",       label: "Stock minimum",         required: false, type: "number"  },
  { key: "maxStock",       label: "Stock maximum",         required: false, type: "number"  },
  { key: "supplier",       label: "Fournisseur",           required: false, type: "string"  },
  { key: "code",           label: "Code produit",          required: false, type: "string"  },
];

// ─── TÉLÉCHARGER LE MODÈLE EXCEL ─────────────────────────────────────────────
function downloadTemplate() {
  try {
    const headers = EXCEL_COLUMNS.map((c) => c.label);
    const sample  = [
      ["Huile Fleurial 1L", "Épicerie", "unité", "6191234567890", 340, 460, 400, 100, 20, 500, "Cevital", "PRD-001"],
      ["Sucre 1kg",         "Épicerie", "kg",    "6191122334455", 95,  130, 110, 200, 50, 800, "ERIAD",   "PRD-002"],
      ["Lait 1L",           "Produits laitiers", "unité", "", 150, 210, 185, 80, 30, 300, "Candia", "PRD-003"],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);

    // Largeur des colonnes
    ws["!cols"] = EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.label.length + 4, 16) }));

    // Style entête (gras + couleur)
    headers.forEach((_, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      if (!ws[cellRef]) return;
      ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: "F59E0B" } } };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produits");
    XLSX.writeFile(wb, "stockpro_modele_import.xlsx");
  } catch (err) {
    console.error("[downloadTemplate] error:", err);
    alert("Erreur lors de la génération du modèle.");
  }
}

// ─── PARSER UN FICHIER EXCEL/CSV ──────────────────────────────────────────────
function parseExcelFile(file, callback) {
  try {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data     = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];
        const rows     = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        callback(null, rows);
      } catch (err) {
        callback("Fichier illisible. Vérifiez qu'il s'agit d'un fichier .xlsx ou .csv valide.");
      }
    };
    reader.onerror = () => callback("Impossible de lire le fichier.");
    reader.readAsArrayBuffer(file);
  } catch (err) {
    callback("Erreur lors de la lecture du fichier.");
  }
}

// ─── MAPPER UNE LIGNE EXCEL → PRODUIT ────────────────────────────────────────
function mapRowToProduct(row, existingProducts) {
  // Cherche la valeur par clé ou par label (flexible)
  const get = (key) => {
    const col = EXCEL_COLUMNS.find((c) => c.key === key);
    // Essaie le label exact, le label sans *, la clé directe
    const candidates = [col?.label, col?.label?.replace(" *",""), key];
    for (const k of candidates) {
      if (k && row[k] !== undefined && row[k] !== "") return row[k];
    }
    return "";
  };

  const name = String(get("name") || "").trim();
  if (!name) return null;

  const code = String(get("code") || "").trim() || nextProductCode(existingProducts);

  return {
    id:             Date.now() + Math.random(),
    code,
    name,
    barcode:        String(get("barcode") || ""),
    category:       String(get("category") || "Autres"),
    unit:           String(get("unit")     || "unité"),
    buyPrice:       parseNum(get("buyPrice")),
    retailPrice:    parseNum(get("retailPrice")),
    wholesalePrice: parseNum(get("wholesalePrice")),
    stock:          parseNum(get("stock")),
    minStock:       parseNum(get("minStock")) || 5,
    maxStock:       parseNum(get("maxStock")) || 0,
    supplier:       String(get("supplier") || ""),
    hasExpiry:      false,
    expiryDate:     "",
  };
}

function nextProductCode(products) {
  const n = (products || []).length + 1;
  return "PRD-" + String(n).padStart(3, "0");
}

// ─── CONSTANTES LOCALES ───────────────────────────────────────────────────────
const TABS = [
  { id: "catalogue",  icon: "📦", label: "Catalogue"        },
  { id: "entrees",    icon: "📥", label: "Entrées"           },
  { id: "sorties",    icon: "📤", label: "Sorties internes"  },
  { id: "inventaire", icon: "🔢", label: "Inventaire"        },
  { id: "mouvements", icon: "📋", label: "Mouvements"        },
];

const UNITS = ["unité", "kg", "g", "L", "mL", "carton", "paquet", "boîte", "sac", "lot"];

function stockStatus(p) {
  if (p.stock === 0)           return "rupture";
  if (p.stock <= p.minStock)   return "faible";
  if (p.maxStock && p.stock >= p.maxStock) return "surstock";
  return "ok";
}

function stockColor(status, C) {
  switch (status) {
    case "rupture":  return C.red;
    case "faible":   return C.orange;
    case "surstock": return C.blue;
    default:         return C.green;
  }
}

// ─── AJOUT RAPIDE — OPEN FOOD FACTS ──────────────────────────────────────────
async function lookupBarcode(barcode) {
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const res  = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;
    const p = json.product;
    return {
      name:     p.product_name_fr || p.product_name || p.abbreviated_product_name || "",
      brand:    p.brands || "",
      category: p.categories_tags?.[0]?.replace("en:","").replace("fr:","") || "",
      quantity: p.quantity || "",
    };
  } catch { return null; }
}

// ─── COMPOSANT MODAL AJOUT RAPIDE ─────────────────────────────────────────────
function QuickAddModal({ products, setProducts, categories, setCategories, onClose, C, s }) {
  const [barcode,    setBarcode]    = useState("");
  const [loading,    setLoading]    = useState(false);
  const [found,      setFound]      = useState(null);    // données Open Food Facts
  const [notFound,   setNotFound]   = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [form, setForm] = useState({ name:"", category:"Autres", unit:"unité", buyPrice:"", retailPrice:"", wholesalePrice:"", stock:"", minStock:"5", supplier:"" });
  const barcodeInputRef = useRef(null);

  const resetForm = () => {
    setBarcode(""); setFound(null); setNotFound(false);
    setForm({ name:"", category:"Autres", unit:"unité", buyPrice:"", retailPrice:"", wholesalePrice:"", stock:"", minStock:"5", supplier:"" });
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  const handleScan = async (code) => {
    const clean = code.trim();
    if (!clean) return;
    // Vérifie si déjà dans le catalogue
    const exists = (products || []).find((p) => p.barcode === clean);
    if (exists) {
      setNotFound(false);
      setFound({ name: exists.name, brand: "", category: exists.category, quantity: "", alreadyExists: true });
      setForm((prev) => ({ ...prev, name: exists.name, category: exists.category }));
      return;
    }
    setLoading(true);
    setNotFound(false);
    setFound(null);
    const data = await lookupBarcode(clean);
    setLoading(false);
    if (data && data.name) {
      const cleanCat = cleanCategory(data.category);
      setFound(data);
      setForm((prev) => ({
        ...prev,
        name:     data.name + (data.quantity ? ` ${data.quantity}` : ""),
        category: cleanCat || "Autres",
        supplier: data.brand || "",
      }));
      // Auto-ajouter catégorie si nouvelle
      if (cleanCat && !(categories || []).includes(cleanCat)) {
        setCategories((prev) => [...prev, cleanCat]);
      }
    } else {
      setNotFound(true);
      setForm((prev) => ({ ...prev, name: "" }));
    }
  };

  const cleanCategory = (raw) => {
    if (!raw) return "";
    const map = { "oils":"Huiles & Graisses","fats":"Huiles & Graisses","beverages":"Boissons","drinks":"Boissons","dairy":"Produits laitiers","milks":"Produits laitiers","breads":"Boulangerie","cereals":"Épicerie","sugars":"Épicerie","pastas":"Épicerie","hygiene":"Hygiène","cleaning":"Nettoyage" };
    const low = raw.toLowerCase();
    for (const [k, v] of Object.entries(map)) if (low.includes(k)) return v;
    return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/-/g, " ");
  };

  const handleBarcodeKey = (e) => {
    if (e.key === "Enter") { handleScan(e.target.value); }
  };

  const handleAdd = () => {
    try {
      if (!form.name.trim()) return;
      const newProduct = {
        id:             Date.now(),
        code:           nextProductCode(products),
        barcode:        barcode.trim(),
        name:           form.name.trim(),
        category:       form.category || "Autres",
        unit:           form.unit || "unité",
        buyPrice:       parseNum(form.buyPrice),
        retailPrice:    parseNum(form.retailPrice),
        wholesalePrice: parseNum(form.wholesalePrice),
        stock:          parseNum(form.stock),
        minStock:       parseNum(form.minStock) || 5,
        maxStock:       0,
        supplier:       form.supplier.trim(),
        hasExpiry:      false,
        expiryDate:     "",
      };
      setProducts((prev) => [...(prev || []), newProduct]);
      setAddedCount((n) => n + 1);
      resetForm();
    } catch (err) { console.error("[QuickAdd] handleAdd error:", err); }
  };

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000099",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300,
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
        width: 520, maxHeight: "92vh", overflowY: "auto",
        padding: 28, animation: "fadeIn .2s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>⚡ Ajout rapide</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {addedCount > 0
                ? <span style={{ color: C.green, fontWeight: 600 }}>✅ {addedCount} produit{addedCount > 1 ? "s" : ""} ajouté{addedCount > 1 ? "s" : ""}</span>
                : "Scannez ou tapez un code-barres pour commencer"}
            </div>
          </div>
          <button style={{ ...s.btn(), padding: "4px 10px", fontSize: 16 }} onClick={onClose}>✕</button>
        </div>

        {/* Champ code-barres */}
        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>📷 Code-barres (scanner ou saisir manuellement)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={barcodeInputRef}
              style={{ ...s.input, flex: 1, fontFamily: "monospace", fontSize: 15, letterSpacing: 2 }}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcodeKey}
              placeholder="6XXXXXXXXXX"
              autoFocus
            />
            <button
              style={{ ...s.btn("primary"), padding: "0 18px", whiteSpace: "nowrap" }}
              onClick={() => handleScan(barcode)}
              disabled={loading}
            >
              {loading ? "⏳" : "🔍 Chercher"}
            </button>
          </div>
        </div>

        {/* État recherche */}
        {loading && (
          <div style={{ textAlign: "center", padding: "12px 0", color: C.muted, fontSize: 13, marginBottom: 12 }}>
            ⏳ Recherche dans la base mondiale Open Food Facts...
          </div>
        )}

        {found && !found.alreadyExists && (
          <div style={{ padding: "10px 14px", background: C.green + "15", border: `1px solid ${C.green}`, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            ✅ <strong style={{ color: C.green }}>Produit trouvé !</strong>{" "}
            <span style={{ color: C.text }}>{found.name}{found.brand ? ` — ${found.brand}` : ""}</span>
            <span style={{ color: C.muted }}> (informations remplies automatiquement)</span>
          </div>
        )}

        {found?.alreadyExists && (
          <div style={{ padding: "10px 14px", background: C.orange + "15", border: `1px solid ${C.orange}`, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            ⚠️ Ce code-barres existe déjà dans le catalogue : <strong style={{ color: C.orange }}>{found.name}</strong>
          </div>
        )}

        {notFound && (
          <div style={{ padding: "10px 14px", background: C.muted + "18", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 14, fontSize: 13, color: C.muted }}>
            🔍 Produit non trouvé dans la base. Remplissez le nom manuellement.
          </div>
        )}

        {/* Formulaire rapide */}
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>Désignation *</label>
          <input
            style={{ ...s.input, fontWeight: 600 }}
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Nom du produit"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={s.label}>Catégorie</label>
            <select style={s.input} value={form.category} onChange={(e) => setField("category", e.target.value)}>
              {[...(categories || []), "Autres"].filter((v, i, a) => a.indexOf(v) === i).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>Unité</label>
            <select style={s.input} value={form.unit} onChange={(e) => setField("unit", e.target.value)}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Prix */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            ["buyPrice",       "💳 Prix achat",  "DA"],
            ["retailPrice",    "🛒 Prix détail", "DA"],
            ["wholesalePrice", "📦 Prix gros",   "DA"],
          ].map(([k, l]) => (
            <div key={k}>
              <label style={s.label}>{l}</label>
              <input
                style={{ ...s.input, textAlign: "center" }}
                type="number" min="0"
                value={form[k]}
                onChange={(e) => setField(k, e.target.value)}
                placeholder="0"
              />
            </div>
          ))}
        </div>

        {/* Stock */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div>
            <label style={s.label}>📦 Stock initial</label>
            <input style={{ ...s.input, textAlign: "center" }} type="number" min="0" value={form.stock} onChange={(e) => setField("stock", e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={s.label}>⚠️ Stock min.</label>
            <input style={{ ...s.input, textAlign: "center" }} type="number" min="0" value={form.minStock} onChange={(e) => setField("minStock", e.target.value)} />
          </div>
          <div>
            <label style={s.label}>🚚 Fournisseur</label>
            <input style={s.input} value={form.supplier} onChange={(e) => setField("supplier", e.target.value)} placeholder="Optionnel" />
          </div>
        </div>

        {/* Boutons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{
              ...s.btn("primary"), flex: 2, padding: 13, fontSize: 14, borderRadius: 10,
              opacity: !form.name.trim() ? 0.4 : 1,
              cursor: !form.name.trim() ? "not-allowed" : "pointer",
            }}
            onClick={handleAdd}
            disabled={!form.name.trim()}
          >
            ✅ Ajouter  ⏭ Produit suivant
          </button>
          <button style={{ ...s.btn(), flex: 1, padding: 13 }} onClick={onClose}>
            Terminer ({addedCount} ajouté{addedCount > 1 ? "s" : ""})
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: C.muted, textAlign: "center" }}>
          💡 Astuce : après chaque ajout le curseur revient sur le code-barres — scannez directement le suivant
        </div>
      </div>
    </div>
  );
}
export default function Stock({
  products, setProducts,
  categories, setCategories,
  suppliers,
  movements, addMovement,
  inventorySessions, setInventorySessions,
  user,
}) {
  const C = useContext(ThemeCtx);
  const s = makeG(C);
  const [tab, setTab] = useState("catalogue");

  // KPI
  const totalProducts  = (products || []).length;
  const stockValue     = (products || []).reduce((sum, p) => sum + p.stock * p.buyPrice, 0);
  const ruptures       = (products || []).filter((p) => p.stock === 0).length;
  const alertes        = (products || []).filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const expires        = (products || []).filter((p) => p.hasExpiry && p.expiryDate && new Date(p.expiryDate) <= new Date(Date.now() + 30 * 86400000)).length;

  const tabCounts = {
    entrees:   (movements || []).filter((m) => m.type === "ENTRY").length,
    sorties:   (movements || []).filter((m) => m.type === "INTERNAL_EXIT").length,
    inventaire:(inventorySessions || []).length,
    mouvements:(movements || []).length,
  };

  return (
    <div>
      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 22 }}>
        <StatCard label="Produits"      value={totalProducts}           color={C.blue}   positive icon="📦" />
        <StatCard label="Valeur stock"  value={formatDA(stockValue)}    color={C.accent} positive icon="💰" />
        <StatCard label="Ruptures"      value={ruptures}   delta={ruptures > 0 ? "à commander" : "Aucune"} color={ruptures > 0 ? C.red : C.green} positive={ruptures === 0} icon="🚨" />
        <StatCard label="Stock faible"  value={alertes}    delta={alertes > 0 ? "sous le seuil" : "Tout OK"} color={alertes > 0 ? C.orange : C.green} positive={alertes === 0} icon="⚠️" />
        <StatCard label="Expirations"   value={expires}    delta="dans 30 jours" color={expires > 0 ? C.red : C.green} positive={expires === 0} icon="📅" />
      </div>

      {/* Bannière alertes */}
      {(ruptures > 0 || alertes > 0) && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, marginBottom: 16,
          background: C.red + "12", border: `1px solid ${C.red}`,
          fontSize: 13, color: C.text,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          🚨 <strong style={{ color: C.red }}>{ruptures} rupture(s)</strong> et{" "}
          <strong style={{ color: C.orange }}>{alertes} produit(s) en stock faible</strong> — commandez dès maintenant.
        </div>
      )}

      {/* Onglets */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 24,
        background: C.surface, borderRadius: 10, padding: 4,
        border: `1px solid ${C.border}`, width: "fit-content",
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none",
              cursor: "pointer", fontSize: 13, transition: "all .15s",
              background: tab === t.id ? C.accent : "transparent",
              color: tab === t.id ? "#000" : C.muted,
              fontWeight: tab === t.id ? 700 : 400,
            }}
          >
            {t.icon} {t.label}
            {tabCounts[t.id] > 0 && tab !== t.id && (
              <span style={{
                marginLeft: 6, background: C.border, color: C.muted,
                borderRadius: 10, fontSize: 10, padding: "1px 6px",
              }}>
                {tabCounts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {tab === "catalogue"  && <TabCatalogue  products={products} setProducts={setProducts} categories={categories} setCategories={setCategories} movements={movements} addMovement={addMovement} user={user} C={C} s={s} />}
      {tab === "entrees"    && <TabEntrees    products={products} setProducts={setProducts} suppliers={suppliers} movements={movements} addMovement={addMovement} user={user} C={C} s={s} />}
      {tab === "sorties"    && <TabSorties    products={products} setProducts={setProducts} movements={movements} addMovement={addMovement} user={user} C={C} s={s} />}
      {tab === "inventaire" && <TabInventaire products={products} setProducts={setProducts} inventorySessions={inventorySessions} setInventorySessions={setInventorySessions} addMovement={addMovement} user={user} C={C} s={s} />}
      {tab === "mouvements" && <TabMouvements movements={movements} products={products} C={C} s={s} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONGLET 1 — CATALOGUE
// ═══════════════════════════════════════════════════════════════════════════════
function TabCatalogue({ products, setProducts, categories, setCategories, movements, user, C, s }) {
  const [search,       setSearch]       = useState("");
  const [catFilter,    setCatFilter]    = useState("Tous");
  const [alertFilter,  setAlertFilter]  = useState(false);
  const [viewMode,     setViewMode]     = useState("list");
  const [showModal,    setShowModal]    = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showImport,   setShowImport]   = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [newCat,       setNewCat]       = useState("");
  const [importRows,   setImportRows]   = useState([]);
  const [importError,  setImportError]  = useState("");
  const [importMode,   setImportMode]   = useState("add"); // "add" | "replace"
  const barcodeRef = useRef(null);
  const fileInputRef = useRef(null);

  const EMPTY_FORM = {
    code: "", barcode: "", name: "", category: categories?.[0] || "Épicerie",
    buyPrice: 0, retailPrice: 0, wholesalePrice: 0,
    stock: 0, minStock: 5, maxStock: 0,
    unit: "unité", supplier: "", hasExpiry: false, expiryDate: "",
  };
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = useMemo(() => {
    return (products || []).filter((p) => {
      if (alertFilter) {
        const st = stockStatus(p);
        if (st !== "rupture" && st !== "faible") return false;
      }
      if (catFilter !== "Tous" && p.category !== catFilter) return false;
      return textMatch(p.name, search) || textMatch(p.barcode, search) || textMatch(p.code, search);
    });
  }, [products, catFilter, search, alertFilter]);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, code: nextProductCode(products) });
    setEditingId(null);
    setShowModal(true);
  };
  const openEdit = (p) => { setForm({ ...p }); setEditingId(p.id); setShowModal(true); };

  const handleSave = () => {
    try {
      if (!form.name.trim()) return;
      if (editingId) {
        setProducts((prev) => prev.map((p) => p.id === editingId ? { ...form, id: editingId } : p));
      } else {
        setProducts((prev) => [...prev, { ...form, id: Date.now() }]);
      }
      setShowModal(false);
    } catch (err) { console.error("[Stock/TabCatalogue] handleSave error:", err); }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Supprimer ce produit ?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const adjustStock = (id, delta) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p));
  };

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const addCategory = () => {
    if (!newCat.trim() || (categories || []).includes(newCat.trim())) return;
    setCategories((prev) => [...prev, newCat.trim()]);
    setNewCat("");
  };

  // ─── Import Excel ───────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportRows([]);
    parseExcelFile(file, (err, rows) => {
      if (err) { setImportError(err); return; }
      if (!rows || rows.length === 0) { setImportError("Le fichier est vide."); return; }
      const parsed = rows
        .map((row) => mapRowToProduct(row, products))
        .filter(Boolean);
      if (parsed.length === 0) {
        setImportError("Aucun produit valide trouvé. Vérifiez que la colonne 'Désignation *' est remplie.");
        return;
      }
      setImportRows(parsed);
    });
    e.target.value = "";
  };

  const handleConfirmImport = () => {
    try {
      if (importRows.length === 0) return;
      // Nouvelles catégories à ajouter automatiquement
      const newCats = [...new Set(importRows.map((r) => r.category))].filter((c) => c && !(categories || []).includes(c));
      if (newCats.length > 0) setCategories((prev) => [...prev, ...newCats]);

      if (importMode === "replace") {
        setProducts(importRows);
      } else {
        // Fusion : évite les doublons par code-barres ou nom exact
        setProducts((prev) => {
          const existing = prev || [];
          const toAdd    = importRows.filter((r) =>
            !existing.some((p) => (r.barcode && p.barcode === r.barcode) || p.name.toLowerCase() === r.name.toLowerCase())
          );
          return [...existing, ...toAdd];
        });
      }
      setShowImport(false);
      setImportRows([]);
      setImportError("");
    } catch (err) {
      console.error("[Stock/Import] handleConfirmImport error:", err);
    }
  };

  const alertCount = (products || []).filter((p) => ["rupture","faible"].includes(stockStatus(p))).length;

  return (
    <div>
      <PageHeader
        title={`Catalogue (${(products || []).length} produits)`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button style={s.btn()} onClick={() => setShowCatModal(true)}>⚙️ Catégories</button>
            <button style={{ ...s.btn("green"), fontSize: 13 }} onClick={downloadTemplate}>⬇️ Modèle Excel</button>
            <button style={{ ...s.btn("blue"), fontSize: 13 }} onClick={() => { setImportRows([]); setImportError(""); setShowImport(true); }}>📥 Importer Excel</button>
            <button style={{ ...s.btn("orange"), fontSize: 13 }} onClick={() => setShowQuickAdd(true)}>⚡ Ajout rapide</button>
            <button style={s.btn("primary")} onClick={openAdd}>+ Nouveau produit</button>
          </div>
        }
      />

      {/* Barre de recherche + vue */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍 Nom, code-barres, code produit..." />
        {/* Filtres alertes */}
        <button
          onClick={() => setAlertFilter((v) => !v)}
          style={{
            ...s.btn(alertFilter ? "danger" : "default"),
            fontSize: 12, padding: "6px 14px",
          }}
        >
          ⚠️ Alertes{alertCount > 0 ? ` (${alertCount})` : ""}
        </button>
        {/* Toggle vue */}
        <div style={{ display: "flex", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 2 }}>
          {[["list","☰ Liste"],["cards","⊞ Cartes"],["compact","▤ Compact"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              style={{
                padding: "5px 14px", borderRadius: 6, border: "none",
                cursor: "pointer", fontSize: 12, transition: "all .15s",
                background: viewMode === v ? C.accent : "transparent",
                color: viewMode === v ? "#000" : C.muted, fontWeight: viewMode === v ? 700 : 400,
              }}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Filtres catégories */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {["Tous", ...(categories || [])].map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            style={{ ...s.btn(cat === catFilter ? "primary" : "default"), padding: "5px 14px", fontSize: 12, borderRadius: 20 }}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? <EmptyState icon="📦" message="Aucun produit trouvé" /> : (
        <>
          {/* ── VUE LISTE ── */}
          {viewMode === "list" && (
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Code","Désignation","Cat.","Unité","P.Achat","P.Détail","P.Gros","Stock","Min/Max","Fournisseur","Actions"].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const st = stockStatus(p);
                    const sc = stockColor(st, C);
                    const ratio = p.maxStock ? Math.min(1, p.stock / p.maxStock) : (p.minStock ? Math.min(1, p.stock / (p.minStock * 5)) : 0.5);
                    return (
                      <tr key={p.id}>
                        <td style={{ ...s.td, fontFamily: "monospace", fontSize: 11, color: C.muted }}>{p.code}</td>
                        <td style={s.td}>
                          <div style={{ fontWeight: 600, color: C.text }}>{p.name}</div>
                          {p.hasExpiry && p.expiryDate && (
                            <div style={{ fontSize: 10, color: new Date(p.expiryDate) < new Date() ? C.red : C.muted }}>
                              Exp: {formatDate(p.expiryDate)}
                            </div>
                          )}
                          {p.barcode && <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{p.barcode}</div>}
                        </td>
                        <td style={s.td}>
                          <span style={{ background: C.blue + "22", color: C.blue, padding: "2px 8px", borderRadius: 10, fontSize: 11 }}>{p.category}</span>
                        </td>
                        <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{p.unit}</td>
                        <td style={{ ...s.td, color: C.muted }}>{formatDA(p.buyPrice)}</td>
                        <td style={{ ...s.td, color: C.green, fontWeight: 600 }}>{formatDA(p.retailPrice)}</td>
                        <td style={{ ...s.td, color: C.purple, fontWeight: 600 }}>{formatDA(p.wholesalePrice)}</td>
                        <td style={s.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => adjustStock(p.id, -1)} style={{ width:24, height:24, borderRadius:5, border:"none", background:C.border, color:C.text, cursor:"pointer", fontSize:14 }}>−</button>
                            <div style={{ textAlign: "center", minWidth: 36 }}>
                              <div style={{ fontWeight: 700, color: sc, fontSize: 14 }}>{p.stock}</div>
                              <div style={{ height: 3, background: C.border, borderRadius: 2, width: 36, marginTop: 2 }}>
                                <div style={{ width: `${ratio * 100}%`, background: sc, height: "100%", borderRadius: 2 }} />
                              </div>
                            </div>
                            <button onClick={() => adjustStock(p.id, 1)} style={{ width:24, height:24, borderRadius:5, border:"none", background:C.border, color:C.text, cursor:"pointer", fontSize:14 }}>+</button>
                          </div>
                        </td>
                        <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>
                          {p.minStock}{p.maxStock ? ` / ${p.maxStock}` : ""}
                        </td>
                        <td style={{ ...s.td, fontSize: 12, color: C.muted }}>{p.supplier || "—"}</td>
                        <td style={s.td}>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button style={{ ...s.btn(), padding: "4px 9px", fontSize: 11 }} onClick={() => openEdit(p)}>✏️</button>
                            <button style={{ ...s.btn("danger"), padding: "4px 9px", fontSize: 11 }} onClick={() => handleDelete(p.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── VUE CARTES ── */}
          {viewMode === "cards" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
              {filtered.map((p) => {
                const st = stockStatus(p);
                const sc = stockColor(st, C);
                const ratio = p.maxStock ? Math.min(1, p.stock / p.maxStock) : Math.min(1, p.stock / Math.max(p.minStock * 5, 1));
                return (
                  <div key={p.id} style={{
                    ...s.card, padding: 14,
                    borderTop: `3px solid ${sc}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", marginBottom: 2 }}>{p.code}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.name}</div>
                        <span style={{ background: C.blue + "22", color: C.blue, padding: "1px 7px", borderRadius: 10, fontSize: 10 }}>{p.category}</span>
                      </div>
                      {st !== "ok" && (
                        <span style={{ background: sc + "22", color: sc, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, marginLeft: 6 }}>
                          {st === "rupture" ? "Rupture" : st === "faible" ? "Faible" : "Surstock"}
                        </span>
                      )}
                    </div>
                    {/* Barre stock */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>Stock actuel</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: sc }}>{p.stock} {p.unit}</span>
                      </div>
                      <div style={{ height: 6, background: C.border, borderRadius: 4 }}>
                        <div style={{ width: `${ratio * 100}%`, background: sc, height: "100%", borderRadius: 4, transition: "width .4s" }} />
                      </div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
                        Min: {p.minStock}{p.maxStock ? ` · Max: ${p.maxStock}` : ""}
                      </div>
                    </div>
                    {/* Prix */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 10 }}>
                      {[["Achat", p.buyPrice, C.muted], ["Détail", p.retailPrice, C.green], ["Gros", p.wholesalePrice, C.purple]].map(([l, v, c]) => (
                        <div key={l} style={{ background: C.surface, borderRadius: 6, padding: "5px 0", textAlign: "center" }}>
                          <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>{l}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: c }}>{formatDA(v)}</div>
                        </div>
                      ))}
                    </div>
                    {/* Actions */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                      <div style={{ display: "flex", gap: 0 }}>
                        <button onClick={() => adjustStock(p.id, -1)} style={{ width:28, height:28, borderRadius:"6px 0 0 6px", border:"none", background:C.border, color:C.text, cursor:"pointer", fontSize:15 }}>−</button>
                        <div style={{ width:36, height:28, background:C.surface, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:sc }}>{p.stock}</div>
                        <button onClick={() => adjustStock(p.id, 1)} style={{ width:28, height:28, borderRadius:"0 6px 6px 0", border:"none", background:C.border, color:C.text, cursor:"pointer", fontSize:15 }}>+</button>
                      </div>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button style={{ ...s.btn(), padding: "4px 9px", fontSize: 11 }} onClick={() => openEdit(p)}>✏️</button>
                        <button style={{ ...s.btn("danger"), padding: "4px 9px", fontSize: 11 }} onClick={() => handleDelete(p.id)}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── VUE COMPACT ── */}
          {viewMode === "compact" && (
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Code","Désignation","Stock","Min","P.Vente","Statut"].map((h) => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const st = stockStatus(p);
                    const sc = stockColor(st, C);
                    return (
                      <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => openEdit(p)}>
                        <td style={{ ...s.td, fontFamily: "monospace", fontSize: 11, color: C.muted }}>{p.code}</td>
                        <td style={{ ...s.td, fontWeight: 600, color: C.text }}>{p.name}</td>
                        <td style={{ ...s.td, fontWeight: 700, color: sc }}>{p.stock} {p.unit}</td>
                        <td style={{ ...s.td, color: C.muted }}>{p.minStock}</td>
                        <td style={{ ...s.td, color: C.green, fontWeight: 600 }}>{formatDA(p.retailPrice)}</td>
                        <td style={s.td}>
                          <span style={{ background: sc + "22", color: sc, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                            {st === "ok" ? "✅ OK" : st === "rupture" ? "🚨 Rupture" : st === "faible" ? "⚠️ Faible" : "📦 Surstock"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal produit */}
      {showModal && (
        <Modal title={editingId ? "Modifier produit" : "Nouveau produit"} onClose={() => setShowModal(false)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={s.label}>Code produit</label>
              <input style={s.input} value={form.code} onChange={(e) => setField("code", e.target.value)} placeholder="PRD-001" />
            </div>
            <div>
              <label style={s.label}>Code-barres (scanner)</label>
              <input ref={barcodeRef} style={s.input} value={form.barcode} onChange={(e) => setField("barcode", e.target.value)} placeholder="6XXXXXXXXXX" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={s.label}>Désignation *</label>
              <input style={s.input} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Ex: Huile Fleurial 1L" />
            </div>
            <div>
              <label style={s.label}>Catégorie</label>
              <select style={s.input} value={form.category} onChange={(e) => setField("category", e.target.value)}>
                {(categories || []).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Unité</label>
              <select style={s.input} value={form.unit} onChange={(e) => setField("unit", e.target.value)}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            {[["buyPrice","Prix d'achat (DA)"],["retailPrice","Prix détail (DA)"],["wholesalePrice","Prix gros (DA)"]].map(([k, l]) => (
              <div key={k}>
                <label style={s.label}>{l}</label>
                <input style={s.input} type="number" min="0" value={form[k]} onChange={(e) => setField(k, parseNum(e.target.value))} />
              </div>
            ))}
            <div>
              <label style={s.label}>Stock initial</label>
              <input style={s.input} type="number" min="0" value={form.stock} onChange={(e) => setField("stock", parseNum(e.target.value))} />
            </div>
            <div>
              <label style={s.label}>Stock minimum (alerte)</label>
              <input style={s.input} type="number" min="0" value={form.minStock} onChange={(e) => setField("minStock", parseNum(e.target.value))} />
            </div>
            <div>
              <label style={s.label}>Stock maximum (optionnel)</label>
              <input style={s.input} type="number" min="0" value={form.maxStock} onChange={(e) => setField("maxStock", parseNum(e.target.value))} placeholder="0 = pas de limite" />
            </div>
            <div>
              <label style={s.label}>Fournisseur principal</label>
              <input style={s.input} value={form.supplier} onChange={(e) => setField("supplier", e.target.value)} placeholder="Nom du fournisseur" />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 16, alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={form.hasExpiry} onChange={(e) => setField("hasExpiry", e.target.checked)} />
                <span style={{ fontSize: 13, color: C.text }}>Ce produit a une date d'expiration</span>
              </label>
              {form.hasExpiry && (
                <div style={{ flex: 1 }}>
                  <input style={s.input} type="date" value={form.expiryDate} onChange={(e) => setField("expiryDate", e.target.value)} />
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button style={{ ...s.btn("primary"), flex: 1 }} onClick={handleSave}>Enregistrer</button>
            <button style={{ ...s.btn(), flex: 1 }} onClick={() => setShowModal(false)}>Annuler</button>
          </div>
        </Modal>
      )}

      {/* Modal catégories */}
      {showCatModal && (
        <Modal title="⚙️ Gestion des catégories" onClose={() => setShowCatModal(false)}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input style={{ ...s.input, flex: 1 }} value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} placeholder="Nouvelle catégorie..." />
            <button style={s.btn("primary")} onClick={addCategory}>+ Ajouter</button>
          </div>
          {(categories || []).map((cat) => (
            <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 6 }}>
              <span style={{ color: C.text, fontSize: 13 }}>{cat}</span>
              <button style={{ ...s.btn("danger"), padding: "3px 10px", fontSize: 11 }} onClick={() => { if (window.confirm(`Supprimer "${cat}" ?`)) setCategories((p) => p.filter((c) => c !== cat)); }}>🗑</button>
            </div>
          ))}
        </Modal>
      )}

      {/* Modal Import Excel */}
      {showImport && (        <Modal title="📥 Importer des produits depuis Excel" onClose={() => { setShowImport(false); setImportRows([]); setImportError(""); }} wide>

          {/* Étape 1 : télécharger le modèle */}
          <div style={{ ...s.card, background: C.blue + "0f", border: `1px solid ${C.blue}33`, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>
              Étape 1 — Télécharger le modèle
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
              Téléchargez le fichier Excel modèle, remplissez-le avec vos produits, puis importez-le.
              Les colonnes obligatoires sont marquées d'un <strong style={{ color: C.red }}>*</strong>.
            </div>
            <button style={{ ...s.btn("blue"), fontSize: 12 }} onClick={downloadTemplate}>
              ⬇️ Télécharger le modèle Excel (.xlsx)
            </button>
          </div>

          {/* Étape 2 : choisir le fichier */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>
              Étape 2 — Choisir votre fichier
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFileSelect} />
            <button
              style={{ ...s.btn("primary"), padding: "12px 24px", width: "100%", fontSize: 14 }}
              onClick={() => fileInputRef.current?.click()}
            >
              📂 Sélectionner un fichier Excel ou CSV
            </button>
            {importError && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: C.red + "12", border: `1px solid ${C.red}`, borderRadius: 8, fontSize: 13, color: C.red }}>
                ❌ {importError}
              </div>
            )}
          </div>

          {/* Étape 3 : aperçu + confirmation */}
          {importRows.length > 0 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>
                Étape 3 — Aperçu ({importRows.length} produit{importRows.length > 1 ? "s" : ""} détecté{importRows.length > 1 ? "s" : ""})
              </div>

              {/* Mode import */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[["add","➕ Ajouter aux produits existants"],["replace","🔄 Remplacer tout le catalogue"]].map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setImportMode(v)}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 8, cursor: "pointer",
                      border: `2px solid ${importMode === v ? (v === "replace" ? C.red : C.green) : C.border}`,
                      background: importMode === v ? (v === "replace" ? C.red + "15" : C.green + "15") : C.surface,
                      color: importMode === v ? (v === "replace" ? C.red : C.green) : C.text,
                      fontSize: 13, fontWeight: importMode === v ? 700 : 400,
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {importMode === "replace" && (
                <div style={{ padding: "8px 14px", background: C.red + "12", border: `1px solid ${C.red}`, borderRadius: 8, fontSize: 12, color: C.red, marginBottom: 12 }}>
                  ⚠️ Attention : cette action supprimera les {(products || []).length} produits existants et les remplacera par les {importRows.length} produits importés.
                </div>
              )}

              {/* Tableau aperçu */}
              <div style={{ maxHeight: 280, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 14 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.card, position: "sticky", top: 0 }}>
                      {["#","Désignation","Catégorie","Unité","P.Achat","P.Détail","P.Gros","Stock","Fournisseur"].map((h) => (
                        <th key={h} style={{ ...s.th, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((p, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : C.surface + "88" }}>
                        <td style={{ ...s.td, color: C.muted, fontSize: 11 }}>{i + 1}</td>
                        <td style={{ ...s.td, fontWeight: 600, color: C.text }}>{p.name}</td>
                        <td style={{ ...s.td, color: C.muted }}>{p.category}</td>
                        <td style={{ ...s.td, color: C.muted }}>{p.unit}</td>
                        <td style={{ ...s.td, color: C.muted }}>{p.buyPrice > 0 ? formatDA(p.buyPrice) : "—"}</td>
                        <td style={{ ...s.td, color: C.green }}>{p.retailPrice > 0 ? formatDA(p.retailPrice) : "—"}</td>
                        <td style={{ ...s.td, color: C.purple }}>{p.wholesalePrice > 0 ? formatDA(p.wholesalePrice) : "—"}</td>
                        <td style={{ ...s.td, color: C.text }}>{p.stock}</td>
                        <td style={{ ...s.td, color: C.muted, fontSize: 11 }}>{p.supplier || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{ ...s.btn("primary"), flex: 2, padding: 12, fontSize: 14 }}
                  onClick={handleConfirmImport}
                >
                  ✅ Importer {importRows.length} produit{importRows.length > 1 ? "s" : ""}
                </button>
                <button style={{ ...s.btn(), flex: 1 }} onClick={() => { setImportRows([]); setImportError(""); }}>
                  Changer de fichier
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Modal Ajout Rapide */}
      {showQuickAdd && (
        <QuickAddModal
          products={products}
          setProducts={setProducts}
          categories={categories}
          setCategories={setCategories}
          onClose={() => setShowQuickAdd(false)}
          C={C}
          s={s}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONGLET 2 — ENTRÉES (BON D'ENTRÉE)
// ═══════════════════════════════════════════════════════════════════════════════
function TabEntrees({ products, setProducts, suppliers, movements, addMovement, user, C, s }) {
  const [showModal, setShowModal] = useState(false);
  const [search,    setSearch]    = useState("");
  const EMPTY = { productId: "", supplierId: "", qty: 1, buyPrice: 0, date: todayISO(), note: "" };
  const [form, setForm] = useState(EMPTY);

  const entries = useMemo(
    () => (movements || []).filter((m) => m.type === "ENTRY").sort((a, b) => new Date(b.date) - new Date(a.date)),
    [movements]
  );

  const filteredEntries = useMemo(
    () => entries.filter((e) => textMatch(e.productName, search) || textMatch(e.ref, search)),
    [entries, search]
  );

  const handleProductSelect = (e) => {
    const prod = products.find((p) => p.id === parseInt(e.target.value));
    setForm((prev) => ({ ...prev, productId: e.target.value, buyPrice: prod?.buyPrice || 0 }));
  };

  const handleSave = () => {
    try {
      if (!form.productId || parseNum(form.qty) <= 0) return;
      const product   = products.find((p) => p.id === parseInt(form.productId));
      const supplier  = suppliers?.find((s) => s.id === parseInt(form.supplierId));
      const qty       = parseNum(form.qty);
      const beforeQty = product?.stock || 0;
      const afterQty  = beforeQty + qty;
      const ref       = generateRef("ENT", entries);

      setProducts((prev) =>
        prev.map((p) => p.id === product.id
          ? { ...p, stock: afterQty, buyPrice: parseNum(form.buyPrice) || p.buyPrice }
          : p
        )
      );

      addMovement({
        type:         "ENTRY",
        ref,
        productId:    product.id,
        productName:  product.name,
        productCode:  product.code,
        qty:          +qty,
        beforeQty,
        afterQty,
        unitPrice:    parseNum(form.buyPrice),
        totalValue:   parseNum(form.buyPrice) * qty,
        supplierId:   supplier?.id   || null,
        supplierName: supplier?.name || null,
        note:         form.note.trim(),
        date:         new Date(form.date).toISOString(),
        userId:       user?.id,
        userName:     user?.nom || "—",
      });

      setShowModal(false);
      setForm(EMPTY);
    } catch (err) { console.error("[Stock/TabEntrees] handleSave error:", err); }
  };

  return (
    <div>
      <PageHeader
        title={`Bons d'entrée (${entries.length})`}
        subtitle="Approvisionnement et réception de stock"
        actions={<button style={s.btn("primary")} onClick={() => { setForm(EMPTY); setShowModal(true); }}>+ Nouvelle entrée</button>}
      />
      <SearchBar value={search} onChange={setSearch} placeholder="🔍 Produit ou référence..." />
      <div style={{ marginTop: 14 }}>
        {filteredEntries.length === 0 ? <EmptyState icon="📥" message="Aucune entrée enregistrée" /> : (
          <div style={s.card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Réf","Produit","Fournisseur","Qté reçue","Prix achat","Valeur","Avant","Après","Date","Par"].map((h) => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => (
                  <tr key={e.id}>
                    <td style={{ ...s.td, color: C.accent, fontWeight: 700, fontFamily: "monospace", fontSize: 12 }}>{e.ref}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{e.productName}<div style={{ fontSize: 10, color: C.muted }}>{e.productCode}</div></td>
                    <td style={{ ...s.td, color: C.muted }}>{e.supplierName || "—"}</td>
                    <td style={{ ...s.td, color: C.green, fontWeight: 700 }}>+{e.qty}</td>
                    <td style={{ ...s.td, color: C.muted }}>{formatDA(e.unitPrice)}</td>
                    <td style={{ ...s.td, color: C.accent, fontWeight: 600 }}>{formatDA(e.totalValue)}</td>
                    <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{e.beforeQty}</td>
                    <td style={{ ...s.td, color: C.green, fontWeight: 600 }}>{e.afterQty}</td>
                    <td style={{ ...s.td, fontSize: 11, color: C.muted }}>{formatDateTime(e.date)}</td>
                    <td style={{ ...s.td, fontSize: 11, color: C.muted }}>{e.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Nouvelle entrée de stock" onClose={() => setShowModal(false)}>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Produit *</label>
            <select style={s.input} value={form.productId} onChange={handleProductSelect}>
              <option value="">— Choisir un produit —</option>
              {(products || []).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name} (stock: {p.stock})</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Fournisseur</label>
            <select style={s.input} value={form.supplierId} onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))}>
              <option value="">— Optionnel —</option>
              {(suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={s.label}>Quantité reçue *</label>
              <input style={s.input} type="number" min="1" value={form.qty} onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Prix d'achat unitaire (DA)</label>
              <input style={s.input} type="number" min="0" value={form.buyPrice} onChange={(e) => setForm((p) => ({ ...p, buyPrice: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={s.label}>Date de réception</label>
              <input style={s.input} type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Note</label>
              <input style={s.input} value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optionnel..." />
            </div>
          </div>
          {form.productId && parseNum(form.qty) > 0 && (
            <div style={{ padding: "10px 14px", background: C.green + "12", border: `1px solid ${C.green}`, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
              ✅ Stock après entrée :{" "}
              <strong style={{ color: C.green }}>
                {(products.find((p) => p.id === parseInt(form.productId))?.stock || 0) + parseNum(form.qty)} unités
              </strong>
              {" "}· Valeur totale :{" "}
              <strong style={{ color: C.accent }}>{formatDA(parseNum(form.buyPrice) * parseNum(form.qty))}</strong>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...s.btn("primary"), flex: 1 }} onClick={handleSave} disabled={!form.productId || parseNum(form.qty) <= 0}>
              ✅ Valider l'entrée
            </button>
            <button style={{ ...s.btn(), flex: 1 }} onClick={() => setShowModal(false)}>Annuler</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONGLET 3 — SORTIES INTERNES
// ═══════════════════════════════════════════════════════════════════════════════
function TabSorties({ products, setProducts, movements, addMovement, user, C, s }) {
  const [showModal, setShowModal] = useState(false);
  const [search,    setSearch]    = useState("");
  const EMPTY = { productId: "", reason: "Perte", qty: 1, date: todayISO(), note: "" };
  const [form, setForm] = useState(EMPTY);

  const exits = useMemo(
    () => (movements || []).filter((m) => m.type === "INTERNAL_EXIT").sort((a, b) => new Date(b.date) - new Date(a.date)),
    [movements]
  );

  const filteredExits = useMemo(
    () => exits.filter((e) => textMatch(e.productName, search) || textMatch(e.ref, search)),
    [exits, search]
  );

  const handleSave = () => {
    try {
      if (!form.productId || parseNum(form.qty) <= 0) return;
      const product   = products.find((p) => p.id === parseInt(form.productId));
      const qty       = parseNum(form.qty);
      if (qty > product.stock) { alert(`Stock insuffisant. Stock actuel: ${product.stock}`); return; }
      const beforeQty = product.stock;
      const afterQty  = beforeQty - qty;
      const ref       = generateRef("SOR", exits);

      setProducts((prev) =>
        prev.map((p) => p.id === product.id ? { ...p, stock: afterQty } : p)
      );

      addMovement({
        type:        "INTERNAL_EXIT",
        ref,
        productId:   product.id,
        productName: product.name,
        productCode: product.code,
        qty:         -qty,
        beforeQty,
        afterQty,
        unitPrice:   product.buyPrice,
        totalValue:  product.buyPrice * qty,
        reason:      form.reason,
        note:        form.note.trim(),
        date:        new Date(form.date).toISOString(),
        userId:      user?.id,
        userName:    user?.nom || "—",
      });

      setShowModal(false);
      setForm(EMPTY);
    } catch (err) { console.error("[Stock/TabSorties] handleSave error:", err); }
  };

  return (
    <div>
      <PageHeader
        title={`Sorties internes (${exits.length})`}
        subtitle="Perte, casse, don, usage interne"
        actions={<button style={s.btn("danger")} onClick={() => { setForm(EMPTY); setShowModal(true); }}>+ Nouvelle sortie</button>}
      />
      <SearchBar value={search} onChange={setSearch} placeholder="🔍 Produit ou référence..." />
      <div style={{ marginTop: 14 }}>
        {filteredExits.length === 0 ? <EmptyState icon="📤" message="Aucune sortie interne" /> : (
          <div style={s.card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Réf","Produit","Motif","Qté sortie","Valeur perte","Avant","Après","Note","Date","Par"].map((h) => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredExits.map((e) => (
                  <tr key={e.id}>
                    <td style={{ ...s.td, color: C.orange, fontWeight: 700, fontFamily: "monospace", fontSize: 12 }}>{e.ref}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{e.productName}</td>
                    <td style={s.td}><span style={{ background: C.orange + "22", color: C.orange, padding: "2px 8px", borderRadius: 10, fontSize: 11 }}>{e.reason}</span></td>
                    <td style={{ ...s.td, color: C.red, fontWeight: 700 }}>{e.qty}</td>
                    <td style={{ ...s.td, color: C.red }}>{formatDA(e.totalValue)}</td>
                    <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{e.beforeQty}</td>
                    <td style={{ ...s.td, color: C.red, fontWeight: 600 }}>{e.afterQty}</td>
                    <td style={{ ...s.td, fontSize: 11, color: C.muted }}>{e.note || "—"}</td>
                    <td style={{ ...s.td, fontSize: 11, color: C.muted }}>{formatDateTime(e.date)}</td>
                    <td style={{ ...s.td, fontSize: 11, color: C.muted }}>{e.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Nouvelle sortie interne" onClose={() => setShowModal(false)}>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Produit *</label>
            <select style={s.input} value={form.productId} onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))}>
              <option value="">— Choisir un produit —</option>
              {(products || []).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name} (stock: {p.stock})</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={s.label}>Motif *</label>
              <select style={s.input} value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}>
                {INTERNAL_EXIT_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Quantité *</label>
              <input style={s.input} type="number" min="1" value={form.qty} onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={s.label}>Date</label>
              <input style={s.input} type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Note</label>
              <input style={s.input} value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optionnel..." />
            </div>
          </div>
          {form.productId && parseNum(form.qty) > 0 && (
            <div style={{ padding: "10px 14px", background: C.red + "12", border: `1px solid ${C.red}`, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
              ⚠️ Stock après sortie :{" "}
              <strong style={{ color: C.red }}>
                {Math.max(0, (products.find((p) => p.id === parseInt(form.productId))?.stock || 0) - parseNum(form.qty))} unités
              </strong>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...s.btn("danger"), flex: 1 }} onClick={handleSave} disabled={!form.productId || parseNum(form.qty) <= 0}>
              Valider la sortie
            </button>
            <button style={{ ...s.btn(), flex: 1 }} onClick={() => setShowModal(false)}>Annuler</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONGLET 4 — INVENTAIRE PHYSIQUE
// ═══════════════════════════════════════════════════════════════════════════════
function TabInventaire({ products, setProducts, inventorySessions, setInventorySessions, addMovement, user, C, s }) {
  const [activeSession, setActiveSession] = useState(null);
  const [search, setSearch] = useState("");

  const startInventory = () => {
    const session = {
      id:     Date.now(),
      ref:    generateRef("INV", inventorySessions),
      date:   new Date().toISOString(),
      status: "En cours",
      items:  (products || []).map((p) => ({
        productId:    p.id,
        productCode:  p.code,
        productName:  p.name,
        unit:         p.unit,
        theoreticalQty: p.stock,
        countedQty:   "",
      })),
      userId:   user?.id,
      userName: user?.nom || "—",
    };
    setInventorySessions((prev) => [...(prev || []), session]);
    setActiveSession(session);
  };

  const updateCount = (productId, value) => {
    setActiveSession((prev) => ({
      ...prev,
      items: prev.items.map((i) => i.productId === productId ? { ...i, countedQty: value } : i),
    }));
  };

  const validateInventory = () => {
    if (!window.confirm("Valider l'inventaire ? Les stocks seront ajustés.")) return;
    try {
      const adjustments = activeSession.items
        .filter((i) => i.countedQty !== "" && parseNum(i.countedQty) !== i.theoreticalQty)
        .map((i) => ({ ...i, countedQty: parseNum(i.countedQty), ecart: parseNum(i.countedQty) - i.theoreticalQty }));

      setProducts((prev) =>
        prev.map((p) => {
          const adj = adjustments.find((a) => a.productId === p.id);
          return adj ? { ...p, stock: adj.countedQty } : p;
        })
      );

      adjustments.forEach((adj) => {
        addMovement({
          type:        "INVENTORY_ADJ",
          ref:         activeSession.ref,
          productId:   adj.productId,
          productName: adj.productName,
          productCode: adj.productCode,
          qty:         adj.ecart,
          beforeQty:   adj.theoreticalQty,
          afterQty:    adj.countedQty,
          note:        `Inventaire ${activeSession.ref}`,
          date:        new Date().toISOString(),
          userId:      user?.id,
          userName:    user?.nom || "—",
        });
      });

      const finalSession = { ...activeSession, status: "Validé", items: activeSession.items.map((i) => ({ ...i, countedQty: i.countedQty === "" ? i.theoreticalQty : parseNum(i.countedQty), ecart: (i.countedQty === "" ? i.theoreticalQty : parseNum(i.countedQty)) - i.theoreticalQty })) };
      setInventorySessions((prev) => prev.map((s) => s.id === activeSession.id ? finalSession : s));
      setActiveSession(null);
    } catch (err) { console.error("[Stock/TabInventaire] validateInventory error:", err); }
  };

  const filteredItems = activeSession?.items.filter((i) => textMatch(i.productName, search) || textMatch(i.productCode, search)) || [];
  const totalAdjustments = activeSession?.items.filter((i) => i.countedQty !== "" && parseNum(i.countedQty) !== i.theoreticalQty).length || 0;

  return (
    <div>
      <PageHeader
        title="Inventaire physique"
        subtitle="Comptage réel vs stock théorique"
        actions={
          activeSession
            ? <div style={{ display: "flex", gap: 8 }}>
                <button style={s.btn("danger")} onClick={() => { if (window.confirm("Annuler l'inventaire ?")) { setInventorySessions((p) => p.filter((s) => s.id !== activeSession.id)); setActiveSession(null); } }}>Annuler</button>
                <button style={s.btn("primary")} onClick={validateInventory}>✅ Valider ({totalAdjustments} ajust.)</button>
              </div>
            : <button style={s.btn("primary")} onClick={startInventory}>+ Nouvel inventaire</button>
        }
      />

      {/* Session active */}
      {activeSession && (
        <div>
          <div style={{ ...s.card, marginBottom: 14, borderLeft: `3px solid ${C.accent}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              🔢 Inventaire en cours — {activeSession.ref}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              Saisissez la quantité comptée pour chaque produit. Laissez vide si le stock est correct.
              <span style={{ marginLeft: 10, color: C.orange, fontWeight: 600 }}>
                {totalAdjustments} écart(s) détecté(s)
              </span>
            </div>
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="🔍 Rechercher un produit..." />
          <div style={{ ...s.card, marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Code","Produit","Unité","Stock théorique","Qté comptée","Écart"].map((h) => <th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const counted = item.countedQty === "" ? null : parseNum(item.countedQty);
                  const ecart   = counted !== null ? counted - item.theoreticalQty : null;
                  const ecartColor = ecart === null ? C.muted : ecart > 0 ? C.green : ecart < 0 ? C.red : C.green;
                  return (
                    <tr key={item.productId} style={{ background: ecart !== null && ecart !== 0 ? C.orange + "08" : "transparent" }}>
                      <td style={{ ...s.td, fontFamily: "monospace", fontSize: 11, color: C.muted }}>{item.productCode}</td>
                      <td style={{ ...s.td, fontWeight: 600, color: C.text }}>{item.productName}</td>
                      <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{item.unit}</td>
                      <td style={{ ...s.td, fontWeight: 600, color: C.text }}>{item.theoreticalQty}</td>
                      <td style={s.td}>
                        <input
                          type="number" min="0"
                          style={{ ...s.input, width: 90, padding: "6px 10px", textAlign: "center", fontWeight: 700, border: `2px solid ${ecart !== null && ecart !== 0 ? C.orange : C.border}` }}
                          value={item.countedQty}
                          onChange={(e) => updateCount(item.productId, e.target.value)}
                          placeholder={String(item.theoreticalQty)}
                        />
                      </td>
                      <td style={{ ...s.td, fontWeight: 700, color: ecartColor }}>
                        {ecart === null ? "—" : ecart === 0 ? "✅ 0" : ecart > 0 ? `+${ecart}` : String(ecart)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historique sessions */}
      {!activeSession && (
        <>
          {(inventorySessions || []).length === 0 ? (
            <EmptyState icon="🔢" message="Aucun inventaire réalisé" />
          ) : (
            <div style={s.card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Réf","Date","Produits comptés","Ajustements","Statut","Par"].map((h) => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...(inventorySessions || [])].reverse().map((session) => {
                    const adjCount = (session.items || []).filter((i) => i.ecart !== 0 && i.ecart !== undefined).length;
                    return (
                      <tr key={session.id}>
                        <td style={{ ...s.td, color: C.accent, fontWeight: 700 }}>{session.ref}</td>
                        <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{formatDateTime(session.date)}</td>
                        <td style={s.td}>{(session.items || []).length}</td>
                        <td style={{ ...s.td, color: adjCount > 0 ? C.orange : C.green, fontWeight: 600 }}>{adjCount}</td>
                        <td style={s.td}>
                          <span style={{ background: session.status === "Validé" ? C.green + "22" : C.accent + "22", color: session.status === "Validé" ? C.green : C.accent, padding: "2px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                            {session.status}
                          </span>
                        </td>
                        <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{session.userName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONGLET 5 — MOUVEMENTS (HISTORIQUE COMPLET)
// ═══════════════════════════════════════════════════════════════════════════════
function TabMouvements({ movements, products, C, s }) {
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");

  const filtered = useMemo(() => {
    return (movements || [])
      .filter((m) => typeFilter === "Tous" || m.type === typeFilter)
      .filter((m) => {
        if (dateFrom && m.date?.split("T")[0] < dateFrom) return false;
        if (dateTo   && m.date?.split("T")[0] > dateTo)   return false;
        return true;
      })
      .filter((m) => textMatch(m.productName, search) || textMatch(m.ref, search) || textMatch(m.userName, search))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [movements, typeFilter, search, dateFrom, dateTo]);

  return (
    <div>
      <PageHeader
        title={`Historique des mouvements (${(movements || []).length})`}
        subtitle="Traçabilité complète de toutes les entrées et sorties"
      />

      {/* Filtres */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="🔍 Produit, réf ou utilisateur..." />
        <select style={{ ...s.input, width: "auto" }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="Tous">Tous les types</option>
          {Object.entries(MOVEMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.muted }}>Du</span>
          <input style={{ ...s.input, width: "auto", padding: "6px 10px", fontSize: 12 }} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span style={{ fontSize: 12, color: C.muted }}>Au</span>
          <input style={{ ...s.input, width: "auto", padding: "6px 10px", fontSize: 12 }} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          {(dateFrom || dateTo) && (
            <button style={{ ...s.btn("danger"), padding: "5px 10px", fontSize: 12 }} onClick={() => { setDateFrom(""); setDateTo(""); }}>✕</button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState icon="📋" message="Aucun mouvement trouvé" /> : (
        <div style={s.card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Réf","Type","Produit","Qté","Avant","Après","Valeur","Infos","Date","Par"].map((h) => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const mt    = MOVEMENT_TYPES[m.type] || { label: m.type, color: C.muted };
                const isIn  = m.qty > 0;
                const qtyColor = isIn ? C.green : m.type === "INVENTORY_ADJ" ? C.accent : C.red;
                return (
                  <tr key={m.id}>
                    <td style={{ ...s.td, fontFamily: "monospace", fontSize: 11, color: C.muted }}>{m.ref || "—"}</td>
                    <td style={s.td}>
                      <span style={{ background: mt.color + "22", color: mt.color, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                        {mt.label}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600, color: C.text }}>{m.productName}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{m.productCode}</div>
                    </td>
                    <td style={{ ...s.td, fontWeight: 700, color: qtyColor }}>
                      {m.qty > 0 ? "+" : ""}{m.qty}
                    </td>
                    <td style={{ ...s.td, color: C.muted, fontSize: 12 }}>{m.beforeQty ?? "—"}</td>
                    <td style={{ ...s.td, fontWeight: 600, color: C.text }}>{m.afterQty ?? "—"}</td>
                    <td style={{ ...s.td, color: C.accent }}>{m.totalValue ? formatDA(m.totalValue) : "—"}</td>
                    <td style={{ ...s.td, fontSize: 11, color: C.muted }}>
                      {m.supplierName && <div>📦 {m.supplierName}</div>}
                      {m.clientName   && <div>👤 {m.clientName}</div>}
                      {m.reason       && <div>🏷 {m.reason}</div>}
                      {m.note         && <div>📝 {m.note}</div>}
                    </td>
                    <td style={{ ...s.td, fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>{formatDateTime(m.date)}</td>
                    <td style={{ ...s.td, fontSize: 11, color: C.muted }}>{m.userName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
