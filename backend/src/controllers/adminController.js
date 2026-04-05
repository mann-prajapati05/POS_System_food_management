import bcrypt from 'bcrypt';
import { unlink } from 'fs/promises';
import path from 'path';
import { query } from '../config/db.js';

const USER_ROLES = new Set(['staff', 'kitchen', 'admin']);
const TABLE_STATUSES = new Set(['available', 'occupied']);
const PAYMENT_METHODS = new Set(['cash', 'card', 'digital', 'upi']);
let usersHasPosIdColumnCache = null;

function generatePosUniqueId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `POS-${random}`;
}

function normalizePaymentMethod(method) {
  return method === 'digital' ? 'card' : method;
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(value) {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function parseBoolean(value, defaultValue = null) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return null;
}

function normalizeImagePath(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const raw = String(value).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/uploads/')) return raw;
  return null;
}

function buildProductImagePath(req) {
  if (req.file?.filename) {
    return `/uploads/products/${req.file.filename}`;
  }

  return normalizeImagePath(
    req.body?.image_path ?? req.body?.imagePath ?? req.body?.image_url ?? req.body?.imageUrl ?? req.body?.image
  );
}

function isLocalProductUploadPath(imagePath) {
  return typeof imagePath === 'string' && imagePath.startsWith('/uploads/products/');
}

async function removeProductImageIfExists(imagePath) {
  if (!isLocalProductUploadPath(imagePath)) return;
  try {
    const relative = imagePath.replace(/^\/+/, '');
    const fullPath = path.resolve(process.cwd(), relative);
    await unlink(fullPath);
  } catch {
    // Ignore missing file/unlink errors to avoid blocking product changes.
  }
}

async function removeUploadedFileIfExists(file) {
  if (!file?.path) return;
  try {
    await unlink(file.path);
  } catch {
    // Ignore cleanup failures.
  }
}

async function usersHasPosIdColumn() {
  if (usersHasPosIdColumnCache !== null) {
    return usersHasPosIdColumnCache;
  }

  const result = await query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
       AND column_name = 'pos_id'
     LIMIT 1`
  );

  usersHasPosIdColumnCache = Boolean(result.rows[0]);
  return usersHasPosIdColumnCache;
}

async function ensurePosTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS pos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );
}

export async function listPos(req, res) {
  try {
    await ensurePosTable();
    const result = await query(
      `SELECT id, name, code AS unique_id, is_active, created_at
       FROM pos
       ORDER BY created_at DESC`
    );

    return res.status(200).json({ pos: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch POS list' });
  }
}

export async function createPos(req, res) {
  try {
    await ensurePosTable();
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'POS name is required' });
    }

    const normalizedName = String(name).trim();
    const existingByName = await query(
      'SELECT id FROM pos WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [normalizedName]
    );

    if (existingByName.rows[0]) {
      return res.status(409).json({ error: 'POS name already exists' });
    }

    let uniqueId = null;
    for (let i = 0; i < 8; i += 1) {
      const candidate = generatePosUniqueId();
      const exists = await query('SELECT 1 FROM pos WHERE code = $1 LIMIT 1', [candidate]);
      if (!exists.rows[0]) {
        uniqueId = candidate;
        break;
      }
    }

    if (!uniqueId) {
      return res.status(500).json({ error: 'Failed to generate POS unique ID' });
    }

    const created = await query(
      `INSERT INTO pos (name, code, is_active)
       VALUES ($1, $2, true)
       RETURNING id, name, code AS unique_id, is_active, created_at`,
      [normalizedName, uniqueId]
    );

    return res.status(201).json({ pos: created.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create POS' });
  }
}

async function getDefaultPosId() {
  await ensurePosTable();
  await query(
    `INSERT INTO pos (name, code)
     SELECT 'Main POS', 'MAIN'
     WHERE NOT EXISTS (SELECT 1 FROM pos WHERE code = 'MAIN')`
  );
  const result = await query('SELECT id FROM pos ORDER BY created_at ASC LIMIT 1');
  return result.rows[0]?.id || null;
}

async function resolveAdminUserPosId(posIdCandidate) {
  if (!(await usersHasPosIdColumn())) {
    return null;
  }

  await ensurePosTable();

  if (posIdCandidate) {
    const found = await query('SELECT id FROM pos WHERE id = $1 LIMIT 1', [posIdCandidate]);
    if (!found.rows[0]) {
      return null;
    }
    return found.rows[0].id;
  }

  return getDefaultPosId();
}

async function resolveAdminPosScope(req, requestedPosIdRaw) {
  await ensurePosTable();

  const requestedPosId = requestedPosIdRaw ? String(requestedPosIdRaw).trim() : null;
  if (requestedPosId && !isUuid(requestedPosId)) {
    return { error: 'posId must be a valid UUID', status: 400 };
  }

  if (req.user?.role !== 'admin') {
    if (!req.user?.posId) {
      return { error: 'POS context missing', status: 403 };
    }

    if (requestedPosId && requestedPosId !== req.user.posId) {
      return { error: 'Forbidden for requested POS', status: 403 };
    }

    return {
      posIds: [req.user.posId],
      selectedPosId: requestedPosId || req.user.posId,
    };
  }

  // Admin has access to all POS.
  const allPosRes = await query('SELECT id FROM pos ORDER BY created_at ASC');
  const accessiblePosIds = allPosRes.rows.map((row) => row.id);

  if (accessiblePosIds.length === 0) {
    return { error: 'No POS available', status: 404 };
  }

  if (requestedPosId) {
    if (!accessiblePosIds.includes(requestedPosId)) {
      return { error: 'Forbidden for requested POS', status: 403 };
    }
    return {
      posIds: [requestedPosId],
      selectedPosId: requestedPosId,
    };
  }

  return {
    posIds: accessiblePosIds,
    selectedPosId: accessiblePosIds[0],
  };
}

export async function createUser(req, res) {
  try {
    const { name, email, password, role, posId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password and role are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!USER_ROLES.has(role)) {
      return res.status(400).json({ error: 'Invalid role. Allowed: admin, staff, kitchen' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const hasPosColumn = await usersHasPosIdColumn();
    const resolvedPosId = await resolveAdminUserPosId(posId);

    if (hasPosColumn && !resolvedPosId) {
      return res.status(400).json({ error: 'Invalid or missing posId' });
    }

    const insertQuery = hasPosColumn
      ? `INSERT INTO users (name, email, password, role, pos_id, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id, name, email, role, pos_id, is_active, created_at, updated_at`
      : `INSERT INTO users (name, email, password, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, name, email, role, is_active, created_at, updated_at`;

    const insertValues = hasPosColumn
      ? [name.trim(), String(email).toLowerCase().trim(), passwordHash, role, resolvedPosId]
      : [name.trim(), String(email).toLowerCase().trim(), passwordHash, role];

    const result = await query(
      insertQuery,
      insertValues
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    return res.status(500).json({ error: 'Failed to create user' });
  }
}

export async function listUsers(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { role, isActive, q } = req.query;
    const values = [scope.posIds];
    const where = ['pos_id = ANY($1::uuid[])'];

    if (role) {
      if (!USER_ROLES.has(role)) {
        return res.status(400).json({ error: 'Invalid role filter' });
      }
      values.push(role);
      where.push(`role = $${values.length}`);
    }

    if (isActive !== undefined) {
      const parsed = parseBoolean(isActive);
      if (parsed === null) {
        return res.status(400).json({ error: 'isActive must be true or false' });
      }
      values.push(parsed);
      where.push(`is_active = $${values.length}`);
    }

    if (q) {
      values.push(`%${String(q).trim()}%`);
      where.push(`(name ILIKE $${values.length} OR email ILIKE $${values.length})`);
    }

    const result = await query(
      `SELECT id, name, email, role, is_active, created_at, updated_at
       FROM users
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY created_at DESC`,
      values
    );

    return res.status(200).json({ users: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function updateUser(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { userId } = req.params;
    const { name, role, isActive } = req.body;

    if (!isUuid(userId)) {
      return res.status(400).json({ error: 'userId must be a valid UUID' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ error: 'name cannot be empty' });
      }
      values.push(String(name).trim());
      updates.push(`name = $${values.length}`);
    }

    if (role !== undefined) {
      if (!USER_ROLES.has(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      values.push(role);
      updates.push(`role = $${values.length}`);
    }

    if (isActive !== undefined) {
      const parsed = parseBoolean(isActive);
      if (parsed === null) {
        return res.status(400).json({ error: 'isActive must be true or false' });
      }
      values.push(parsed);
      updates.push(`is_active = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    values.push(userId);
    values.push(scope.posIds);

    const result = await query(
      `UPDATE users
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length - 1} AND pos_id = ANY($${values.length}::uuid[])
       RETURNING id, name, email, role, pos_id, is_active, created_at, updated_at`,
      values
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user' });
  }
}

export async function deleteUser(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId || req.body.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { userId } = req.params;

    if (!isUuid(userId)) {
      return res.status(400).json({ error: 'userId must be a valid UUID' });
    }

    const dependencyCheck = await query(
      `SELECT
        EXISTS(SELECT 1 FROM pos_sessions WHERE opened_by = $1 AND pos_id = ANY($2::uuid[])) AS has_sessions,
        EXISTS(SELECT 1 FROM orders WHERE pos_id = ANY($2::uuid[]) AND (created_by = $1 OR assigned_kitchen_user = $1)) AS has_orders`,
      [userId, scope.posIds]
    );

    if (dependencyCheck.rows[0]?.has_sessions || dependencyCheck.rows[0]?.has_orders) {
      const deactivated = await query(
        `UPDATE users
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND pos_id = ANY($2::uuid[])
         RETURNING id, name, email, role, pos_id, is_active`,
        [userId, scope.posIds]
      );

      if (!deactivated.rows[0]) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        message: 'User has linked records and was disabled instead of deleted',
        user: deactivated.rows[0],
      });
    }

    const deleted = await query(
      'DELETE FROM users WHERE id = $1 AND pos_id = ANY($2::uuid[]) RETURNING id, name, email, role, pos_id',
      [userId, scope.posIds]
    );

    if (!deleted.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ message: 'User deleted successfully', user: deleted.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}

export async function createCategory(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { name, description } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const result = await query(
      `INSERT INTO categories (name, description, pos_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, pos_id, created_at`,
      [String(name).trim(), description || null, scope.selectedPosId]
    );

    return res.status(201).json({ category: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    return res.status(500).json({ error: 'Failed to create category' });
  }
}

export async function listCategories(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const result = await query(
      `SELECT c.id, c.name, c.description, c.created_at,
              COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.pos_id = c.pos_id
       WHERE c.pos_id = ANY($1::uuid[])
       GROUP BY c.id
       ORDER BY c.name ASC`,
      [scope.posIds]
    );

    return res.status(200).json({ categories: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

export async function updateCategory(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId || req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { categoryId } = req.params;
    const { name, description } = req.body;

    if (!isUuid(categoryId)) {
      return res.status(400).json({ error: 'categoryId must be a valid UUID' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ error: 'name cannot be empty' });
      }
      values.push(String(name).trim());
      updates.push(`name = $${values.length}`);
    }

    if (description !== undefined) {
      values.push(description || null);
      updates.push(`description = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    values.push(categoryId);
    values.push(scope.posIds);

    const result = await query(
      `UPDATE categories
       SET ${updates.join(', ')}
       WHERE id = $${values.length - 1} AND pos_id = ANY($${values.length}::uuid[])
       RETURNING id, name, description, pos_id, created_at`,
      values
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.status(200).json({ category: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    return res.status(500).json({ error: 'Failed to update category' });
  }
}

export async function deleteCategory(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId || req.body.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { categoryId } = req.params;

    if (!isUuid(categoryId)) {
      return res.status(400).json({ error: 'categoryId must be a valid UUID' });
    }

    const inUse = await query(
      'SELECT 1 FROM products WHERE category_id = $1 AND pos_id = ANY($2::uuid[]) LIMIT 1',
      [categoryId, scope.posIds]
    );
    if (inUse.rows[0]) {
      return res.status(409).json({ error: 'Cannot delete category with existing products' });
    }

    const result = await query(
      'DELETE FROM categories WHERE id = $1 AND pos_id = ANY($2::uuid[]) RETURNING id, name, description, pos_id',
      [categoryId, scope.posIds]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.status(200).json({ message: 'Category deleted successfully', category: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete category' });
  }
}

export async function createProduct(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId);
    if (scope.error) {
      await removeUploadedFileIfExists(req.file);
      return res.status(scope.status).json({ error: scope.error });
    }
    const { name, categoryId, price, description, isAvailable } = req.body;
    const imagePath = buildProductImagePath(req);

    if (!name || !categoryId || price === undefined) {
      await removeUploadedFileIfExists(req.file);
      return res.status(400).json({ error: 'name, categoryId and price are required' });
    }

    if (!isUuid(categoryId)) {
      await removeUploadedFileIfExists(req.file);
      return res.status(400).json({ error: 'categoryId must be a valid UUID' });
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      await removeUploadedFileIfExists(req.file);
      return res.status(400).json({ error: 'price must be a positive number' });
    }

    const category = await query('SELECT id FROM categories WHERE id = $1 AND pos_id = $2', [categoryId, scope.selectedPosId]);
    if (!category.rows[0]) {
      await removeUploadedFileIfExists(req.file);
      return res.status(404).json({ error: 'Category not found' });
    }

    const available = isAvailable === undefined ? true : parseBoolean(isAvailable);
    if (available === null) {
      await removeUploadedFileIfExists(req.file);
      return res.status(400).json({ error: 'isAvailable must be true or false' });
    }

    const result = await query(
      `INSERT INTO products (name, category_id, price, image_path, description, is_available, pos_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, category_id, price, image_path, image_path AS image_url, description, is_available, pos_id, created_at, updated_at`,
      [String(name).trim(), categoryId, parsedPrice, imagePath, description || null, available, scope.selectedPosId]
    );

    return res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    await removeUploadedFileIfExists(req.file);
    return res.status(500).json({ error: 'Failed to create product' });
  }
}

export async function listProducts(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { categoryId, isAvailable, q } = req.query;
    const values = [scope.posIds];
    const where = ['p.pos_id = ANY($1::uuid[])'];

    if (categoryId) {
      if (!isUuid(categoryId)) {
        return res.status(400).json({ error: 'categoryId must be a valid UUID' });
      }
      values.push(categoryId);
      where.push(`p.category_id = $${values.length}`);
    }

    if (isAvailable !== undefined) {
      const parsed = parseBoolean(isAvailable);
      if (parsed === null) {
        return res.status(400).json({ error: 'isAvailable must be true or false' });
      }
      values.push(parsed);
      where.push(`p.is_available = $${values.length}`);
    }

    if (q) {
      values.push(`%${String(q).trim()}%`);
      where.push(`(p.name ILIKE $${values.length} OR p.description ILIKE $${values.length})`);
    }

    const result = await query(
      `SELECT
         p.id,
         p.name,
         p.category_id,
         c.name AS category_name,
         p.price,
         p.image_path,
         p.image_path AS image_url,
         p.description,
         p.is_available,
         p.created_at,
         p.updated_at
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY p.created_at DESC`,
      values
    );

    return res.status(200).json({ products: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}

export async function updateProduct(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId);
    if (scope.error) {
      await removeUploadedFileIfExists(req.file);
      return res.status(scope.status).json({ error: scope.error });
    }
    const { productId } = req.params;
    const { name, categoryId, price, description, isAvailable } = req.body;

    if (!isUuid(productId)) {
      await removeUploadedFileIfExists(req.file);
      return res.status(400).json({ error: 'productId must be a valid UUID' });
    }

    const existingRes = await query(
      'SELECT id, image_path FROM products WHERE id = $1 AND pos_id = ANY($2::uuid[])',
      [productId, scope.posIds]
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      await removeUploadedFileIfExists(req.file);
      return res.status(404).json({ error: 'Product not found' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      if (!String(name).trim()) {
        await removeUploadedFileIfExists(req.file);
        return res.status(400).json({ error: 'name cannot be empty' });
      }
      values.push(String(name).trim());
      updates.push(`name = $${values.length}`);
    }

    if (categoryId !== undefined) {
      if (!isUuid(categoryId)) {
        await removeUploadedFileIfExists(req.file);
        return res.status(400).json({ error: 'categoryId must be a valid UUID' });
      }
      const category = await query('SELECT id FROM categories WHERE id = $1 AND pos_id = ANY($2::uuid[])', [categoryId, scope.posIds]);
      if (!category.rows[0]) {
        await removeUploadedFileIfExists(req.file);
        return res.status(404).json({ error: 'Category not found' });
      }
      values.push(categoryId);
      updates.push(`category_id = $${values.length}`);
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        await removeUploadedFileIfExists(req.file);
        return res.status(400).json({ error: 'price must be a positive number' });
      }
      values.push(parsedPrice);
      updates.push(`price = $${values.length}`);
    }

    if (description !== undefined) {
      values.push(description || null);
      updates.push(`description = $${values.length}`);
    }

    const uploadedImagePath = req.file ? buildProductImagePath(req) : null;
    if (uploadedImagePath) {
      values.push(uploadedImagePath);
      updates.push(`image_path = $${values.length}`);
    }

    if (isAvailable !== undefined) {
      const parsed = parseBoolean(isAvailable);
      if (parsed === null) {
        await removeUploadedFileIfExists(req.file);
        return res.status(400).json({ error: 'isAvailable must be true or false' });
      }
      values.push(parsed);
      updates.push(`is_available = $${values.length}`);
    }

    if (updates.length === 0) {
      await removeUploadedFileIfExists(req.file);
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    values.push(productId);
    values.push(scope.posIds);

    const result = await query(
      `UPDATE products
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length - 1} AND pos_id = ANY($${values.length}::uuid[])
       RETURNING id, name, category_id, price, image_path, image_path AS image_url, description, is_available, pos_id, created_at, updated_at`,
      values
    );

    if (!result.rows[0]) {
      await removeUploadedFileIfExists(req.file);
      return res.status(404).json({ error: 'Product not found' });
    }

    if (uploadedImagePath && existing.image_path && existing.image_path !== uploadedImagePath) {
      await removeProductImageIfExists(existing.image_path);
    }

    return res.status(200).json({ product: result.rows[0] });
  } catch (err) {
    await removeUploadedFileIfExists(req.file);
    return res.status(500).json({ error: 'Failed to update product' });
  }
}

export async function updateProductAvailability(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId || req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { productId } = req.params;
    const { isAvailable } = req.body;

    if (!isUuid(productId)) {
      return res.status(400).json({ error: 'productId must be a valid UUID' });
    }

    const parsed = parseBoolean(isAvailable);
    if (parsed === null) {
      return res.status(400).json({ error: 'isAvailable must be true or false' });
    }

    const result = await query(
      `UPDATE products
       SET is_available = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND pos_id = ANY($3::uuid[])
       RETURNING id, name, is_available, pos_id, updated_at`,
      [productId, parsed, scope.posIds]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json({ product: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update product availability' });
  }
}

export async function deleteProduct(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId || req.body.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { productId } = req.params;

    if (!isUuid(productId)) {
      return res.status(400).json({ error: 'productId must be a valid UUID' });
    }

    const inUse = await query(
      `SELECT 1
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = $1 AND o.pos_id = ANY($2::uuid[])
       LIMIT 1`,
      [productId, scope.posIds]
    );
    if (inUse.rows[0]) {
      const disabled = await query(
        `UPDATE products
         SET is_available = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND pos_id = ANY($2::uuid[])
         RETURNING id, name, image_path, image_path AS image_url, is_available, pos_id`,
        [productId, scope.posIds]
      );

      if (!disabled.rows[0]) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json({
        message: 'Product has linked order items and was disabled instead of deleted',
        product: disabled.rows[0],
      });
    }

    const result = await query(
      'DELETE FROM products WHERE id = $1 AND pos_id = ANY($2::uuid[]) RETURNING id, name, image_path, image_path AS image_url, pos_id',
      [productId, scope.posIds]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await removeProductImageIfExists(result.rows[0].image_path);

    return res.status(200).json({ message: 'Product deleted successfully', product: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete product' });
  }
}

export async function createFloor(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { name, isActive } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const active = isActive === undefined ? true : parseBoolean(isActive);
    if (active === null) {
      return res.status(400).json({ error: 'isActive must be true or false' });
    }

    const result = await query(
      `INSERT INTO floors (name, is_active, pos_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, is_active, pos_id, created_at`,
      [String(name).trim(), active, scope.selectedPosId]
    );

    return res.status(201).json({ floor: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create floor' });
  }
}

export async function createTable(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { floorId } = req.params;
    const { tableNumber, seats, status, isActive } = req.body;

    if (!isUuid(floorId)) {
      return res.status(400).json({ error: 'floorId must be a valid UUID' });
    }

    if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
      return res.status(400).json({ error: 'tableNumber must be a positive integer' });
    }

    if (!Number.isInteger(seats) || seats <= 0) {
      return res.status(400).json({ error: 'seats must be a positive integer' });
    }

    const normalizedStatus = status || 'available';
    if (!TABLE_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({ error: 'status must be available or occupied' });
    }

    const active = isActive === undefined ? true : parseBoolean(isActive);
    if (active === null) {
      return res.status(400).json({ error: 'isActive must be true or false' });
    }

    const floor = await query('SELECT id FROM floors WHERE id = $1 AND pos_id = $2', [floorId, scope.selectedPosId]);
    if (!floor.rows[0]) {
      return res.status(404).json({ error: 'Floor not found' });
    }

    const result = await query(
      `INSERT INTO tables (floor_id, table_number, seats, status, is_active, pos_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, floor_id, table_number, seats, status, is_active, pos_id, created_at`,
      [floorId, tableNumber, seats, normalizedStatus, active, scope.selectedPosId]
    );

    return res.status(201).json({ table: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Table number already exists on this floor' });
    }
    return res.status(500).json({ error: 'Failed to create table' });
  }
}

export async function updateFloor(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId || req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }

    const { floorId } = req.params;
    const { name, isActive } = req.body;

    if (!isUuid(floorId)) {
      return res.status(400).json({ error: 'floorId must be a valid UUID' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ error: 'name cannot be empty' });
      }
      values.push(String(name).trim());
      updates.push(`name = $${values.length}`);
    }

    if (isActive !== undefined) {
      const parsed = parseBoolean(isActive);
      if (parsed === null) {
        return res.status(400).json({ error: 'isActive must be true or false' });
      }
      values.push(parsed);
      updates.push(`is_active = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    values.push(floorId);
    values.push(scope.posIds);

    const result = await query(
      `UPDATE floors
       SET ${updates.join(', ')}
       WHERE id = $${values.length - 1} AND pos_id = ANY($${values.length}::uuid[])
       RETURNING id, name, is_active, pos_id, created_at`,
      values
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Floor not found' });
    }

    return res.status(200).json({ floor: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Floor name already exists for this POS' });
    }
    return res.status(500).json({ error: 'Failed to update floor' });
  }
}

export async function deleteFloor(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId || req.body.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }

    const { floorId } = req.params;
    if (!isUuid(floorId)) {
      return res.status(400).json({ error: 'floorId must be a valid UUID' });
    }

    const hasTables = await query(
      'SELECT 1 FROM tables WHERE floor_id = $1 AND pos_id = ANY($2::uuid[]) LIMIT 1',
      [floorId, scope.posIds]
    );

    if (hasTables.rows[0]) {
      return res.status(409).json({ error: 'Cannot delete floor with existing tables' });
    }

    const result = await query(
      'DELETE FROM floors WHERE id = $1 AND pos_id = ANY($2::uuid[]) RETURNING id, name, pos_id',
      [floorId, scope.posIds]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Floor not found' });
    }

    return res.status(200).json({ message: 'Floor deleted successfully', floor: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete floor' });
  }
}

export async function updateTable(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId || req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { tableId } = req.params;
    const { tableNumber, seats, status, isActive } = req.body;

    if (!isUuid(tableId)) {
      return res.status(400).json({ error: 'tableId must be a valid UUID' });
    }

    const current = await query('SELECT id, floor_id FROM tables WHERE id = $1 AND pos_id = ANY($2::uuid[])', [tableId, scope.posIds]);
    if (!current.rows[0]) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const updates = [];
    const values = [];

    if (tableNumber !== undefined) {
      if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
        return res.status(400).json({ error: 'tableNumber must be a positive integer' });
      }
      values.push(tableNumber);
      updates.push(`table_number = $${values.length}`);
    }

    if (seats !== undefined) {
      if (!Number.isInteger(seats) || seats <= 0) {
        return res.status(400).json({ error: 'seats must be a positive integer' });
      }
      values.push(seats);
      updates.push(`seats = $${values.length}`);
    }

    if (status !== undefined) {
      if (!TABLE_STATUSES.has(status)) {
        return res.status(400).json({ error: 'status must be available or occupied' });
      }
      values.push(status);
      updates.push(`status = $${values.length}`);
    }

    if (isActive !== undefined) {
      const parsed = parseBoolean(isActive);
      if (parsed === null) {
        return res.status(400).json({ error: 'isActive must be true or false' });
      }
      values.push(parsed);
      updates.push(`is_active = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    values.push(tableId);
    values.push(scope.posIds);

    const result = await query(
      `UPDATE tables
       SET ${updates.join(', ')}
       WHERE id = $${values.length - 1} AND pos_id = ANY($${values.length}::uuid[])
       RETURNING id, floor_id, table_number, seats, status, is_active, pos_id, created_at`,
      values
    );

    return res.status(200).json({ table: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Table number already exists on this floor' });
    }
    return res.status(500).json({ error: 'Failed to update table' });
  }
}

export async function deleteTable(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId || req.body.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }

    const { tableId } = req.params;
    if (!isUuid(tableId)) {
      return res.status(400).json({ error: 'tableId must be a valid UUID' });
    }

    const hasOpenOrders = await query(
      `SELECT 1
       FROM orders
       WHERE table_id = $1
         AND pos_id = ANY($2::uuid[])
         AND status != 'paid'
       LIMIT 1`,
      [tableId, scope.posIds]
    );

    if (hasOpenOrders.rows[0]) {
      return res.status(409).json({ error: 'Cannot delete table with open orders' });
    }

    const result = await query(
      'DELETE FROM tables WHERE id = $1 AND pos_id = ANY($2::uuid[]) RETURNING id, table_number, pos_id',
      [tableId, scope.posIds]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Table not found' });
    }

    return res.status(200).json({ message: 'Table deleted successfully', table: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete table' });
  }
}

export async function listFloorsTables(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const floors = await query(
      'SELECT id, name, is_active, pos_id, created_at FROM floors WHERE pos_id = ANY($1::uuid[]) ORDER BY name ASC',
      [scope.posIds]
    );
    const tables = await query(
      `SELECT id, floor_id, table_number, seats, status, is_active, created_at
       FROM tables
       WHERE pos_id = ANY($1::uuid[])
       ORDER BY floor_id, table_number`,
      [scope.posIds]
    );

    const byFloor = new Map();
    for (const floor of floors.rows) {
      byFloor.set(floor.id, { ...floor, tables: [] });
    }

    for (const table of tables.rows) {
      if (byFloor.has(table.floor_id)) {
        byFloor.get(table.floor_id).tables.push(table);
      }
    }

    return res.status(200).json({ floors: [...byFloor.values()] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch floors and tables' });
  }
}

export async function listPaymentMethods(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const result = await query(
      `SELECT method, enabled, upi_id, updated_at
       FROM payment_method_settings
       WHERE pos_id = ANY($1::uuid[])
       ORDER BY method ASC`,
      [scope.posIds]
    );

    return res.status(200).json({ paymentMethods: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
}

export async function updatePaymentMethod(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId || req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { method } = req.params;
    const normalizedMethod = normalizePaymentMethod(method);
    const { enabled, upiId } = req.body;

    if (!PAYMENT_METHODS.has(method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const parsedEnabled = parseBoolean(enabled);
    if (parsedEnabled === null) {
      return res.status(400).json({ error: 'enabled must be true or false' });
    }

    if (normalizedMethod === 'upi' && parsedEnabled && (!upiId || !String(upiId).trim())) {
      return res.status(400).json({ error: 'upiId is required when enabling UPI' });
    }

    const result = await query(
      `UPDATE payment_method_settings
       SET enabled = $2,
           upi_id = CASE WHEN $1 = 'upi' THEN $3 ELSE upi_id END,
           updated_at = CURRENT_TIMESTAMP
       WHERE method = $1 AND pos_id = ANY($4::uuid[])
       RETURNING method, enabled, upi_id, updated_at`,
      [normalizedMethod, parsedEnabled, upiId ? String(upiId).trim() : null, scope.posIds]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    return res.status(200).json({ paymentMethod: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update payment method' });
  }
}

export async function listSessions(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { status, openedBy, fromDate, toDate } = req.query;
    const values = [scope.posIds];
    const where = ['ps.pos_id = ANY($1::uuid[])'];

    if (status) {
      if (!['open', 'active', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }
      values.push(status);
      where.push(`ps.status = $${values.length}`);
    }

    if (openedBy) {
      if (!isUuid(openedBy)) {
        return res.status(400).json({ error: 'openedBy must be a valid UUID' });
      }
      values.push(openedBy);
      where.push(`ps.opened_by = $${values.length}`);
    }

    if (fromDate) {
      if (!isValidDate(fromDate)) {
        return res.status(400).json({ error: 'Invalid fromDate' });
      }
      values.push(fromDate);
      where.push(`ps.opened_at >= $${values.length}::timestamp`);
    }

    if (toDate) {
      if (!isValidDate(toDate)) {
        return res.status(400).json({ error: 'Invalid toDate' });
      }
      values.push(toDate);
      where.push(`ps.opened_at <= $${values.length}::timestamp`);
    }

    const result = await query(
      `SELECT
         ps.id,
         ps.opened_by,
         u.name AS opened_by_name,
         ps.opened_at,
         ps.closed_at,
         ps.status,
         ps.total_sales,
         ps.total_orders,
         COUNT(o.id)::int AS calculated_order_count,
         COALESCE(SUM(o.total_price) FILTER (WHERE o.status = 'paid'), 0) AS calculated_revenue
       FROM pos_sessions ps
       INNER JOIN users u ON u.id = ps.opened_by
       LEFT JOIN orders o ON o.session_id = ps.id AND o.pos_id = ps.pos_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       GROUP BY ps.id, u.name
       ORDER BY ps.opened_at DESC`,
      values
    );

    return res.status(200).json({ sessions: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}

export async function openPosSession(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }

    const existing = await query(
      `SELECT id, pos_id, status, opened_at
       FROM pos_sessions
       WHERE pos_id = $1 AND status = 'active'
       ORDER BY opened_at DESC
       LIMIT 1`,
      [scope.selectedPosId]
    );

    if (existing.rows[0]) {
      return res.status(409).json({ error: 'An active session already exists for this POS', session: existing.rows[0] });
    }

    const created = await query(
      `INSERT INTO pos_sessions (pos_id, opened_by, status, notes)
       VALUES ($1, $2, 'active', $3)
       RETURNING id, pos_id, opened_by, status, notes, opened_at`,
      [scope.selectedPosId, req.user.id, req.body?.notes || null]
    );

    return res.status(201).json({ session: created.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to open session' });
  }
}

export async function closeActiveSession(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.body.posId || req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }

    const active = await query(
      `SELECT id
       FROM pos_sessions
       WHERE pos_id = $1 AND status = 'active'
       ORDER BY opened_at DESC LIMIT 1`,
      [scope.selectedPosId]
    );

    if (!active.rows[0]) {
      return res.status(404).json({ error: 'No active session found for this POS' });
    }

    const sessionId = active.rows[0].id;

    const openOrdersRes = await query(
      `SELECT COUNT(*)::int AS open_orders
       FROM orders
       WHERE session_id = $1 AND pos_id = $2 AND status != 'paid'`,
      [sessionId, scope.selectedPosId]
    );

    if (openOrdersRes.rows[0].open_orders > 0) {
      return res.status(409).json({ error: 'Cannot close session with unpaid or in-progress orders' });
    }

    const summary = await query(
      `SELECT
         COUNT(*) FILTER (WHERE o.status = 'paid') AS paid_orders,
         COALESCE(SUM(o.total_price) FILTER (WHERE o.status = 'paid'), 0) AS total_sales
       FROM orders o
       WHERE o.session_id = $1 AND o.pos_id = $2`,
      [sessionId, scope.selectedPosId]
    );

    const closed = await query(
      `UPDATE pos_sessions
       SET status = 'closed',
           closed_by = $4,
           closed_at = CURRENT_TIMESTAMP,
           total_sales = $2,
           total_orders = $3
       WHERE id = $1 AND pos_id = $5
       RETURNING id, pos_id, status, opened_at, closed_at, total_sales, total_orders, closed_by`,
      [
        sessionId,
        summary.rows[0].total_sales,
        Number(summary.rows[0].paid_orders || 0),
        req.user.id,
        scope.selectedPosId,
      ]
    );

    return res.status(200).json({ session: closed.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to close session' });
  }
}

export async function getAdminSessionSummary(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { sessionId } = req.params;

    if (!isUuid(sessionId)) {
      return res.status(400).json({ error: 'sessionId must be a valid UUID' });
    }

    const sessionRes = await query(
      `SELECT ps.id, ps.opened_by, u.name AS opened_by_name, ps.opened_at, ps.closed_at, ps.status, ps.total_sales, ps.total_orders
       FROM pos_sessions ps
       INNER JOIN users u ON u.id = ps.opened_by
       WHERE ps.id = $1 AND ps.pos_id = ANY($2::uuid[])`,
      [sessionId, scope.posIds]
    );

    if (!sessionRes.rows[0]) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const ordersSummary = await query(
      `SELECT
         COUNT(*)::int AS total_orders,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_orders,
         COALESCE(SUM(total_price) FILTER (WHERE status = 'paid'), 0) AS revenue
       FROM orders
       WHERE session_id = $1 AND pos_id = ANY($2::uuid[])`,
      [sessionId, scope.posIds]
    );

    const payments = await query(
      `SELECT method, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
       FROM payments
       WHERE pos_id = ANY($2::uuid[])
         AND order_id IN (SELECT id FROM orders WHERE session_id = $1 AND pos_id = ANY($2::uuid[]))
       GROUP BY method
       ORDER BY method`,
      [sessionId, scope.posIds]
    );

    return res.status(200).json({
      session: sessionRes.rows[0],
      summary: ordersSummary.rows[0],
      paymentBreakdown: payments.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch session summary' });
  }
}

export async function getSalesReport(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { fromDate, toDate, sessionId, staffId, productId } = req.query;
    const values = [scope.posIds];
    const where = ["o.status = 'paid'", 'o.pos_id = ANY($1::uuid[])'];

    if (fromDate) {
      if (!isValidDate(fromDate)) {
        return res.status(400).json({ error: 'Invalid fromDate' });
      }
      values.push(fromDate);
      where.push(`o.paid_at >= $${values.length}::timestamp`);
    }

    if (toDate) {
      if (!isValidDate(toDate)) {
        return res.status(400).json({ error: 'Invalid toDate' });
      }
      values.push(toDate);
      where.push(`o.paid_at <= $${values.length}::timestamp`);
    }

    if (sessionId) {
      if (!isUuid(sessionId)) {
        return res.status(400).json({ error: 'sessionId must be a valid UUID' });
      }
      values.push(sessionId);
      where.push(`o.session_id = $${values.length}`);
    }

    if (staffId) {
      if (!isUuid(staffId)) {
        return res.status(400).json({ error: 'staffId must be a valid UUID' });
      }
      values.push(staffId);
      where.push(`o.created_by = $${values.length}`);
    }

    if (productId) {
      if (!isUuid(productId)) {
        return res.status(400).json({ error: 'productId must be a valid UUID' });
      }
      values.push(productId);
      where.push(`EXISTS (
        SELECT 1 FROM order_items oi2
        WHERE oi2.order_id = o.id AND oi2.product_id = $${values.length}
      )`);
    }

    const totals = await query(
      `SELECT
         COUNT(*)::int AS order_count,
         COALESCE(SUM(o.total_price), 0) AS total_revenue,
         COALESCE(AVG(o.total_price), 0) AS avg_order_value
       FROM orders o
       WHERE ${where.join(' AND ')}`,
      values
    );

    const timeline = await query(
      `SELECT
         DATE_TRUNC('day', o.paid_at) AS day,
         COUNT(*)::int AS order_count,
         COALESCE(SUM(o.total_price), 0) AS revenue
       FROM orders o
       WHERE ${where.join(' AND ')}
       GROUP BY DATE_TRUNC('day', o.paid_at)
       ORDER BY day ASC`,
      values
    );

    const byStaff = await query(
      `SELECT
         u.id AS staff_id,
         u.name AS staff_name,
         COUNT(o.id)::int AS order_count,
         COALESCE(SUM(o.total_price), 0) AS revenue
       FROM orders o
       INNER JOIN users u ON u.id = o.created_by
       WHERE ${where.join(' AND ')}
       GROUP BY u.id, u.name
       ORDER BY revenue DESC`,
      values
    );

    return res.status(200).json({
      filters: { fromDate: fromDate || null, toDate: toDate || null, sessionId: sessionId || null, staffId: staffId || null, productId: productId || null },
      totals: totals.rows[0],
      timeline: timeline.rows,
      byStaff: byStaff.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch sales report' });
  }
}

export async function getTopProducts(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const { fromDate, toDate, limit } = req.query;
    const values = [scope.posIds];
    const where = ["o.status = 'paid'", 'o.pos_id = ANY($1::uuid[])'];

    if (fromDate) {
      if (!isValidDate(fromDate)) {
        return res.status(400).json({ error: 'Invalid fromDate' });
      }
      values.push(fromDate);
      where.push(`o.paid_at >= $${values.length}::timestamp`);
    }

    if (toDate) {
      if (!isValidDate(toDate)) {
        return res.status(400).json({ error: 'Invalid toDate' });
      }
      values.push(toDate);
      where.push(`o.paid_at <= $${values.length}::timestamp`);
    }

    const parsedLimit = Number.parseInt(limit || '10', 10);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({ error: 'limit must be between 1 and 100' });
    }

    values.push(parsedLimit);

    const result = await query(
      `SELECT
         p.id AS product_id,
         p.name AS product_name,
         c.name AS category_name,
         SUM(oi.quantity)::int AS quantity_sold,
         COALESCE(SUM(oi.quantity * oi.price_at_time), 0) AS revenue
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       INNER JOIN products p ON p.id = oi.product_id
       INNER JOIN categories c ON c.id = p.category_id
       WHERE ${where.join(' AND ')}
       GROUP BY p.id, p.name, c.name
       ORDER BY quantity_sold DESC, revenue DESC
       LIMIT $${values.length}`,
      values
    );

    return res.status(200).json({ topProducts: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch top products' });
  }
}

export async function getAdminDashboard(req, res) {
  try {
    const scope = await resolveAdminPosScope(req, req.query.posId);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error });
    }
    const [sessions, orders, products, tables] = await Promise.all([
      query(`SELECT
               COUNT(*) FILTER (WHERE status = 'open')::int AS open_sessions,
               COUNT(*) FILTER (WHERE status = 'active')::int AS active_sessions,
               COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_sessions
             FROM pos_sessions
             WHERE pos_id = ANY($1::uuid[])`, [scope.posIds]),
      query(`SELECT
               COUNT(*)::int AS total_orders,
               COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_orders,
               COUNT(*) FILTER (WHERE status IN ('to_cook', 'preparing'))::int AS kitchen_active,
               COALESCE(SUM(total_price) FILTER (WHERE status = 'paid'), 0) AS revenue
             FROM orders
             WHERE pos_id = ANY($1::uuid[])`, [scope.posIds]),
      query(`SELECT
               COUNT(*)::int AS total_products,
               COUNT(*) FILTER (WHERE is_available = true)::int AS available_products
             FROM products
             WHERE pos_id = ANY($1::uuid[])`, [scope.posIds]),
      query(`SELECT
               COUNT(*)::int AS total_tables,
               COUNT(*) FILTER (WHERE status = 'occupied')::int AS occupied_tables,
               COUNT(*) FILTER (WHERE status = 'available')::int AS available_tables
             FROM tables
             WHERE pos_id = ANY($1::uuid[])`, [scope.posIds]),
    ]);

    return res.status(200).json({
      sessions: sessions.rows[0],
      orders: orders.rows[0],
      products: products.rows[0],
      tables: tables.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch admin dashboard' });
  }
}
