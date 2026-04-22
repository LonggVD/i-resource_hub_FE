import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, startWith } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toSignal } from '@angular/core/rxjs-interop';
import { ColDef, ICellRendererParams } from 'ag-grid-community';

// Shared Components
import { IrhAggridComponent } from '../../shared/components/irh-aggrid/irh-aggrid.component';
import {
  IrhSelect,
  IrhSelectOption,
} from '../../shared/components/irh-select/irh-select.component';
import {
  IrhMultiSelect,
  IrhMultiSelectOption,
} from '../../shared/components/irh-multi-select/irh-multi-select.component';
import { IrhImage } from '../../shared/components/irh-image/irh-image.component';

// Services
import { ResourceItemService } from '../../core/api/resource-item-service';
import { ResourceTemplateService } from '../../core/api/resource-template-service';
import { OrganizationUnitService } from '../../core/api/organization-unit-service';
import { AuthService } from '../../core/api/auth.service';
import { NotificationService } from '../../core/api/notification';

// Models
import {
  ResourceItemResponse,
  ResourceItemCreateRequest,
  ResourceItemBatchCreateRequest,
  ResourceItemUpdateRequest,
} from '../../core/models/resource-item.model';
import { ResourceTemplate } from '../../core/models/resource-template.model';
import { OrganizationUnitResponse } from '../../core/models/organization-unit.model';

// Renderers
import { ResourceItemActionRendererComponent } from './resource-item-action-renderer.component';
import { ResourceItemStatusBadgeRendererComponent } from './resource-item-status-badge-renderer.component';

// Taiga UI
import { TuiButton, TuiIcon, TuiLoader, TuiTextfield } from '@taiga-ui/core';
import { TuiDialog } from '@taiga-ui/experimental';

// QR Code Libraries
import { QRCodeModule } from 'angularx-qrcode';
import { NgxScannerQrcodeComponent, ScannerQRCodeResult, LOAD_WASM } from 'ngx-scanner-qrcode';

