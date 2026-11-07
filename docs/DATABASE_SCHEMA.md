# Database Schema Document
**Project:** VyapariMitra AI  
**Engine Support:** PostgreSQL (Production) / SQLite (Local Fast Dev & Testing)  
**ORM:** SQLAlchemy 2.0  

---

## 1. Entity Relationship Overview

```
                      +-------------------+
                      |    Businesses     |
                      +-------------------+
                               | 1
                               |
         +---------------------+---------------------+---------------------+
         | *                   | *                   | *                   | *
+-----------------+   +-----------------+   +-----------------+   +-----------------+
|      Users      |   |   Categories    |   |    Customers    |   |  VoiceSessions  |
+-----------------+   +-----------------+   +-----------------+   +-----------------+
                               | 1                   | 1                   | 1
                               |                     |                     |
                               | *                   | *                   | *
                      +-----------------+   +-----------------+   +-----------------+
                      |    Products     |---|     Orders      |   |  VoiceCommands  |
                      +-----------------+   +-----------------+   +-----------------+
                               | 1                   | 1
                               |                     |
         +---------------------+                     | *
         | *                                +-----------------+
+-----------------------+                   |   OrderItems    |
| InventoryTransactions |                   +-----------------+
+-----------------------+
         | *
+-----------------+
|   SaleItems     |
+-----------------+
         | *
         | 1
+-----------------+
|     Sales       |----+
+-----------------+    | 1
                       |
                       v 1
+-----------------+  +-----------------+
|    Invoices     |  |    AuditLogs    |
+-----------------+  +-----------------+
```

---

## 2. Table Specifications

### 2.1. `businesses`
Stores merchant organization profiles.
| Field | Type | Modifiers | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | UUID v4 |
| `name` | VARCHAR(255) | NOT NULL | Registered store name |
| `owner_name` | VARCHAR(255) | NOT NULL | Owner full name |
| `phone` | VARCHAR(32) | UNIQUE, NOT NULL | Mobile number |
| `email` | VARCHAR(255) | UNIQUE, NULLABLE | Business email |
| `address` | TEXT | NULLABLE | Physical store address |
| `gstin` | VARCHAR(20) | NULLABLE | GST Identification Number |
| `preferred_language`| VARCHAR(10) | DEFAULT 'te-IN' | Primary language (te-IN, en-IN, hi-IN) |
| `currency` | VARCHAR(5) | DEFAULT 'INR' | Business currency |
| `created_at` | TIMESTAMP | DEFAULT UTC_NOW | Account creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT UTC_NOW | Last modified timestamp |

### 2.2. `users`
Authenticated staff / store owners.
| Field | Type | Modifiers | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | UUID v4 |
| `business_id` | VARCHAR(36) | FOREIGN KEY (businesses.id), NOT NULL | Tenant scope |
| `full_name` | VARCHAR(255) | NOT NULL | User's full name |
| `phone_or_email`| VARCHAR(255) | UNIQUE, NOT NULL | Login identifier |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt / Argon2 hash |
| `role` | VARCHAR(32) | DEFAULT 'owner' | owner, manager, cashier |
| `is_active` | BOOLEAN | DEFAULT TRUE | Account state |
| `created_at` | TIMESTAMP | DEFAULT UTC_NOW | Registration timestamp |

### 2.3. `categories`
Product taxonomy.
| Field | Type | Modifiers | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | UUID v4 |
| `business_id` | VARCHAR(36) | FOREIGN KEY (businesses.id), NOT NULL | Tenant scope |
| `name` | VARCHAR(120) | NOT NULL | Category name (e.g. Grains, Spices) |
| `description` | TEXT | NULLABLE | Optional details |
| `created_at` | TIMESTAMP | DEFAULT UTC_NOW | Creation timestamp |

