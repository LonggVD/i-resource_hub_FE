import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiDialogContext, TuiIcon } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

interface GuideStep {
  num: number;
  icon: string;
  title: string;
  bullets: string[];
  hint?: string;
}

@Component({
  selector: 'app-guide-dialog',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiIcon],
  templateUrl: './guide-dialog.component.html',
  styleUrl: './guide-dialog.component.css',
})
export class GuideDialogComponent {
  readonly context = inject<TuiDialogContext<void, void>>(POLYMORPHEUS_CONTEXT);

  readonly steps: GuideStep[] = [
    {
      num: 1,
      icon: '@tui.search',
      title: 'Tìm thiết bị bạn cần',
      bullets: [
        'Chọn danh mục (Máy chiếu, IoT, Âm thanh…) hoặc lọc theo Khoa/Đơn vị',
        'Gõ tên thiết bị vào ô tìm kiếm để tra cứu nhanh',
        'Bấm "Chi tiết" trên thẻ để xem mô tả, hình ảnh, tình trạng',
      ],
      hint: 'Mẹo: Mục "Phổ biến" ở thanh sắp xếp giúp bạn xem thiết bị được mượn nhiều nhất.',
    },
    {
      num: 2,
      icon: '@tui.calendar-check',
      title: 'Đặt lịch & chọn ca mượn',
      bullets: [
        'Bấm "Mượn ngay" → chọn ngày, ca (sáng / chiều / tối) và số lượng',
        'Có thể thêm nhiều thiết bị vào giỏ rồi gửi đơn 1 lần',
        'Ghi rõ mục đích sử dụng để giáo vụ duyệt nhanh hơn',
      ],
      hint: 'Đơn ở trạng thái "Chờ duyệt" có thể tự huỷ trước giờ ca mượn 30 phút.',
    },
    {
      num: 3,
      icon: '@tui.qr-code',
      title: 'Quét QR để nhận thiết bị',
      bullets: [
        'Sau khi đơn được Duyệt, đến phòng thiết bị đúng ca đã đặt',
        'Mở mục "Đơn của tôi" — hiển thị mã QR cho thủ kho quét',
        'Kiểm tra thiết bị trước khi rời phòng để tránh tranh chấp',
      ],
    },
    {
      num: 4,
      icon: '@tui.package-check',
      title: 'Trả thiết bị đúng giờ',
      bullets: [
        'Mang thiết bị về đúng phòng đã mượn trước khi ca kết thúc',
        'Báo cáo ngay nếu thiết bị bị hỏng / mất mát — kèm ảnh minh chứng',
        'Trả trễ hoặc làm hỏng sẽ bị trừ điểm tín nhiệm theo quy định',
      ],
      hint: 'Điểm tín nhiệm dưới 50 sẽ bị tạm khoá quyền mượn cho đến khi cải thiện.',
    },
  ];

  readonly tips: { icon: string; text: string }[] = [
    { icon: '@tui.zap', text: 'Đặt sớm 1-2 ngày trước khi cần dùng để tránh hết slot' },
    { icon: '@tui.heart', text: 'Bấm tim trên thẻ để lưu thiết bị yêu thích, mượn lại dễ dàng' },
    { icon: '@tui.shopping-cart', text: 'Dùng giỏ hàng khi cần mượn nhiều thiết bị cho 1 sự kiện' },
    { icon: '@tui.shield-check', text: 'Tăng điểm tín nhiệm bằng cách trả đúng hạn, giữ thiết bị tốt' },
  ];

  close() {
    this.context.completeWith();
  }
}
