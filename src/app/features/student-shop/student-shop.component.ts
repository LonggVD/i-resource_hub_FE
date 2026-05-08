import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TuiButton, TuiIcon, TuiLoader, TuiScrollbar } from '@taiga-ui/core';
import { TuiPagination, TuiCarouselComponent, TuiBadge } from '@taiga-ui/kit';
import { ResourceTemplateService } from '../../core/api/resource-template-service';
import { CategoryService } from '../../core/api/category-service';
import { OrganizationUnitService } from '../../core/api/organization-unit-service';
import { ResourceTemplate } from '../../core/models/resource-template.model';
import { Category } from '../../core/models/category.model';
import { OrganizationUnitResponse } from '../../core/models/organization-unit.model';
import { CartService } from '../../core/service/cart.service';
import { IrhImage } from '../../shared/components/irh-image/irh-image.component';

@Component({
  selector: 'app-student-shop',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiScrollbar,
    TuiPagination,
    TuiBadge,
    TuiCarouselComponent,
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

  readonly isLoading = signal(false);
  private readonly _resourceList = signal<ResourceTemplate[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly units = signal<OrganizationUnitResponse[]>([]);

  // Filter Signals
  readonly searchQuery = signal('');
  readonly selectedCategoryIds = signal<Set<string>>(new Set());
  readonly selectedUnitIds = signal<Set<string>>(new Set());

  // Get names for active filters
  readonly selectedCategories = computed(() => {
    const ids = this.selectedCategoryIds();
    return this.categories().filter(c => ids.has(c.id));
  });

  readonly selectedUnits = computed(() => {
    const ids = this.selectedUnitIds();
    return this.units().filter(u => ids.has(u.id));
  });

  // Pagination Signals
  readonly pageSize = 6;
  readonly currentPage = signal(0);

  // Tree State (Expanded nodes)
  readonly expandedNodes = signal<Map<string, boolean>>(new Map());

  // Filtered List (Computed)
  readonly allFilteredResources = computed(() => {
    let list = this._resourceList();
    const search = this.searchQuery().toLowerCase();
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
    return list;
  });

  readonly filteredResources = computed(() => {
    const start = this.currentPage() * this.pageSize;
    return this.allFilteredResources().slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => Math.ceil(this.allFilteredResources().length / this.pageSize));

  // Tree Structure for Sidebar
  readonly categoryTree = computed(() => this.buildTree(this.categories()));
  readonly unitTree = computed(() => this.buildTree(this.units(), 'parentId'));

  private buildTree(items: any[], parentKey: string = 'parent'): any[] {
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

  // Carousel state
  index = 0;
  readonly banners = [
    {
      color: '#6366f1',
      title: 'Hệ thống mượn thiết bị Lab',
      desc: 'Hiện đại - Nhanh chóng - Tiện lợi',
    },
    {
      color: '#8b5cf6',
      title: 'Linh kiện IoT mới về',
      desc: 'Khám phá ngay bộ sưu tập Arduino & Raspberry Pi',
    },
    { color: '#ec4899', title: 'Máy chiếu độ nét cao', desc: 'Phục vụ thuyết trình và sự kiện' },
  ];

  readonly cartCount = this.cartService.count;

  viewDetail(id: string) {
    this.router.navigate(['/resources', id]);
  }

  onAddToCart(resource: ResourceTemplate, event: MouseEvent) {
    this.cartService.addToCart(resource, 1);
    this.animateFlyToCart(event);
  }

  private animateFlyToCart(event: MouseEvent) {
    // 1. Tìm element nguồn (hình ảnh hoặc card) và element đích (nút giỏ hàng)
    const btn = event.currentTarget as HTMLElement;
    const card = btn.closest('.product-card');
    const img = card?.querySelector('.product-img') as HTMLImageElement;
    const cartBtn = document.querySelector('.floating-cart') as HTMLElement;

    if (!img || !cartBtn) return;

    // 2. Tạo bản sao để bay
    const flyer = img.cloneNode(false) as HTMLImageElement;
    const imgRect = img.getBoundingClientRect();
    const cartRect = cartBtn.getBoundingClientRect();

    flyer.classList.add('fly-item');
    flyer.style.top = `${imgRect.top}px`;
    flyer.style.left = `${imgRect.left}px`;
    flyer.style.width = `${imgRect.width}px`;
    flyer.style.height = `${imgRect.height}px`;

    document.body.appendChild(flyer);

    // 3. Thực hiện bay (dùng timeout để trigger transition)
    requestAnimationFrame(() => {
      flyer.style.top = `${cartRect.top + 10}px`;
      flyer.style.left = `${cartRect.left + 10}px`;
      flyer.style.width = '20px';
      flyer.style.height = '20px';
      flyer.style.opacity = '0.5';
      flyer.style.transform = 'scale(0.2) rotate(360deg)';
    });

    // 4. Dọn dẹp sau khi bay xong
    setTimeout(() => {
      flyer.remove();
      // Thêm hiệu ứng rung rinh cho nút giỏ hàng
      cartBtn.classList.add('cart-bounce');
      setTimeout(() => cartBtn.classList.remove('cart-bounce'), 400);
    }, 800);
  }

  ngOnInit() {
    this.loadData();
  }

  goCart() {
    this.router.navigate(['/cart']);
  }

  loadData() {
    this.isLoading.set(true);
    this.resourceService.getAllActive().subscribe((data) => {
      this._resourceList.set(data);
      this.isLoading.set(false);
    });

    this.categoryService.getAllCategories().subscribe((cats) => this.categories.set(cats));
    this.unitService.getAllUnits().subscribe((units) => this.units.set(units));
  }

  setCategory(id: string | null) {
    if (id === null) {
      this.selectedCategoryIds.set(new Set());
    } else {
      const current = new Set(this.selectedCategoryIds());
      if (current.has(id)) current.delete(id);
      else current.add(id);
      this.selectedCategoryIds.set(current);
    }
    this.currentPage.set(0);
  }

  setUnit(id: string | null) {
    if (id === null) {
      this.selectedUnitIds.set(new Set());
    } else {
      const current = new Set(this.selectedUnitIds());
      if (current.has(id)) current.delete(id);
      else current.add(id);
      this.selectedUnitIds.set(current);
    }
    this.currentPage.set(0);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(0); // Reset to page 1 on search
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
}
