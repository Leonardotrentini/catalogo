export type ErpDemoProduct = {
  id: string;
  nome: string;
  codigo: string;
  preco: number;
  estoque: number;
  categoria: string;
  cores: string[];
  tamanhos: string[];
  imagem: string;
  selected: boolean;
};

export const BLING_DEMO_PRODUCTS: Omit<ErpDemoProduct, "selected">[] = [
  {
    id: "bling-1001",
    nome: "Camiseta Oversized Premium",
    codigo: "CAM-OVS-001",
    preco: 55.9,
    estoque: 320,
    categoria: "Camisetas",
    cores: ["#111111", "#FFFFFF", "#1B4332"],
    tamanhos: ["P", "M", "G", "GG"],
    imagem: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop",
  },
  {
    id: "bling-1002",
    nome: "Gola Polo Elastano",
    codigo: "POL-ELA-014",
    preco: 69.9,
    estoque: 180,
    categoria: "Polos",
    cores: ["#F8F1E3", "#7F1D1D", "#0F172A"],
    tamanhos: ["P", "M", "G"],
    imagem: "https://images.unsplash.com/photo-1586790170083-2f9ceadc561d?w=200&h=200&fit=crop",
  },
  {
    id: "bling-1003",
    nome: "Baby Look Peruana",
    codigo: "BBL-PER-022",
    preco: 42.9,
    estoque: 95,
    categoria: "Baby Look",
    cores: ["#F5D0FE", "#FFFFFF", "#111827"],
    tamanhos: ["P", "M", "G", "GG"],
    imagem: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=200&h=200&fit=crop",
  },
  {
    id: "bling-1004",
    nome: "Short Sarja Masculino",
    codigo: "SHT-SAR-008",
    preco: 79.9,
    estoque: 140,
    categoria: "Shorts",
    cores: ["#1E3A5F", "#BEA463", "#111111"],
    tamanhos: ["38", "40", "42", "44"],
    imagem: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=200&h=200&fit=crop",
  },
  {
    id: "bling-1005",
    nome: "Moletom Canguru",
    codigo: "MOL-CAN-031",
    preco: 119.9,
    estoque: 64,
    categoria: "Moletom",
    cores: ["#374151", "#F3F4F6", "#14532D"],
    tamanhos: ["M", "G", "GG", "XG"],
    imagem: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200&h=200&fit=crop",
  },
];

/** Produtos mock no estilo Hiper (loja física moda + grade + atacarejo). */
export const HIPER_DEMO_PRODUCTS: Omit<ErpDemoProduct, "selected">[] = [
  {
    id: "hiper-2001",
    nome: "Calça Jeans Skinny",
    codigo: "7891002001001",
    preco: 149.9,
    estoque: 86,
    categoria: "Calças",
    cores: ["#1E3A5F", "#111827", "#6B7280"],
    tamanhos: ["36", "38", "40", "42", "44"],
    imagem: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=200&h=200&fit=crop",
  },
  {
    id: "hiper-2002",
    nome: "Vestido Midi Linho",
    codigo: "7891002001002",
    preco: 189.9,
    estoque: 42,
    categoria: "Vestidos",
    cores: ["#F5E6D3", "#7C2D12", "#111111"],
    tamanhos: ["P", "M", "G"],
    imagem: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200&h=200&fit=crop",
  },
  {
    id: "hiper-2003",
    nome: "Camisa Social Slim",
    codigo: "7891002001003",
    preco: 99.9,
    estoque: 120,
    categoria: "Camisas",
    cores: ["#FFFFFF", "#DBEAFE", "#111827"],
    tamanhos: ["P", "M", "G", "GG"],
    imagem: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&h=200&fit=crop",
  },
  {
    id: "hiper-2004",
    nome: "Jaqueta Jeans Oversized",
    codigo: "7891002001004",
    preco: 229.9,
    estoque: 35,
    categoria: "Jaquetas",
    cores: ["#3B82F6", "#1E3A5F"],
    tamanhos: ["M", "G", "GG"],
    imagem: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&h=200&fit=crop",
  },
  {
    id: "hiper-2005",
    nome: "Tênis Casual Couro",
    codigo: "7891002001005",
    preco: 259.9,
    estoque: 58,
    categoria: "Calçados",
    cores: ["#FFFFFF", "#111111", "#BEA463"],
    tamanhos: ["37", "38", "39", "40", "41", "42"],
    imagem: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop",
  },
];

/** @deprecated use ErpDemoProduct */
export type BlingDemoProduct = ErpDemoProduct;
