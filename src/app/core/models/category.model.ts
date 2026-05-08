export interface Category {
  id: string;
  parentId: string | null;
  parentName: string | null;
  categoryName: string;
  description: string;
  status: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryCreateRequest {
  parentId?: string;
  categoryName: string;
  description: string;
  status?: string;
}
