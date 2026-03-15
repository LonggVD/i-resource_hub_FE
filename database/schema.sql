-- ========================================================================
-- PHẦN 1: TỔ CHỨC & BẢO MẬT (ORGANIZATION & SECURITY)
-- ========================================================================

CREATE TABLE organization_units (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    parent_id CHAR(36),
    unit_name VARCHAR(100) NOT NULL,
    unit_type VARCHAR(50) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES organization_units(id)
);

CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    unit_id CHAR(36),
    student_code VARCHAR(20) UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    credit_score INT DEFAULT 100 CHECK (credit_score >= 0),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    last_login_at TIMESTAMP NULL,
    failed_login_attempt INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    version INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by CHAR(36),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (unit_id) REFERENCES organization_units(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE roles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    permission_code VARCHAR(100) UNIQUE NOT NULL,
    resource_code VARCHAR(50),
    action_code VARCHAR(50),
    description TEXT
);

CREATE TABLE user_roles (
    user_id CHAR(36),
    role_id CHAR(36),
    assigned_by CHAR(36),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

CREATE TABLE role_permissions (
    role_id CHAR(36),
    permission_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE role_data_scopes (
    role_id CHAR(36),
    scope_type VARCHAR(50) NOT NULL,
    PRIMARY KEY (role_id, scope_type),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ========================================================================
-- PHẦN 2: QUẢN LÝ KHO TÀI NGUYÊN (INVENTORY)
-- ========================================================================

CREATE TABLE categories (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    parent_id CHAR(36),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE resource_templates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    category_id CHAR(36),
    unit_id CHAR(36),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_auto_approve BOOLEAN DEFAULT FALSE,
    image_url VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (unit_id) REFERENCES organization_units(id)
);

CREATE TABLE resource_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    template_id CHAR(36),
    serial_number VARCHAR(50) UNIQUE NOT NULL,
    purchase_date DATE,
    warranty_expiry DATE,
    condition_status VARCHAR(20) DEFAULT 'GOOD',
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    version INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES resource_templates(id)
);

CREATE TABLE resource_maintenances (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    resource_item_id CHAR(36),
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'IN_PROGRESS',
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_item_id) REFERENCES resource_items(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ========================================================================
-- PHẦN 3: ĐẶT LỊCH (BOOKING CORE) & KỸ THUẬT CHỐNG TRÙNG (MySQL Cách)
-- ========================================================================

CREATE TABLE time_slots (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    slot_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    day_of_week INT
);

CREATE TABLE bookings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    resource_item_id CHAR(36),
    booking_date DATE NOT NULL,
    slot_id CHAR(36),
    purpose TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by CHAR(36),
    approved_at TIMESTAMP NULL,
    rejected_reason TEXT,
    cancelled_at TIMESTAMP NULL,
    cancelled_reason TEXT,
    overdue_marked_at TIMESTAMP NULL,
    qr_code_token VARCHAR(255) UNIQUE,
    actual_start_time TIMESTAMP NULL,
    actual_end_time TIMESTAMP NULL,
    version INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- TẠO CỘT ẢO ĐỂ LÀM UNIQUE INDEX CHỐNG DOUBLE BOOKING TRONG MYSQL
    active_flag INT GENERATED ALWAYS AS (
        CASE WHEN status IN ('PENDING', 'APPROVED', 'BORROWED') AND is_deleted = FALSE THEN 1 ELSE NULL END
    ) STORED,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resource_item_id) REFERENCES resource_items(id),
    FOREIGN KEY (slot_id) REFERENCES time_slots(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Index chống trùng lịch với cột ảo vừa tạo
CREATE UNIQUE INDEX uq_active_booking
ON bookings (resource_item_id, booking_date, slot_id, active_flag);

-- ========================================================================
-- PHẦN 4: HẬU KIỂM, MINH CHỨNG & HỆ THỐNG
-- ========================================================================

CREATE TABLE booking_participants (
    booking_id CHAR(36),
    user_id CHAR(36),
    PRIMARY KEY (booking_id, user_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE booking_histories (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36),
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by CHAR(36),
    reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE booking_evidences (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36),
    evidence_type VARCHAR(20),
    image_url VARCHAR(255) NOT NULL,
    description TEXT,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE penalties (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    booking_id CHAR(36),
    penalty_type VARCHAR(50),
    penalty_point INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE audit_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    table_name VARCHAR(100) NOT NULL,
    record_id CHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_data JSON,
    new_data JSON,
    changed_by CHAR(36),
    ip_address VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE notifications (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    type VARCHAR(50),
    reference_id CHAR(36),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_push_sent BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE system_configs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value VARCHAR(255) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
