export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  type?: 'work' | 'material';
  description?: string;
  code?: string;
}

export interface ProfileMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  catalogPath: string;
  categories: string[];
}

export interface ProfileCatalog {
  id: string;
  name: string;
  description: string;
  icon: string;
  categories: string[];
  items: CatalogItem[];
  synonyms?: string[][];
}

export interface EstimateItem {
  id: string;
  catalogId?: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  quantity: number;
  total: number;
  description?: string;
  type?: 'work' | 'material';
}

export interface Estimate {
  id: string;
  title: string;
  customer: string;
  companyName: string;
  date: string;
  phone?: string;
  address?: string;
  notes?: string;
  profileId: string;
  profileName?: string;
  items: EstimateItem[];
  discount: number; // percentage, e.g. 5 for 5%
  subtotal: number;
  servicesSubtotal?: number;
  materialsSubtotal?: number;
  total: number;
  createdAt: number;
  updatedAt: number;
}
