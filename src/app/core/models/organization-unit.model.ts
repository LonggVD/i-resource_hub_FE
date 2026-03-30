export interface OrganizationUnitResponse {
  id: string;
  parentId: string | null;
  unitName: string;
  unitType: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationUnitCreateRequest {
  parentId?: string;
  unitName: string;
  unitType: string;
}

export interface OrganizationUnitUpdateRequest {
  unitName: string;
  unitType: string;
}
