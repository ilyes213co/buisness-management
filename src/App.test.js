import { useState, useRef, useCallback, useContext, createContext, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  ResponsiveContainer, CartesianGrid
} from "recharts";

// ─── THÈMES ───────────────────────────────────────────────────────────────────
const DARK = {
  bg:"#0a0a0f", surface:"#12121a", card:"#1a1a26", border:"#2a2a3f",
  accent:"#f0a500", accentDim:"#f0a50015", green:"#00c896", red:"#ff4d6d",
  blue:"#4d8fff", text:"#f0f0f5", muted:"#6b6b85", purple:"#a855f7",
  inputBg:"#12121a", chartGrid:"#2a2a3f", shadow:"rgba(0,0,0,.4)",
};
const LIGHT = {
  bg:"#f1f5f9", surface:"#ffffff", card:"#ffffff", border:"#e2e8f0",
  accent:"#d97706", accentDim:"#d977060d", green:"#059669", red:"#dc2626",
  blue:"#2563eb", text:"#0f172a", muted:"#64748b", purple:"#7c3aed",
  inputBg:"#f8fafc", chartGrid:"#e2e8f0", shadow:"rgba(0,0,0,.1)",
};

const ThemeCtx = createContext(DARK);

const makeG = (C) => ({
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 },
  btn:(v="default")=>({
    padding:"9px 18px", borderRadius:8, border:"none", cursor:"pointer",
    fontSize:13, fontWeight:600, transition:"all .15s",
    background:v==="primary"?C.accent:v==="danger"?C.red:v==="green"?C.green:v==="blue"?C.blue:v==="purple"?C.purple:C.border,
    color:v==="primary"?"#000":C.text
  }),
  badge:(color)=>({ background:color+"22", color, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }),
  input:{ background:C.inputBg, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:13, width:"100%", boxSizing:"border-box", outline:"none" },
  label:{ fontSize:12, color:C.muted, marginBottom:6, display:"block", textTransform:"uppercase", letterSpacing:.8 },
  th:{ textAlign:"left", padding:"10px 14px", fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:.8, borderBottom:`1px solid ${C.border}` },
  td:{ padding:"12px 14px", fontSize:13, borderBottom:`1px solid ${C.border}` },
});

// ─── HOOK localStorage ────────────────────────────────────────────────────────
function useLocalStorage(key, def) {
  const [state, setState] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; }
    catch { return def; }
  });
  const set = useCallback((v) => {
    setState(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [state, set];
}

// ─── SYSTÈME DE LICENCE OFFLINE ──────────────────────────────────────────────
function getMachineId() {
  try {
    const os = window.require ? window.require('os') : null;
    if (!os) return "web-browser";
    const raw = os.hostname() + os.platform() + os.arch() + (os.cpus()?.[0]?.model || "");
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  } catch { return "unknown"; }
}

function validerCle(cle) {
  if (!cle) return false;
  const parts = cle.toUpperCase().replace(/\s/g, '').split('-');
  if (parts.length !== 4 || parts[0] !== 'GEST') return false;
  const [, A, B, C] = parts;
  if (!/^[0-9A-F]{4}$/.test(A) || !/^[0-9A-F]{4}$/.test(B) || !/^[0-9A-F]{4}$/.test(C)) return false;
  const expected = ((parseInt(A, 16) + parseInt(B, 16)) % 65536).toString(16).toUpperCase().padStart(4, '0');
  return C === expected;
}

function licenceEstValide() {
  const cle = localStorage.getItem('gestapp_licence');
  if (!validerCle(cle)) return false;
  const machineStocke = localStorage.getItem('gestapp_machine');
  if (!machineStocke) return false;
  return machineStocke === getMachineId();
}

function LicenseScreen({ onActivate }) {
  const [cle, setCle] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);

  const format = (val) => {
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let out = 'GEST-';
    const rest = raw.startsWith('GEST') ? raw.slice(4) : raw;
    const cleaned = rest.replace(/-/g, '');
    for (let i = 0; i < cleaned.length && i < 12; i++) {
      if (i === 4 || i === 8) out += '-';
      out += cleaned[i];
    }
    return out;
  };

  const handleChange = (e) => { setCle(format(e.target.value)); setErr(''); };

  const activer = () => {
    if (!validerCle(cle)) { setErr('❌ Clé invalide. Vérifiez la clé reçue.'); return; }
    setOk(true);
    setTimeout(() => {
      localStorage.setItem('gestapp_licence', cle);
      localStorage.setItem('gestapp_machine', getMachineId());
      onActivate();
    }, 1200);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background:'#1a1a26', border:'1px solid #2a2a3f', borderRadius:16, padding:40, width:460, textAlign:'center' }}>
        {ok ? (
          <div>
            <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
            <div style={{ fontSize:22, fontWeight:900, color:'#00c896', marginBottom:8 }}>Licence activée !</div>
            <div style={{ fontSize:13, color:'#6b6b85' }}>Chargement de GestApp...</div>
            <div style={{ marginTop:20, height:4, background:'#2a2a3f', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'#f0a500', animation:'loadbar 1.2s linear forwards' }} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:52, marginBottom:8 }}>🔑</div>
            <div style={{ fontSize:24, fontWeight:900, color:'#f0a500', marginBottom:4 }}>⚡ GestApp</div>
            <div style={{ fontSize:13, color:'#6b6b85', marginBottom:32 }}>Entrez votre clé de licence pour continuer</div>
            <div style={{ textAlign:'left', marginBottom:8 }}>
              <label style={{ fontSize:11, color:'#6b6b85', textTransform:'uppercase', letterSpacing:.8, display:'block', marginBottom:6 }}>Clé de licence</label>
              <input
                style={{ width:'100%', background:'#12121a', border:`2px solid ${err?'#ff4d6d':cle.length>5?'#f0a500':'#2a2a3f'}`, borderRadius:10, padding:'12px 16px', color:'#f0f0f5', fontSize:17, fontFamily:"'Courier New',monospace", letterSpacing:3, textAlign:'center', outline:'none', boxSizing:'border-box' }}
                value={cle} onChange={handleChange} placeholder="GEST-XXXX-XXXX-XXXX" maxLength={19}
                onKeyDown={e=>e.key==='Enter'&&activer()}
              />
            </div>
            {err && <div style={{ color:'#ff4d6d', fontSize:13, marginBottom:12, textAlign:'left' }}>{err}</div>}
            <button
              style={{ width:'100%', padding:14, marginTop:8, background:'#f0a500', border:'none', borderRadius:10, color:'#000', fontSize:15, fontWeight:700, cursor:'pointer', opacity:cle.length<19?0.5:1 }}
              onClick={activer} disabled={cle.length<19}
            >🔓 Activer GestApp</button>
            <div style={{ marginTop:28, padding:14, background:'#12121a', borderRadius:10, fontSize:12, color:'#6b6b85', lineHeight:1.8 }}>
              <div style={{ color:'#f0a500', fontWeight:700, marginBottom:6 }}>💡 Vous n'avez pas de clé ?</div>
              <div>Contactez votre revendeur GestApp pour obtenir votre clé d'activation.</div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes loadbar{from{width:0}to{width:100%}}`}</style>
    </div>
  );
}

// ─── DONNÉES INITIALES ────────────────────────────────────────────────────────
const MENU_INIT = [
  {id:1,cat:"Boissons",name:"Café Express",price:200,image:"☕",barcode:""},
  {id:2,cat:"Boissons",name:"Cappuccino",price:350,image:"🍵",barcode:""},
  {id:3,cat:"Boissons",name:"Jus d'orange",price:300,image:"🍊",barcode:""},
  {id:4,cat:"Boissons",name:"Coca Cola",price:250,image:"🥤",barcode:""},
  {id:5,cat:"Snacks",name:"Sandwich Thon",price:450,image:"🥪",barcode:""},
  {id:6,cat:"Snacks",name:"Pizza Reine",price:800,image:"🍕",barcode:""},
  {id:7,cat:"Plats",name:"Couscous",price:1200,image:"🍲",barcode:""},
  {id:8,cat:"Plats",name:"Tajine Poulet",price:1100,image:"🍗",barcode:""},
  {id:9,cat:"Desserts",name:"Crème Brûlée",price:350,image:"🍮",barcode:""},
];
const MENU_CATS_INIT = ["Boissons","Snacks","Plats","Desserts","Entrées","Autres"];

const CATALOGUE_INIT = [
  {id:1,cat:"Hauts",name:"T-Shirt Basique",price:1800,image:"👕",couleurs:["Blanc","Noir","Gris","Bleu"],tailles:["S","M","L","XL","XXL"],stock:50,barcode:""},
  {id:2,cat:"Hauts",name:"Chemise Oxford",price:3500,image:"👔",couleurs:["Blanc","Bleu ciel","Rose"],tailles:["S","M","L","XL"],stock:30,barcode:""},
  {id:3,cat:"Hauts",name:"Pull Laine",price:4200,image:"🧥",couleurs:["Gris","Bordeaux","Marine"],tailles:["S","M","L","XL"],stock:20,barcode:""},
  {id:4,cat:"Bas",name:"Jean Slim",price:4500,image:"👖",couleurs:["Bleu","Noir","Gris"],tailles:["38","40","42","44","46"],stock:40,barcode:""},
  {id:5,cat:"Bas",name:"Short Chino",price:2800,image:"🩳",couleurs:["Beige","Kaki","Marine"],tailles:["S","M","L","XL"],stock:25,barcode:""},
  {id:6,cat:"Robes",name:"Robe d'été",price:3200,image:"👗",couleurs:["Rouge","Blanc","Fleurs"],tailles:["S","M","L"],stock:20,barcode:""},
  {id:7,cat:"Chaussures",name:"Sneakers",price:5500,image:"👟",couleurs:["Blanc","Noir","Gris"],tailles:["38","39","40","41","42","43","44"],stock:35,barcode:""},
  {id:8,cat:"Chaussures",name:"Boots",price:6800,image:"👢",couleurs:["Noir","Marron"],tailles:["36","37","38","39","40","41"],stock:18,barcode:""},
  {id:9,cat:"Accessoires",name:"Casquette",price:900,image:"🧢",couleurs:["Noir","Rouge","Bleu"],tailles:["Unique"],stock:60,barcode:""},
  {id:10,cat:"Accessoires",name:"Ceinture",price:1200,image:"👜",couleurs:["Noir","Marron"],tailles:["Unique"],stock:45,barcode:""},
];
const CAT_CATS_INIT = ["Hauts","Bas","Robes","Chaussures","Accessoires","Autres"];

const EMP_INIT = [
  {id:1,name:"Ahmed Benali",role:"Gérant",   salaire:45000,phone:"0555-123456",status:"Présent",avances:[]},
  {id:2,name:"Fatima Hamdi",role:"Serveuse", salaire:28000,phone:"0661-234567",status:"Présent",avances:[]},
  {id:3,name:"Karim Slimani",role:"Cuisinier",salaire:35000,phone:"0770-345678",status:"Présent",avances:[]},
  {id:4,name:"Sara Boudiaf",role:"Caissière",salaire:26000,phone:"0556-456789",status:"Absent", avances:[]},
];
const ACHATS_INIT = [
  {id:1,ref:"ACH-001",fournisseur:"Marché Central",produit:"Café + Sucre",qte:5,montant:15400,date:"28/02/2026",statut:"Livré",catalogueProduitId:null},
  {id:2,ref:"ACH-002",fournisseur:"Boucherie Hamdi",produit:"Viandes",qte:10,montant:32000,date:"27/02/2026",statut:"En attente",catalogueProduitId:null},
];
const TABLES_INIT = Array.from({length:20},(_,i)=>({id:i+1,status:i<5?"occupied":i<7?"reserved":"free"}));

const ROLES = {
  patron:   {label:"Patron",  color:"#f0a500", pages:["dashboard","tables","menu","ventes","catalogue","employes","achats","caisse","historique","rapports","sauvegarde","parametres","pinAdmin"]},
  gerant:   {label:"Gérant",  color:"#4d8fff", pages:["dashboard","tables","menu","ventes","catalogue","employes","achats","caisse","historique","rapports","sauvegarde"]},
  serveur:  {label:"Serveur", color:"#00c896", pages:["tables","ventes","caisse"]},
  caissier: {label:"Caissier",color:"#a855f7", pages:["caisse","historique","rapports"]},
};
const COMPTES_DEFAULT = [
  {id:1, nom:"Patron",           role:"patron",   pin:"1234", actif:true,  createdAt:"2026-01-01"},
  {id:2, nom:"Karim (Gérant)",   role:"gerant",   pin:"5678", actif:true,  createdAt:"2026-01-01"},
  {id:3, nom:"Fatima (Serveur)", role:"serveur",  pin:"2468", actif:true,  createdAt:"2026-01-01"},
  {id:4, nom:"Sara (Caissier)",  role:"caissier", pin:"1357", actif:true,  createdAt:"2026-01-01"},
];

// ─── HELPERS PIN ──────────────────────────────────────────────────────────────
function genererPIN(longueur=4){
  let pin="";
  for(let i=0;i<longueur;i++) pin+=Math.floor(Math.random()*10);
  return pin;
}
function logAction(logs,setLogs,userId,nom,action,details=""){
  const entry={id:Date.now(),userId,nom,action,details,timestamp:new Date().toISOString(),ip:"local"};
  setLogs(p=>[entry,...p].slice(0,500));
  return entry;
}

const BACKUP_KEYS = [
  "gestapp_type","gestapp_nom","gestapp_tables","gestapp_commandes",
  "gestapp_employes","gestapp_achats","gestapp_menu","gestapp_catalogue","gestapp_theme",
  "gestapp_menu_categories","gestapp_cat_categories","gestapp_type_locked",
];

// ─── TICKETS ──────────────────────────────────────────────────────────────────
// ─── CONFIG TICKETS (lecture directe localStorage) ────────────────────────────
const TICKETS_CONFIG_DEFAULT = {
  validation_table:    { table:true,  cuisine:true  },
  paiement_table:      { addition:true               },
  validation_emporter: { emporter_client:true, emporter_cuisine:true },
  paiement_emporter:   { addition:true               },
  vente_boutique:      { vente:true                  },
};
function getTicketsConfig(){
  try{ const s=localStorage.getItem("gestapp_tickets_config"); return s?{...TICKETS_CONFIG_DEFAULT,...JSON.parse(s)}:TICKETS_CONFIG_DEFAULT; }
  catch{ return TICKETS_CONFIG_DEFAULT; }
}