### 2.4. `products`
Inventory item catalog with multilingual alias support.
| Field | Type | Modifiers | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | UUID v4 |
| `business_id` | VARCHAR(36) | FOREIGN KEY (businesses.id), NOT NULL | Tenant scope |
| `category_id` | VARCHAR(36) | FOREIGN KEY (categories.id), NULLABLE | Category |
| `name` | VARCHAR(255) | NOT NULL | Canonical product name (e.g., Sona Masoori Rice) |
| `telugu_name` | VARCHAR(255) | NULLABLE | Telugu script name (సోనా మసూరి బియ్యం) |
| `aliases` | JSON / TEXT | DEFAULT '[]' | Known aliases & transliterations ("rice", "biyyam") |
| `sku` | VARCHAR(64) | NULLABLE | Stock Keeping Unit / Barcode |
| `current_stock` | NUMERIC(12, 3)| NOT NULL, DEFAULT 0.000 | Current available stock |
| `unit` | VARCHAR(20) | NOT NULL, DEFAULT 'kg' | Unit: kg, litre, packet, piece |
| `cost_price` | NUMERIC(10, 2)| NOT NULL | Purchase price per unit |
| `selling_price`| NUMERIC(10, 2)| NOT NULL | Standard retail price per unit |
| `low_stock_threshold`| NUMERIC(12, 3)| DEFAULT 10.000 | Alert threshold for low inventory |
| `is_active` | BOOLEAN | DEFAULT TRUE | Active catalogue status |
| `created_at` | TIMESTAMP | DEFAULT UTC_NOW | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT UTC_NOW | Last modified timestamp |

### 2.5. `inventory_transactions`
Auditable stock ledger (ledger-based inventory management).
| Field | Type | Modifiers | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | UUID v4 |
| `business_id` | VARCHAR(36) | FOREIGN KEY (businesses.id), NOT NULL | Tenant scope |
| `product_id` | VARCHAR(36) | FOREIGN KEY (products.id), NOT NULL | Linked product |
| `type` | VARCHAR(32) | NOT NULL | IN (purchase), OUT (sale), ADJUSTMENT, RETURN |
| `quantity` | NUMERIC(12, 3)| NOT NULL | Amount moved (+ or -) |
| `balance_after` | NUMERIC(12, 3)| NOT NULL | Stock snapshot immediately following transaction |
| `unit_price` | NUMERIC(10, 2)| NULLABLE | Unit cost or price at transaction time |
| `reference_type`| VARCHAR(32) | NULLABLE | sale, manual, voice_command, purchase_order |
| `reference_id` | VARCHAR(36) | NULLABLE | Linked sale_id or voice_command_id |
| `notes` | TEXT | NULLABLE | Multilingual transcription or operator note |
| `created_at` | TIMESTAMP | DEFAULT UTC_NOW | Transaction timestamp |

### 2.6. `sales` and `sale_items`
Financial transactions and itemized invoices.
- `sales`:
  - `id`, `business_id`, `customer_id`, `invoice_number`, `subtotal`, `tax_amount`, `discount_amount`, `total_amount`, `payment_method` (cash, upi, credit), `status` (completed, cancelled, refunded), `created_at`.
- `sale_items`:
  - `id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `total_price`, `created_at`.

### 2.7. `customers` & `orders`
Customer directory and pending/fulfilled orders.
- `customers`: `id`, `business_id`, `name`, `phone`, `total_purchases`, `credit_balance`, `created_at`.
- `orders`: `id`, `business_id`, `customer_id`, `status` (pending, ready, delivered, cancelled), `total_amount`, `notes`, `created_at`.
- `order_items`: `id`, `order_id`, `product_id`, `quantity`, `unit_price`, `total_price`.

### 2.8. `voice_sessions` & `voice_commands`
Tracks every voice interaction, audio length, model used, latency, detected intent, and outcome.
- `voice_sessions`: `id`, `business_id`, `user_id`, `started_at`, `ended_at`.
- `voice_commands`: `id`, `session_id`, `business_id`, `raw_audio_path`, `transcription`, `detected_language`, `intent`, `slots` (JSON), `confidence`, `executed_action`, `timbre_audio_generated`, `latency_ms`, `idempotency_key`, `created_at`.

### 2.9. `notifications` & `audit_logs`
System alerts (e.g. low stock) and security audit trails.
