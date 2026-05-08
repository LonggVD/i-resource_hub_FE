import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TuiButton, TuiDialogService, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TuiPagination, TuiCarouselComponent, TuiBadge } from '@taiga-ui/kit';
import { TuiItem } from '@taiga-ui/cdk/directives/item';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { GuideDialogComponent } from './guide-dialog/guide-dialog.component';
import { ResourceTemplateService } from '../../core/api/resource-template-service';
import { CategoryService } from '../../core/api/category-service';
import { OrganizationUnitService } from '../../core/api/organization-unit-service';
import { ResourceTemplate } from '../../core/models/resource-template.model';
import { Category } from '../../core/models/category.model';
import { OrganizationUnitResponse } from '../../core/models/organization-unit.model';
import { CartService } from '../../core/service/cart.service';
import { AuthService } from '../../core/api/auth.service';
import { BookingService } from '../../core/api/booking.service';
import { IrhImage } from '../../shared/components/irh-image/irh-image.component';

type SortKey = 'newest' | 'name' | 'available' | 'popular';
type SlideKind = 'steps' | 'tags' | 'subtitle';
type CtaAction = 'guide' | 'scroll';

interface SlideStep {
  icon: string;
  label: string;
}

interface BannerSlide {
  kind: SlideKind;
  gradient: string;
  eyebrow: string;
  title: string;
  desc?: string;
  cta: string;
  ctaAction: CtaAction;
  icon: string;
  steps?: SlideStep[];
  tags?: string[];
  decorations?: { icon: string; className: string }[];
}

const WISHLIST_KEY = 'irh_wishlist_ids';

@Component({
  selector: 'app-student-shop',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiPagination,
    TuiBadge,
    TuiCarouselComponent,
    TuiItem,
    IrhImage,
  ],
  templateUrl: './student-shop.component.html',
  styleUrl: './student-shop.component.css',
})
export class StudentShopComponent implements OnInit {
  private readonly resourceService = inject(ResourceTemplateService);
  private readonly categoryService = inject(CategoryService);
  private readonly unitService = inject(OrganizationUnitService);
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly bookingService = inject(BookingService);
  private readonly dialogs = inject(TuiDialogService);

  @ViewChild('listSection', { static: false })
  private listSection?: ElementRef<HTMLElement>;

