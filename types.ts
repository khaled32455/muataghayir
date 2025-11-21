export interface TextPlaceholder {
  type: 'text';
  id: string;
  x: number;
  y: number;
  dataColumn: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  width: number;
  align: 'left' | 'center' | 'right';
}

export interface ImagePlaceholder {
  type: 'image';
  id:string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataSource: 'excel' | 'zip';
  dataColumn?: string;
}

export type Placeholder = TextPlaceholder | ImagePlaceholder;

export type ExcelRow = Record<string, string | number>;

export interface FontRecord {
  name: string;
  data: ArrayBuffer;
}

export interface Subscription {
  plan: 'free' | 'monthly' | 'annual';
  expiresAt: string | null; // ISO Date string e.g., '2024-12-31'
}

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  country: string;
  phone: string;
  subscription: Subscription;
}