export interface ResourceTemplate {
  id: string;
  name: string;
  description: string;
  isAutoApprove: boolean;
  imageUrl: string;
  category: CategorySummary | null;
  unit: OrganizationUnitSummary | null;
  totalQuantity?: number;
  availableQuantity?: number;
}

export interface CategorySummary {
  id: string;
  categoryName: string;
}

export interface OrganizationUnitSummary {
  id: string;
  unitName: string;
}

export interface ResourceTemplateCreateRequest {
  name: string;
  description?: string;
  isAutoApprove?: boolean;
  imageUrl?: string;
  categoryId?: string;
  unitId?: string;
}

export interface ResourceTemplateUpdateRequest {
  name: string;
  description?: string;
  isAutoApprove?: boolean;
  imageUrl?: string;
  categoryId?: string;
  unitId?: string;
}
