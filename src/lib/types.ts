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

export interface GalleryItem {
  kind: "image" | "video";
  src: string;
  color?: string;
  videoType?: "link" | "file";
  name?: string;
}