  readonly isLoading = signal(false);
  private readonly _resourceList = signal<ResourceTemplate[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly units = signal<OrganizationUnitResponse[]>([]);

  // Stats
  readonly creditScore = computed(() => this.authService.user()?.creditScore ?? 100);
  readonly username = computed(() => this.authService.username());
  readonly pendingBookingCount = signal(0);
  readonly activeBookingCount = signal(0);

  // Filter Signals
  readonly searchQuery = signal('');
  readonly selectedCategoryIds = signal<Set<string>>(new Set());
  readonly selectedUnitIds = signal<Set<string>>(new Set());
  readonly sortKey = signal<SortKey>('newest');

  // Wishlist
  readonly wishlist = signal<Set<string>>(this.loadWishlist());

  readonly selectedCategories = computed(() => {
    const ids = this.selectedCategoryIds();
    return this.categories().filter((c) => ids.has(c.id));
  });

  readonly selectedUnits = computed(() => {
    const ids = this.selectedUnitIds();
    return this.units().filter((u) => ids.has(u.id));
  });

  // Pagination
  readonly pageSize = 6;
  readonly currentPage = signal(0);

  // Tree expanded state
  readonly expandedNodes = signal<Map<string, boolean>>(new Map());

  // Filtered + sorted list
  readonly allFilteredResources = computed(() => {
    let list = [...this._resourceList()];
    const search = this.searchQuery().toLowerCase().trim();
    const catIds = this.selectedCategoryIds();
    const unitIds = this.selectedUnitIds();

    if (search) {
      list = list.filter((item) => item.name.toLowerCase().includes(search));
    }
    if (catIds.size > 0) {
      list = list.filter((item) => item.category && catIds.has(item.category.id));
    }
    if (unitIds.size > 0) {
      list = list.filter((item) => item.unit && unitIds.has(item.unit.id));
    }

    switch (this.sortKey()) {
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        break;
      case 'available':
        list.sort((a, b) => (b.availableQuantity ?? 0) - (a.availableQuantity ?? 0));
        break;
      case 'popular':
        // Mock: tỉ lệ "đang dùng" = 1 - available/total
        list.sort((a, b) => {
          const ra = 1 - (a.availableQuantity ?? 0) / Math.max(1, a.totalQuantity ?? 1);
          const rb = 1 - (b.availableQuantity ?? 0) / Math.max(1, b.totalQuantity ?? 1);
          return rb - ra;
        });
        break;
      case 'newest':
      default:
        // Giữ thứ tự BE trả về (giả định mới nhất ở đầu)
        break;
    }

    return list;
  });

  readonly filteredResources = computed(() => {
    const start = this.currentPage() * this.pageSize;
    return this.allFilteredResources().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() =>
    Math.ceil(this.allFilteredResources().length / this.pageSize),
  );

  readonly categoryTree = computed(() => this.buildTree(this.categories()));
  readonly unitTree = computed(() => this.buildTree(this.units(), 'parentId'));

  private buildTree(items: any[], parentKey: string = 'parentId'): any[] {
    const map = new Map();
    const roots: any[] = [];

    items.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });

    items.forEach((item) => {
      const node = map.get(item.id);
      const parentVal = item[parentKey];
      const parentId =
        typeof parentVal === 'object' && parentVal !== null ? parentVal.id : parentVal;

      if (parentId && map.has(parentId)) {
        map.get(parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  // ===== Banner carousel =====
  // Taiga UI tự pause khi hover/touch + visibilityChange — không cần code thủ công.
  // Set duration = ms giữa 2 lần auto-advance.
  index = 0;
  readonly autoplayDuration = 2000;

  readonly banners: BannerSlide[] = [
    {
      kind: 'steps',
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 55%, #06b6d4 100%)',
      eyebrow: 'Bắt đầu trong 30 giây',
      title: 'Mượn thiết bị Lab dễ dàng',
      cta: 'Xem hướng dẫn',
      ctaAction: 'guide',
      icon: '@tui.zap',
      steps: [
        { icon: '@tui.search', label: 'Tìm thiết bị' },
        { icon: '@tui.calendar-check', label: 'Đặt lịch & ca' },
        { icon: '@tui.qr-code', label: 'Quét QR nhận' },
      ],
      decorations: [
        { icon: '@tui.sparkles', className: 'deco deco-sparkle-1' },
        { icon: '@tui.sparkles', className: 'deco deco-sparkle-2' },
        { icon: '@tui.box', className: 'deco deco-box' },
      ],
    },
    {
      kind: 'tags',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #4f46e5 100%)',
      eyebrow: 'Mới về kho',
      title: 'Linh kiện IoT cho project của bạn',
      cta: 'Khám phá',
      ctaAction: 'scroll',
      icon: '@tui.cpu',
      tags: ['Arduino Uno R3', 'Raspberry Pi 4', 'ESP32', 'Sensor pack', 'Servo'],
      decorations: [
        { icon: '@tui.circuit-board', className: 'deco deco-circuit-1' },
        { icon: '@tui.cpu', className: 'deco deco-cpu' },
        { icon: '@tui.zap', className: 'deco deco-zap' },
      ],
    },
    {
      kind: 'subtitle',
      gradient: 'linear-gradient(135deg, #0e7490 0%, #0891b2 50%, #4f46e5 100%)',
      eyebrow: 'Phổ biến',
      title: 'Thiết bị trình chiếu chuyên nghiệp',
      desc: 'Máy chiếu 4K, loa kéo công suất cao, micro không dây cho mọi sự kiện trong trường.',
      cta: 'Đặt ngay',
      ctaAction: 'scroll',
      icon: '@tui.video',
      decorations: [
        { icon: '@tui.volume-2', className: 'deco deco-volume' },
        { icon: '@tui.mic', className: 'deco deco-mic' },
        { icon: '@tui.video', className: 'deco deco-video' },
      ],
    },
  ];

  goSlide(i: number) {
    this.index = i;
  }

  onCtaClick(banner: BannerSlide) {
    if (banner.ctaAction === 'guide') {
      this.openGuideDialog();
    } else if (banner.ctaAction === 'scroll') {
      this.scrollToList();
    }
  }

  private openGuideDialog() {
    this.dialogs
      .open<void>(new PolymorpheusComponent(GuideDialogComponent), {
        label: 'Hướng dẫn mượn thiết bị',
        size: 'l',
        dismissible: true,
      })
      .subscribe();
  }

  private scrollToList() {
    const el = this.listSection?.nativeElement;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  readonly cartCount = this.cartService.count;

  ngOnInit() {
    this.loadData();
    this.loadMyBookingStats();
  }

  loadData() {
    this.isLoading.set(true);
    this.resourceService.getAllActive().subscribe({
      next: (data) => {
        this._resourceList.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });

    this.categoryService.getAllCategories().subscribe((cats) => this.categories.set(cats));
    this.unitService.getAllUnits().subscribe((units) => this.units.set(units));
  }

  private loadMyBookingStats() {
    this.bookingService.getMyBookings().subscribe({
      next: (bookings) => {
        this.pendingBookingCount.set(bookings.filter((b) => b.status === 'PENDING').length);
        this.activeBookingCount.set(
          bookings.filter((b) => b.status === 'APPROVED' || b.status === 'BORROWED').length,
        );
      },
      error: () => {
        // im lặng - chỉ là widget thống kê, không hiện lỗi
      },
    });
  }

  viewDetail(id: string) {
    this.router.navigate(['/resources', id]);
  }

  goCart() {
    this.router.navigate(['/cart']);
  }

  goMyBookings() {
    this.router.navigate(['/my-bookings']);
  }

  onAddToCart(resource: ResourceTemplate, event: MouseEvent) {
    event.stopPropagation();
    this.cartService.addToCart(resource, 1);
    this.animateFlyToCart(event);
  }

  toggleWishlist(id: string, event: MouseEvent) {
    event.stopPropagation();
    const current = new Set(this.wishlist());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.wishlist.set(current);
    this.saveWishlist(current);
  }

  isWishlisted(id: string): boolean {
    return this.wishlist().has(id);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(0);
  }

  setSort(key: SortKey) {
    this.sortKey.set(key);
    this.currentPage.set(0);
  }

  setCategory(id: string | null) {
    if (id === null) {
      this.selectedCategoryIds.set(new Set());
    } else {
      const current = new Set(this.selectedCategoryIds());
      current.has(id) ? current.delete(id) : current.add(id);
      this.selectedCategoryIds.set(current);
    }
    this.currentPage.set(0);
  }

  setUnit(id: string | null) {
    if (id === null) {
      this.selectedUnitIds.set(new Set());
    } else {
      const current = new Set(this.selectedUnitIds());
      current.has(id) ? current.delete(id) : current.add(id);
      this.selectedUnitIds.set(current);
    }
    this.currentPage.set(0);
  }

  clearAllFilters() {
    this.selectedCategoryIds.set(new Set());
    this.selectedUnitIds.set(new Set());
    this.searchQuery.set('');
    this.currentPage.set(0);
  }

  toggleNode(id: string, event: Event) {
    event.stopPropagation();
    const current = this.expandedNodes();
    current.set(id, !current.get(id));
    this.expandedNodes.set(new Map(current));
  }

  isExpanded(id: string): boolean {
    return !!this.expandedNodes().get(id);
  }

  // ===== Helpers cho card =====
  getStockState(item: ResourceTemplate): 'out' | 'low' | 'medium' | 'high' {
    const qty = item.availableQuantity ?? 0;
    if (qty === 0) return 'out';
    if (qty <= 2) return 'low';
    if (qty <= 5) return 'medium';
    return 'high';
  }

  isHot(item: ResourceTemplate): boolean {
    const total = item.totalQuantity ?? 1;
    const avail = item.availableQuantity ?? 0;
    return total > 0 && avail / total < 0.3 && avail > 0;
  }

  trackById(_index: number, item: ResourceTemplate): string {
    return item.id;
  }

  // ===== Wishlist persistence =====
  private loadWishlist(): Set<string> {
    try {
      const raw = localStorage.getItem(WISHLIST_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch {
      // ignore
    }
    return new Set();
  }

  private saveWishlist(set: Set<string>) {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify([...set]));
    } catch {
      // ignore
    }
  }

  // ===== Fly-to-cart animation =====
  private animateFlyToCart(event: MouseEvent) {
    const btn = event.currentTarget as HTMLElement;
    const card = btn.closest('.product-card');
    const img = card?.querySelector('.product-img') as HTMLImageElement | null;
    const cartBtn = document.querySelector('.floating-cart') as HTMLElement | null;

    if (!img || !cartBtn) return;

    const flyer = img.cloneNode(false) as HTMLImageElement;
    const imgRect = img.getBoundingClientRect();
    const cartRect = cartBtn.getBoundingClientRect();

    flyer.classList.add('fly-item');
    flyer.style.top = `${imgRect.top}px`;
    flyer.style.left = `${imgRect.left}px`;
    flyer.style.width = `${imgRect.width}px`;
    flyer.style.height = `${imgRect.height}px`;

    document.body.appendChild(flyer);

    requestAnimationFrame(() => {
      flyer.style.top = `${cartRect.top + 10}px`;
      flyer.style.left = `${cartRect.left + 10}px`;
      flyer.style.width = '20px';
      flyer.style.height = '20px';
      flyer.style.opacity = '0.5';
      flyer.style.transform = 'scale(0.2) rotate(360deg)';
    });

    setTimeout(() => {
      flyer.remove();
      cartBtn.classList.add('cart-bounce');
      setTimeout(() => cartBtn.classList.remove('cart-bounce'), 400);
    }, 800);
  }
}