// ─── GÉNÉRATION HTML TICKET ───────────────────────────────────────────────────
function genTicketHTML(cmd, type, nom) {
  const now=new Date(), date=now.toLocaleDateString("fr-FR"), heure=now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  const isEmporter=cmd.table==="Emporter";

  // ── CSS commun : bouton JAMAIS imprimé ──
  const CSS=`
    @media print{.no-print{display:none!important;visibility:hidden!important}}
    body{font-family:'Courier New',monospace;font-size:13px;width:280px;margin:20px auto;color:#111}
    .sep{border:none;border-top:2px dashed #ccc;margin:10px 0}
    table{width:100%;border-collapse:collapse}
    .pb{display:block;width:100%;padding:10px;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:bold;margin-top:14px}
  `;

  // ── Ticket BON DE TABLE : minimaliste, pas d'articles ──
  if(type==="table"){
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>BON DE TABLE</title><style>${CSS}</style></head><body>
    <div style="text-align:center;margin-bottom:16px">
      <div style="display:inline-block;background:#2563eb;color:white;padding:4px 18px;border-radius:20px;font-size:12px;font-weight:bold;margin-bottom:8px">🪑 BON DE TABLE</div>
      <div style="font-size:18px;font-weight:900">⚡ ${nom}</div>
    </div>
    <hr class="sep"/>
    <div style="text-align:center;margin:20px 0">
      <div style="font-size:13px;color:#666;margin-bottom:6px">Numéro de table</div>
      <div style="font-size:52px;font-weight:900;color:#2563eb;line-height:1">${cmd.table}</div>
      <div style="font-size:13px;color:#888;margin-top:8px">Commande #${String(cmd.id).slice(-4)}</div>
    </div>
    <hr class="sep"/>
    <div style="font-size:12px">📅 ${date} à ${heure}</div>
    ${cmd.serveur?`<div style="font-size:12px">👤 ${cmd.serveur}</div>`:""}
    ${cmd.note?`<div style="font-size:11px;background:#fffbeb;border:1px solid #fcd34d;padding:4px 8px;border-radius:4px;margin-top:6px">📝 ${cmd.note}</div>`:""}
    <hr class="sep"/>
    <div style="text-align:center;font-size:13px;font-weight:700;padding:8px 0;color:#2563eb">Présentez ce bon à la caisse</div>
    <hr class="sep"/>
    <button class="pb no-print" style="background:#2563eb" onclick="window.print();window.close()">🖨️ Imprimer</button>
    </body></html>`;
  }

  const cfg={
    cuisine:         {titre:isEmporter?"BON CUISINE — À EMPORTER":"BON DE CUISINE", sousTitre:"Préparateur — Usage interne", couleur:"#dc2626",icone:"👨‍🍳",showPrix:false,showTotal:false,footer:"Préparer dans les meilleurs délais"},
    addition:        {titre:"ADDITION",         sousTitre:"Reçu de paiement",             couleur:"#16a34a",icone:"💳", showPrix:true, showTotal:true, footer:"Merci pour votre visite ! À bientôt 😊"},
    vente:           {titre:"TICKET DE CAISSE", sousTitre:"Reçu boutique",                couleur:"#7c3aed",icone:"🛍️",showPrix:true, showTotal:true, footer:"Merci pour votre achat ! À bientôt 😊"},
    emporter_client: {titre:"BON DE COMMANDE",  sousTitre:"À présenter à la caisse",      couleur:"#ea580c",icone:"🥡",showPrix:true, showTotal:true, footer:"Nous vous préviendrons quand votre commande est prête 😊"},
    emporter_cuisine:{titre:"COMMANDE À EMPORTER",sousTitre:"Préparateur — PRIORITÉ",     couleur:"#dc2626",icone:"🥡",showPrix:false,showTotal:false,footer:"À EMPORTER — Préparer rapidement"},
  }[type];

  const lignes=(cmd.items||[]).map(i=>`<tr><td style="padding:5px 0;border-bottom:1px dashed #eee">${i.name}</td><td style="text-align:center;padding:5px 6px;border-bottom:1px dashed #eee;font-weight:bold">×${i.qty}</td>${cfg.showPrix?`<td style="text-align:right;padding:5px 0;border-bottom:1px dashed #eee">${(i.price*i.qty).toLocaleString()} DA</td>`:""}</tr>`).join("");
  const remiseLigne=cmd.remise?`<tr style="color:#dc2626"><td>Remise (${cmd.remise}%)</td><td></td>${cfg.showPrix?`<td style="text-align:right">-${Math.round((cmd.totalBrut||cmd.total)*(cmd.remise/100)).toLocaleString()} DA</td>`:""}</tr>`:"";
  const emporterBanner=isEmporter?`<div style="background:#ea580c;color:white;padding:8px;text-align:center;font-size:16px;font-weight:900;border-radius:8px;margin:10px 0;letter-spacing:2px">🥡 À EMPORTER</div>`:"";
  const emporterInfo=isEmporter&&cmd.clientNom?`<div style="font-size:12px;margin-top:4px">👤 ${cmd.clientNom}${cmd.clientTel?` · 📞 ${cmd.clientTel}`:""}</div>`:"";
  const numEmporter=isEmporter&&cmd.numEmporter?`<div style="font-size:18px;font-weight:900;text-align:center;padding:6px 0;color:#ea580c">N° ${cmd.numEmporter}</div>`:"";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${cfg.titre}</title><style>${CSS}</style></head><body>
  <div style="text-align:center;margin-bottom:12px">
    <div style="display:inline-block;background:${cfg.couleur};color:white;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:bold;margin-bottom:6px">${cfg.icone} ${cfg.titre}</div>
    <div style="font-size:16px;font-weight:900">⚡ ${nom}</div>
    <div style="font-size:11px;color:#666">${cfg.sousTitre}</div>
  </div>
  ${numEmporter}${emporterBanner}
  <hr class="sep"/>
  <div style="font-size:12px">📅 ${date} à ${heure}</div>
  <div style="font-size:12px">${isEmporter?"🥡 Emporter":cmd.table==="Comptoir"?"🛍️ Comptoir":"🪑 Table : "+cmd.table} | #${String(cmd.id).slice(-4)}</div>
  ${cmd.serveur?`<div style="font-size:12px">👤 ${cmd.serveur}</div>`:""}
  ${emporterInfo}
  ${cmd.note?`<div style="font-size:11px;background:#fffbeb;border:1px solid #fcd34d;padding:4px 8px;border-radius:4px;margin-top:4px">📝 ${cmd.note}</div>`:""}
  ${cmd.modePaiement?`<div style="font-size:12px;margin-top:4px">💳 ${cmd.modePaiement}</div>`:""}
  <hr class="sep"/>
  <table><thead><tr>
    <th style="text-align:left;padding-bottom:6px">Article</th>
    <th style="text-align:center;padding-bottom:6px">Qté</th>
    ${cfg.showPrix?`<th style="text-align:right;padding-bottom:6px">Prix</th>`:""}
  </tr></thead><tbody>${lignes}</tbody></table>
  ${cfg.showTotal?`<hr class="sep"/><table>${remiseLigne}<tr style="font-size:15px;font-weight:900"><td>TOTAL</td><td></td><td style="text-align:right">${cmd.total.toLocaleString()} DA</td></tr></table>`:""}
  <hr class="sep"/>
  <div style="text-align:center;font-size:11px;color:#666;font-style:italic">${cfg.footer}</div>
  <button class="pb no-print" style="background:${cfg.couleur}" onclick="window.print();window.close()">🖨️ Imprimer</button>
  </body></html>`;
}

function ouvrirTicket(cmd,type,nom){
  const w=window.open("","_blank","width=360,height=640,scrollbars=yes");
  if(!w) return;
  w.document.write(genTicketHTML(cmd,type,nom));
  w.document.close();
  setTimeout(()=>{try{w.print();}catch{}},500);
}

// ── Fonctions d'impression pilotées par la config patron ──
function imprimerValidation(cmd,nom){
  const cfg=getTicketsConfig().validation_table;
  let delay=0;
  if(cfg.table)   { setTimeout(()=>ouvrirTicket(cmd,"table",nom),delay);   delay+=700; }
  if(cfg.cuisine) { setTimeout(()=>ouvrirTicket(cmd,"cuisine",nom),delay); }
}
function imprimerAddition(cmd,nom){
  const cfg=getTicketsConfig().paiement_table;
  if(cfg.addition) ouvrirTicket(cmd,"addition",nom);
}
function imprimerVente(cmd,nom){
  const cfg=getTicketsConfig().vente_boutique;
  if(cfg.vente) ouvrirTicket(cmd,"vente",nom);
}
function imprimerEmporter(cmd,nom){
  const cfg=getTicketsConfig().validation_emporter;
  let delay=0;
  if(cfg.emporter_client)  { setTimeout(()=>ouvrirTicket(cmd,"emporter_client",nom),delay);  delay+=700; }
  if(cfg.emporter_cuisine) { setTimeout(()=>ouvrirTicket(cmd,"emporter_cuisine",nom),delay); }
}
function imprimerPaiementEmporter(cmd,nom){
  const cfg=getTicketsConfig().paiement_emporter;
  if(cfg.addition) ouvrirTicket(cmd,"addition",nom);
}


// ─── COMPOSANTS UTILITAIRES ───────────────────────────────────────────────────
function Modal({title,onClose,children,wide}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  return(<div style={{position:"fixed",inset:0,background:"#00000099",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={onClose}>
    <div style={{...g.card,width:wide?940:500,maxHeight:"92vh",overflowY:"auto",animation:"fadeIn .2s ease"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:17,fontWeight:800,color:C.text}}>{title}</div>
        <button style={{...g.btn(),padding:"4px 10px",fontSize:16}} onClick={onClose}>✕</button>
      </div>
      {children}
    </div>
  </div>);
}

function StatCard({label,value,delta,pos,color}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  return(<div style={{...g.card,borderTop:`3px solid ${color}`}}>
    <div style={{fontSize:26,fontWeight:800,color}}>{value}</div>
    <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginTop:4}}>{label}</div>
    <div style={{fontSize:12,color:pos?C.green:C.red,marginTop:6}}>{pos?"↑":"↓"} {delta}</div>
  </div>);
}

// ─── LOGIN PIN ────────────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function Login({onLogin, comptes, logs, setLogs}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const [step, setStep]        = useState("select"); // "select" | "pin"
  const [selected, setSelected]= useState(null);
  const [pin, setPin]          = useState("");
  const [err, setErr]          = useState("");
  const [shake, setShake]      = useState(false);
  const [success, setSuccess]  = useState(false);
  const [lockouts, setLockouts]= useState(() => {
    try { return JSON.parse(localStorage.getItem("gestapp_lockouts")||"{}"); } catch { return {}; }
  });
  const [now, setNow]          = useState(Date.now());

  useEffect(()=>{
    const t=setInterval(()=>setNow(Date.now()),1000);
    return()=>clearInterval(t);
  },[]);

  const saveLockouts=(lo)=>{
    setLockouts(lo);
    try { localStorage.setItem("gestapp_lockouts", JSON.stringify(lo)); } catch {}
  };

  const getLockInfo=(userId)=>{
    const lo=lockouts[userId];
    if(!lo) return {locked:false,remaining:0,attempts:0};
    if(lo.lockedUntil && Date.now() < lo.lockedUntil){
      return {locked:true, remaining:Math.ceil((lo.lockedUntil-Date.now())/1000), attempts:lo.attempts||0};
    }
    return {locked:false, remaining:0, attempts:lo.attempts||0};
  };

  const computersActive=comptes.filter(c=>c.actif!==false);

  const selectUser=(c)=>{
    const li=getLockInfo(c.id);
    if(li.locked){ setErr(`Compte verrouillé. Réessayez dans ${Math.ceil(li.remaining/60)} min ${li.remaining%60} s.`); return; }
    setSelected(c); setPin(""); setErr(""); setStep("pin");
    logAction(logs,setLogs,c.id,c.nom,"SELECTION","Écran de sélection utilisateur");
  };

  const pressKey=(k)=>{
    if(success) return;
    if(pin.length>=6) return;
    const newPin=pin+k;
    setPin(newPin);
    setErr("");
    if(newPin.length>=4) validatePin(newPin);
  };

  const validatePin=(enteredPin)=>{
    const li=getLockInfo(selected.id);
    if(li.locked){ setErr(`Verrouillé encore ${li.remaining}s.`); return; }
    if(enteredPin === selected.pin){
      setSuccess(true);
      const newLo={...lockouts,[selected.id]:{attempts:0,lockedUntil:null}};
      saveLockouts(newLo);
      logAction(logs,setLogs,selected.id,selected.nom,"CONNEXION_SUCCES",`Connexion réussie – rôle: ${selected.role}`);
      setTimeout(()=>onLogin(selected),700);
    } else {
      const attempts=(lockouts[selected.id]?.attempts||0)+1;
      let lockedUntil=null;
      if(attempts>=MAX_ATTEMPTS){ lockedUntil=Date.now()+LOCK_DURATION_MS; }
      const newLo={...lockouts,[selected.id]:{attempts,lockedUntil}};
      saveLockouts(newLo);
      logAction(logs,setLogs,selected.id,selected.nom,"CONNEXION_ECHEC",`Tentative ${attempts}/${MAX_ATTEMPTS} – PIN incorrect`);
      setShake(true);
      setTimeout(()=>{ setShake(false); setPin(""); },600);
      if(attempts>=MAX_ATTEMPTS){
        setErr(`❌ Compte verrouillé pour 5 minutes après ${MAX_ATTEMPTS} tentatives.`);
        setTimeout(()=>{setStep("select");setSelected(null);setErr("");},3000);
      } else {
        setErr(`❌ Code incorrect — ${MAX_ATTEMPTS-attempts} tentative${MAX_ATTEMPTS-attempts>1?"s":""} restante${MAX_ATTEMPTS-attempts>1?"s":""}`);
      }
    }
  };

  const deleteKey=()=>{ if(pin.length>0){ setPin(p=>p.slice(0,-1)); setErr(""); } };
  const backToSelect=()=>{ setStep("select"); setSelected(null); setPin(""); setErr(""); };

  const PIN_KEYS=[["1","2","3"],["4","5","6"],["7","8","9"],["←","0","✓"]];

  const dotColor=(i)=>{
    if(success) return C.green;
    if(err && pin.length===0) return C.red;
    return i<pin.length ? C.accent : C.border;
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`
        @keyframes shakePin{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
        @keyframes popIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes successPulse{0%,100%{box-shadow:0 0 0 0 ${C.green}44}50%{box-shadow:0 0 0 16px ${C.green}00}}
        .pin-key:hover{filter:brightness(1.2);transform:scale(1.05)!important}
        .pin-key:active{transform:scale(.95)!important}
        .user-card:hover{border-color:${C.accent}!important;background:${C.accentDim}!important;transform:translateY(-2px)}
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div style={{width:340,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,flexShrink:0}}>
        <div style={{fontSize:52,marginBottom:12,animation:"popIn .5s ease"}}>⚡</div>
        <div style={{fontSize:28,fontWeight:900,color:C.accent,letterSpacing:-1,marginBottom:4}}>GestApp</div>
        <div style={{fontSize:13,color:C.muted,textAlign:"center",marginBottom:40}}>Gestion commerciale intelligente</div>
        <div style={{width:"100%",padding:"14px 16px",background:C.card,borderRadius:12,border:`1px solid ${C.border}`,marginBottom:12}}>
          <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:10}}>🔒 Connexion sécurisée</div>
          {[["🔢","Code PIN unique par utilisateur"],["🛡","Verrouillage après 5 tentatives"],["📋","Journal de toutes les connexions"],["⏱","Déverrouillage automatique 5 min"]].map(([ico,txt])=>(
            <div key={txt} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:12,color:C.muted}}>
              <span style={{fontSize:14}}>{ico}</span><span>{txt}</span>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:C.muted,textAlign:"center",marginTop:20}}>
          {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:40}}>
        {step==="select" ? (
          <div style={{width:"100%",maxWidth:560,animation:"slideUp .4s ease"}}>
            <div style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:4}}>Qui êtes-vous ?</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:28}}>Sélectionnez votre compte pour vous connecter</div>
            {err && <div role="alert" style={{padding:"10px 14px",background:C.red+"18",border:`1px solid ${C.red}44`,borderRadius:10,color:C.red,fontSize:13,marginBottom:16}}>{err}</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
              {computersActive.map((c,i)=>{
                const li=getLockInfo(c.id);
                return(
                  <div key={c.id} className="user-card" onClick={()=>selectUser(c)}
                    style={{padding:"18px 20px",background:C.card,border:`2px solid ${li.locked?C.red:C.border}`,borderRadius:14,cursor:li.locked?"not-allowed":"pointer",transition:"all .2s",animation:`popIn .3s ease ${i*0.07}s both`,opacity:li.locked?0.6:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:44,height:44,borderRadius:"50%",background:ROLES[c.role].color+"22",border:`2px solid ${ROLES[c.role].color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:ROLES[c.role].color,flexShrink:0}}>
                        {c.nom[0]}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:14,color:C.text}}>{c.nom}</div>
                        <span style={{...g.badge(ROLES[c.role].color),fontSize:10}}>{ROLES[c.role].label}</span>
                      </div>
                      {li.locked
                        ? <span style={{fontSize:18}}>🔒</span>
                        : <span style={{fontSize:16,color:C.muted}}>›</span>
                      }
                    </div>
                    {li.locked && (
                      <div style={{marginTop:8,fontSize:11,color:C.red}}>Verrouillé encore {Math.floor(li.remaining/60)}:{String(li.remaining%60).padStart(2,"0")}</div>
                    )}
                    {!li.locked && li.attempts>0 && (
                      <div style={{marginTop:6,fontSize:11,color:C.accent}}>⚠ {MAX_ATTEMPTS-li.attempts} tentative{MAX_ATTEMPTS-li.attempts>1?"s":""} restante{MAX_ATTEMPTS-li.attempts>1?"s":""}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{textAlign:"center",animation:"slideUp .35s ease",width:320}}>
            <button onClick={backToSelect} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:13,marginBottom:20,display:"flex",alignItems:"center",gap:6}}>
              ‹ Retour
            </button>
            <div style={{width:64,height:64,borderRadius:"50%",background:ROLES[selected.role].color+"22",border:`2px solid ${ROLES[selected.role].color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:800,color:ROLES[selected.role].color,margin:"0 auto 12px"}}>
              {selected.nom[0]}
            </div>
            <div style={{fontSize:18,fontWeight:700,color:C.text}}>{selected.nom}</div>
            <div style={{marginBottom:24}}><span style={{...g.badge(ROLES[selected.role].color)}}>{ROLES[selected.role].label}</span></div>

            {/* PIN dots */}
            <div role="status" aria-live="polite"
              style={{display:"flex",justifyContent:"center",gap:12,marginBottom:8,animation:shake?"shakePin .4s ease":"none"}}>
              {[0,1,2,3].map(i=>(
                <div key={i} style={{width:16,height:16,borderRadius:"50%",background:dotColor(i),transition:"background .15s",boxShadow:i<pin.length?`0 0 8px ${C.accent}66`:""}}/>
              ))}
            </div>
            {success && <div style={{color:C.green,fontSize:13,marginBottom:8,animation:"popIn .3s ease"}}>✅ Connexion réussie…</div>}
            {err && <div role="alert" style={{color:C.red,fontSize:12,marginBottom:8,minHeight:18}}>{err}</div>}
            {!success && !err && <div style={{fontSize:12,color:C.muted,marginBottom:8,minHeight:18}}>Entrez votre code PIN</div>}

            {/* PIN Keypad */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:8}} aria-label="Clavier PIN">
              {PIN_KEYS.flat().map((k)=>{
                if(k==="✓") return(
                  <button key={k} className="pin-key" aria-label="Valider" onClick={()=>pin.length>=4&&validatePin(pin)}
                    style={{height:58,borderRadius:12,border:"none",cursor:pin.length>=4?"pointer":"default",background:pin.length>=4?C.accent:C.border,color:pin.length>=4?"#000":C.muted,fontSize:18,fontWeight:800,transition:"all .15s",opacity:pin.length>=4?1:.5}}>✓</button>
                );
                if(k==="←") return(
                  <button key={k} className="pin-key" aria-label="Supprimer" onClick={deleteKey}
                    style={{height:58,borderRadius:12,border:`1px solid ${C.border}`,cursor:"pointer",background:C.card,color:C.text,fontSize:18,fontWeight:600,transition:"all .15s"}}>⌫</button>
                );
                return(
                  <button key={k} className="pin-key" aria-label={`Chiffre ${k}`} onClick={()=>pressKey(k)}
                    style={{height:58,borderRadius:12,border:`1px solid ${C.border}`,cursor:"pointer",background:C.card,color:C.text,fontSize:20,fontWeight:700,transition:"all .15s"}}>
                    {k}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({employes,commandes}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const presents=employes.filter(e=>e.status==="Présent").length;
  const payees=commandes.filter(c=>c.statut==="Payé");
  const ca=payees.reduce((s,c)=>s+c.total,0);
  const enCours=commandes.filter(c=>c.statut==="En cours");
  const emporterActives=commandes.filter(c=>c.table==="Emporter"&&c.statut!=="Payé");
  const getTableLabel=(c)=>{
    if(c.table==="Emporter") return `🥡 Emporter ${c.numEmporter||""}`;
    if(c.table==="Comptoir") return "🛍️ Comptoir";
    return `🪑 Table ${c.table}`;
  };
  return(<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
      <StatCard label="Chiffre d'affaires" value={ca.toLocaleString()+" DA"} delta="depuis ouverture" pos={true} color={C.accent}/>
      <StatCard label="Commandes" value={commandes.length} delta={`${enCours.length} en cours`} pos={true} color={C.blue}/>
      <StatCard label="À Emporter actives" value={emporterActives.length} delta="en cours de préparation" pos={true} color="#ea580c"/>
      <StatCard label="Employés présents" value={`${presents}/${employes.length}`} delta={`${employes.length-presents} absent(s)`} pos={presents===employes.length} color={C.green}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={g.card}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:16,color:C.text}}>📊 Ventes cette semaine</div>
        {[["Lun",38000,66],["Mar",42000,72],["Mer",35000,60],["Jeu",57500,100],["Ven",48000,83],["Sam",52000,90],["Dim",12500,22]].map(([d,v,w])=>(
          <div key={d} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{width:32,fontSize:12,color:C.muted}}>{d}</div>
            <div style={{flex:1,background:C.border,borderRadius:4,height:8}}><div style={{width:`${w}%`,background:C.accent,borderRadius:4,height:"100%"}}/></div>
            <div style={{fontSize:12,minWidth:80,textAlign:"right",color:C.text}}>{v.toLocaleString()} DA</div>
          </div>
        ))}
      </div>
      <div style={g.card}>
        <div style={{fontSize:15,fontWeight:700,margin:"16px 0 10px",color:C.text}}>🧾 Dernières commandes</div>
        {commandes.length===0?<div style={{color:C.muted,fontSize:13}}>Aucune commande</div>
          :commandes.slice(-4).reverse().map((c,i)=>(<div key={i} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{getTableLabel(c)} — #{String(c.id).slice(-4)}</div><div style={{fontSize:11,color:C.muted}}>{c.total} DA</div></div>
            <span style={g.badge(c.statut==="Payé"?C.green:C.accent)}>{c.statut}</span>
          </div>))}
      </div>
    </div>
  </div>);
}

// ─── TABLES & COMMANDES ───────────────────────────────────────────────────────
// ─── COMMANDE À EMPORTER ──────────────────────────────────────────────────────
function CommandeEmporter({commandes,setCommandes,menu,nomEtablissement,user,onClose}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const [vue,setVue]=useState("nouvelle"); // "nouvelle" | "suivi"
  const [order,setOrder]=useState([]);const [cat,setCat]=useState("Tous");const [search,setSearch]=useState("");
  const [noteCmd,setNoteCmd]=useState("");const [remise,setRemise]=useState(0);
  const [clientNom,setClientNom]=useState("");const [clientTel,setClientTel]=useState("");
  const [modePaie,setModePaie]=useState("Cash");
  const barcodeRef=useRef("");const barcodeTimer=useRef(null);

  // Code-barres
  useEffect(()=>{
    const handler=(e)=>{
      if(e.key==="Enter"){const bc=barcodeRef.current.trim();if(bc){const found=menu.find(m=>m.barcode===bc);if(found)addItem(found);barcodeRef.current="";}
      } else if(e.key.length===1){barcodeRef.current+=e.key;clearTimeout(barcodeTimer.current);barcodeTimer.current=setTimeout(()=>{barcodeRef.current="";},300);}
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[menu]);

  const cats=["Tous",...new Set(menu.map(m=>m.cat))];
  const filtered=menu.filter(m=>cat==="Tous"||m.cat===cat).filter(m=>m.name.toLowerCase().includes(search.toLowerCase()));
  const addItem=(item)=>setOrder(p=>{const ex=p.find(o=>o.id===item.id);return ex?p.map(o=>o.id===item.id?{...o,qty:o.qty+1}:o):[...p,{...item,qty:1}];});
  const removeItem=(id)=>setOrder(p=>p.filter(o=>o.id!==id));
  const changeQty=(id,d)=>setOrder(p=>p.map(o=>o.id===id?{...o,qty:Math.max(1,o.qty+d)}:o));
  const totalBrut=order.reduce((s,o)=>s+o.price*o.qty,0);
  const montantRemise=remise>0?Math.round(totalBrut*(remise/100)):0;
  const total=totalBrut-montantRemise;

  // Compteur emporter: EM-001, EM-002...
  const getNumEmporter=()=>{
    const emporterCmds=commandes.filter(c=>c.table==="Emporter");
    const today=new Date().toISOString().split("T")[0];
    const todayCmds=emporterCmds.filter(c=>c.dateStamp===today);
    return "EM-"+String(todayCmds.length+1).padStart(3,"0");
  };

  const valider=()=>{
    if(!order.length)return;
    const numEmporter=getNumEmporter();
    const newCmd={
      id:Date.now(),table:"Emporter",numEmporter,total,totalBrut,remise,
      statut:"En attente",statutEmporter:"En attente",
      items:[...order],date:new Date().toLocaleString("fr-FR"),
      dateStamp:new Date().toISOString().split("T")[0],
      serveur:user?.nom||"",note:noteCmd.trim(),
      clientNom:clientNom.trim(),clientTel:clientTel.trim(),modePaiement:modePaie
    };
    setCommandes(p=>[...p,newCmd]);
    imprimerEmporter(newCmd,nomEtablissement);
    setOrder([]);setNoteCmd("");setRemise(0);setClientNom("");setClientTel("");
    setVue("suivi");
  };

  const changerStatut=(id,statut)=>{
    setCommandes(p=>p.map(c=>{
      if(c.id!==id)return c;
      const updated={...c,statutEmporter:statut};
      if(statut==="Récupéré"){updated.statut="Payé";}
      if(statut==="Récupéré") setTimeout(()=>imprimerAddition({...updated},nomEtablissement),200);
      return updated;
    }));
  };

  const emporterActives=commandes.filter(c=>c.table==="Emporter"&&c.statut!=="Payé")
    .sort((a,b)=>b.id-a.id);
  const STATUTS_ORDER=["En attente","En préparation","Prêt","Récupéré"];
  const STATUT_COLORS={"En attente":C.accent,"En préparation":C.blue,"Prêt":C.green,"Récupéré":C.muted};

  return(
    <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={onClose}>
      <div style={{width:"95vw",maxWidth:1100,height:"92vh",background:C.surface,borderRadius:20,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeIn .2s ease"}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:"14px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:46,height:46,borderRadius:12,background:"#ea580c33",border:"2px solid #ea580c",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🥡</div>
            <div>
              <div style={{fontSize:18,fontWeight:800,color:C.text}}>Commandes À Emporter</div>
              <div style={{fontSize:12,color:C.muted}}>Commandes comptoir sans table</div>
            </div>
            <div style={{display:"flex",gap:0,marginLeft:16,background:C.bg,borderRadius:10,padding:3}}>
              {[["nouvelle","➕ Nouvelle"],["suivi","📋 Suivi ("+emporterActives.length+")"]].map(([v,l])=>(
                <button key={v} onClick={()=>setVue(v)} style={{padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:vue===v?"#ea580c":"transparent",color:vue===v?"#fff":C.muted,transition:"all .15s"}}>{l}</button>
              ))}
            </div>
          </div>
          <button style={{...g.btn("danger"),padding:"8px 14px"}} onClick={onClose}>✕</button>
        </div>

        {/* Vue Nouvelle Commande */}
        {vue==="nouvelle"&&(
          <div style={{display:"flex",flex:1,overflow:"hidden"}}>
            {/* Menu */}
            <div style={{flex:1,display:"flex",flexDirection:"column",borderRight:`1px solid ${C.border}`,overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,background:C.card,flexShrink:0}}>
                <input style={{...g.input,marginBottom:10}} placeholder="🔍 Rechercher ou scanner code-barres..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus/>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>setCat(c)} style={{...g.btn(c===cat?"primary":""),padding:"5px 14px",fontSize:12,borderRadius:20,background:c===cat?"#ea580c":C.border,color:c===cat?"#fff":C.text}}>{c}</button>)}</div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:14,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,alignContent:"start"}}>
                {filtered.map(item=>{const inOrder=order.find(o=>o.id===item.id);const isImg=item.image?.startsWith("data:")||item.image?.startsWith("http");return(
                  <div key={item.id} onClick={()=>addItem(item)} style={{background:inOrder?"#ea580c22":C.card,border:`2px solid ${inOrder?"#ea580c":C.border}`,borderRadius:14,padding:12,cursor:"pointer",textAlign:"center",transition:"all .15s",transform:inOrder?"scale(1.03)":"scale(1)",position:"relative"}}>
                    {inOrder&&<div style={{position:"absolute",top:6,right:6,background:"#ea580c",color:"#fff",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800}}>{inOrder.qty}</div>}
                    <div style={{fontSize:isImg?0:36,marginBottom:8,height:48,display:"flex",alignItems:"center",justifyContent:"center"}}>{isImg?<img src={item.image} alt="" style={{width:48,height:48,borderRadius:10,objectFit:"cover"}}/>:item.image}</div>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:3,color:C.text}}>{item.name}</div>
                    <div style={{fontSize:13,color:"#ea580c",fontWeight:800}}>{item.price} DA</div>
                  </div>
                );})}
              </div>
            </div>

            {/* Panier + infos client */}
            <div style={{width:310,display:"flex",flexDirection:"column",background:C.card,flexShrink:0,overflow:"hidden"}}>
              <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"space-between",color:C.text}}>
                <span>🥡 Commande</span>{order.length>0&&<span style={{...g.badge("#ea580c"),background:"#ea580c22",color:"#ea580c"}}>{order.reduce((s,o)=>s+o.qty,0)} art.</span>}
              </div>
              {/* Infos client */}
              <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,background:C.surface}}>
                <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:8,fontWeight:600}}>👤 Info Client (optionnel)</div>
                <input style={{...g.input,marginBottom:8,fontSize:12}} placeholder="Nom du client" value={clientNom} onChange={e=>setClientNom(e.target.value)}/>
                <input style={{...g.input,fontSize:12}} placeholder="Téléphone" value={clientTel} onChange={e=>setClientTel(e.target.value)}/>
              </div>
              {/* Articles */}
              <div style={{flex:1,overflowY:"auto",padding:"8px 14px"}}>
                {order.length===0?<div style={{textAlign:"center",paddingTop:40,color:C.muted}}><div style={{fontSize:38}}>🥡</div><div style={{fontSize:13,marginTop:10}}>Sélectionnez des produits</div></div>
                  :order.map(o=>{const isImg=o.image?.startsWith("data:")||o.image?.startsWith("http");return(
                    <div key={o.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{fontSize:isImg?0:20,width:28,textAlign:"center"}}>{isImg?<img src={o.image} alt="" style={{width:28,height:28,borderRadius:6,objectFit:"cover"}}/>:o.image}</div>
                          <div><div style={{fontSize:12,fontWeight:700,color:C.text}}>{o.name}</div><div style={{fontSize:11,color:C.muted}}>{o.price} DA</div></div>
                        </div>
                        <button style={{...g.btn("danger"),padding:"2px 7px",fontSize:11}} onClick={()=>removeItem(o.id)}>✕</button>
                      </div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{display:"flex"}}>
                          <button onClick={()=>changeQty(o.id,-1)} style={{width:28,height:28,borderRadius:"8px 0 0 8px",border:"none",background:C.border,color:C.text,cursor:"pointer",fontWeight:700,fontSize:16}}>−</button>
                          <div style={{width:34,height:28,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:C.text}}>{o.qty}</div>
                          <button onClick={()=>changeQty(o.id,+1)} style={{width:28,height:28,borderRadius:"0 8px 8px 0",border:"none",background:"#ea580c",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:16}}>+</button>
                        </div>
                        <div style={{fontWeight:800,color:"#ea580c",fontSize:14}}>{o.price*o.qty} DA</div>
                      </div>
                    </div>
                  );})}
              </div>
              {/* Bas du panier */}
              <div style={{padding:"10px 14px 14px",borderTop:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
                <label style={{...g.label,marginBottom:4}}>📝 Note / Instructions</label>
                <textarea style={{...g.input,height:46,resize:"none",fontSize:12,padding:"8px 10px",marginBottom:10}} placeholder="Sans oignon, bien cuit, emballage séparé..." value={noteCmd} onChange={e=>setNoteCmd(e.target.value)}/>
                <label style={{...g.label,marginBottom:4}}>💸 Remise</label>
                <div style={{display:"flex",gap:5,marginBottom:10}}>{[0,5,10,15,20].map(r=><button key={r} onClick={()=>setRemise(r)} style={{flex:1,padding:"4px 0",borderRadius:8,border:`2px solid ${remise===r?"#ea580c":C.border}`,background:remise===r?"#ea580c22":C.surface,color:remise===r?"#ea580c":C.text,cursor:"pointer",fontSize:11,fontWeight:700}}>{r}%</button>)}</div>
                <label style={{...g.label,marginBottom:4}}>💳 Paiement</label>
                <div style={{display:"flex",gap:5,marginBottom:10}}>{["Cash","Carte","Virement"].map(m=><button key={m} onClick={()=>setModePaie(m)} style={{...g.btn(modePaie===m?"primary":""),flex:1,padding:"6px 0",fontSize:11,background:modePaie===m?"#ea580c":C.border,color:modePaie===m?"#fff":C.text}}>{m}</button>)}</div>
                {remise>0&&<div style={{fontSize:12,color:C.red,marginBottom:6,display:"flex",justifyContent:"space-between"}}><span>Remise ({remise}%)</span><span>-{montantRemise} DA</span></div>}
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,fontSize:17,fontWeight:900,color:C.text}}><span>TOTAL</span><span style={{color:"#ea580c"}}>{total} DA</span></div>
                <div style={{fontSize:11,color:C.muted,marginBottom:10,padding:"7px 10px",background:C.card,borderRadius:8,lineHeight:1.6}}>🖨️ <span style={{color:"#ea580c"}}>Bon client</span> + <span style={{color:C.red}}>Cuisine</span> → imprimés automatiquement</div>
                <button style={{background:order.length===0?"#ea580c66":"#ea580c",color:"#fff",width:"100%",padding:12,fontSize:14,borderRadius:12,border:"none",cursor:order.length===0?"not-allowed":"pointer",fontWeight:700}} onClick={valider} disabled={order.length===0}>
                  🥡 Valider & Imprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vue Suivi */}
        {vue==="suivi"&&(
          <div style={{flex:1,overflowY:"auto",padding:24}}>
            {emporterActives.length===0?(
              <div style={{textAlign:"center",padding:60,color:C.muted}}>
                <div style={{fontSize:52,marginBottom:16}}>🥡</div>
                <div style={{fontSize:16,fontWeight:700,marginBottom:8,color:C.text}}>Aucune commande à emporter en cours</div>
                <div style={{fontSize:13}}>Créez une nouvelle commande via l'onglet "➕ Nouvelle"</div>
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16}}>
                {emporterActives.map(cmd=>{
                  const statutCurrent=cmd.statutEmporter||"En attente";
                  const idx=STATUTS_ORDER.indexOf(statutCurrent);
                  const prochainStatut=STATUTS_ORDER[idx+1];
                  return(
                    <div key={cmd.id} style={{background:C.card,border:`2px solid ${STATUT_COLORS[statutCurrent]}`,borderRadius:16,overflow:"hidden"}}>
                      <div style={{background:STATUT_COLORS[statutCurrent]+"22",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
                        <div>
                          <div style={{fontSize:18,fontWeight:900,color:STATUT_COLORS[statutCurrent]}}>N° {cmd.numEmporter}</div>
                          <div style={{fontSize:11,color:C.muted}}>{cmd.date}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <span style={{...g.badge(STATUT_COLORS[statutCurrent]),fontSize:12}}>{statutCurrent}</span>
                          <div style={{fontSize:12,fontWeight:700,color:C.text,marginTop:4}}>{cmd.total.toLocaleString()} DA</div>
                        </div>
                      </div>
                      <div style={{padding:"12px 16px"}}>
                        {(cmd.clientNom||cmd.clientTel)&&(
                          <div style={{padding:"8px 10px",background:C.surface,borderRadius:8,marginBottom:12,fontSize:12,color:C.text}}>
                            {cmd.clientNom&&<div>👤 {cmd.clientNom}</div>}
                            {cmd.clientTel&&<div>📞 {cmd.clientTel}</div>}
                          </div>
                        )}
                        <div style={{marginBottom:12}}>
                          {cmd.items?.map((item,i)=>(
                            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>
                              <span style={{color:C.text}}>{item.qty}× {item.name}</span>
                              <span style={{color:C.muted}}>{item.price*item.qty} DA</span>
                            </div>
                          ))}
                          {cmd.note&&<div style={{marginTop:8,fontSize:11,background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:6,padding:"5px 8px",color:"#92400e"}}>📝 {cmd.note}</div>}
                        </div>
                        {/* Progress bar statuts */}
                        <div style={{display:"flex",gap:4,marginBottom:12}}>
                          {STATUTS_ORDER.filter(s=>s!=="Récupéré").map((s,i)=>(
                            <div key={s} style={{flex:1,height:4,borderRadius:4,background:i<=STATUTS_ORDER.indexOf(statutCurrent)&&statutCurrent!=="Récupéré"?STATUT_COLORS[statutCurrent]:C.border}}/>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          {prochainStatut&&(
                            <button style={{flex:1,padding:"8px 0",borderRadius:10,border:"none",cursor:"pointer",background:STATUT_COLORS[prochainStatut],color:"#fff",fontSize:12,fontWeight:700}}
                              onClick={()=>changerStatut(cmd.id,prochainStatut)}>
                              {prochainStatut==="En préparation"?"👨‍🍳 Préparer":prochainStatut==="Prêt"?"✅ Prêt":prochainStatut==="Récupéré"?"🥡 Récupéré ✓":"→ "+prochainStatut}
                            </button>
                          )}
                          <button style={{...g.btn(),padding:"8px 10px",fontSize:11}} onClick={()=>ouvrirTicket(cmd,"emporter_client",nomEtablissement)}>🖨️</button>
                          <button style={{...g.btn("danger"),padding:"8px 10px",fontSize:11}} onClick={()=>ouvrirTicket(cmd,"emporter_cuisine",nomEtablissement)}>👨‍🍳</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Tables({tables,setTables,commandes,setCommandes,menu,nomEtablissement,user}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const [selected,setSelected]=useState(null);const [vue,setVue]=useState("commande");
  const [order,setOrder]=useState([]);const [cat,setCat]=useState("Tous");const [search,setSearch]=useState("");
  const [noteCmd,setNoteCmd]=useState("");const [remise,setRemise]=useState(0);
  const [showAdd,setShowAdd]=useState(false);const [nbAdd,setNbAdd]=useState(1);
  const [showEmporter,setShowEmporter]=useState(false);
  const barcodeRef=useRef("");const barcodeTimer=useRef(null);

  const cats=["Tous",...new Set(menu.map(m=>m.cat))];
  const filtered=menu.filter(m=>cat==="Tous"||m.cat===cat).filter(m=>m.name.toLowerCase().includes(search.toLowerCase()));
  const addItem=(item)=>setOrder(p=>{const ex=p.find(o=>o.id===item.id);return ex?p.map(o=>o.id===item.id?{...o,qty:o.qty+1}:o):[...p,{...item,qty:1}];});
  const removeItem=(id)=>setOrder(p=>p.filter(o=>o.id!==id));
  const changeQty=(id,d)=>setOrder(p=>p.map(o=>o.id===id?{...o,qty:Math.max(1,o.qty+d)}:o));
  const totalBrut=order.reduce((s,o)=>s+o.price*o.qty,0);
  const montantRemise=remise>0?Math.round(totalBrut*(remise/100)):0;
  const total=totalBrut-montantRemise;
  const cmdActive=(tid)=>commandes.filter(c=>c.table===tid&&c.statut==="En cours");
  const openTable=(t)=>{setSelected(t);setOrder([]);setCat("Tous");setSearch("");setNoteCmd("");setRemise(0);setVue(t.status==="occupied"?"details":"commande");};

  // Lecteur code-barres dans la fenêtre commande
  useEffect(()=>{
    if(!selected) return;
    const handler=(e)=>{
      if(e.key==="Enter"){const bc=barcodeRef.current.trim();if(bc){const found=menu.find(m=>m.barcode===bc);if(found) addItem(found);barcodeRef.current="";}
      } else if(e.key.length===1){barcodeRef.current+=e.key;clearTimeout(barcodeTimer.current);barcodeTimer.current=setTimeout(()=>{barcodeRef.current="";},300);}
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[selected,menu]);

  const valider=()=>{
    if(!order.length)return;
    const newCmd={id:Date.now(),table:selected.id,total,totalBrut,remise,statut:"En cours",items:[...order],date:new Date().toLocaleString("fr-FR"),dateStamp:new Date().toISOString().split("T")[0],serveur:user?.nom||"",note:noteCmd.trim()};
    setCommandes(p=>[...p,newCmd]);setTables(p=>p.map(t=>t.id===selected.id?{...t,status:"occupied"}:t));
    imprimerValidation(newCmd,nomEtablissement);setOrder([]);setNoteCmd("");setRemise(0);setSelected(null);
  };
  const libererEtPayer=(tid)=>{
    const cmds=cmdActive(tid);
    setTables(p=>p.map(t=>t.id===tid?{...t,status:"free"}:t));
    setCommandes(p=>p.map(c=>c.table===tid&&c.statut==="En cours"?{...c,statut:"Payé"}:c));
    cmds.forEach(c=>setTimeout(()=>imprimerAddition({...c,statut:"Payé"},nomEtablissement),300));
    setSelected(null);
  };
  const SC={occupied:C.red,reserved:C.accent,free:C.green};
  const SL={occupied:"Occupée",reserved:"Réservée",free:"Libre"};
  const emporterEnCours=commandes.filter(c=>c.table==="Emporter"&&c.statut!=="Payé").length;

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div>
        <div style={{fontSize:15,fontWeight:700,marginBottom:6,color:C.text}}>Plan des tables ({tables.length}/100)</div>
        <div style={{display:"flex",gap:16,fontSize:12}}>{Object.entries(SC).map(([k,v])=><span key={k} style={{color:v}}>● {SL[k]} ({tables.filter(t=>t.status===k).length})</span>)}</div>
      </div>
      <div style={{display:"flex",gap:10}}>
        {/* Bouton À Emporter */}
        <button onClick={()=>setShowEmporter(true)} style={{position:"relative",padding:"9px 18px",borderRadius:10,border:"2px solid #ea580c",background:"#ea580c22",color:"#ea580c",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:8,transition:"all .15s"}}>
          🥡 À Emporter
          {emporterEnCours>0&&<span style={{background:"#ea580c",color:"#fff",borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{emporterEnCours}</span>}
        </button>
        <button style={g.btn("primary")} onClick={()=>setShowAdd(true)}>+ Ajouter tables</button>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:8,marginBottom:24}}>
      {tables.map(t=>{
        const color=SC[t.status];const cmds=cmdActive(t.id);const numCmd=cmds.length>0?`#${String(cmds[0].id).slice(-4)}`:"";
        return(<div key={t.id} onClick={()=>openTable(t)} style={{aspectRatio:"1",borderRadius:10,border:`2px solid ${color}`,background:color+"18",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12,fontWeight:700,color,boxShadow:t.status==="occupied"?`0 0 12px ${color}33`:"none",transition:"all .15s"}}>
          <div style={{fontSize:14}}>T{t.id}</div>
          {numCmd&&<div style={{fontSize:9,opacity:.9}}>{numCmd}</div>}
          {cmds.length>0&&<div style={{fontSize:9,opacity:.85}}>{cmds.reduce((s,c)=>s+c.total,0).toLocaleString()} DA</div>}
          {cmds.some(c=>c.note)&&<div style={{fontSize:9}}>📝</div>}
        </div>);
      })}
    </div>
    {showAdd&&<Modal title="Ajouter des tables" onClose={()=>setShowAdd(false)}>
      <label style={g.label}>Nombre (max {100-tables.length})</label>
      <input style={g.input} type="number" min={1} max={100-tables.length} value={nbAdd} onChange={e=>setNbAdd(parseInt(e.target.value)||1)}/>
      <div style={{display:"flex",gap:8,marginTop:16}}>
        <button style={{...g.btn("primary"),flex:1}} onClick={()=>{if(tables.length+nbAdd>100)return alert("Max 100 tables!");setTables(p=>[...p,...Array.from({length:nbAdd},(_,i)=>({id:p.length+i+1,status:"free"}))]);setShowAdd(false);setNbAdd(1);}}>Confirmer</button>
        <button style={{...g.btn(),flex:1}} onClick={()=>setShowAdd(false)}>Annuler</button>
      </div>
    </Modal>}

    {/* Modal Commande À Emporter */}
    {showEmporter&&<CommandeEmporter commandes={commandes} setCommandes={setCommandes} menu={menu} nomEtablissement={nomEtablissement} user={user} onClose={()=>setShowEmporter(false)}/>}

    {selected&&(<div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={()=>setSelected(null)}>
      <div style={{width:"95vw",maxWidth:1080,height:"90vh",background:C.surface,borderRadius:20,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeIn .2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"14px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:46,height:46,borderRadius:12,background:SC[selected.status]+"33",border:`2px solid ${SC[selected.status]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:SC[selected.status]}}>{selected.id}</div>
            <div>
              <div style={{fontSize:18,fontWeight:800,color:C.text}}>Table {selected.id}</div>
              <div style={{display:"flex",gap:6,marginTop:3}}>
                <span style={g.badge(SC[selected.status])}>{SL[selected.status]}</span>
                {cmdActive(selected.id).length>0&&<span style={g.badge(C.blue)}>#{String(cmdActive(selected.id)[0].id).slice(-4)}</span>}
              </div>
            </div>
            {selected.status==="occupied"&&(<div style={{display:"flex",gap:0,marginLeft:16,background:C.bg,borderRadius:10,padding:3}}>
              {[["details","👁 Commande"],["commande","➕ Ajouter"]].map(([v,l])=>(
                <button key={v} onClick={()=>setVue(v)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:vue===v?C.accent:"transparent",color:vue===v?"#000":C.muted,transition:"all .15s"}}>{l}</button>
              ))}
            </div>)}
          </div>
          <div style={{display:"flex",gap:10}}>
            {selected.status==="occupied"&&<button style={g.btn("green")} onClick={()=>libererEtPayer(selected.id)}>💳 Payer & Addition</button>}
            <button style={{...g.btn("danger"),padding:"8px 14px"}} onClick={()=>setSelected(null)}>✕</button>
          </div>
        </div>
        {vue==="details"&&selected.status==="occupied"&&(()=>{
          const cmds=cmdActive(selected.id);
          const merged=cmds.flatMap(c=>c.items||[]).reduce((acc,item)=>{const ex=acc.find(a=>a.id===item.id);if(ex)ex.qty+=item.qty;else acc.push({...item});return acc;},[]);
          const totalTable=cmds.reduce((s,c)=>s+c.total,0);
          const notes=cmds.filter(c=>c.note).map(c=>c.note);
          return(<div style={{flex:1,overflowY:"auto",padding:24}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              <div style={g.card}>
                <div style={{fontSize:15,fontWeight:800,marginBottom:10,display:"flex",alignItems:"center",gap:8,color:C.text}}>
                  🧾 Table {selected.id} <span style={g.badge(C.accent)}>{merged.reduce((s,i)=>s+i.qty,0)} art.</span>
                  {cmds.length>0&&<span style={g.badge(C.blue)}>#{String(cmds[0].id).slice(-4)}</span>}
                </div>
                {notes.length>0&&<div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"8px 12px",marginBottom:14}}>{notes.map((n,i)=><div key={i} style={{fontSize:12,color:"#92400e"}}>📝 {n}</div>)}</div>}
                {merged.map((item,i)=>{const isImg=item.image?.startsWith("data:")||item.image?.startsWith("http");return(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",background:C.surface,borderRadius:8,fontSize:isImg?0:22}}>{isImg?<img src={item.image} alt="" style={{width:34,height:34,borderRadius:8,objectFit:"cover"}}/>:item.image}</div>
                      <div><div style={{fontSize:14,fontWeight:700,color:C.text}}>{item.name}</div><div style={{fontSize:11,color:C.muted}}>{item.price} DA × {item.qty}</div></div>
                    </div>
                    <div style={{fontSize:15,fontWeight:800,color:C.accent}}>{item.price*item.qty} DA</div>
                  </div>
                );})}
                <div style={{display:"flex",justifyContent:"space-between",marginTop:16,paddingTop:12,borderTop:`2px solid ${C.border}`,fontSize:18,fontWeight:900,color:C.text}}><span>TOTAL</span><span style={{color:C.accent}}>{totalTable.toLocaleString()} DA</span></div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {[{v:"blue",type:"table",icon:"🪑",titre:"Ticket table",desc:"À présenter à la caisse"},{v:"danger",type:"cuisine",icon:"👨‍🍳",titre:"Bon cuisine",desc:"Pour le préparateur"},{v:"green",type:"addition",icon:"💳",titre:"Addition",desc:"Reçu de paiement"}].map(({v,type,icon,titre,desc})=>(
                  <div key={type} style={{...g.card,borderTop:`3px solid ${v==="blue"?C.blue:v==="danger"?C.red:C.green}`}}>
                    <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:C.text}}>{icon} {titre}</div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:12}}>{desc}</div>
                    <button style={{...g.btn(v),width:"100%"}} onClick={()=>cmds.forEach(c=>ouvrirTicket(c,type,nomEtablissement))}>🖨️ Imprimer</button>
                  </div>
                ))}
              </div>
            </div>
          </div>);
        })()}
        {(vue==="commande"||selected.status!=="occupied")&&(<div style={{display:"flex",flex:1,overflow:"hidden"}}>
          <div style={{flex:1,display:"flex",flexDirection:"column",borderRight:`1px solid ${C.border}`,overflow:"hidden"}}>
            <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,background:C.card,flexShrink:0}}>
              <input style={{...g.input,marginBottom:10}} placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>setCat(c)} style={{...g.btn(c===cat?"primary":""),padding:"5px 14px",fontSize:12,borderRadius:20}}>{c}</button>)}</div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:14,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,alignContent:"start"}}>
              {filtered.map(item=>{const inOrder=order.find(o=>o.id===item.id);const isImg=item.image?.startsWith("data:")||item.image?.startsWith("http");return(
                <div key={item.id} onClick={()=>addItem(item)} style={{background:inOrder?C.accent+"28":C.card,border:`2px solid ${inOrder?C.accent:C.border}`,borderRadius:14,padding:12,cursor:"pointer",textAlign:"center",transition:"all .15s",transform:inOrder?"scale(1.03)":"scale(1)",position:"relative"}}>
                  {inOrder&&<div style={{position:"absolute",top:6,right:6,background:C.accent,color:"#000",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800}}>{inOrder.qty}</div>}
                  <div style={{fontSize:isImg?0:36,marginBottom:8,height:48,display:"flex",alignItems:"center",justifyContent:"center"}}>{isImg?<img src={item.image} alt="" style={{width:48,height:48,borderRadius:10,objectFit:"cover"}}/>:item.image}</div>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:3,color:C.text}}>{item.name}</div>
                  <div style={{fontSize:13,color:C.accent,fontWeight:800}}>{item.price} DA</div>
                </div>
              );})}
            </div>
          </div>
          <div style={{width:300,display:"flex",flexDirection:"column",background:C.card,flexShrink:0,overflow:"hidden"}}>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,fontWeight:800,fontSize:14,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",color:C.text}}>
              <span>🧾 Commande</span>{order.length>0&&<span style={g.badge(C.accent)}>{order.reduce((s,o)=>s+o.qty,0)} art.</span>}
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"8px 14px"}}>
              {order.length===0?<div style={{textAlign:"center",paddingTop:50,color:C.muted}}><div style={{fontSize:38}}>🛒</div><div style={{fontSize:13,marginTop:10}}>Sélectionnez des produits</div></div>
                :order.map(o=>{const isImg=o.image?.startsWith("data:")||o.image?.startsWith("http");return(
                  <div key={o.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{fontSize:isImg?0:20,width:28,textAlign:"center"}}>{isImg?<img src={o.image} alt="" style={{width:28,height:28,borderRadius:6,objectFit:"cover"}}/>:o.image}</div>
                        <div><div style={{fontSize:12,fontWeight:700,color:C.text}}>{o.name}</div><div style={{fontSize:11,color:C.muted}}>{o.price} DA</div></div>
                      </div>
                      <button style={{...g.btn("danger"),padding:"2px 7px",fontSize:11}} onClick={()=>removeItem(o.id)}>✕</button>
                    </div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex"}}>
                        <button onClick={()=>changeQty(o.id,-1)} style={{width:28,height:28,borderRadius:"8px 0 0 8px",border:"none",background:C.border,color:C.text,cursor:"pointer",fontWeight:700,fontSize:16}}>−</button>
                        <div style={{width:34,height:28,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:C.text}}>{o.qty}</div>
                        <button onClick={()=>changeQty(o.id,+1)} style={{width:28,height:28,borderRadius:"0 8px 8px 0",border:"none",background:C.accent,color:"#000",cursor:"pointer",fontWeight:700,fontSize:16}}>+</button>
                      </div>
                      <div style={{fontWeight:800,color:C.accent,fontSize:14}}>{o.price*o.qty} DA</div>
                    </div>
                  </div>
                );})}
            </div>
            <div style={{padding:"10px 14px",borderTop:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
              <label style={{...g.label,marginBottom:4}}>📝 Note</label>
              <textarea style={{...g.input,height:46,resize:"none",fontSize:12,padding:"8px 10px",marginBottom:10}} placeholder="Sans sel, allergie..." value={noteCmd} onChange={e=>setNoteCmd(e.target.value)}/>
              <label style={{...g.label,marginBottom:4}}>💸 Remise</label>
              <div style={{display:"flex",gap:5,marginBottom:10}}>{[0,5,10,15,20].map(r=><button key={r} onClick={()=>setRemise(r)} style={{flex:1,padding:"4px 0",borderRadius:8,border:`2px solid ${remise===r?C.accent:C.border}`,background:remise===r?C.accentDim:C.surface,color:remise===r?C.accent:C.text,cursor:"pointer",fontSize:11,fontWeight:700}}>{r}%</button>)}</div>
              {remise>0&&<div style={{fontSize:12,color:C.red,marginBottom:6,display:"flex",justifyContent:"space-between"}}><span>Remise ({remise}%)</span><span>-{montantRemise} DA</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,fontSize:17,fontWeight:900,color:C.text}}><span>TOTAL</span><span style={{color:C.accent}}>{total} DA</span></div>
              <button style={{...g.btn("primary"),width:"100%",padding:12,fontSize:14,borderRadius:12,opacity:order.length===0?0.4:1,cursor:order.length===0?"not-allowed":"pointer"}} onClick={valider} disabled={order.length===0}>✓ Valider & Imprimer</button>
            </div>
          </div>
        </div>)}
      </div>
    </div>)}
  </div>);
}

