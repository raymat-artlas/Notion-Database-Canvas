export interface Database {
  id: string; // UUID (Supabase)
  name: string;
  x: number;
  y: number;
  color: string;
  properties: Property[];
  memo?: string; // メモ機能
  isCollapsed?: boolean; // 折りたたみ状態
  createdAt: Date; // TIMESTAMP WITH TIME ZONE (Supabase)
  updatedAt: Date; // TIMESTAMP WITH TIME ZONE (Supabase)
}

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  required: boolean;
  options?: SelectOption[];
  order: number;
  relationConfig?: RelationConfig;
  rollupConfig?: RollupConfig;
  formulaConfig?: FormulaConfig;
  dateConfig?: DateConfig;
  numberConfig?: NumberConfig;
  memo?: string; // プロパティ用メモ機能
  selectedValues?: string[]; // For multi-select properties to store selected option IDs
}

export interface RelationConfig {
  targetDatabaseId: string;
  relationName?: string;
  isDualProperty: boolean;
  isParent?: boolean; // true if this is the parent side of the relation
  linkedPropertyId?: string; // ID of the corresponding property on the other side
}

export interface RollupConfig {
  relationPropertyId: string;
  targetPropertyId: string;
  aggregation: 'count' | 'sum' | 'average' | 'min' | 'max' | 'earliest' | 'latest';
}

export interface FormulaConfig {
  expression: string;
  referencedProperties: string[]; // Referenced property names
}

export interface DateConfig {
  format: 'date' | 'datetime';
  includeTime: boolean;
}

export interface NumberConfig {
  format: 'number' | 'currency' | 'percent';
  currency?: string; // For currency format
}

export interface SelectOption {
  id: string;
  name: string;
  color: string;
}

export type PropertyType = 
  | 'title'
  | 'text'
  | 'number'
  | 'select'
  | 'multi-select'
  | 'status'
  | 'date'
  | 'person'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by'
  | 'button'
  | 'id'
  | 'expiry';

export interface Relation {
  id: string; // UUID (Supabase)
  fromDatabaseId: string; // UUID (Supabase)
  toDatabaseId: string;   // UUID (Supabase)
  type: 'single' | 'dual' | 'formula';
  label?: string;
  fromPropertyName: string;
  toPropertyName: string;
  fromPropertyId?: string; // ID of the parent property
  toPropertyId?: string;   // ID of the child property
  rollups?: Rollup[];
}

export interface Rollup {
  id: string;
  name: string;
  sourceProperty: string;
  function: 'count' | 'sum' | 'average' | 'min' | 'max';
}

export interface Project {
  id: string;
  name: string;
  databases: Database[];
  relations: Relation[];
  canvas: CanvasState;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  selectedIds: string[];
}