@Component({
  selector: 'app-resource-items',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IrhAggridComponent,
    IrhSelect,
    IrhMultiSelect,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiTextfield,
    TuiDialog,
    IrhImage,
    QRCodeModule,
    NgxScannerQrcodeComponent,
  ],
  templateUrl: './resource-item.component.html',
  styleUrl: './resource-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceItemComponent implements OnInit, OnDestroy {
  // --- Services ---
  private readonly resourceItemService = inject(ResourceItemService);
  private readonly templateService = inject(ResourceTemplateService);
  private readonly unitService = inject(OrganizationUnitService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  // --- Scanner ViewChild ---
  @ViewChild('scannerRef') scanner!: NgxScannerQrcodeComponent;

  // --- States ---
  public readonly isLoading = signal(false);
  private readonly _rawData = signal<ResourceItemResponse[]>([]);
  public readonly templates = signal<ResourceTemplate[]>([]);
  public readonly units = signal<OrganizationUnitResponse[]>([]);

  // --- Filter State ---
  public readonly searchQuery = signal('');
  public readonly selectedConditionStatuses = signal<string[]>([]);
  public readonly selectedStatuses = signal<string[]>([]);

  // --- Auth State ---
  public readonly isAdmin = computed(
    () => this.authService.user()?.roles.includes('ADMIN') ?? false,
  );
  public readonly isManager = computed(
    () => this.authService.user()?.roles.includes('MANAGER') ?? false,
  );
  public readonly userUnitId = computed(() => this.authService.user()?.unitId);

  // --- Computed Filtered Data ---
  public readonly data = computed(() => {
    let filtered = this._rawData();
    const query = this.searchQuery().toLowerCase().trim();
    const selectedConditions = this.selectedConditionStatuses();
    const selectedStats = this.selectedStatuses();

    if (query) {
      filtered = filtered.filter(
        (item) =>
          item.serialNumber.toLowerCase().includes(query) ||
          item.template.name.toLowerCase().includes(query),
      );
    }

    if (selectedConditions.length > 0) {
      filtered = filtered.filter((item) => selectedConditions.includes(item.conditionStatus));
    }

    if (selectedStats.length > 0) {
      filtered = filtered.filter((item) => selectedStats.includes(item.status));
    }

    return filtered;
  });

  // --- Forms ---
  public itemForm = new FormGroup({
    templateId: new FormControl('', Validators.required),
    unitId: new FormControl('', Validators.required),
    serialNumber: new FormControl('', Validators.required),
    conditionStatus: new FormControl('GOOD', Validators.required),
    status: new FormControl('AVAILABLE', Validators.required),
    purchaseDate: new FormControl(''),
    warrantyExpiry: new FormControl(''),
  });

  public batchForm = new FormGroup({
    templateId: new FormControl('', Validators.required),
    unitId: new FormControl('', Validators.required),
    serialNumbersText: new FormControl('', Validators.required),
    conditionStatus: new FormControl('GOOD', Validators.required),
    status: new FormControl('AVAILABLE', Validators.required),
  });

  public qrSerialNumber = new FormControl('');

  // --- Modal Flags ---
  public showBatchModal = signal(false);
  public showQRModal = signal(false);
  public showFormModal = signal(false);
  public openPreviewDialog = signal(false);
  public isEditMode = signal(false);
  public currentEditingId = signal<string | null>(null);
  public previewImageUrl = signal('');

  // --- QR Code Print Modal ---
  public showPrintQRModal = signal(false);
  public printQRData = signal<{ serialNumber: string; templateName: string; id: string } | null>(
    null,
  );

  // --- Batch QR Print ---
  public showBatchPrintQRModal = signal(false);
  public batchPrintQRItems = signal<{ serialNumber: string; templateName: string; id: string }[]>(
    [],
  );
  public selectedRows = signal<ResourceItemResponse[]>([]);

  // --- QR Scanner State ---
  public isScannerStarted = signal(false);
  public scannerReady = signal(false);

  // --- Track Template Changes for Image Preview ---
  private readonly templateIdSignal = toSignal(
    this.itemForm
      .get('templateId')!
      .valueChanges.pipe(startWith(this.itemForm.get('templateId')?.value)),
  );

  // --- Computed Template Image for Modal ---
  public readonly selectedTemplateImageUrl = computed(() => {
    const templateId = this.templateIdSignal();
    if (!templateId) return this.PLACEHOLDER_IMG;
    const template = this.templates().find((t) => t.id === templateId);
    return template?.imageUrl || this.PLACEHOLDER_IMG;
  });

  private readonly PLACEHOLDER_IMG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>')}`;

  // --- Filter Options ---
  public readonly conditionOptions: IrhMultiSelectOption[] = [
    { label: 'Tốt', value: 'GOOD' },
    { label: 'Hư hỏng', value: 'DAMAGED' },
    { label: 'Mất', value: 'LOST' },
  ];

  public readonly statusOptions: IrhMultiSelectOption[] = [
    { label: 'Sẵn sàng', value: 'AVAILABLE' },
    { label: 'Đang sử dụng', value: 'IN_USE' },
    { label: 'Bảo trì', value: 'IN_MAINTENANCE' },
  ];

  // --- AG Grid Config ---
  public colDefs: ColDef[] = [
    {
      headerName: 'Ảnh',
      field: 'template.imageUrl',
      colId: 'thumbnail',
      width: 70,
      maxWidth: 70,
      minWidth: 70,
      flex: 0,
      filter: false,
      floatingFilter: false,
      sortable: false,
      resizable: false,
      suppressHeaderFilterButton: true,
      headerClass: 'col-no-filter',
      cellClass: 'col-no-filter',
      onCellClicked: (params: any) => {
        const url = params.value || this.PLACEHOLDER_IMG;
        this.previewImageUrl.set(url);
        this.openPreviewDialog.set(true);
        this.cdr.detectChanges();
      },
      cellStyle: {
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      cellRenderer: (params: ICellRendererParams) => {
        const url = params.value || this.PLACEHOLDER_IMG;
        return `
          <div style="width: 40px; height: 40px; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center;">
            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${this.PLACEHOLDER_IMG}'"/>
          </div>
        `;
      },
    },
    {
      headerName: 'Tên thiết bị',
      field: 'template.name',
      flex: 2,
      minWidth: 180,
      cellClass: 'font-bold text-gray-800',
    },
    {
      headerName: 'Mã Serial',
      field: 'serialNumber',
      flex: 1.5,
      minWidth: 140,
      filter: true,
      cellClass: 'font-mono text-blue-600',
    },
    {
      headerName: 'Đơn vị quản lý',
      field: 'unit.unitName',
      flex: 1.5,
      minWidth: 160,
      valueFormatter: (params: any) => params.value || 'N/A',
      cellClass: 'text-gray-600 italic',
    },
    {
      headerName: 'Tình trạng',
      field: 'conditionStatus',
      width: 140,
      cellRenderer: ResourceItemStatusBadgeRendererComponent,
    },
    {
      headerName: 'Trạng thái',
      field: 'status',
      width: 160,
      cellRenderer: ResourceItemStatusBadgeRendererComponent,
    },
    {
      headerName: 'Hành động',
      pinned: 'right',
      width: 140,
      filter: false,
      floatingFilter: false,
      sortable: false,
      resizable: false,
      suppressHeaderFilterButton: true,
      cellRenderer: ResourceItemActionRendererComponent,
      cellRendererParams: {
        onEdit: (data: any) => this.onEdit(data),
        onPrintQR: (data: any) => this.onPrintQR(data),
        onDelete: (data: any) => this.onDelete(data),
      },
    },
  ];

  // --- Constructor: Load WASM for scanner ---
  constructor() {
    LOAD_WASM('assets/wasm/ngx-scanner-qrcode.wasm').subscribe({
      next: () => {
        this.scannerReady.set(true);
      },
      error: (err) => {
        console.warn('Failed to load QR scanner WASM:', err);
      },
    });
  }

  // --- Lifecycle ---
  ngOnInit() {
    this.refreshData();
    this.loadTemplates();
    this.loadUnits();
  }

  ngOnDestroy() {
    // Ensure scanner is stopped when component is destroyed
    this.stopScanner();
  }

  // --- API Calls ---
  refreshData() {
    this.isLoading.set(true);
    this.resourceItemService.getAllActive().subscribe({
      next: (res) => {
        this._rawData.set(res);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.notification.showError('Không thể tải danh sách tài nguyên');
        this.isLoading.set(false);
      },
    });
  }

  loadTemplates() {
    this.templateService.getAllActive().subscribe((res) => {
      this.templates.set(res);
      this.cdr.detectChanges();
    });
  }

  loadUnits() {
    this.unitService.getAllUnits().subscribe((res) => {
      this.units.set(res);
      this.cdr.detectChanges();
    });
  }

  // --- Modal Logic ---
  openAddModal() {
    this.isEditMode.set(false);
    this.currentEditingId.set(null);
    this.itemForm.reset({
      conditionStatus: 'GOOD',
      status: 'AVAILABLE',
      unitId: this.isManager() ? this.userUnitId() : '',
    });
    this.showFormModal.set(true);
  }

  openBatchModal() {
    this.batchForm.reset({
      conditionStatus: 'GOOD',
      status: 'AVAILABLE',
      unitId: this.isManager() ? this.userUnitId() : '',
    });
    this.showBatchModal.set(true);
  }

  onEdit(item: ResourceItemResponse) {
    this.isEditMode.set(true);
    this.currentEditingId.set(item.id);
    this.itemForm.patchValue({
      templateId: item.template.id,
      unitId: item.unit?.id ?? '',
      serialNumber: item.serialNumber,
      conditionStatus: item.conditionStatus,
      status: item.status,
      purchaseDate: item.purchaseDate,
      warrantyExpiry: item.warrantyExpiry,
    });
    this.showFormModal.set(true);
  }

  onDelete(item: ResourceItemResponse) {
    if (confirm(`Bạn có chắc chắn muốn xóa thiết bị ${item.serialNumber}?`)) {
      this.resourceItemService.softDelete(item.id).subscribe({
        next: () => {
          this.notification.showSuccess('Đã xóa thiết bị thành công');
          this.refreshData();
        },
        error: () => this.notification.showError('Không thể xóa thiết bị'),
      });
    }
  }

  // --- QR Code Print (angularx-qrcode) ---
  onPrintQR(item: ResourceItemResponse) {
    this.printQRData.set({
      serialNumber: item.serialNumber,
      templateName: item.template.name,
      id: item.id,
    });
    this.showPrintQRModal.set(true);
  }

  /** Get QR canvas or image data URI from the print dialog */
  private getQRImageDataUrl(containerId: string): string | null {
    const canvas = document.querySelector(`#${containerId} qrcode canvas`) as HTMLCanvasElement;
    if (canvas) {
      return canvas.toDataURL('image/png');
    }
    const img = document.querySelector(`#${containerId} qrcode img`) as HTMLImageElement;
    if (img) {
      return img.src;
    }
    return null;
  }

  downloadQRCode() {
    const qrData = this.printQRData();
    if (!qrData) return;

    const qrImageSrc = this.getQRImageDataUrl('qr-print-dialog');
    if (!qrImageSrc) {
      this.notification.showError('Không tìm thấy mã QR để tải');
      return;
    }

    // Build a full label canvas (QR + device info + serial + org name)
    this.renderLabelToCanvas(qrImageSrc, qrData).then((labelCanvas) => {
      const link = document.createElement('a');
      link.download = `QR_${qrData.serialNumber}.png`;
      link.href = labelCanvas.toDataURL('image/png');
      link.click();
      this.notification.showSuccess('Đã tải ảnh tem QR');
    });
  }

  /** Render a full print-label to an offscreen canvas (QR image + text info) */
  private renderLabelToCanvas(
    qrImageSrc: string,
    data: { serialNumber: string; templateName: string },
  ): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const PADDING = 32;
        const QR_SIZE = 220;
        const canvasWidth = QR_SIZE + PADDING * 2;
        const canvasHeight = QR_SIZE + 120 + PADDING * 2;

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d')!;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Dashed border
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.roundRect(8, 8, canvasWidth - 16, canvasHeight - 16, 12);
        ctx.stroke();
        ctx.setLineDash([]);

        // QR code image
        const qrX = (canvasWidth - QR_SIZE) / 2;
        ctx.drawImage(img, qrX, PADDING, QR_SIZE, QR_SIZE);

        // Device name
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 14px Inter, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(data.templateName, canvasWidth / 2, PADDING + QR_SIZE + 24);

        // Serial number
        ctx.fillStyle = '#6366f1';
        ctx.font = '600 13px JetBrains Mono, Fira Code, monospace';
        ctx.fillText(data.serialNumber, canvasWidth / 2, PADDING + QR_SIZE + 48);

        // Org name
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 10px Inter, Segoe UI, sans-serif';
        ctx.fillText('i-Resource Hub', canvasWidth / 2, PADDING + QR_SIZE + 72);

        resolve(canvas);
      };
      img.src = qrImageSrc;
    });
  }

  printQRCode() {
    const qrData = this.printQRData();
    if (!qrData) return;

    const qrImageSrc = this.getQRImageDataUrl('qr-print-dialog');
    if (!qrImageSrc) {
      this.notification.showError('Không tìm thấy mã QR để in');
      return;
    }

    this.openPrintWindow([{ ...qrData, qrImageSrc }]);
  }

  /** Copy serial number to clipboard */
  copySerial(serial: string) {
    navigator.clipboard.writeText(serial).then(() => {
      this.notification.showSuccess('Đã sao chép mã Serial');
    });
  }

  // --- Batch QR Print ---
  onSelectionChanged(event: any) {
    const selectedData = event.api.getSelectedRows() as ResourceItemResponse[];
    this.selectedRows.set(selectedData);
  }

  openBatchPrintQR() {
    const selected = this.selectedRows();
    if (selected.length === 0) {
      this.notification.showError('Vui lòng chọn ít nhất một thiết bị để in tem QR');
      return;
    }

    this.batchPrintQRItems.set(
      selected.map((item) => ({
        serialNumber: item.serialNumber,
        templateName: item.template.name,
        id: item.id,
      })),
    );
    this.showBatchPrintQRModal.set(true);
  }

  printBatchQRCodes() {
    const items = this.batchPrintQRItems();
    if (items.length === 0) return;

    // Gather all QR image data from the batch dialog
    const qrItems: { serialNumber: string; templateName: string; qrImageSrc: string }[] = [];
    items.forEach((item, idx) => {
      const containerId = `batch-qr-item-${idx}`;
      const qrSrc = this.getQRImageDataUrl(containerId);
      if (qrSrc) {
        qrItems.push({ ...item, qrImageSrc: qrSrc });
      }
    });

    if (qrItems.length === 0) {
      this.notification.showError('Không tìm thấy mã QR để in');
      return;
    }

    this.openPrintWindow(qrItems);
  }

  /** Open a print window with one or more QR labels */
  private openPrintWindow(
    items: { serialNumber: string; templateName: string; qrImageSrc: string }[],
  ) {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      this.notification.showError('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    const labelsHtml = items
      .map(
        (item) => `
      <div class="qr-label">
        <img src="${item.qrImageSrc}" alt="QR" class="qr-img" />
        <p class="device-name">${item.templateName}</p>
        <p class="serial-number">${item.serialNumber}</p>
        <p class="org-name">i-Resource Hub</p>
      </div>
    `,
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>In mã QR - ${items.length > 1 ? items.length + ' thiết bị' : items[0].serialNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page {
              size: auto;
              margin: 10mm;
            }
            body {
              font-family: 'Inter', 'Segoe UI', sans-serif;
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 24px;
              padding: 20px;
            }
            .qr-label {
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              border: 2px dashed #cbd5e1;
              border-radius: 16px;
              padding: 24px 20px 20px;
              page-break-inside: avoid;
              width: 280px;
            }
            .qr-img {
              width: 200px;
              height: 200px;
              border-radius: 8px;
            }
            .device-name {
              font-size: 14px;
              font-weight: 700;
              color: #1e293b;
              margin: 12px 0 4px;
            }
            .serial-number {
              font-size: 12px;
              font-weight: 600;
              color: #6366f1;
              font-family: 'Courier New', monospace;
              margin: 0 0 6px;
              background: #eef2ff;
              padding: 3px 10px;
              border-radius: 6px;
            }
            .org-name {
              font-size: 10px;
              color: #94a3b8;
              letter-spacing: 0.1em;
              text-transform: uppercase;
              margin-top: 6px;
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); window.close(); }, 300);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // --- QR Scanner (ngx-scanner-qrcode) ---
  openQRScanModal() {
    this.qrSerialNumber.setValue('');
    this.showQRModal.set(true);
  }

  startScanner() {
    if (this.scanner && this.scannerReady()) {
      this.scanner.start();
      this.isScannerStarted.set(true);
    }
  }

  stopScanner() {
    if (this.scanner && this.isScannerStarted()) {
      this.scanner.stop();
      this.isScannerStarted.set(false);
    }
  }

  toggleScanner() {
    if (this.isScannerStarted()) {
      this.stopScanner();
    } else {
      this.startScanner();
    }
  }

  onScannerEvent(results: ScannerQRCodeResult[]) {
    if (results && results.length > 0) {
      const scannedValue = results[0].value;
      if (scannedValue) {
        // Stop scanner after successful scan
        this.stopScanner();

        // Set the scanned value as serial number
        this.qrSerialNumber.setValue(scannedValue);
        this.notification.showSuccess(`Đã quét mã QR: ${scannedValue}`);
        this.cdr.detectChanges();
      }
    }
  }

  onQRModalClose(open: boolean) {
    if (!open) {
      this.stopScanner();
    }
    this.showQRModal.set(open);
  }

  // --- Form Submissions ---
  submitItemForm() {
    if (this.itemForm.invalid) return;

    const payload = this.itemForm.getRawValue() as any;
    this.isLoading.set(true);

    if (this.isEditMode()) {
      this.resourceItemService.update(this.currentEditingId()!, payload).subscribe({
        next: () => {
          this.notification.showSuccess('Cập nhật thiết bị thành công');
          this.showFormModal.set(false);
          this.refreshData();
        },
        error: () => {
          this.notification.showError('Lỗi khi cập nhật thiết bị');
          this.isLoading.set(false);
        },
      });
    } else {
      this.resourceItemService.create(payload).subscribe({
        next: () => {
          this.notification.showSuccess('Thêm thiết bị thành công');
          this.showFormModal.set(false);
          this.refreshData();
        },
        error: () => {
          this.notification.showError('Lỗi khi thêm thiết bị');
          this.isLoading.set(false);
        },
      });
    }
  }

  submitBatchForm() {
    if (this.batchForm.invalid) return;

    const formVal = this.batchForm.getRawValue();
    const serialNumbers = formVal
      .serialNumbersText!.split('\n')
      .map((s) => s.trim())
      .filter((s) => s !== '');

    if (serialNumbers.length === 0) {
      this.notification.showError('Vui lòng nhập ít nhất một mã Serial');
      return;
    }

    const payload: ResourceItemBatchCreateRequest = {
      templateId: formVal.templateId!,
      conditionStatus: formVal.conditionStatus!,
      status: formVal.status!,
      serialNumbers: serialNumbers,
      unitId: formVal.unitId!,
    };

    this.isLoading.set(true);
    this.resourceItemService.batchCreate(payload).subscribe({
      next: (res) => {
        this.notification.showSuccess(`Đã nhập thành công ${res.length} thiết bị`);
        this.showBatchModal.set(false);
        this.refreshData();
      },
      error: () => {
        this.notification.showError('Lỗi khi nhập hàng loạt');
        this.isLoading.set(false);
      },
    });
  }

  handleScan() {
    const serial = this.qrSerialNumber.value;
    if (!serial) return;

    this.isLoading.set(true);
    this.resourceItemService.getBySerialNumber(serial).subscribe({
      next: (res) => {
        this.notification.showSuccess(`Tìm thấy thiết bị: ${res.template.name}`);
        this.showQRModal.set(false);
        this.stopScanner();
        this.onEdit(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.notification.showError('Không tìm thấy thiết bị');
        this.isLoading.set(false);
      },
    });
  }

  getTemplateOptions(): IrhSelectOption[] {
    return this.templates().map((t) => ({ label: t.name, value: t.id }));
  }

  getUnitOptions(): IrhSelectOption[] {
    return this.units().map((u) => ({ label: u.unitName, value: u.id }));
  }

  onSearchChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }
}