function MenuPage({menu,setMenu,menuCats,setMenuCats}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const [showModal,setShowModal]=useState(false);const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({name:"",cat:"Boissons",price:0,image:"🍽",barcode:""});
  const [catFilter,setCatFilter]=useState("Tous");const fileRef=useRef();
  const [showCatModal,setShowCatModal]=useState(false);const [newCat,setNewCat]=useState("");
  const cats=["Tous",...menuCats];
  const save=()=>{if(!form.name)return;if(editing)setMenu(p=>p.map(m=>m.id===editing?{...form,id:editing}:m));else setMenu(p=>[...p,{...form,id:Date.now()}]);setShowModal(false);};
  const del=(id)=>{if(window.confirm("Supprimer ce produit ?"))setMenu(p=>p.filter(m=>m.id!==id));};
  const addCat=()=>{if(!newCat.trim()||menuCats.includes(newCat.trim()))return;setMenuCats(p=>[...p,newCat.trim()]);setNewCat("");};
  const delCat=(cat)=>{if(menu.some(m=>m.cat===cat))return alert("Cette catégorie contient des produits.");setMenuCats(p=>p.filter(c=>c!==cat));};
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div>
        <div style={{fontSize:15,fontWeight:700,marginBottom:8,color:C.text}}>Gestion du Menu ({menu.length} produits)</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} style={{...g.btn(c===catFilter?"primary":""),padding:"5px 14px",fontSize:12,borderRadius:20}}>{c}</button>)}</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button style={g.btn()} onClick={()=>setShowCatModal(true)}>⚙️ Catégories</button>
        <button style={g.btn("primary")} onClick={()=>{setForm({name:"",cat:menuCats[0]||"Boissons",price:0,image:"🍽",barcode:""});setEditing(null);setShowModal(true);}}>+ Nouveau produit</button>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:16}}>
      {(catFilter==="Tous"?menu:menu.filter(m=>m.cat===catFilter)).map(item=>{const isImg=item.image?.startsWith("data:")||item.image?.startsWith("http");return(
        <div key={item.id} style={{...g.card,padding:0,overflow:"hidden"}}>
          <div style={{height:100,background:`linear-gradient(135deg,${C.surface},${C.bg})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:50}}>{isImg?<img src={item.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:item.image}</div>
          <div style={{padding:14,textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:6,color:C.text}}>{item.name}</div>
            <span style={g.badge(C.purple)}>{item.cat}</span>
            {item.barcode&&<div style={{fontSize:10,color:C.muted,marginTop:4}}>📷 {item.barcode}</div>}
            <div style={{fontSize:17,fontWeight:900,color:C.accent,margin:"10px 0"}}>{item.price} DA</div>
            <div style={{display:"flex",gap:6}}>
              <button style={{...g.btn(),flex:1,padding:"6px 0",fontSize:12}} onClick={()=>{setForm({...item,barcode:item.barcode||""});setEditing(item.id);setShowModal(true);}}>✏️</button>
              <button style={{...g.btn("danger"),padding:"6px 10px",fontSize:12}} onClick={()=>del(item.id)}>🗑</button>
            </div>
          </div>
        </div>
      );})}
    </div>
    {showCatModal&&<Modal title="⚙️ Gérer les catégories du Menu" onClose={()=>setShowCatModal(false)}>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <input style={{...g.input,flex:1}} placeholder="Nouvelle catégorie..." value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCat()}/>
        <button style={g.btn("primary")} onClick={addCat}>+ Ajouter</button>
      </div>
      {menuCats.map(cat=>(
        <div key={cat} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:14,color:C.text,fontWeight:600}}>{cat}</span>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:11,color:C.muted}}>{menu.filter(m=>m.cat===cat).length} produits</span>
            <button style={{...g.btn("danger"),padding:"4px 10px",fontSize:11}} onClick={()=>delCat(cat)}>🗑</button>
          </div>
        </div>
      ))}
    </Modal>}
    {showModal&&<Modal title={editing?"Modifier produit":"Nouveau produit"} onClose={()=>setShowModal(false)}>
      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{width:90,height:90,borderRadius:16,background:C.surface,border:`2px dashed ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:46,margin:"0 auto 12px",overflow:"hidden"}}>{form.image?.startsWith("data:")||form.image?.startsWith("http")?<img src={form.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:form.image}</div>
        <button style={{...g.btn(),fontSize:12,padding:"6px 16px",marginBottom:10}} onClick={()=>fileRef.current.click()}>📷 Photo</button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(p=>({...p,image:ev.target.result}));r.readAsDataURL(f);}}/>
        <div style={{display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap"}}>{["☕","🍕","🥤","🍗","🥪","🍰","🍲","🥐","🍮","🍊","🍵","🥗","🍔","🍜","🧃"].map(e=><button key={e} onClick={()=>setForm(p=>({...p,image:e}))} style={{width:32,height:32,borderRadius:8,border:"none",background:form.image===e?C.accent:C.border,cursor:"pointer",fontSize:16}}>{e}</button>)}</div>
      </div>
      <div style={{marginBottom:14}}><label style={g.label}>Nom</label><input style={g.input} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/></div>
      <div style={{marginBottom:14}}><label style={g.label}>Catégorie</label><select style={g.input} value={form.cat} onChange={e=>setForm(p=>({...p,cat:e.target.value}))}>{menuCats.map(c=><option key={c}>{c}</option>)}</select></div>
      <div style={{marginBottom:14}}><label style={g.label}>Prix (DA)</label><input style={g.input} type="number" value={form.price} onChange={e=>setForm(p=>({...p,price:parseFloat(e.target.value)||0}))}/></div>
      <div style={{marginBottom:18}}><label style={g.label}>Code-barres (optionnel)</label><input style={g.input} value={form.barcode||""} onChange={e=>setForm(p=>({...p,barcode:e.target.value}))} placeholder="Scannez ou tapez le code..."/></div>
      <div style={{display:"flex",gap:8}}><button style={{...g.btn("primary"),flex:1}} onClick={save}>Enregistrer</button><button style={{...g.btn(),flex:1}} onClick={()=>setShowModal(false)}>Annuler</button></div>
    </Modal>}
  </div>);
}

// ─── CATALOGUE BOUTIQUE ───────────────────────────────────────────────────────
function CatalogueBoutique({catalogue,setCatalogue,catCats,setCatCats}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const [showModal,setShowModal]=useState(false);const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({name:"",cat:"Hauts",price:0,image:"👕",couleurs:"Blanc,Noir",tailles:"S,M,L,XL",stock:0,barcode:""});
  const [catFilter,setCatFilter]=useState("Tous");const fileRef=useRef();
  const [showCatModal,setShowCatModal]=useState(false);const [newCat,setNewCat]=useState("");
  const cats=["Tous",...catCats];
  const save=()=>{if(!form.name)return;const item={...form,id:editing||Date.now(),couleurs:form.couleurs.split(",").map(s=>s.trim()).filter(Boolean),tailles:form.tailles.split(",").map(s=>s.trim()).filter(Boolean)};if(editing)setCatalogue(p=>p.map(m=>m.id===editing?item:m));else setCatalogue(p=>[...p,item]);setShowModal(false);};
  const openEdit=(item)=>{setForm({...item,couleurs:item.couleurs.join(","),tailles:item.tailles.join(","),barcode:item.barcode||""});setEditing(item.id);setShowModal(true);};
  const del=(id)=>{if(window.confirm("Supprimer ?"))setCatalogue(p=>p.filter(m=>m.id!==id));};
  const displayed=catFilter==="Tous"?catalogue:catalogue.filter(m=>m.cat===catFilter);
  const addCat=()=>{if(!newCat.trim()||catCats.includes(newCat.trim()))return;setCatCats(p=>[...p,newCat.trim()]);setNewCat("");};
  const delCat=(cat)=>{if(catalogue.some(m=>m.cat===cat))return alert("Cette catégorie contient des produits.");setCatCats(p=>p.filter(c=>c!==cat));};
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div>
        <div style={{fontSize:15,fontWeight:700,marginBottom:8,color:C.text}}>Catalogue ({catalogue.length} produits)</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} style={{...g.btn(c===catFilter?"primary":""),padding:"5px 14px",fontSize:12,borderRadius:20}}>{c}</button>)}</div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button style={g.btn()} onClick={()=>setShowCatModal(true)}>⚙️ Catégories</button>
        <button style={g.btn("primary")} onClick={()=>{setForm({name:"",cat:catCats[0]||"Hauts",price:0,image:"👕",couleurs:"Blanc,Noir",tailles:"S,M,L,XL",stock:0,barcode:""});setEditing(null);setShowModal(true);}}>+ Nouveau</button>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16}}>
      {displayed.map(item=>{const isImg=item.image?.startsWith("data:")||item.image?.startsWith("http");return(
        <div key={item.id} style={{...g.card,padding:0,overflow:"hidden"}}>
          <div style={{height:110,background:`linear-gradient(135deg,${C.surface},${C.bg})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:52,position:"relative"}}>
            {isImg?<img src={item.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:item.image}
            <div style={{position:"absolute",top:8,right:8,background:item.stock>10?C.green:item.stock>0?C.accent:C.red,color:"#fff",borderRadius:20,fontSize:10,fontWeight:700,padding:"2px 8px"}}>{item.stock} en stock</div>
          </div>
          <div style={{padding:14}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:C.text}}>{item.name}</div>
            <span style={g.badge(C.purple)}>{item.cat}</span>
            {item.barcode&&<div style={{fontSize:10,color:C.muted,marginTop:4}}>📷 {item.barcode}</div>}
            <div style={{fontSize:16,fontWeight:900,color:C.accent,margin:"8px 0"}}>{item.price.toLocaleString()} DA</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:4}}>🎨 {item.couleurs?.join(" · ")}</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:12}}>📐 {item.tailles?.join(" · ")}</div>
            <div style={{display:"flex",gap:6}}>
              <button style={{...g.btn(),flex:1,padding:"6px 0",fontSize:12}} onClick={()=>openEdit(item)}>✏️</button>
              <button style={{...g.btn("danger"),padding:"6px 10px",fontSize:12}} onClick={()=>del(item.id)}>🗑</button>
            </div>
          </div>
        </div>
      );})}
    </div>
    {showCatModal&&<Modal title="⚙️ Gérer les catégories Boutique" onClose={()=>setShowCatModal(false)}>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <input style={{...g.input,flex:1}} placeholder="Nouvelle catégorie..." value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCat()}/>
        <button style={g.btn("primary")} onClick={addCat}>+ Ajouter</button>
      </div>
      {catCats.map(cat=>(
        <div key={cat} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:14,color:C.text,fontWeight:600}}>{cat}</span>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:11,color:C.muted}}>{catalogue.filter(m=>m.cat===cat).length} produits</span>
            <button style={{...g.btn("danger"),padding:"4px 10px",fontSize:11}} onClick={()=>delCat(cat)}>🗑</button>
          </div>
        </div>
      ))}
    </Modal>}
    {showModal&&<Modal title={editing?"Modifier":"Nouveau produit"} onClose={()=>setShowModal(false)}>
      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{width:80,height:80,borderRadius:14,background:C.surface,border:`2px dashed ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,margin:"0 auto 10px",overflow:"hidden"}}>{form.image?.startsWith("data:")||form.image?.startsWith("http")?<img src={form.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:form.image}</div>
        <button style={{...g.btn(),fontSize:12,padding:"5px 14px",marginBottom:8}} onClick={()=>fileRef.current.click()}>📷 Photo</button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setForm(p=>({...p,image:ev.target.result}));r.readAsDataURL(f);}}/>
        <div style={{display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap",marginTop:6}}>{["👕","👔","🧥","👖","🩳","👗","👟","👢","🧢","👜","👒","🩴"].map(e=><button key={e} onClick={()=>setForm(p=>({...p,image:e}))} style={{width:30,height:30,borderRadius:8,border:"none",background:form.image===e?C.accent:C.border,cursor:"pointer",fontSize:15}}>{e}</button>)}</div>
      </div>
      {[["name","Nom du produit","text"],["price","Prix (DA)","number"],["stock","Stock initial","number"]].map(([k,l,t])=>(
        <div key={k} style={{marginBottom:14}}><label style={g.label}>{l}</label><input style={g.input} type={t} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:t==="number"?parseFloat(e.target.value)||0:e.target.value}))}/></div>
      ))}
      <div style={{marginBottom:14}}><label style={g.label}>Catégorie</label><select style={g.input} value={form.cat} onChange={e=>setForm(p=>({...p,cat:e.target.value}))}>{catCats.map(c=><option key={c}>{c}</option>)}</select></div>
      <div style={{marginBottom:14}}><label style={g.label}>Couleurs (virgule)</label><input style={g.input} value={form.couleurs} onChange={e=>setForm(p=>({...p,couleurs:e.target.value}))} placeholder="Blanc, Noir, Rouge"/></div>
      <div style={{marginBottom:14}}><label style={g.label}>Tailles (virgule)</label><input style={g.input} value={form.tailles} onChange={e=>setForm(p=>({...p,tailles:e.target.value}))} placeholder="S, M, L, XL ou 38, 40, 42"/></div>
      <div style={{marginBottom:18}}><label style={g.label}>Code-barres (optionnel)</label><input style={g.input} value={form.barcode||""} onChange={e=>setForm(p=>({...p,barcode:e.target.value}))} placeholder="Scannez ou tapez le code..."/></div>
      <div style={{display:"flex",gap:8}}><button style={{...g.btn("primary"),flex:1}} onClick={save}>Enregistrer</button><button style={{...g.btn(),flex:1}} onClick={()=>setShowModal(false)}>Annuler</button></div>
    </Modal>}
  </div>);
}

