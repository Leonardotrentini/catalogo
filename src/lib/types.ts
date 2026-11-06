export interface VideoItem {
  type: "link" | "file";
  src: string;
  name?: string;
  color?: string;
  /** Position in the product gallery (photos + videos together). */
  order?: number;
}

export interface ProductImage {
  src: string;
  color?: string;
  /** Position in the product gallery (photos + videos together). */
  order?: number;
}

export interface VolumeDiscount {
  minQty: number;
  unitPrice: string;
}

export interface StockLine {
  color: string;
  size: string;
  qty: number;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  qty: number;
  sizes: string[];
  price: string;
  colors: string[];
  /** Ausente = estoque antigo (só o total). Preenchido = unidades por cor e tamanho. */
  stock?: StockLine[];
  images: ProductImage[];
  videos: VideoItem[];
  description: string;
  coverType?: "video" | "image";
  volumeDiscounts?: VolumeDiscount[];
}

export interface BrandColors {
  primary: string;
  accent: string;
  text: string;
  card: string;
}

export interface BrandSeller {
  id: string;
  name: string;
  phone: string;
}

export type BrandVideoPosition = "top" | "after-highlights" | "after-categories" | "before-footer";

export interface Brand {
  name: string;
  logo: string;
  banner: string;
  videoUrl: string;
  /** Título opcional acima do vídeo de apresentação. Vazio oculta. Ausente usa o texto padrão. */
  videoTitle?: string;
  whatsapp: string;
  sellers?: BrandSeller[];
  instagram: string;
  cnpj: string;
  highlights?: BrandHighlight[];
  highlightStyle?: HighlightStyle;
  checkoutButtonText?: string;
  checkoutButtonColor?: string;
  /** Where the presentation video sits on the catalog home. */
  videoPosition?: BrandVideoPosition;
  /** Liga o estoque por cor e tamanho. Ausente ou falso mantém o estoque único. */
  stockControl?: boolean;
  /** Pastas do catálogo (podem existir vazias). Produtos usam product.category. */
  categories?: string[];
  customProductColors?: ProductColorEntry[];
}

export interface ProductColorEntry {
  name: string;
  hex: string;
}

export type HighlightStyle = "pill" | "minimal" | "outline" | "glass";

export type HighlightIcon =
  | "globe"
  | "message"
  | "shield"
  | "card"
  | "truck"
  | "star"
  | "package"
  | "clock"
  | "award"
  | "heart";

export interface BrandHighlight {
  id: string;
  label: string;
  icon: HighlightIcon;
  enabled: boolean;
}

export interface CartItem {
  key: string;
  productId: number;
  name: string;
  color: string;
  colorName: string;
  size: string;
  qty: number;
  price: string;
  image: string;
}

export interface Influencer {
  id: string;
  catalogId: string;
  name: string;
  phone: string;
  couponCode: string;
  discountPercent: number;
  active: boolean;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
  salesCount?: number;
  salesTotal?: number;
}

export interface CouponSale {
  id: string;
  catalogId: string;
  influencerId: string | null;
  couponCode: string;
  customerName: string;
  customerPhone: string;
  pieces: number;
  total: number;
  registeredTotal: number;
  couponDiscount: number;
  source: string;
  createdAt: string;
}

export type AdminTab = "marca" | "produtos" | "preview" | "integracoes" | "cupons";

export type UserRole = "super_admin" | "tenant";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  catalog_slug: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface GalleryItem {
  kind: "image" | "video";
  src: string;
  color?: string;
  videoType?: "link" | "file";
  name?: string;
}
