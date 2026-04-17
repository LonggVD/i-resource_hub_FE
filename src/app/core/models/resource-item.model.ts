export interface ResourceItemResponse {
  id: string;
  serialNumber: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  conditionStatus: string; // "GOOD", "DAMAGED", "LOST"
  conditionDetail?: string;
  status: string; // "AVAILABLE", "IN_USE", "IN_MAINTENANCE"
  template: {
    id: string;
    name: string;
    imageUrl: string;
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
}

export interface ResourceItemBatchCreateRequest {
  templateId: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  conditionStatus: string;
  conditionDetail?: string;
  status: string;
  serialNumbers: string[];
}

export interface ResourceItemUpdateRequest {
  templateId: string;
  serialNumber: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  conditionStatus: string;
  conditionDetail?: string;
  status: string;
}
