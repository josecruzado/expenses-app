export interface Categoria {
  id: string;
  icon: string;
  name: string;
  createdAt?: Date;
  isFavorite?: boolean;
}

export interface Gasto {
  id: string;
  categoriaId: string; // Referencia a la categoría
  fecha: Date; // Formato español
  monto: number;
  nota: string;
}

export interface GastoWithCategory extends Gasto {
  categoria: Categoria;
}

export interface CreateGastoData {
  categoriaId: string;
  fecha: Date;
  monto: number;
  nota: string;
}

export interface UpdateGastoData extends Partial<CreateGastoData> {}