// ─── VENTES BOUTIQUE ──────────────────────────────────────────────────────────
function VentesBoutique({catalogue,setCatalogue,commandes,setCommandes,nomEtablissement,user,catCats}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const [cart,setCart]=useState([]);const [catFilter,setCatFilter]=useState("Tous");const [search,setSearch]=useState("");
  const [variantPicker,setVariantPicker]=useState(null);const [pickedCouleur,setPickedCouleur]=useState("");const [pickedTaille,setPickedTaille]=useState("");
  const [noteVente,setNoteVente]=useState("");const [modePaie,setModePaie]=useState("Cash");const [remise,setRemise]=useState(0);
  const [scanFeedback,setScanFeedback]=useState("");
  const barcodeRef=useRef("");const barcodeTimer=useRef(null);
  const cats=["Tous",...catCats];
  const filtered=catalogue.filter(m=>catFilter==="Tous"||m.cat===catFilter).filter(m=>m.name.toLowerCase().includes(search.toLowerCase()));
  const totalBrut=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const montantRemise=remise>0?Math.round(totalBrut*(remise/100)):0;
  const total=totalBrut-montantRemise;

  // Lecteur code-barres
  useEffect(()=>{
    const handler=(e)=>{
      if(e.key==="Enter"){
        const bc=barcodeRef.current.trim();
        if(bc){
          const found=catalogue.find(m=>m.barcode===bc);
          if(found){openVariant(found);setScanFeedback(`✅ ${found.name} trouvé`);}
          else setScanFeedback(`❌ Code "${bc}" introuvable`);
          barcodeRef.current="";
          setTimeout(()=>setScanFeedback(""),3000);
        }
      } else if(e.key.length===1){
        barcodeRef.current+=e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current=setTimeout(()=>{barcodeRef.current="";},300);
      }
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[catalogue]);

  const openVariant=(item)=>{setVariantPicker(item);setPickedCouleur(item.couleurs?.[0]||"");setPickedTaille(item.tailles?.[0]||"");};
  const addToCart=()=>{if(!variantPicker)return;const key=`${variantPicker.id}-${pickedCouleur}-${pickedTaille}`;setCart(p=>{const ex=p.find(i=>i.key===key);return ex?p.map(i=>i.key===key?{...i,qty:i.qty+1}:i):[...p,{...variantPicker,key,couleur:pickedCouleur,taille:pickedTaille,qty:1}];});setVariantPicker(null);};
  const changeQty=(key,d)=>setCart(p=>p.map(i=>i.key===key?{...i,qty:Math.max(1,i.qty+d)}:i));
  const removeItem=(key)=>setCart(p=>p.filter(i=>i.key!==key));
  const valider=()=>{
    if(!cart.length)return;
    const newCmd={id:Date.now(),table:"Comptoir",total,totalBrut,remise,statut:"Payé",items:cart.map(i=>({...i,name:`${i.name} (${i.couleur}/${i.taille})`})),date:new Date().toLocaleString("fr-FR"),dateStamp:new Date().toISOString().split("T")[0],serveur:user?.nom||"",note:noteVente.trim(),modePaiement:modePaie};
    setCommandes(p=>[...p,newCmd]);
    // Décrémenter le stock catalogue
    cart.forEach(cartItem=>{
      setCatalogue(p=>p.map(c=>c.id===cartItem.id?{...c,stock:Math.max(0,(c.stock||0)-cartItem.qty)}:c));
    });
    imprimerVente(newCmd,nomEtablissement);
    setCart([]);setNoteVente("");setRemise(0);
  };
  return(<div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20,height:"calc(100vh - 130px)"}}>
    <div style={{...g.card,display:"flex",flexDirection:"column",overflow:"hidden",padding:0}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,background:C.card}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text}}>🛍️ Articles</div>
          {scanFeedback&&<div style={{fontSize:12,padding:"4px 12px",borderRadius:20,background:scanFeedback.startsWith("✅")?C.green+"22":C.red+"22",color:scanFeedback.startsWith("✅")?C.green:C.red,fontWeight:600}}>{scanFeedback}</div>}
          <div style={{fontSize:12,color:C.muted,padding:"6px 12px",background:C.surface,borderRadius:8,border:`1px solid ${C.border}`}}>📷 Scanner actif</div>
        </div>
        <input style={{...g.input,marginBottom:10}} placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} style={{...g.btn(c===catFilter?"primary":""),padding:"5px 14px",fontSize:12,borderRadius:20}}>{c}</button>)}</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,alignContent:"start"}}>
        {filtered.map(item=>{const isImg=item.image?.startsWith("data:")||item.image?.startsWith("http");const inCart=cart.filter(i=>i.id===item.id).reduce((s,i)=>s+i.qty,0);return(
          <div key={item.id} onClick={()=>openVariant(item)} style={{background:inCart>0?C.accent+"22":C.card,border:`2px solid ${inCart>0?C.accent:C.border}`,borderRadius:14,padding:12,cursor:"pointer",textAlign:"center",transition:"all .15s",position:"relative",opacity:item.stock===0?0.5:1}}>
            {inCart>0&&<div style={{position:"absolute",top:6,right:6,background:C.accent,color:"#000",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800}}>{inCart}</div>}
            {item.stock===0&&<div style={{position:"absolute",top:6,left:6,background:C.red,color:"#fff",borderRadius:20,fontSize:9,fontWeight:700,padding:"2px 6px"}}>Rupture</div>}
            <div style={{fontSize:isImg?0:44,height:50,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}>{isImg?<img src={item.image} alt="" style={{width:50,height:50,borderRadius:10,objectFit:"cover"}}/>:item.image}</div>
            <div style={{fontSize:12,fontWeight:700,marginBottom:4,color:C.text}}>{item.name}</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{item.couleurs?.length} coul. · {item.tailles?.length} tailles</div>
            <div style={{fontSize:14,color:C.accent,fontWeight:800}}>{item.price.toLocaleString()} DA</div>
          </div>
        );})}
      </div>
    </div>
    <div style={{...g.card,display:"flex",flexDirection:"column",padding:0,overflow:"hidden"}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"space-between",color:C.text}}>
        <span>🛒 Panier</span>{cart.length>0&&<span style={g.badge(C.accent)}>{cart.reduce((s,i)=>s+i.qty,0)} art.</span>}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 14px"}}>
        {cart.length===0?<div style={{textAlign:"center",paddingTop:50,color:C.muted}}><div style={{fontSize:40}}>🛍️</div><div style={{fontSize:13,marginTop:10}}>Sélectionnez des articles</div></div>
          :cart.map(item=>(<div key={item.key} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div><div style={{fontSize:12,fontWeight:700,color:C.text}}>{item.name}</div><div style={{fontSize:11,color:C.muted}}>{item.couleur} / {item.taille} · {item.price.toLocaleString()} DA</div></div>
              <button style={{...g.btn("danger"),padding:"2px 7px",fontSize:11}} onClick={()=>removeItem(item.key)}>✕</button>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex"}}>
                <button onClick={()=>changeQty(item.key,-1)} style={{width:28,height:28,borderRadius:"8px 0 0 8px",border:"none",background:C.border,color:C.text,cursor:"pointer",fontWeight:700,fontSize:16}}>−</button>
                <div style={{width:34,height:28,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:C.text}}>{item.qty}</div>
                <button onClick={()=>changeQty(item.key,+1)} style={{width:28,height:28,borderRadius:"0 8px 8px 0",border:"none",background:C.accent,color:"#000",cursor:"pointer",fontWeight:700,fontSize:16}}>+</button>
              </div>
              <div style={{fontWeight:800,color:C.accent,fontSize:14}}>{(item.price*item.qty).toLocaleString()} DA</div>
            </div>
          </div>))}
      </div>
      <div style={{padding:"10px 14px",borderTop:`1px solid ${C.border}`,background:C.surface}}>
        <label style={{...g.label,marginBottom:4}}>💸 Remise</label>
        <div style={{display:"flex",gap:5,marginBottom:10}}>{[0,5,10,15,20].map(r=><button key={r} onClick={()=>setRemise(r)} style={{flex:1,padding:"4px 0",borderRadius:8,border:`2px solid ${remise===r?C.accent:C.border}`,background:remise===r?C.accentDim:C.surface,color:remise===r?C.accent:C.text,cursor:"pointer",fontSize:11,fontWeight:700}}>{r}%</button>)}</div>
        <label style={{...g.label,marginBottom:4}}>💳 Paiement</label>
        <div style={{display:"flex",gap:6,marginBottom:10}}>{["Cash","Carte","Virement"].map(m=><button key={m} onClick={()=>setModePaie(m)} style={{...g.btn(modePaie===m?"primary":""),flex:1,padding:"6px 0",fontSize:12}}>{m}</button>)}</div>
        <label style={{...g.label,marginBottom:4}}>📝 Note</label>
        <textarea style={{...g.input,height:42,resize:"none",fontSize:12,padding:"7px 10px",marginBottom:10}} placeholder="Note client..." value={noteVente} onChange={e=>setNoteVente(e.target.value)}/>
        {remise>0&&<div style={{fontSize:12,color:C.red,marginBottom:4,display:"flex",justifyContent:"space-between"}}><span>Remise ({remise}%)</span><span>-{montantRemise.toLocaleString()} DA</span></div>}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,fontSize:17,fontWeight:900,color:C.text}}><span>TOTAL</span><span style={{color:C.accent}}>{total.toLocaleString()} DA</span></div>
        <button style={{...g.btn("primary"),width:"100%",padding:12,fontSize:14,borderRadius:12,opacity:cart.length===0?0.4:1,cursor:cart.length===0?"not-allowed":"pointer"}} onClick={valider} disabled={cart.length===0}>🛍️ Encaisser & Ticket</button>
      </div>
    </div>
    {variantPicker&&<Modal title={`Variante — ${variantPicker.name}`} onClose={()=>setVariantPicker(null)}>
      <div style={{textAlign:"center",fontSize:50,marginBottom:16}}>{variantPicker.image?.startsWith("data:")||variantPicker.image?.startsWith("http")?<img src={variantPicker.image} alt="" style={{width:70,height:70,borderRadius:14,objectFit:"cover"}}/>:variantPicker.image}</div>
      <div style={{marginBottom:16}}><label style={g.label}>🎨 Couleur</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{variantPicker.couleurs?.map(c=><button key={c} onClick={()=>setPickedCouleur(c)} style={{padding:"8px 16px",borderRadius:20,border:`2px solid ${pickedCouleur===c?C.accent:C.border}`,background:pickedCouleur===c?C.accentDim:C.surface,color:pickedCouleur===c?C.accent:C.text,cursor:"pointer",fontSize:13,fontWeight:600}}>{c}</button>)}</div></div>
      <div style={{marginBottom:20}}><label style={g.label}>📐 Taille</label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{variantPicker.tailles?.map(t=><button key={t} onClick={()=>setPickedTaille(t)} style={{width:50,height:40,borderRadius:10,border:`2px solid ${pickedTaille===t?C.accent:C.border}`,background:pickedTaille===t?C.accentDim:C.surface,color:pickedTaille===t?C.accent:C.text,cursor:"pointer",fontSize:13,fontWeight:700}}>{t}</button>)}</div></div>
      <div style={{...g.card,background:C.surface,marginBottom:16,textAlign:"center"}}><div style={{fontSize:13,color:C.muted}}>Sélection</div><div style={{fontSize:16,fontWeight:700,marginTop:4,color:C.text}}>{variantPicker.name} · {pickedCouleur} / {pickedTaille}</div><div style={{fontSize:18,fontWeight:900,color:C.accent,marginTop:4}}>{variantPicker.price.toLocaleString()} DA</div></div>
      <div style={{display:"flex",gap:8}}><button style={{...g.btn("primary"),flex:1,padding:12}} onClick={addToCart}>✓ Ajouter</button><button style={{...g.btn(),flex:1}} onClick={()=>setVariantPicker(null)}>Annuler</button></div>
    </Modal>}
  </div>);
}

