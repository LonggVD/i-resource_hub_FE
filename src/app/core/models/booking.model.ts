import { UserResponse } from './user.model';
import { ResourceItemResponse } from './resource-item.model';

export type BookingStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'BORROWED'
  | 'RETURNED'
  | 'CANCELLED'
  | 'OVERDUE';

export interface TimeSlot {
  id: string;
  slotName: string;
  startTime: string;
  endTime: string;
  disabled?: boolean;
}

export interface Booking {
  id: string;
  user?: UserResponse;
  resourceItem?: ResourceItemResponse;
  bookingDate: string;
  slot?: TimeSlot;
  purpose?: string;
  status: BookingStatus;
  qrCodeToken?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  deviceName?: string;
  borrowerName?: string;
  borrowerId?: string;
  userId?: string;
  borrowerUnitName?: string;
  slotId?: string;
  slotName?: string;
  startTime?: string;
  endTime?: string;
  serialNumber?: string;
  batchToken?: string;
  expired?: boolean;
  ownerUnitId?: string;
  ownerUnitName?: string;
  hasDamage?: boolean;
  damageDescription?: string;
  resolution?: string;
  isResolved?: boolean;
  evidenceImageUrl?: string;
  isPenalized?: boolean;
}

export interface GroupedBooking {
  batchToken: string;
  bookingDate: string;
  slotName: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  purpose: string;
  borrowerName?: string;
  borrowerId?: string;
  userId?: string;
  borrowerUnitName?: string;
  expired?: boolean;
  // Các thiết bị trong nhóm này
  items: {
    deviceName: string;
    serialNumber: string;
    id: string;
    status: BookingStatus;
    qrCodeToken?: string;
    ownerUnitName?: string;
    hasDamage?: boolean;
    damageDescription?: string;
    resolution?: string;
    isResolved?: boolean;
    evidenceImageUrl?: string;
  }[];
  // Phân nhóm theo khoa để hiển thị thông minh
  unitGroups?: {
    unitName: string;
    status: BookingStatus;
    items: any[];
    hasDamage?: boolean;
    damageDescription?: string;
    resolution?: string;
    isResolved?: boolean;
    evidenceImageUrl?: string;
  }[];
  // Tổng hợp status
  displayStatus: BookingStatus;
  hasDamage?: boolean;
  damageDescription?: string;
  resolution?: string;
  isResolved?: boolean;
  evidenceImageUrl?: string;
  isPenalized?: boolean;
}

export interface EvidenceRequest {
  bookingId: string;
  description: string;
  imageUrls: string[];
}
