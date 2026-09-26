// ─── TYPES DE MOUVEMENTS DE STOCK ─────────────────────────────────────────────
export const MOVEMENT_TYPES = {
  ENTRY:          { label: "Entrée stock",      color: "#10b981", sign: "+" },
  SALE_RETAIL:    { label: "Vente détail",       color: "#3b82f6", sign: "-" },
  SALE_WHOLESALE: { label: "Vente gros",         color: "#8b5cf6", sign: "-" },
  INTERNAL_EXIT:  { label: "Sortie interne",     color: "#f97316", sign: "-" },
  INVENTORY_ADJ:  { label: "Ajust. inventaire",  color: "#f59e0b", sign: "±" },
};

// ─── MOTIFS DE SORTIES INTERNES ───────────────────────────────────────────────
export const INTERNAL_EXIT_REASONS = [
  "Perte", "Casse", "Don", "Usage interne", "Péremption", "Autre",
];
