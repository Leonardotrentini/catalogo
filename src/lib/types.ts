export interface VideoItem {
  type: "link" | "file";
  src: string;
  name?: string;
  color?: string;
}

export interface ProductImage {
  src: string;
  color?: string;
}

export interface VolumeDiscount {
  minQty: number;
  unitPrice: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  qty: number;
  sizes: string[];
  price: string;
  colors: string[];
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

export interface Brand {
  name: string;
  logo: string;
  banner: string;
  videoUrl: string;
  whatsapp: string;
  instagram: string;
  cnpj: string;
  highlights?: BrandHighlight[];
  highlightStyle?: HighlightStyle;
  checkoutButtonText?: string;
  checkoutButtonColor?: string;
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

export type AdminTab = "marca" | "produtos" | "preview";

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