// ─── EMPLOYÉS ─────────────────────────────────────────────────────────────────
function Employes({employes,setEmployes,user}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const [showModal,    setShowModal]    = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [form,         setForm]         = useState({name:"",role:"",salaire:0,phone:"",status:"Présent",avances:[]});
  const [showAvance,   setShowAvance]   = useState(null);
  const [showHistorique,setShowHistorique]=useState(null);
  const [montantAvance,setMontantAvance]=useState("");
  const [noteAvance,   setNoteAvance]   = useState("");
  const [errAvance,    setErrAvance]    = useState("");

  const peutGererAvances = user?.role==="patron"||user?.role==="gerant";
  const totalAvances=(emp)=>(emp.avances||[]).reduce((s,a)=>s+a.montant,0);
  const salaireNet=(emp)=>emp.salaire-totalAvances(emp);
  const totalSalaires=employes.reduce((s,e)=>s+e.salaire,0);
  const totalToutesAvances=employes.reduce((s,e)=>s+totalAvances(e),0);

  const save=()=>{
    if(!form.name)return;
    const emp={...form,id:editing||Date.now(),avances:form.avances||[]};
    if(editing)setEmployes(p=>p.map(e=>e.id===editing?emp:e));
    else setEmployes(p=>[...p,emp]);
    setShowModal(false);
  };

  const ajouterAvance=()=>{
    const montant=parseFloat(montantAvance);
    if(!montant||montant<=0){setErrAvance("Montant invalide.");return;}
    if(montant>showAvance.salaire){setErrAvance("L'avance dépasse le salaire mensuel !");return;}
    const dejaAvance=totalAvances(showAvance);
    if(dejaAvance+montant>showAvance.salaire){setErrAvance(`Solde restant disponible : ${showAvance.salaire-dejaAvance} DA`);return;}
    const nouvelleAvance={id:Date.now(),montant,note:noteAvance.trim(),date:new Date().toLocaleString("fr-FR"),dateStamp:new Date().toISOString().split("T")[0],par:user?.nom||"Inconnu"};
    setEmployes(p=>p.map(e=>e.id===showAvance.id?{...e,avances:[...(e.avances||[]),nouvelleAvance]}:e));
    setShowAvance(null);setMontantAvance("");setNoteAvance("");setErrAvance("");
  };

  const supprimerAvance=(empId,avanceId)=>{
    if(!window.confirm("Supprimer cette avance ?"))return;
    setEmployes(p=>p.map(e=>e.id===empId?{...e,avances:(e.avances||[]).filter(a=>a.id!==avanceId)}:e));
  };

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
      <div>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:10}}>Employés ({employes.length})</div>
        <div style={{display:"flex",gap:20,fontSize:13}}>
          <span style={{color:C.muted}}>Masse salariale : <strong style={{color:C.accent}}>{totalSalaires.toLocaleString()} DA</strong></span>
          <span style={{color:C.muted}}>Total avances : <strong style={{color:C.red}}>{totalToutesAvances.toLocaleString()} DA</strong></span>
          <span style={{color:C.muted}}>Net à payer : <strong style={{color:C.green}}>{(totalSalaires-totalToutesAvances).toLocaleString()} DA</strong></span>
        </div>
      </div>
      <button style={g.btn("primary")} onClick={()=>{setForm({name:"",role:"",salaire:0,phone:"",status:"Présent",avances:[]});setEditing(null);setShowModal(true);}}>+ Nouvel employé</button>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
      {employes.map(e=>{
        const totalAv=totalAvances(e);
        const net=salaireNet(e);
        const pourcent=e.salaire>0?Math.round((totalAv/e.salaire)*100):0;
        return(
          <div key={e.id} style={{...g.card,padding:0,overflow:"hidden"}}>
            <div style={{padding:"16px 16px 12px",background:`linear-gradient(135deg,${C.surface},${C.bg})`}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <div style={{width:46,height:46,borderRadius:"50%",background:C.accent+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,border:`2px solid ${C.accent}`,color:C.accent,fontWeight:800,flexShrink:0}}>{e.name[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.name}</div>
                  <div style={{fontSize:12,color:C.muted}}>{e.role}</div>
                </div>
                <div style={{cursor:"pointer",flexShrink:0}} onClick={()=>setEmployes(p=>p.map(x=>x.id===e.id?{...x,status:x.status==="Présent"?"Absent":"Présent"}:x))}>
                  <span style={g.badge(e.status==="Présent"?C.green:C.red)}>{e.status}</span>
                </div>
              </div>
              {e.phone&&<div style={{fontSize:11,color:C.muted,marginBottom:10}}>📞 {e.phone}</div>}
              <div style={{background:C.card,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12}}>
                  <span style={{color:C.muted}}>💼 Salaire brut</span>
                  <span style={{fontWeight:700,color:C.text}}>{e.salaire.toLocaleString()} DA</span>
                </div>
                {totalAv>0&&(<>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12}}>
                    <span style={{color:C.red}}>📉 Avances données</span>
                    <span style={{fontWeight:700,color:C.red}}>−{totalAv.toLocaleString()} DA</span>
                  </div>
                  <div style={{background:C.border,borderRadius:4,height:5,marginBottom:6,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(pourcent,100)}%`,background:pourcent>=80?C.red:pourcent>=50?C.accent:C.green,borderRadius:4,height:"100%",transition:"width .4s"}}/>
                  </div>
                  <div style={{fontSize:10,color:C.muted,textAlign:"right",marginBottom:4}}>{pourcent}% du salaire avancé</div>
                  <div style={{width:"100%",height:1,background:C.border,margin:"4px 0 6px"}}/>
                </>)}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                  <span style={{color:C.muted,fontWeight:600}}>💰 Net à verser</span>
                  <span style={{fontWeight:800,color:net>=0?C.green:C.red}}>{net.toLocaleString()} DA</span>
                </div>
              </div>
              {(e.avances||[]).length>0&&(
                <button onClick={()=>setShowHistorique(e)} style={{background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:0,marginBottom:6}}>
                  <span style={g.badge(C.accent)}>📋 {(e.avances||[]).length} avance{(e.avances||[]).length>1?"s":""}</span>
                  <span style={{fontSize:11,color:C.muted}}>→ voir historique</span>
                </button>
              )}
            </div>
            <div style={{display:"flex",gap:0,borderTop:`1px solid ${C.border}`}}>
              {peutGererAvances&&(
                <button style={{flex:1,padding:"10px 0",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:"transparent",color:C.accent,borderRight:`1px solid ${C.border}`}}
                  onClick={()=>{setShowAvance(e);setMontantAvance("");setNoteAvance("");setErrAvance("");}}>💵 Avance</button>
              )}
              <button style={{flex:1,padding:"10px 0",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:"transparent",color:C.text,borderRight:`1px solid ${C.border}`}}
                onClick={()=>{setForm({...e,avances:e.avances||[]});setEditing(e.id);setShowModal(true);}}>✏️ Modifier</button>
              <button style={{flex:1,padding:"10px 0",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:"transparent",color:C.red}}
                onClick={()=>{if(window.confirm("Retirer cet employé ?"))setEmployes(p=>p.filter(x=>x.id!==e.id));}}>🗑 Retirer</button>
            </div>
          </div>
        );
      })}
    </div>

    {showModal&&<Modal title={editing?"Modifier l'employé":"Nouvel employé"} onClose={()=>setShowModal(false)}>
      {[["name","Nom complet","text"],["role","Poste / Rôle","text"],["salaire","Salaire mensuel (DA)","number"],["phone","Téléphone","text"]].map(([k,l,t])=>(
        <div key={k} style={{marginBottom:14}}><label style={g.label}>{l}</label><input style={g.input} type={t} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:t==="number"?parseFloat(e.target.value)||0:e.target.value}))}/></div>
      ))}
      <div style={{marginBottom:16}}><label style={g.label}>Statut</label><select style={g.input} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option>Présent</option><option>Absent</option></select></div>
      <div style={{display:"flex",gap:8}}><button style={{...g.btn("primary"),flex:1,padding:12}} onClick={save}>Enregistrer</button><button style={{...g.btn(),flex:1}} onClick={()=>setShowModal(false)}>Annuler</button></div>
    </Modal>}

    {showAvance&&<Modal title={`💵 Avance sur salaire — ${showAvance.name}`} onClose={()=>{setShowAvance(null);setMontantAvance("");setNoteAvance("");setErrAvance("");}}>
      <div style={{background:C.surface,borderRadius:12,padding:14,marginBottom:20}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,textAlign:"center"}}>
          <div style={{padding:"10px 8px",background:C.card,borderRadius:8}}>
            <div style={{fontSize:18,fontWeight:800,color:C.text}}>{showAvance.salaire.toLocaleString()}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>💼 Salaire brut</div>
          </div>
          <div style={{padding:"10px 8px",background:C.card,borderRadius:8}}>
            <div style={{fontSize:18,fontWeight:800,color:totalAvances(showAvance)>0?C.red:C.muted}}>{totalAvances(showAvance).toLocaleString()}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>📉 Déjà avancé</div>
          </div>
          <div style={{padding:"10px 8px",background:C.card,borderRadius:8}}>
            <div style={{fontSize:18,fontWeight:800,color:C.green}}>{salaireNet(showAvance).toLocaleString()}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>💰 Disponible</div>
          </div>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <label style={g.label}>Montant de l'avance (DA)</label>
        <input style={{...g.input,fontSize:20,fontWeight:700,textAlign:"center",borderColor:errAvance?C.red:C.border}} type="number" min="0" max={salaireNet(showAvance)} value={montantAvance} onChange={e=>{setMontantAvance(e.target.value);setErrAvance("");}} placeholder="Ex : 5000" autoFocus/>
        <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
          {[1000,2000,5000,10000,Math.round(showAvance.salaire*0.25),Math.round(showAvance.salaire*0.5)].filter((v,i,a)=>a.indexOf(v)===i&&v>0&&v<=showAvance.salaire).map(v=>(
            <button key={v} onClick={()=>{setMontantAvance(String(v));setErrAvance("");}} style={{...g.btn(),padding:"5px 12px",fontSize:12,borderRadius:20,border:`1px solid ${String(montantAvance)===String(v)?C.accent:C.border}`,background:String(montantAvance)===String(v)?C.accentDim:C.surface,color:String(montantAvance)===String(v)?C.accent:C.text}}>{v.toLocaleString()} DA</button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <label style={g.label}>Note / Motif (optionnel)</label>
        <input style={g.input} value={noteAvance} onChange={e=>setNoteAvance(e.target.value)} placeholder="Ex : urgence familiale, acompte semaine..."/>
      </div>
      {errAvance&&<div style={{background:C.red+"18",border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",fontSize:13,color:C.red,marginBottom:14,fontWeight:600}}>⚠️ {errAvance}</div>}
      {montantAvance&&parseFloat(montantAvance)>0&&!errAvance&&(
        <div style={{background:C.accent+"15",border:`1px solid ${C.accent}44`,borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:13}}>
          <div style={{fontWeight:700,color:C.accent,marginBottom:6}}>📋 Récapitulatif</div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,color:C.text}}><span>Avance accordée :</span><span style={{fontWeight:700,color:C.accent}}>+{parseFloat(montantAvance).toLocaleString()} DA</span></div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,color:C.text}}><span>Total avances après :</span><span style={{fontWeight:700,color:C.red}}>{(totalAvances(showAvance)+parseFloat(montantAvance)).toLocaleString()} DA</span></div>
          <div style={{display:"flex",justifyContent:"space-between",color:C.text,paddingTop:6,borderTop:`1px dashed ${C.border}`}}><span>Net à verser fin de mois :</span><span style={{fontWeight:800,color:C.green}}>{(salaireNet(showAvance)-parseFloat(montantAvance)).toLocaleString()} DA</span></div>
        </div>
      )}
      <div style={{display:"flex",gap:10}}>
        <button style={{...g.btn("primary"),flex:1,padding:13,fontSize:14,opacity:!montantAvance||parseFloat(montantAvance)<=0?0.5:1}} onClick={ajouterAvance} disabled={!montantAvance||parseFloat(montantAvance)<=0}>✅ Confirmer l'avance</button>
        <button style={{...g.btn(),flex:1}} onClick={()=>{setShowAvance(null);setMontantAvance("");setNoteAvance("");setErrAvance("");}}>Annuler</button>
      </div>
    </Modal>}

    {showHistorique&&<Modal title={`📋 Historique avances — ${showHistorique.name}`} onClose={()=>setShowHistorique(null)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
        {[["💼 Salaire brut",showHistorique.salaire,C.text],["📉 Total avances",totalAvances(showHistorique),C.red],["💰 Net à verser",salaireNet(showHistorique),C.green]].map(([l,v,c])=>(
          <div key={l} style={{textAlign:"center",padding:"12px 8px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:18,fontWeight:800,color:c}}>{v.toLocaleString()} DA</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>
      {totalAvances(showHistorique)>0&&(
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:6}}>
            <span>Avances / Salaire brut</span>
            <span style={{fontWeight:700,color:C.accent}}>{Math.round((totalAvances(showHistorique)/showHistorique.salaire)*100)}%</span>
          </div>
          <div style={{background:C.border,borderRadius:6,height:8,overflow:"hidden"}}>
            <div style={{width:`${Math.min((totalAvances(showHistorique)/showHistorique.salaire)*100,100)}%`,background:C.red,borderRadius:6,height:"100%"}}/>
          </div>
        </div>
      )}
      {(showHistorique.avances||[]).length===0?(
        <div style={{textAlign:"center",padding:"30px 0",color:C.muted,fontSize:13}}><div style={{fontSize:32,marginBottom:10}}>📭</div>Aucune avance enregistrée.</div>
      ):(
        <div>
          {[...(showHistorique.avances||[])].reverse().map((av)=>(
            <div key={av.id} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:700,color:C.red}}>−{av.montant.toLocaleString()} DA</span>
                  {av.note&&<span style={{fontSize:11,background:"#fffbeb",color:"#92400e",padding:"2px 8px",borderRadius:6}}>📝 {av.note}</span>}
                </div>
                <div style={{fontSize:11,color:C.muted}}>📅 {av.date}{av.par&&<span style={{marginLeft:10}}>👤 Par : <strong style={{color:C.text}}>{av.par}</strong></span>}</div>
              </div>
              {peutGererAvances&&(
                <button style={{...g.btn("danger"),padding:"4px 10px",fontSize:11,marginLeft:12}} onClick={()=>{supprimerAvance(showHistorique.id,av.id);setShowHistorique(p=>({...p,avances:(p.avances||[]).filter(a=>a.id!==av.id)}));}}>🗑</button>
              )}
            </div>
          ))}
        </div>
      )}
      {peutGererAvances&&(
        <button style={{...g.btn("primary"),width:"100%",marginTop:16,padding:11}} onClick={()=>{setShowHistorique(null);setShowAvance(employes.find(e=>e.id===showHistorique.id));setMontantAvance("");setNoteAvance("");setErrAvance("");}}>💵 Ajouter une nouvelle avance</button>
      )}
    </Modal>}
  </div>);
}

// ─── ACHATS ───────────────────────────────────────────────────────────────────
function Achats({achats,setAchats,catalogue,setCatalogue}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const [showModal,setShowModal]=useState(false);
  const [form,setForm]=useState({fournisseur:"",produit:"",qte:1,montant:0,date:"",statut:"En attente",catalogueProduitId:""});
  const save=()=>{
    if(!form.fournisseur)return;
    const ref="ACH-"+String(achats.length+1).padStart(3,"0");
    setAchats(p=>[...p,{...form,id:Date.now(),ref,catalogueProduitId:form.catalogueProduitId||null}]);
    if(form.statut==="Livré"){
      if(form.catalogueProduitId)setCatalogue(p=>p.map(c=>c.id===parseInt(form.catalogueProduitId)?{...c,stock:(c.stock||0)+parseInt(form.qte||0)}:c));
    }
    setShowModal(false);
  };
  const livrer=(a)=>{
    setAchats(p=>p.map(x=>x.id===a.id?{...x,statut:"Livré"}:x));
    if(a.catalogueProduitId)setCatalogue(p=>p.map(c=>c.id===parseInt(a.catalogueProduitId)?{...c,stock:(c.stock||0)+parseInt(a.qte||0)}:c));
  };
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
      <div><div style={{fontSize:15,fontWeight:700,color:C.text}}>Achats & Fournisseurs</div><div style={{fontSize:13,color:C.muted,marginTop:4}}>Total : <span style={{color:C.accent,fontWeight:700}}>{achats.reduce((s,a)=>s+a.montant,0).toLocaleString()} DA</span></div></div>
      <button style={g.btn("primary")} onClick={()=>{setForm({fournisseur:"",produit:"",qte:1,montant:0,date:new Date().toLocaleDateString("fr-FR"),statut:"En attente",catalogueProduitId:""});setShowModal(true);}}>+ Nouvel achat</button>
    </div>
    <div style={{...g.card,marginBottom:14,background:C.surface,padding:12,fontSize:12,color:C.muted,borderLeft:`3px solid ${C.accent}`}}>💡 <strong style={{color:C.accent}}>Auto-sync :</strong> Liez un achat → stock catalogue mis à jour automatiquement à la livraison.</div>
    <div style={g.card}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>{["Réf","Fournisseur","Produit","Qté","Montant","Date","Statut","Action"].map(h=><th key={h} style={g.th}>{h}</th>)}</tr></thead>
        <tbody>{achats.map(a=>(<tr key={a.id}>
          <td style={{...g.td,color:C.accent,fontWeight:700}}>{a.ref}</td>
          <td style={{...g.td,color:C.text}}>{a.fournisseur}</td>
          <td style={{...g.td,color:C.text}}>{a.produit}
            
            {a.catalogueProduitId&&<div style={{fontSize:11,color:C.blue}}>→ Catalogue: {catalogue.find(c=>c.id===parseInt(a.catalogueProduitId))?.name||"?"}</div>}
          </td>
          <td style={{...g.td,color:C.text}}>{a.qte}</td>
          <td style={{...g.td,fontWeight:700,color:C.text}}>{a.montant.toLocaleString()} DA</td>
          <td style={{...g.td,color:C.muted}}>{a.date}</td>
          <td style={g.td}><span style={g.badge(a.statut==="Livré"?C.green:a.statut==="Annulé"?C.red:C.accent)}>{a.statut}</span></td>
          <td style={g.td}>{a.statut==="En attente"&&<button style={{...g.btn("green"),padding:"4px 10px",fontSize:11}} onClick={()=>livrer(a)}>✅ Livré</button>}</td>
        </tr>))}</tbody>
      </table>
    </div>
    {showModal&&<Modal title="Nouvel achat" onClose={()=>setShowModal(false)}>
      {[["fournisseur","Fournisseur","text"],["produit","Produits achetés","text"],["qte","Quantité","number"],["montant","Montant (DA)","number"],["date","Date","text"]].map(([k,l,t])=>(
        <div key={k} style={{marginBottom:14}}><label style={g.label}>{l}</label><input style={g.input} type={t} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:t==="number"?parseFloat(e.target.value)||0:e.target.value}))}/></div>
      ))}
      <div style={{marginBottom:14}}><label style={g.label}>👕 Lier au catalogue boutique</label><select style={g.input} value={form.catalogueProduitId} onChange={e=>setForm(p=>({...p,catalogueProduitId:e.target.value}))}><option value="">-- Aucun --</option>{catalogue.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div style={{marginBottom:16}}><label style={g.label}>Statut</label><select style={g.input} value={form.statut} onChange={e=>setForm(p=>({...p,statut:e.target.value}))}><option>En attente</option><option>Livré</option><option>Annulé</option></select></div>
      <div style={{display:"flex",gap:8}}><button style={{...g.btn("primary"),flex:1}} onClick={save}>Enregistrer</button><button style={{...g.btn(),flex:1}} onClick={()=>setShowModal(false)}>Annuler</button></div>
    </Modal>}
  </div>);
}

// ─── CAISSE ───────────────────────────────────────────────────────────────────
function Caisse({commandes,setCommandes,nomEtablissement}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const [calcCmd,setCalcCmd]=useState(null);
  const [montantRecu,setMontantRecu]=useState("");
  const recu=parseFloat(montantRecu)||0;
  const monnaie=calcCmd?recu-calcCmd.total:0;

  const payees=commandes.filter(c=>c.statut==="Payé");
  const enCours=commandes.filter(c=>c.statut==="En cours");
  const emporterActives=commandes.filter(c=>c.table==="Emporter"&&c.statut!=="Payé");

  const ouvrirCalculatrice=(cmd)=>{setCalcCmd(cmd);setMontantRecu(String(cmd.total));};
  const confirmerPaiement=()=>{
    if(!calcCmd) return;
    setCommandes(p=>p.map(x=>x.id===calcCmd.id?{...x,statut:"Payé",statutEmporter:x.table==="Emporter"?"Récupéré":x.statutEmporter}:x));
    imprimerAddition({...calcCmd,statut:"Payé"},nomEtablissement);
    setCalcCmd(null);setMontantRecu("");
  };

  const getTableLabel=(c)=>{
    if(c.table==="Emporter") return `🥡 Emporter ${c.numEmporter||""}`;
    if(c.table==="Comptoir") return "🛍️ Comptoir";
    return `🪑 Table ${c.table}`;
  };

  return(<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
      <StatCard label="Total encaissé" value={payees.reduce((s,c)=>s+c.total,0).toLocaleString()+" DA"} delta={`${payees.length} commandes`} pos={true} color={C.green}/>
      <StatCard label="Tables en cours" value={enCours.length} delta="À encaisser" pos={true} color={C.accent}/>
      <StatCard label="À Emporter actives" value={emporterActives.length} delta="En préparation/prêtes" pos={true} color="#ea580c"/>
      <StatCard label="Total commandes" value={commandes.length} delta="Depuis ouverture" pos={true} color={C.blue}/>
    </div>

    {/* Commandes À Emporter en cours */}
    {emporterActives.length>0&&(
      <div style={{...g.card,marginBottom:20,borderLeft:"3px solid #ea580c"}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:14,color:"#ea580c",display:"flex",alignItems:"center",gap:8}}>
          🥡 Commandes À Emporter en cours
          <span style={{background:"#ea580c22",color:"#ea580c",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{emporterActives.length}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {emporterActives.map(c=>{
            const STATUT_COLORS={"En attente":C.accent,"En préparation":C.blue,"Prêt":C.green};
            const sc=STATUT_COLORS[c.statutEmporter||"En attente"]||C.accent;
            return(
              <div key={c.id} style={{background:C.surface,border:`2px solid ${sc}`,borderRadius:12,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:15,fontWeight:800,color:sc}}>N° {c.numEmporter}</div>
                  <span style={{...g.badge(sc),fontSize:11}}>{c.statutEmporter||"En attente"}</span>
                </div>
                {c.clientNom&&<div style={{fontSize:12,color:C.text,marginBottom:4}}>👤 {c.clientNom}{c.clientTel&&` · 📞 ${c.clientTel}`}</div>}
                <div style={{fontSize:12,color:C.muted,marginBottom:10}}>{c.items?.slice(0,2).map(i=>`${i.qty}×${i.name}`).join(", ")}{c.items?.length>2?` +${c.items.length-2}`:""}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:800,color:C.accent,fontSize:14}}>{c.total.toLocaleString()} DA</span>
                  <button style={{background:"#ea580c",color:"#fff",padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700}} onClick={()=>ouvrirCalculatrice(c)}>🧮 Encaisser</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    <div style={g.card}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:16,color:C.text}}>📋 Toutes les commandes</div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>{["#","Table/Lieu","Articles","Note","Total","Statut","Actions"].map(h=><th key={h} style={g.th}>{h}</th>)}</tr></thead>
        <tbody>
          {commandes.length===0?<tr><td colSpan={7} style={{...g.td,textAlign:"center",color:C.muted,padding:30}}>Aucune commande</td></tr>
            :[...commandes].reverse().map(c=>(
              <tr key={c.id}>
                <td style={{...g.td,color:C.accent,fontWeight:700}}>#{String(c.id).slice(-4)}</td>
                <td style={{...g.td,color:C.text}}>{getTableLabel(c)}</td>
                <td style={{...g.td,color:C.muted,fontSize:11,maxWidth:160}}>{c.items?.slice(0,2).map(i=>`${i.qty}×${i.name}`).join(", ")}{c.items?.length>2?` +${c.items.length-2}`:""}</td>
                <td style={g.td}>{c.note?<span style={{fontSize:11,background:"#fffbeb",color:"#92400e",padding:"2px 8px",borderRadius:6}}>📝 {c.note.slice(0,16)}{c.note.length>16?"...":""}</span>:<span style={{color:C.muted}}>—</span>}</td>
                <td style={{...g.td,fontWeight:700,color:C.accent}}>{c.total.toLocaleString()} DA</td>
                <td style={g.td}><span style={g.badge(c.statut==="Payé"?C.green:C.accent)}>{c.statut}</span></td>
                <td style={g.td}>
                  <div style={{display:"flex",gap:5}}>
                    {c.statut==="En cours"&&<button style={{...g.btn("green"),padding:"4px 9px",fontSize:11}} onClick={()=>ouvrirCalculatrice(c)}>🧮 Encaisser</button>}
                    {c.table==="Emporter"&&c.statut!=="Payé"&&<button style={{background:"#ea580c",color:"#fff",padding:"4px 9px",fontSize:11,borderRadius:6,border:"none",cursor:"pointer",fontWeight:600}} onClick={()=>ouvrirCalculatrice(c)}>🥡 Encaisser</button>}
                    <button style={{...g.btn("blue"),padding:"4px 8px",fontSize:11}} onClick={()=>c.table==="Comptoir"?imprimerVente(c,nomEtablissement):c.table==="Emporter"?ouvrirTicket(c,"emporter_client",nomEtablissement):ouvrirTicket(c,"table",nomEtablissement)}>🪑</button>
                    <button style={{...g.btn("green"),padding:"4px 8px",fontSize:11}} onClick={()=>imprimerAddition(c,nomEtablissement)}>💳</button>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>

    {calcCmd&&<Modal title="🧮 Calculatrice — Rendu monnaie" onClose={()=>{setCalcCmd(null);setMontantRecu("");}}>
      <div style={{textAlign:"center",padding:"10px 0 20px"}}>
        <div style={{fontSize:13,color:C.muted,marginBottom:4}}>
          Commande #{String(calcCmd.id).slice(-4)} — {getTableLabel(calcCmd)}
          {calcCmd.clientNom&&<span style={{color:C.accent}}> · {calcCmd.clientNom}</span>}
        </div>
        <div style={{fontSize:28,fontWeight:900,color:C.accent,marginBottom:20}}>{calcCmd.total.toLocaleString()} DA à payer</div>
        <label style={g.label}>Montant reçu du client (DA)</label>
        <input style={{...g.input,fontSize:24,fontWeight:700,textAlign:"center",marginBottom:16}} type="number" value={montantRecu} onChange={e=>setMontantRecu(e.target.value)} autoFocus/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
          {[500,1000,2000,5000].map(v=>(
            <button key={v} onClick={()=>setMontantRecu(String(Math.ceil(calcCmd.total/v)*v))} style={{...g.btn(),padding:"10px 0",fontSize:14,fontWeight:700}}>{v>=1000?v/1000+"k":v}</button>
          ))}
        </div>
        <button style={{...g.btn(),padding:"8px 0",width:"100%",marginBottom:20,fontSize:13}} onClick={()=>setMontantRecu(String(calcCmd.total))}>Montant exact : {calcCmd.total.toLocaleString()} DA</button>
        <div style={{padding:20,borderRadius:16,background:monnaie>=0?C.green+"18":C.red+"18",border:`2px solid ${monnaie>=0?C.green:C.red}`,marginBottom:20}}>
          <div style={{fontSize:14,color:C.muted,marginBottom:4}}>Monnaie à rendre</div>
          <div style={{fontSize:36,fontWeight:900,color:monnaie>=0?C.green:C.red}}>{monnaie>=0?monnaie.toLocaleString():"Insuffisant"} {monnaie>=0?"DA":""}</div>
          {monnaie<0&&<div style={{fontSize:13,color:C.red,marginTop:4}}>Il manque {Math.abs(monnaie).toLocaleString()} DA</div>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{...g.btn("primary"),flex:1,padding:12,fontSize:14,opacity:monnaie<0?0.4:1,cursor:monnaie<0?"not-allowed":"pointer"}} onClick={confirmerPaiement} disabled={monnaie<0}>✅ Confirmer & Imprimer addition</button>
          <button style={{...g.btn(),flex:1}} onClick={()=>{setCalcCmd(null);setMontantRecu("");}}>Annuler</button>
        </div>
      </div>
    </Modal>}
  </div>);
}

function Historique({commandes,nomEtablissement}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const [search,setSearch]=useState("");const [filtre,setFiltre]=useState("Tous");
  const [filtreType,setFiltreType]=useState("Tous"); // "Tous" | "Table" | "Emporter" | "Comptoir"
  const [dateD,setDateD]=useState("");const [dateF,setDateF]=useState("");
  const [detail,setDetail]=useState(null);

  const filtered=commandes.filter(c=>{
    if(filtre!=="Tous"&&c.statut!==filtre) return false;
    if(filtreType==="Emporter"&&c.table!=="Emporter") return false;
    if(filtreType==="Table"&&(c.table==="Emporter"||c.table==="Comptoir")) return false;
    if(filtreType==="Comptoir"&&c.table!=="Comptoir") return false;
    if(dateD&&c.dateStamp&&c.dateStamp<dateD) return false;
    if(dateF&&c.dateStamp&&c.dateStamp>dateF) return false;
    if(search){const s=search.toLowerCase();if(!String(c.table).includes(s)&&!String(c.id).includes(s)&&!(c.numEmporter||"").toLowerCase().includes(s)&&!(c.clientNom||"").toLowerCase().includes(s)&&!c.items?.some(i=>i.name.toLowerCase().includes(s))&&!c.note?.toLowerCase().includes(s)&&!c.serveur?.toLowerCase().includes(s)) return false;}
    return true;
  }).sort((a,b)=>b.id-a.id);

  const totalFiltre=filtered.filter(c=>c.statut==="Payé").reduce((s,c)=>s+c.total,0);
  const getTableLabel=(c)=>{
    if(c.table==="Emporter") return `🥡 EM ${c.numEmporter||""}`;
    if(c.table==="Comptoir") return "🛍️ Comptoir";
    return `🪑 T${c.table}`;
  };

  return(<div>
    <div style={{...g.card,marginBottom:20}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",gap:10,alignItems:"center",marginBottom:12}}>
        <input style={g.input} placeholder="🔍 Rechercher (table, article, client, note, N° emporter...)" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select style={{...g.input,width:"auto"}} value={filtre} onChange={e=>setFiltre(e.target.value)}>{["Tous","En cours","Payé"].map(v=><option key={v}>{v}</option>)}</select>
        <select style={{...g.input,width:"auto"}} value={filtreType} onChange={e=>setFiltreType(e.target.value)}>{["Tous","Table","Emporter","Comptoir"].map(v=><option key={v}>{v}</option>)}</select>
        {search&&<button style={{...g.btn("danger"),padding:"9px 14px"}} onClick={()=>setSearch("")}>✕</button>}
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:C.muted,fontWeight:600}}>📅 Filtrer par date :</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{...g.label,marginBottom:0,whiteSpace:"nowrap"}}>Du</label>
          <input style={{...g.input,width:"auto",padding:"6px 10px",fontSize:12}} type="date" value={dateD} onChange={e=>setDateD(e.target.value)}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <label style={{...g.label,marginBottom:0,whiteSpace:"nowrap"}}>Au</label>
          <input style={{...g.input,width:"auto",padding:"6px 10px",fontSize:12}} type="date" value={dateF} onChange={e=>setDateF(e.target.value)}/>
        </div>
        {(dateD||dateF)&&<button style={{...g.btn(),padding:"6px 12px",fontSize:12}} onClick={()=>{setDateD("");setDateF("");}}>✕ Effacer dates</button>}
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:20}}>
      <StatCard label="Résultats" value={filtered.length} delta={`sur ${commandes.length} total`} pos={true} color={C.blue}/>
      <StatCard label="Payées" value={filtered.filter(c=>c.statut==="Payé").length} delta="encaissées" pos={true} color={C.green}/>
      <StatCard label="À Emporter" value={commandes.filter(c=>c.table==="Emporter").length} delta="total emporter" pos={true} color="#ea580c"/>
      <StatCard label="Total filtré" value={totalFiltre.toLocaleString()+" DA"} delta="payées" pos={true} color={C.purple}/>
    </div>

    <div style={g.card}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>{["#","Lieu","Client","Articles","Note","Total","Date","Statut","Actions"].map(h=><th key={h} style={g.th}>{h}</th>)}</tr></thead>
        <tbody>
          {filtered.length===0
            ?<tr><td colSpan={9} style={{...g.td,textAlign:"center",color:C.muted,padding:40}}><div style={{fontSize:32,marginBottom:10}}>🔍</div><div>Aucune commande trouvée</div></td></tr>
            :filtered.map(c=>(
              <tr key={c.id} style={{cursor:"pointer"}} onClick={()=>setDetail(c)}>
                <td style={{...g.td,color:C.accent,fontWeight:700}}>#{String(c.id).slice(-4)}</td>
                <td style={{...g.td,color:C.text,fontWeight:600}}>{getTableLabel(c)}</td>
                <td style={{...g.td,fontSize:12,color:C.muted}}>{c.clientNom||c.serveur||"—"}</td>
                <td style={{...g.td,fontSize:11,color:C.muted,maxWidth:150}}>{c.items?.slice(0,2).map(i=>`${i.qty}×${i.name}`).join(", ")}{c.items?.length>2?` +${c.items.length-2}`:""}</td>
                <td style={g.td}>{c.note?<span style={{fontSize:11,background:"#fffbeb",color:"#92400e",padding:"2px 8px",borderRadius:6}}>📝 {c.note.slice(0,14)}{c.note.length>14?"...":""}</span>:<span style={{color:C.muted}}>—</span>}</td>
                <td style={{...g.td,fontWeight:700,color:C.accent,whiteSpace:"nowrap"}}>{c.total.toLocaleString()} DA</td>
                <td style={{...g.td,fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{c.dateStamp||c.date?.split(" ")[0]||"—"}</td>
                <td style={g.td}><span style={g.badge(c.statut==="Payé"?C.green:C.accent)}>{c.statut}</span></td>
                <td style={g.td} onClick={e=>e.stopPropagation()}>
                  <div style={{display:"flex",gap:5}}>
                    <button style={{...g.btn("blue"),padding:"4px 8px",fontSize:11}} onClick={()=>c.table==="Emporter"?ouvrirTicket(c,"emporter_client",nomEtablissement):c.table==="Comptoir"?imprimerVente(c,nomEtablissement):ouvrirTicket(c,"table",nomEtablissement)}>🧾</button>
                    {c.table==="Emporter"&&<button style={{...g.btn("danger"),padding:"4px 8px",fontSize:11}} onClick={()=>ouvrirTicket(c,"emporter_cuisine",nomEtablissement)}>👨‍🍳</button>}
                    <button style={{...g.btn("green"),padding:"4px 8px",fontSize:11}} onClick={()=>imprimerAddition(c,nomEtablissement)}>💳</button>
                  </div>
                </td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>

    {detail&&<Modal title={`Détail #${String(detail.id).slice(-4)}`} onClose={()=>setDetail(null)}>
      <div style={{marginBottom:14,padding:12,background:C.surface,borderRadius:10}}>
        {detail.table==="Emporter"&&<div style={{background:"#ea580c22",border:"1px solid #ea580c",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:13,fontWeight:700,color:"#ea580c",textAlign:"center"}}>🥡 COMMANDE À EMPORTER — N° {detail.numEmporter}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:13}}>
          <div style={{color:C.text}}><span style={{color:C.muted}}>Lieu :</span> {getTableLabel(detail)}</div>
          <div style={{color:C.text}}><span style={{color:C.muted}}>Date :</span> {detail.date}</div>
          {detail.clientNom&&<div style={{color:C.text}}><span style={{color:C.muted}}>Client :</span> {detail.clientNom}</div>}
          {detail.clientTel&&<div style={{color:C.text}}><span style={{color:C.muted}}>Tél :</span> {detail.clientTel}</div>}
          <div style={{color:C.text}}><span style={{color:C.muted}}>Serveur :</span> {detail.serveur||"—"}</div>
          <div><span style={{color:C.muted}}>Statut :</span> <span style={g.badge(detail.statut==="Payé"?C.green:C.accent)}>{detail.statut}</span></div>
          {detail.modePaiement&&<div style={{color:C.text}}><span style={{color:C.muted}}>Paiement :</span> {detail.modePaiement}</div>}
        </div>
        {detail.note&&<div style={{marginTop:10,background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#92400e"}}>📝 {detail.note}</div>}
      </div>
      {detail.items?.map((item,i)=>{const isImg=item.image?.startsWith("data:")||item.image?.startsWith("http");return(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",background:C.surface,borderRadius:6,fontSize:isImg?0:18}}>{isImg?<img src={item.image} alt="" style={{width:30,height:30,borderRadius:6,objectFit:"cover"}}/>:item.image}</div>
            <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{item.name}</div><div style={{fontSize:11,color:C.muted}}>{item.price} DA × {item.qty}</div></div>
          </div>
          <div style={{fontWeight:700,color:C.accent}}>{item.price*item.qty} DA</div>
        </div>
      );})}
      <div style={{display:"flex",justifyContent:"space-between",padding:"14px 0 0",fontWeight:900,fontSize:16,color:C.text}}><span>TOTAL</span><span style={{color:C.accent}}>{detail.total.toLocaleString()} DA</span></div>
      <div style={{display:"flex",gap:8,marginTop:16}}>
        {detail.table==="Emporter"?(
          <>
            <button style={{...g.btn("blue"),flex:1}} onClick={()=>ouvrirTicket(detail,"emporter_client",nomEtablissement)}>🥡 Bon client</button>
            <button style={{...g.btn("danger"),flex:1}} onClick={()=>ouvrirTicket(detail,"emporter_cuisine",nomEtablissement)}>👨‍🍳 Cuisine</button>
          </>
        ):(
          <>
            <button style={{...g.btn("blue"),flex:1}} onClick={()=>detail.table==="Comptoir"?imprimerVente(detail,nomEtablissement):ouvrirTicket(detail,"table",nomEtablissement)}>🧾 Ticket</button>
            <button style={{...g.btn("danger"),flex:1}} onClick={()=>ouvrirTicket(detail,"cuisine",nomEtablissement)}>👨‍🍳 Cuisine</button>
          </>
        )}
        <button style={{...g.btn("green"),flex:1}} onClick={()=>imprimerAddition(detail,nomEtablissement)}>💳 Addition</button>
      </div>
    </Modal>}
  </div>);
}

function Rapports({commandes,employes,menu,catalogue}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const payees=commandes.filter(c=>c.statut==="Payé");
  const totalCA=payees.reduce((s,c)=>s+c.total,0);
  const totalSalaires=employes.reduce((s,e)=>s+e.salaire,0);
  const benefice=totalCA-totalSalaires;
  const emporterPayees=payees.filter(c=>c.table==="Emporter");
  const emporterCA=emporterPayees.reduce((s,c)=>s+c.total,0);
  const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d.toISOString().split("T")[0];});
  const revenueBar=last7.map(ds=>{
    const label=new Date(ds).toLocaleDateString("fr-FR",{weekday:"short",day:"2-digit",month:"2-digit"});
    const revenu=payees.filter(c=>c.dateStamp===ds).reduce((s,c)=>s+c.total,0);
    return{date:label,revenu};
  });
  const allItems=payees.flatMap(c=>c.items||[]);
  const menuItems=[...menu,...catalogue];
  const catMap={};
  allItems.forEach(item=>{const found=menuItems.find(m=>m.id===item.id)||{cat:"Autres"};catMap[found.cat]=(catMap[found.cat]||0)+item.price*item.qty;});
  const pieData=Object.entries(catMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  const PIE_COLORS=[C.accent,C.blue,C.green,C.purple,C.red,"#06b6d4","#f59e0b"];
  const topProduits=menuItems.map(item=>{const count=allItems.filter(i=>i.id===item.id).reduce((s,i)=>s+i.qty,0);return{...item,count};}).filter(i=>i.count>0).sort((a,b)=>b.count-a.count).slice(0,8);
  const TOOLTIP={background:C.card,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12};
  return(<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:16,marginBottom:24}}>
      {[["Chiffre d'affaires",totalCA,C.accent],["CA À Emporter",emporterCA,"#ea580c"],["Total salaires",totalSalaires,C.red],["Bénéfice estimé",benefice,benefice>=0?C.green:C.red]].map(([l,v,c])=>(
        <div key={l} style={{...g.card,borderTop:`3px solid ${c}`}}><div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>{l}</div><div style={{fontSize:26,fontWeight:800,color:c,marginTop:6}}>{v.toLocaleString()} DA</div></div>
      ))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
      <div style={g.card}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:16,color:C.text}}>📊 Revenu — 7 derniers jours</div>
        {revenueBar.some(d=>d.revenu>0)
          ?<BarChart width={420} height={200} data={revenueBar} margin={{top:4,right:4,bottom:4,left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid}/>
            <XAxis dataKey="date" tick={{fill:C.muted,fontSize:10}}/>
            <YAxis tick={{fill:C.muted,fontSize:10}} tickFormatter={v=>v>=1000?v/1000+"k":v}/>
            <Tooltip contentStyle={TOOLTIP} formatter={v=>[v.toLocaleString()+" DA","Revenu"]}/>
            <Bar dataKey="revenu" fill={C.accent} radius={[6,6,0,0]}/>
          </BarChart>
          :<div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13,flexDirection:"column",gap:8}}><span>📊</span><span>Validez des commandes pour voir les stats</span></div>
        }
      </div>
      <div style={g.card}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:16,color:C.text}}>🍕 Ventes par catégorie</div>
        {pieData.length>0
          ?<PieChart width={420} height={200}>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP} formatter={v=>[v.toLocaleString()+" DA"]}/>
          </PieChart>
          :<div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13}}>Aucune vente enregistrée</div>
        }
      </div>
    </div>
    <div style={g.card}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:16,color:C.text}}>🏆 Top produits vendus</div>
      {topProduits.length===0?<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:20}}>Aucune vente enregistrée</div>
        :topProduits.map((item,i)=>{const isImg=item.image?.startsWith("data:")||item.image?.startsWith("http");const maxCount=topProduits[0].count;return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{width:24,fontSize:14,fontWeight:700,color:i<3?C.accent:C.muted}}>{i+1}</div>
            <div style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",background:C.surface,borderRadius:8,fontSize:isImg?0:18,flexShrink:0}}>{isImg?<img src={item.image} alt="" style={{width:32,height:32,borderRadius:8,objectFit:"cover"}}/>:item.image}</div>
            <div style={{width:160,fontSize:13,color:C.text,fontWeight:600}}>{item.name}</div>
            <div style={{flex:1,background:C.border,borderRadius:6,height:10}}><div style={{width:`${(item.count/maxCount)*100}%`,background:i===0?C.accent:i===1?C.blue:C.green,borderRadius:6,height:"100%",transition:"width .5s"}}/></div>
            <div style={{fontSize:12,minWidth:70,textAlign:"right",color:C.muted}}>{item.count} vendu{item.count>1?"s":""}</div>
            <div style={{fontSize:12,minWidth:90,textAlign:"right",color:C.accent,fontWeight:700}}>{(item.price*item.count).toLocaleString()} DA</div>
          </div>
        );})}
    </div>
  </div>);
}

