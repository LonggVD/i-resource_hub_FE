// Type shim cho thư viện 'qrcode' (peer dep của angularx-qrcode).
// Chỉ khai báo các API mà ứng dụng dùng — không bao trùm toàn bộ surface.
declare module 'qrcode' {
  export interface QrCodeToDataURLOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' | 'low' | 'medium' | 'quartile' | 'high';
    margin?: number;
    scale?: number;
    width?: number;
    color?: { dark?: string; light?: string };
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
  }

  export function toDataURL(text: string, options?: QrCodeToDataURLOptions): Promise<string>;
}
