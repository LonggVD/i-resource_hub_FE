export interface ResourceItemResponse {
  id: string;
  serialNumber: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  conditionStatus: string;
  conditionDetail?: string;
  status: string;
  template: {
    id: string;
    name: string;
    imageUrl: string;
  };
  unit?: {
    id: string;
    unitName: string;
  };
}

export interface ResourceItemCreateRequest {
  templateId: string;
  serialNumber: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  conditionStatus: string;
  conditionDetail?: string;
  status: string;
  unitId: string;
}

export interface ResourceItemBatchCreateRequest {
  templateId: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  conditionStatus: string;
  conditionDetail?: string;
  status: string;
  serialNumbers: string[];
  unitId: string;
}

export interface ResourceItemUpdateRequest {
  templateId: string;
  serialNumber: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  conditionStatus: string;
  conditionDetail?: string;
  status: string;
  unitId: string;
}