// ─── SAUVEGARDE & RESTAURATION ────────────────────────────────────────────────
function Sauvegarde({nomEtablissement,employes,commandes,menu,catalogue,achats}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const fileRef=useRef();
  const [lastBackup,setLastBackup]=useLocalStorage("gestapp_last_backup",null);
  const [importStatus,setImportStatus]=useState(null);
  const [importMsg,setImportMsg]=useState("");
  const [showConfirm,setShowConfirm]=useState(false);
  const [pendingData,setPendingData]=useState(null);
  const [preview,setPreview]=useState(null);

  const getTailleKo=()=>{let total=0;BACKUP_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v)total+=v.length;});return(total/1024).toFixed(1);};

  const exporter=()=>{
    const data={version:"2.0",date:new Date().toISOString(),etablissement:nomEtablissement,data:{}};
    BACKUP_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v){try{data.data[k]=JSON.parse(v);}catch{data.data[k]=v;}}});
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    const dateStr=new Date().toLocaleDateString("fr-FR").replace(/\//g,"-");
    a.href=url;a.download=`GestApp_${nomEtablissement.replace(/\s/g,"_")}_${dateStr}.json`;a.click();URL.revokeObjectURL(url);
    setLastBackup(new Date().toLocaleString("fr-FR"));
    setImportStatus("success");setImportMsg(`✅ Sauvegarde exportée — ${getTailleKo()} Ko`);
    setTimeout(()=>setImportStatus(null),4000);
  };

  const onFileChange=(e)=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        const parsed=JSON.parse(ev.target.result);
        if(!parsed.data||!parsed.version)throw new Error("Format invalide");
        const d=parsed.data;
        setPreview({etablissement:parsed.etablissement||"Inconnu",date:parsed.date?new Date(parsed.date).toLocaleString("fr-FR"):"?",commandes:(d.gestapp_commandes||[]).length,employes:(d.gestapp_employes||[]).length,menu:(d.gestapp_menu||[]).length,catalogue:(d.gestapp_catalogue||[]).length,achats:(d.gestapp_achats||[]).length});
        setPendingData(parsed.data);setShowConfirm(true);
      }catch{setImportStatus("error");setImportMsg("❌ Fichier invalide ou corrompu.");setTimeout(()=>setImportStatus(null),5000);}
    };
    reader.readAsText(file);e.target.value="";
  };

  const confirmerImport=()=>{
    try{
      Object.entries(pendingData).forEach(([k,v])=>{localStorage.setItem(k,typeof v==="string"?v:JSON.stringify(v));});
      setShowConfirm(false);setPendingData(null);setPreview(null);
      setImportStatus("success");setImportMsg("✅ Données restaurées ! Rechargement en cours...");
      setTimeout(()=>window.location.reload(),1800);
    }catch{setImportStatus("error");setImportMsg("❌ Erreur lors de la restauration.");setTimeout(()=>setImportStatus(null),5000);}
  };

  return(<div>
    <div style={{fontSize:15,fontWeight:700,marginBottom:20,color:C.text}}>💾 Sauvegarde & Restauration</div>
    {importStatus&&<div style={{padding:"12px 18px",borderRadius:10,marginBottom:20,fontWeight:600,fontSize:14,background:importStatus==="success"?C.green+"22":C.red+"22",border:`1px solid ${importStatus==="success"?C.green:C.red}`,color:importStatus==="success"?C.green:C.red}}>{importMsg}</div>}

    {/* Stats */}
    <div style={{...g.card,marginBottom:20}}>
      <div style={{fontSize:14,fontWeight:700,marginBottom:14,color:C.text}}>📊 Données actuelles</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {[["🧾 Commandes",commandes.length,C.accent],["👥 Employés",employes.length,C.blue],["🍽 Menu",menu.length,C.green],["👕 Catalogue",catalogue.length,C.purple],["🛒 Achats",achats.length,C.red],].map(([label,val,color])=>(
          <div key={label} style={{background:color+"18",border:`1px solid ${color}44`,borderRadius:10,padding:"12px 16px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color}}>{val}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:4}}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:12,fontSize:12,color:C.muted,display:"flex",gap:20}}>
        <span>💿 Taille : <strong style={{color:C.text}}>{getTailleKo()} Ko</strong></span>
        {lastBackup&&<span>🕐 Dernière sauvegarde : <strong style={{color:C.green}}>{lastBackup}</strong></span>}
      </div>
    </div>

    {/* Exporter */}
    <div style={{...g.card,marginBottom:20,borderLeft:`4px solid ${C.green}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:4}}>📤 Exporter la sauvegarde</div>
          <div style={{fontSize:13,color:C.muted}}>Télécharge un fichier .json avec toutes vos données</div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>Inclut : commandes, menu, catalogue, employés, achats, paramètres</div>
        </div>
        <button style={{...g.btn("green"),padding:"12px 24px",fontSize:14,whiteSpace:"nowrap"}} onClick={exporter}>💾 Exporter maintenant</button>
      </div>
    </div>

    {/* Importer */}
    <div style={{...g.card,marginBottom:20,borderLeft:`4px solid ${C.blue}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:4}}>📥 Restaurer une sauvegarde</div>
          <div style={{fontSize:13,color:C.muted}}>Importe un fichier .json exporté depuis GestApp</div>
          <div style={{fontSize:12,color:C.red,marginTop:4}}>⚠️ Les données actuelles seront remplacées</div>
        </div>
        <button style={{...g.btn("blue"),padding:"12px 24px",fontSize:14,whiteSpace:"nowrap"}} onClick={()=>fileRef.current.click()}>📂 Choisir un fichier</button>
      </div>
      <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={onFileChange}/>
    </div>

    {/* Guide */}
    <div style={{...g.card,borderLeft:`4px solid ${C.accent}`}}>
      <div style={{fontSize:14,fontWeight:700,color:C.accent,marginBottom:12}}>💡 Bonnes pratiques</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,fontSize:13,color:C.muted}}>
        {[["📅 Quotidienne","Exportez chaque soir avant de fermer"],["☁️ Cloud","Uploadez le fichier sur Google Drive ou WhatsApp"],["🔄 Nouveau PC","Importez le fichier sur la nouvelle machine"],["🆘 Urgence","Gardez toujours le dernier .json en lieu sûr"]].map(([titre,desc])=>(
          <div key={titre} style={{padding:"10px 14px",background:C.surface,borderRadius:8}}>
            <div style={{fontWeight:700,color:C.text,marginBottom:4}}>{titre}</div>
            <div style={{fontSize:12}}>{desc}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Modal confirmation */}
    {showConfirm&&preview&&(<div style={{position:"fixed",inset:0,background:"#00000099",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
      <div style={{...g.card,width:460,animation:"fadeIn .2s ease"}}>
        <div style={{fontSize:17,fontWeight:800,color:C.text,marginBottom:16}}>⚠️ Confirmer la restauration</div>
        <div style={{padding:14,background:C.surface,borderRadius:10,marginBottom:16}}>
          <div style={{fontSize:13,color:C.muted,marginBottom:8}}>Fichier détecté :</div>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>🏪 {preview.etablissement}</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:12}}>📅 Sauvegardé le {preview.date}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[["Commandes",preview.commandes],["Employés",preview.employes],["Menu",preview.menu],["Catalogue",preview.catalogue],["Achats",preview.achats]].map(([l,v])=>(
              <div key={l} style={{textAlign:"center",padding:"8px 4px",background:C.card,borderRadius:8}}>
                <div style={{fontSize:18,fontWeight:800,color:C.accent}}>{v}</div>
                <div style={{fontSize:10,color:C.muted}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:"10px 14px",background:C.red+"18",border:`1px solid ${C.red}44`,borderRadius:10,fontSize:13,color:C.red,marginBottom:16}}>
          ⚠️ <strong>Attention :</strong> vos données actuelles ({commandes.length} commandes, {menu.length} produits...) seront remplacées.
        </div>
        <div style={{display:"flex",gap:10}}>
          <button style={{...g.btn("primary"),flex:1,padding:12}} onClick={confirmerImport}>✅ Confirmer la restauration</button>
          <button style={{...g.btn(),flex:1,padding:12}} onClick={()=>{setShowConfirm(false);setPendingData(null);setPreview(null);}}>Annuler</button>
        </div>
      </div>
    </div>)}
  </div>);
}

// ─── PARAMÈTRES ───────────────────────────────────────────────────────────────
function Parametres({type,setType,nomEtablissement,setNomEtablissement,isDark,setIsDark,typeLocked,setTypeLocked,comptes}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const [nom,setNom]=useState(nomEtablissement);
  const [confirmLock,setConfirmLock]=useState(false);
  const [ticketsCfg,setTicketsCfg]=useLocalStorage("gestapp_tickets_config",TICKETS_CONFIG_DEFAULT);
  const reset=()=>{if(window.confirm("⚠️ Réinitialiser toutes les données ?")){{[...BACKUP_KEYS,"gestapp_last_backup","gestapp_licence","gestapp_machine","gestapp_comptes","gestapp_logs","gestapp_lockouts","gestapp_tickets_config"].forEach(k=>localStorage.removeItem(k));window.location.reload();}}};
  const toggleTicket=(event,key)=>setTicketsCfg(prev=>{
    const base={...TICKETS_CONFIG_DEFAULT,...prev};
    return{...base,[event]:{...base[event],[key]:!base[event]?.[key]}};
  });
  const TICKET_EVENTS=[
    {id:"validation_table",   label:"🪑 Validation commande table",      desc:"Déclenché quand on valide une commande sur une table",
     options:[{key:"table",icon:"🪑",label:"Bon de table (client)",color:C.blue},{key:"cuisine",icon:"👨\u200d🍳",label:"Bon de cuisine",color:C.red}]},
    {id:"paiement_table",     label:"💳 Paiement table",                 desc:"Déclenché à l'encaissement d'une table",
     options:[{key:"addition",icon:"💳",label:"Addition / Reçu client",color:C.green}]},
    {id:"validation_emporter",label:"🥡 Nouvelle commande À Emporter",   desc:"Déclenché à la création d'un emporter",
     options:[{key:"emporter_client",icon:"🥡",label:"Bon client emporter",color:"#ea580c"},{key:"emporter_cuisine",icon:"👨\u200d🍳",label:"Bon cuisine emporter",color:C.red}]},
    {id:"paiement_emporter",  label:"💳 Paiement commande À Emporter",   desc:"Déclenché à l'encaissement d'un emporter",
     options:[{key:"addition",icon:"💳",label:"Addition / Reçu client",color:C.green}]},
    {id:"vente_boutique",     label:"🛍️ Vente boutique / Comptoir",      desc:"Déclenché lors d'une vente au comptoir",
     options:[{key:"vente",icon:"🛍️",label:"Ticket de caisse",color:C.purple}]},
  ];
  const cfg={...TICKETS_CONFIG_DEFAULT,...ticketsCfg};
  return(<div style={{display:"grid",gap:20}}>
    <div style={g.card}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:16,color:C.text}}>🏪 Informations de l'établissement</div>
      <div style={{marginBottom:14}}><label style={g.label}>Nom de l'établissement</label><input style={g.input} value={nom} onChange={e=>setNom(e.target.value)}/></div>
      <button style={g.btn("primary")} onClick={()=>setNomEtablissement(nom)}>💾 Sauvegarder</button>
    </div>
    <div style={g.card}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:16,color:C.text}}>🌙 Thème de l'interface</div>
      <div style={{display:"flex",gap:12}}>
        {[["🌙","Mode Sombre",true,"Recommandé pour les restaurants"],["☀️","Mode Clair",false,"Idéal pour les boutiques"]].map(([icon,label,val,desc])=>(
          <button key={label} onClick={()=>setIsDark(val)} style={{flex:1,padding:16,borderRadius:12,border:`2px solid ${isDark===val?C.accent:C.border}`,background:isDark===val?C.accentDim:C.surface,cursor:"pointer",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:6}}>{icon}</div>
            <div style={{fontWeight:700,color:isDark===val?C.accent:C.text,fontSize:14}}>{label}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{desc}</div>
          </button>
        ))}
      </div>
    </div>
    <div style={g.card}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:16,color:C.text}}>⚙️ Type d'établissement</div>
      {typeLocked?(
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>{type==="boutique"?"👕":type==="cafeteria"?"☕":type==="snack"?"🥪":"🍽"}</span>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:C.text,textTransform:"capitalize"}}>{type}</div>
            <span style={g.badge(C.green)}>🔒 Type verrouillé définitivement</span>
          </div>
        </div>
      ):(
        <>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
            {[["restaurant","🍽 Restaurant"],["cafeteria","☕ Cafétéria"],["snack","🥪 Snack"],["boutique","👕 Boutique"]].map(([v,l])=>(
              <button key={v} style={{...g.btn(type===v?"primary":""),padding:"12px 24px",fontSize:14}} onClick={()=>setType(v)}>{l}</button>
            ))}
          </div>
          <button style={{...g.btn("danger"),padding:"10px 20px"}} onClick={()=>setConfirmLock(true)}>🔒 Verrouiller définitivement ce choix</button>
        </>
      )}
      {confirmLock&&<Modal title="⚠️ Confirmer le verrouillage" onClose={()=>setConfirmLock(false)}>
        <div style={{fontSize:14,color:C.text,marginBottom:16}}>Vous êtes sur le point de verrouiller le type <strong style={{color:C.accent}}>{type}</strong> définitivement. Cette action est irréversible (sauf réinitialisation complète).</div>
        <div style={{display:"flex",gap:8}}><button style={{...g.btn("danger"),flex:1,padding:12}} onClick={()=>{setTypeLocked(true);setConfirmLock(false);}}>Confirmer le verrouillage</button><button style={{...g.btn(),flex:1}} onClick={()=>setConfirmLock(false)}>Annuler</button></div>
      </Modal>}
    </div>

    {/* ── CONFIGURATION TICKETS ── */}
    <div style={g.card}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:C.text}}>🖨️ Configuration des tickets d'impression</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:18}}>Choisissez quels tickets sont imprimés automatiquement pour chaque événement.</div>
      <div style={{display:"grid",gap:14}}>
        {TICKET_EVENTS.map(ev=>(
          <div key={ev.id} style={{padding:"14px 16px",background:C.surface,borderRadius:12,border:`1px solid ${C.border}`}}>
            <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:2}}>{ev.label}</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:12}}>{ev.desc}</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {ev.options.map(opt=>{
                const isOn=cfg[ev.id]?.[opt.key]??false;
                return(
                  <button key={opt.key} onClick={()=>toggleTicket(ev.id,opt.key)}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:10,border:`2px solid ${isOn?opt.color:C.border}`,background:isOn?opt.color+"22":"transparent",cursor:"pointer",transition:"all .15s"}}>
                    <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${isOn?opt.color:C.muted}`,background:isOn?opt.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0}}>
                      {isOn?"✓":""}
                    </div>
                    <span style={{fontSize:13}}>{opt.icon}</span>
                    <span style={{fontSize:13,fontWeight:600,color:isOn?opt.color:C.text}}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:14,padding:"10px 14px",background:C.accentDim,borderRadius:8,fontSize:12,color:C.muted}}>
        💡 Si aucun ticket n'est coché pour un événement, rien ne sera imprimé automatiquement. Vous pouvez toujours imprimer manuellement depuis l'historique.
      </div>
    </div>

    <div style={g.card}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:4,color:C.text}}>👥 Comptes utilisateurs</div>
      <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Pour gérer les PINs et créer/supprimer des comptes, allez dans 🔑 Accès & PIN</div>
      {(comptes||[]).map(c=>(
        <div key={c.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{c.nom}</div><div style={{fontSize:11,color:C.muted}}>Créé le {c.createdAt||"—"} · {c.actif===false?"Désactivé":"Actif"}</div></div>
          <span style={g.badge(ROLES[c.role].color)}>{ROLES[c.role].label}</span>
        </div>
      ))}
    </div>
    <div style={{...g.card,borderTop:`3px solid ${C.red}`}}>
      <div style={{fontSize:15,fontWeight:700,marginBottom:8,color:C.red}}>⚠️ Zone de danger</div>
      <div style={{fontSize:13,color:C.muted,marginBottom:14}}>Réinitialiser toutes les données (irréversible).</div>
      <button style={g.btn("danger")} onClick={reset}>🗑 Réinitialiser</button>
    </div>
  </div>);
}

// ─── PANNEAU ADMIN PIN ────────────────────────────────────────────────────────
function PinAdminPanel({comptes,setComptes,logs,setLogs,user}){
  const C=useContext(ThemeCtx);const g=makeG(C);
  const [activeTab,setActiveTab]=useState("users"); // "users"|"logs"
  const [showModal,setShowModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({nom:"",role:"patron",pin:"",actif:true});
  const [revealPin,setRevealPin]=useState({});
  const [pinCopied,setPinCopied]=useState(null);
  const [logFilter,setLogFilter]=useState("");
  const [logAction_,setLogAction_]=useState("all");
  const [confirmDel,setConfirmDel]=useState(null);

  const openNew=()=>{
    const newPin=genererPIN(4);
    setForm({nom:"",role:"serveur",pin:newPin,actif:true});
    setEditing(null);setShowModal(true);
    logAction(logs,setLogs,user.id,user.nom,"ACCES_GESTION_PIN","Ouverture formulaire nouvel utilisateur");
  };
  const openEdit=(c)=>{ setForm({nom:c.nom,role:c.role,pin:c.pin,actif:c.actif!==false}); setEditing(c.id); setShowModal(true); };

  const saveUser=()=>{
    if(!form.nom.trim()||!form.pin){return;}
    const pinExists=comptes.some(c=>c.pin===form.pin&&(editing===null||c.id!==editing));
    if(pinExists){ alert("⚠️ Ce code PIN est déjà utilisé par un autre compte."); return; }
    if(editing){
      setComptes(p=>p.map(c=>c.id===editing?{...c,...form}:c));
      logAction(logs,setLogs,user.id,user.nom,"MODIF_UTILISATEUR",`Modification de ${form.nom}`);
    } else {
      const newUser={id:Date.now(),nom:form.nom.trim(),role:form.role,pin:form.pin,actif:form.actif,createdAt:new Date().toISOString().split("T")[0]};
      setComptes(p=>[...p,newUser]);
      logAction(logs,setLogs,user.id,user.nom,"CREATION_UTILISATEUR",`Nouvel utilisateur: ${form.nom} (${form.role})`);
    }
    setShowModal(false);
  };

  const deleteUser=(c)=>{
    if(c.role==="patron"&&comptes.filter(x=>x.role==="patron").length<=1){ alert("⚠️ Impossible de supprimer le dernier compte Patron."); return; }
    setConfirmDel(c);
  };
  const confirmDelete=()=>{
    logAction(logs,setLogs,user.id,user.nom,"SUPPRESSION_UTILISATEUR",`Suppression de ${confirmDel.nom}`);
    setComptes(p=>p.filter(c=>c.id!==confirmDel.id));
    setConfirmDel(null);
  };

  const toggleActif=(c)=>{
    if(c.id===user.id){ alert("Vous ne pouvez pas désactiver votre propre compte."); return; }
    const newActif=c.actif===false?true:false;
    setComptes(p=>p.map(x=>x.id===c.id?{...x,actif:newActif}:x));
    logAction(logs,setLogs,user.id,user.nom,newActif?"ACTIVATION_COMPTE":"DESACTIVATION_COMPTE",`Compte ${c.nom} ${newActif?"activé":"désactivé"}`);
  };

  const regenPin=(c)=>{
    const newPin=genererPIN(4);
    setComptes(p=>p.map(x=>x.id===c.id?{...x,pin:newPin}:x));
    logAction(logs,setLogs,user.id,user.nom,"REGEN_PIN",`Nouveau PIN généré pour ${c.nom}`);
    setRevealPin(p=>({...p,[c.id]:true}));
  };

  const copyPin=(c,pin)=>{
    navigator.clipboard?.writeText(pin).catch(()=>{});
    setPinCopied(c.id);
    setTimeout(()=>setPinCopied(null),2000);
    logAction(logs,setLogs,user.id,user.nom,"COPIE_PIN",`PIN copié pour ${c.nom}`);
  };

  const filteredLogs=logs.filter(l=>{
    const matchText=logFilter===""||l.nom.toLowerCase().includes(logFilter.toLowerCase())||l.action.toLowerCase().includes(logFilter.toLowerCase())||l.details.toLowerCase().includes(logFilter.toLowerCase());
    const matchAction=logAction_==="all"||l.action===logAction_;
    return matchText&&matchAction;
  });

  const actionColors={"CONNEXION_SUCCES":C.green,"CONNEXION_ECHEC":C.red,"CREATION_UTILISATEUR":C.blue,"SUPPRESSION_UTILISATEUR":C.red,"MODIF_UTILISATEUR":C.accent,"REGEN_PIN":C.purple,"ACTIVATION_COMPTE":C.green,"DESACTIVATION_COMPTE":C.muted,"SELECTION":C.muted,"COPIE_PIN":C.accent,"ACCES_GESTION_PIN":C.blue};
  const actionIcons={"CONNEXION_SUCCES":"✅","CONNEXION_ECHEC":"❌","CREATION_UTILISATEUR":"➕","SUPPRESSION_UTILISATEUR":"🗑","MODIF_UTILISATEUR":"✏️","REGEN_PIN":"🔄","ACTIVATION_COMPTE":"🟢","DESACTIVATION_COMPTE":"⛔","SELECTION":"👆","COPIE_PIN":"📋","ACCES_GESTION_PIN":"🔑"};

  const allActions=["all",...new Set(logs.map(l=>l.action))];
  const lockouts=(() => { try { return JSON.parse(localStorage.getItem("gestapp_lockouts")||"{}"); } catch { return {}; } })();

  const TABS=[["users","👥 Utilisateurs"],["logs","📋 Journal"]];

  return(<div style={{display:"grid",gap:20}}>
    {/* Header */}
    <div style={{...g.card,borderLeft:`4px solid ${C.accent}`,padding:"16px 20px"}}>
      <div style={{fontSize:16,fontWeight:800,color:C.accent,marginBottom:2}}>🔑 Administration des accès PIN</div>
      <div style={{fontSize:13,color:C.muted}}>Gérez les utilisateurs, codes PIN et consultez l'historique des connexions</div>
    </div>

    {/* Tabs */}
    <div style={{display:"flex",gap:8}}>
      {TABS.map(([id,label])=>(
        <button key={id} onClick={()=>setActiveTab(id)}
          style={{padding:"9px 20px",borderRadius:8,border:`2px solid ${activeTab===id?C.accent:C.border}`,background:activeTab===id?C.accentDim:"transparent",color:activeTab===id?C.accent:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .15s"}}>
          {label}
        </button>
      ))}
    </div>

    {activeTab==="users" && (<>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[
          {label:"Total comptes",value:comptes.length,color:C.blue},
          {label:"Actifs",value:comptes.filter(c=>c.actif!==false).length,color:C.green},
          {label:"Désactivés",value:comptes.filter(c=>c.actif===false).length,color:C.red},
          {label:"Verrouillés",value:Object.values(lockouts).filter(l=>l.lockedUntil&&Date.now()<l.lockedUntil).length,color:C.accent},
        ].map(({label,value,color})=>(
          <div key={label} style={{...g.card,borderTop:`3px solid ${color}`,padding:"14px 16px"}}>
            <div style={{fontSize:22,fontWeight:800,color}}>{value}</div>
            <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:.8,marginTop:2}}>{label}</div>
          </div>
        ))}
      </div>

      {/* User list */}
      <div style={g.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text}}>Comptes utilisateurs ({comptes.length})</div>
          <button style={{...g.btn("primary"),padding:"9px 18px"}} onClick={openNew}>+ Nouvel utilisateur</button>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Utilisateur","Rôle","Code PIN","Statut","Connexions","Actions"].map(h=><th key={h} style={g.th}>{h}</th>)}</tr></thead>
          <tbody>
            {comptes.map(c=>{
              const loData=lockouts[c.id];
              const isLocked=loData?.lockedUntil&&Date.now()<loData.lockedUntil;
              const attempts=loData?.attempts||0;
              const userLogs=logs.filter(l=>l.userId===c.id&&l.action==="CONNEXION_SUCCES");
              const lastLogin=userLogs[0]?.timestamp;
              const shown=revealPin[c.id];
              return(
                <tr key={c.id} style={{opacity:c.actif===false?0.5:1}}>
                  <td style={{...g.td,fontWeight:700,color:C.text}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:ROLES[c.role].color+"22",border:`1.5px solid ${ROLES[c.role].color}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:ROLES[c.role].color,fontSize:13}}>{c.nom[0]}</div>
                      <div>
                        <div>{c.nom}</div>
                        <div style={{fontSize:11,color:C.muted}}>Créé le {c.createdAt||"—"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={g.td}><span style={g.badge(ROLES[c.role].color)}>{ROLES[c.role].label}</span></td>
                  <td style={g.td}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontFamily:"monospace",fontSize:16,letterSpacing:4,color:C.accent}}>
                        {shown ? c.pin : "••••"}
                      </span>
                      <button onClick={()=>setRevealPin(p=>({...p,[c.id]:!p[c.id]}))} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.muted}} title={shown?"Masquer":"Révéler"}>{shown?"🙈":"👁"}</button>
                      <button onClick={()=>copyPin(c,c.pin)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:pinCopied===c.id?C.green:C.muted}} title="Copier">{pinCopied===c.id?"✅":"📋"}</button>
                    </div>
                  </td>
                  <td style={g.td}>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      <span style={g.badge(c.actif===false?C.red:C.green)}>{c.actif===false?"Désactivé":"Actif"}</span>
                      {isLocked && <span style={g.badge(C.red)}>🔒 Verrouillé</span>}
                      {!isLocked && attempts>0 && <span style={g.badge(C.accent)}>{attempts} échec{attempts>1?"s":""}</span>}
                    </div>
                  </td>
                  <td style={g.td}>
                    <div style={{fontSize:12,color:C.muted}}>
                      <div>{userLogs.length} connexion{userLogs.length!==1?"s":""}</div>
                      {lastLogin&&<div style={{fontSize:10}}>Dernière: {new Date(lastLogin).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</div>}
                    </div>
                  </td>
                  <td style={g.td}>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <button style={{...g.btn("blue"),padding:"4px 10px",fontSize:11}} onClick={()=>openEdit(c)}>✏️</button>
                      <button style={{...g.btn("purple"),padding:"4px 10px",fontSize:11}} onClick={()=>regenPin(c)} title="Régénérer PIN">🔄</button>
                      <button style={{...g.btn(c.actif===false?"green":""),padding:"4px 10px",fontSize:11}} onClick={()=>toggleActif(c)} title={c.actif===false?"Activer":"Désactiver"}>{c.actif===false?"🟢":"⛔"}</button>
                      {c.id!==user.id&&<button style={{...g.btn("danger"),padding:"4px 10px",fontSize:11}} onClick={()=>deleteUser(c)}>🗑</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>)}

    {activeTab==="logs" && (
      <div style={g.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text}}>Journal des actions ({filteredLogs.length})</div>
          <div style={{display:"flex",gap:8}}>
            <input style={{...g.input,width:200}} value={logFilter} onChange={e=>setLogFilter(e.target.value)} placeholder="🔍 Rechercher…"/>
            <select style={{...g.input,width:180}} value={logAction_} onChange={e=>setLogAction_(e.target.value)}>
              {allActions.map(a=><option key={a} value={a}>{a==="all"?"Toutes les actions":a}</option>)}
            </select>
            <button style={{...g.btn("danger"),padding:"8px 14px",fontSize:12}} onClick={()=>{if(window.confirm("Vider le journal ?"))setLogs([]);}}>🗑 Vider</button>
          </div>
        </div>
        <div style={{maxHeight:520,overflowY:"auto"}}>
          {filteredLogs.length===0
            ? <div style={{textAlign:"center",padding:40,color:C.muted,fontSize:13}}>Aucune entrée dans le journal</div>
            : filteredLogs.map(l=>(
              <div key={l.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:(actionColors[l.action]||C.muted)+"22",border:`1.5px solid ${actionColors[l.action]||C.muted}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                  {actionIcons[l.action]||"📌"}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:13,color:C.text}}>{l.nom}</span>
                    <span style={{...g.badge(actionColors[l.action]||C.muted),fontSize:10}}>{l.action}</span>
                    <span style={{fontSize:11,color:C.muted,marginLeft:"auto"}}>{new Date(l.timestamp).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>
                  </div>
                  {l.details&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>{l.details}</div>}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    )}

    {/* Modal utilisateur */}
    {showModal&&<Modal title={editing?"Modifier l'utilisateur":"Nouvel utilisateur"} onClose={()=>setShowModal(false)}>
      <div style={{marginBottom:14}}><label style={g.label}>Nom complet *</label><input style={g.input} value={form.nom} onChange={e=>setForm(p=>({...p,nom:e.target.value}))} placeholder="Ex: Ahmed Benali"/></div>
      <div style={{marginBottom:14}}>
        <label style={g.label}>Rôle *</label>
        <select style={g.input} value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
          {Object.entries(ROLES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div style={{marginBottom:6}}><label style={g.label}>Code PIN *</label>
        <div style={{display:"flex",gap:8}}>
          <input style={{...g.input,fontFamily:"monospace",fontSize:18,letterSpacing:4,textAlign:"center"}} type="text" maxLength={6} value={form.pin} onChange={e=>setForm(p=>({...p,pin:e.target.value.replace(/\D/g,"")}))} placeholder="0000"/>
          <button style={{...g.btn("purple"),whiteSpace:"nowrap",padding:"0 14px"}} onClick={()=>setForm(p=>({...p,pin:genererPIN(4)}))}>🎲 Générer</button>
        </div>
      </div>
      <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Le PIN doit être communiqué à l'utilisateur de façon sécurisée (4 à 6 chiffres).</div>
      <div style={{marginBottom:20}}>
        <label style={{...g.label,marginBottom:0,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
          <input type="checkbox" checked={form.actif} onChange={e=>setForm(p=>({...p,actif:e.target.checked}))} style={{width:16,height:16}}/>
          Compte actif (peut se connecter)
        </label>
      </div>
      <div style={{display:"flex",gap:8}}><button style={{...g.btn("primary"),flex:1,padding:12}} onClick={saveUser}>💾 Enregistrer</button><button style={{...g.btn(),flex:1}} onClick={()=>setShowModal(false)}>Annuler</button></div>
    </Modal>}

    {/* Modal suppression */}
    {confirmDel&&<Modal title="⚠️ Confirmer la suppression" onClose={()=>setConfirmDel(null)}>
      <div style={{fontSize:14,color:C.text,marginBottom:16}}>Supprimer définitivement le compte <strong style={{color:C.accent}}>{confirmDel.nom}</strong> ? Cette action est irréversible.</div>
      <div style={{display:"flex",gap:8}}><button style={{...g.btn("danger"),flex:1,padding:12}} onClick={confirmDelete}>🗑 Supprimer</button><button style={{...g.btn(),flex:1}} onClick={()=>setConfirmDel(null)}>Annuler</button></div>
    </Modal>}
  </div>);
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
const NAV = [
  {id:"dashboard",  icon:"📊",label:"Tableau de bord"},
  {id:"tables",     icon:"🪑",label:"Tables & Commandes",  restoOnly:true},
  {id:"menu",       icon:"🍽",label:"Gestion du Menu",     restoOnly:true},
  {id:"ventes",     icon:"🛍️",label:"Point de Vente",      boutiqueOnly:true},
  {id:"catalogue",  icon:"👕",label:"Catalogue Boutique",  boutiqueOnly:true},
  {id:"employes",   icon:"👥",label:"Employés",            patronOnly:true},
  {id:"achats",     icon:"🛒",label:"Achats"},
  {id:"caisse",     icon:"💰",label:"Caisse"},
  {id:"historique", icon:"🧾",label:"Historique"},
  {id:"rapports",   icon:"📈",label:"Rapports"},
  {id:"sauvegarde", icon:"💾",label:"Sauvegarde",          patronOnly:true},
  {id:"pinAdmin",   icon:"🔑",label:"Accès & PIN",         patronOnly:true},
  {id:"parametres", icon:"⚙️",label:"Paramètres",          patronOnly:true},
];

// ─── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("dashboard");
  const [licensed,setLicensed]=useState(()=>licenceEstValide());
  const [isDark,          setIsDark]          =useLocalStorage("gestapp_theme",      true);
  const [type,            setType]            =useLocalStorage("gestapp_type",       "restaurant");
  const [typeLocked,      setTypeLocked]      =useLocalStorage("gestapp_type_locked",false);
  const [nomEtablissement,setNomEtablissement]=useLocalStorage("gestapp_nom",        "Mon Établissement");
  const [tables,          setTables]          =useLocalStorage("gestapp_tables",     TABLES_INIT);
  const [commandes,       setCommandes]       =useLocalStorage("gestapp_commandes",  []);
  const [employes,        setEmployes]        =useLocalStorage("gestapp_employes",   EMP_INIT);
  const [achats,          setAchats]          =useLocalStorage("gestapp_achats",     ACHATS_INIT);
  const [menu,            setMenu]            =useLocalStorage("gestapp_menu",       MENU_INIT);
  const [menuCats,        setMenuCats]        =useLocalStorage("gestapp_menu_categories", MENU_CATS_INIT);
  const [catalogue,       setCatalogue]       =useLocalStorage("gestapp_catalogue",  CATALOGUE_INIT);
  const [catCats,         setCatCats]         =useLocalStorage("gestapp_cat_categories",  CAT_CATS_INIT);
  const [comptes,         setComptes]         =useLocalStorage("gestapp_comptes",    COMPTES_DEFAULT);
  const [logs,            setLogs]            =useLocalStorage("gestapp_logs",       []);

  const colors=isDark?DARK:LIGHT;

  const handleLogin=(u)=>{
    logAction(logs,setLogs,u.id,u.nom,"SESSION_DEBUT",`Session démarrée – ${new Date().toLocaleTimeString("fr-FR")}`);
    setUser(u);
  };
  const handleLogout=()=>{
    if(user) logAction(logs,setLogs,user.id,user.nom,"SESSION_FIN","Déconnexion");
    setUser(null);
  };

  if(!licensed) return <ThemeCtx.Provider value={colors}><LicenseScreen onActivate={()=>setLicensed(true)}/></ThemeCtx.Provider>;
  if(!user)     return <ThemeCtx.Provider value={colors}><Login onLogin={handleLogin} comptes={comptes} logs={logs} setLogs={setLogs}/></ThemeCtx.Provider>;

  const role=ROLES[user.role];
  const navItems=NAV.filter(n=>{
    if(n.restoOnly&&type==="boutique") return false;
    if(n.boutiqueOnly&&type!=="boutique") return false;
    if(n.patronOnly&&user.role!=="patron"&&user.role!=="gerant") return false;
    return role.pages.includes(n.id);
  });
  const currentPage=role.pages.includes(page)?page:role.pages[0];

  const enCoursCount=commandes.filter(c=>c.statut==="En cours").length;

  return(
    <ThemeCtx.Provider value={colors}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes loadbar{from{width:0}to{width:100%}}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${colors.border};border-radius:10px}*{box-sizing:border-box}`}</style>
      <div style={{display:"flex",minHeight:"100vh",background:colors.bg,color:colors.text,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

        {/* ── SIDEBAR ── */}
        <div style={{width:234,background:colors.surface,borderRight:`1px solid ${colors.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"18px 20px 14px",borderBottom:`1px solid ${colors.border}`,marginBottom:6}}>
            <div style={{fontSize:17,fontWeight:900,color:colors.accent}}>⚡ {nomEtablissement}</div>
            <div style={{fontSize:11,color:colors.muted,marginTop:2}}>Gestion commerciale</div>
          </div>
          {navItems.map(n=>{const a=currentPage===n.id;const badge=n.id==="caisse"&&enCoursCount>0?enCoursCount:0;return(
            <div key={n.id} onClick={()=>setPage(n.id)}
                 style={{display:"flex",alignItems:"center",gap:10,padding:"11px 20px",cursor:"pointer",borderLeft:a?`3px solid ${colors.accent}`:"3px solid transparent",background:a?colors.accentDim:"transparent",color:a?colors.accent:colors.muted,fontSize:13,fontWeight:a?700:400,transition:"all .15s",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span>{n.icon}</span><span>{n.label}</span>
              </div>
              {badge>0&&<span style={{background:colors.red,color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{badge}</span>}
            </div>
          );})}
          <div style={{flex:1}}/>
          <div style={{padding:"8px 20px"}}>
            <button onClick={()=>setIsDark(!isDark)} style={{...makeG(colors).btn(),width:"100%",padding:"8px 0",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {isDark?"☀️ Mode clair":"🌙 Mode sombre"}
            </button>
          </div>
          <div style={{padding:"6px 20px",fontSize:11,color:colors.green,display:"flex",alignItems:"center",gap:6}}>💾 Données sauvegardées</div>
          <div style={{padding:"12px 20px",borderTop:`1px solid ${colors.border}`}}>
            <div style={{fontSize:11,color:colors.muted}}>Connecté</div>
            <div style={{fontSize:13,fontWeight:700,color:role.color,marginTop:2}}>👤 {user.nom}</div>
            <span style={{...makeG(colors).badge(role.color),marginTop:4,display:"inline-block"}}>{role.label}</span>
            <button style={{...makeG(colors).btn("danger"),marginTop:10,width:"100%",padding:7,fontSize:12}} onClick={handleLogout}>Déconnexion</button>
          </div>
        </div>

        {/* ── CONTENU PRINCIPAL ── */}
        <div style={{flex:1,overflowY:"auto",padding:28}}>
          {currentPage==="dashboard"  && <Dashboard employes={employes} commandes={commandes}/>}
          {currentPage==="tables"     && <Tables tables={tables} setTables={setTables} commandes={commandes} setCommandes={setCommandes} menu={menu} nomEtablissement={nomEtablissement} user={user}/>}
          {currentPage==="menu"       && <MenuPage menu={menu} setMenu={setMenu} menuCats={menuCats} setMenuCats={setMenuCats}/>}
          {currentPage==="ventes"     && <VentesBoutique catalogue={catalogue} setCatalogue={setCatalogue} commandes={commandes} setCommandes={setCommandes} nomEtablissement={nomEtablissement} user={user} catCats={catCats}/>}
          {currentPage==="catalogue"  && <CatalogueBoutique catalogue={catalogue} setCatalogue={setCatalogue} catCats={catCats} setCatCats={setCatCats}/>}
          {currentPage==="employes"   && <Employes employes={employes} setEmployes={setEmployes} user={user}/>}
          {currentPage==="achats"     && <Achats achats={achats} setAchats={setAchats} catalogue={catalogue} setCatalogue={setCatalogue}/>}
          {currentPage==="caisse"     && <Caisse commandes={commandes} setCommandes={setCommandes} nomEtablissement={nomEtablissement}/>}
          {currentPage==="historique" && <Historique commandes={commandes} nomEtablissement={nomEtablissement}/>}
          {currentPage==="rapports"   && <Rapports commandes={commandes} employes={employes} menu={menu} catalogue={catalogue}/>}
          {currentPage==="sauvegarde" && <Sauvegarde nomEtablissement={nomEtablissement} employes={employes} commandes={commandes} menu={menu} catalogue={catalogue} achats={achats}/>}
          {currentPage==="pinAdmin"   && <PinAdminPanel comptes={comptes} setComptes={setComptes} logs={logs} setLogs={setLogs} user={user}/>}
          {currentPage==="parametres" && <Parametres type={type} setType={setType} nomEtablissement={nomEtablissement} setNomEtablissement={setNomEtablissement} isDark={isDark} setIsDark={setIsDark} typeLocked={typeLocked} setTypeLocked={setTypeLocked} comptes={comptes}/>}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}