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
  slotId?: string;
  slotName?: string;
  startTime?: string;
  endTime?: string;
}

export interface EvidenceRequest {
  bookingId: string;
  description: string;
  imageUrls: string[];
}
