export interface Category {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  parent: Category | null;
  categoryName: string;
  description: string;
  deleted: boolean;
}

export interface CategoryCreateRequest {
  parent?: {
    id: string;
  };
  categoryName: string;
  description: string;
}
