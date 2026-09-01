import type { Brand, BrandColors, Product } from "./types";
import { defaultHighlights } from "./highlights";

export const PRODUCT_COLORS = [
  { name: "Preto", hex: "#1a1a1a" },
  { name: "Branco", hex: "#f5f5f5" },
  { name: "Cinza", hex: "#888888" },
  { name: "Marinho", hex: "#1a2744" },
  { name: "Azul", hex: "#2563eb" },
  { name: "Vermelho", hex: "#dc2626" },
  { name: "Verde", hex: "#16a34a" },
  { name: "Amarelo", hex: "#eab308" },
  { name: "Rosa", hex: "#ec4899" },
  { name: "Roxo", hex: "#7c3aed" },
  { name: "Laranja", hex: "#ea580c" },
  { name: "Bege", hex: "#d4c5a9" },
  { name: "Marrom", hex: "#78350f" },
  { name: "Bordô", hex: "#7f1d1d" },
  { name: "Cáqui", hex: "#a3926b" },
  { name: "Caramelo", hex: "#b8860b" },
] as const;

export const DEFAULT_CATEGORIES = [
  "Camisetas",
  "Bermudas",
  "Calças",
  "Jeans",
  "Moletons",
  "Conjuntos",
  "Cuecas",
  "Vestidos",
  "Blusas",
  "Acessórios",
];

export const DEFAULT_SIZES = [
  "PP",
  "P",
  "M",
  "G",
  "GG",
  "XG",
  "XXG",
  "36",
  "38",
  "40",
  "42",
  "44",
  "46",
  "48",
  "Único",
];

export const DEFAULT_COLORS: BrandColors = {
  primary: "#0A1F18",
  accent: "#C9A84C",
  text: "#ffffff",
  card: "#122E23",
};

export const DEFAULT_BRAND: Brand = {
  name: "",
  logo: "",
  banner: "",
  videoUrl: "",
  whatsapp: "",
  instagram: "",
  cnpj: "",
  highlights: defaultHighlights(),
  highlightStyle: "pill",
  checkoutButtonText: "Finalizar pedido",
  checkoutButtonColor: "#25D366",
};

export const demoProducts: Product[] = [
  {
    id: 1,
    name: "Camiseta Oversized Streetwear",
    category: "Camisetas",
    qty: 150,
    sizes: ["M", "G", "GG"],
    price: "27.00",
    colors: ["#1a1a1a", "#f5f5f5"],
    images: [],
    videos: [],
    coverType: "image",
    description: "Algodão 30.1 penteado, corte oversized.",
  },
  {
    id: 2,
    name: "Bermuda Elastano Premium",
    category: "Bermudas",
    qty: 80,
    sizes: ["M", "G"],
    price: "35.00",
    colors: ["#1a2744", "#888888"],
    images: [],
    videos: [],
    description: "",
  },
  {
    id: 3,
    name: "Calça Jeans Slim",
    category: "Jeans",
    qty: 45,
    sizes: ["40", "42", "44"],
    price: "55.00",
    colors: ["#2563eb", "#1a1a1a"],
    images: [],
    videos: [],
    description: "Jeans com elastano, lavagem escura.",
  },
];
