import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

export async function catalogRoutes(fastify: FastifyInstance) {
  // Categories
  fastify.get('/categories', async (_request, reply) => {
    const res = await db.query(
      'SELECT id, name, slug, description, icon_name AS "iconName", display_order FROM categories ORDER BY display_order ASC'
    );
    return reply.send(res.rows);
  });

  // Brands with Series
  fastify.get('/brands', async (_request, reply) => {
    const brandsRes = await db.query('SELECT id, name, origin_country, description, is_popular FROM brands');
    const seriesRes = await db.query('SELECT id, brand_id, name FROM brand_series');

    const brands = brandsRes.rows.map((b) => ({
      id: b.id,
      name: b.name,
      origin: b.origin_country,
      description: b.description,
      isPopular: b.is_popular,
      series: seriesRes.rows.filter((s) => s.brand_id === b.id).map((s) => s.name),
    }));

    return reply.send(brands);
  });

  // Customer Products List (Zero margin leakage guaranteed by projection)
  fastify.get('/products', async (request, reply) => {
    const { category, brand, query } = request.query as any;

    let sql = `
      SELECT 
        s.id,
        s.sku_code AS "sku",
        s.name,
        c.name AS "category",
        b.name AS "brand",
        bs.name AS "series",
        s.unit_of_measure AS "unit",
        s.mrp_inr AS "mrp",
        s.selling_price_inr AS "sellingPrice",
        s.gst_rate_percent AS "gstPercent",
        s.hsn_code AS "hsnCode",
        s.image_url AS "imageUrl",
        s.is_certified AS "isCertified",
        s.certification_number AS "certificationNumber",
        s.rating,
        s.review_count AS "reviewCount",
        s.description,
        s.configuration,
        s.specification
      FROM skus s
      JOIN categories c ON s.category_id = c.id
      JOIN brands b ON s.brand_id = b.id
      JOIN brand_series bs ON s.series_id = bs.id
      WHERE s.is_active = TRUE
    `;

    const params: any[] = [];
    if (category) {
      params.push(category);
      sql += ` AND (s.category_id = $${params.length} OR c.slug = $${params.length})`;
    }
    if (brand) {
      params.push(brand);
      sql += ` AND (b.name ILIKE $${params.length} OR s.brand_id = $${params.length})`;
    }
    if (query) {
      params.push(`%${query}%`);
      sql += ` AND (s.name ILIKE $${params.length} OR s.sku_code ILIKE $${params.length} OR s.description ILIKE $${params.length})`;
    }

    sql += ' ORDER BY s.name ASC';

    const res = await db.query(sql, params);
    return reply.send(res.rows);
  });

  // Search with Nearby Store Stock
  fastify.get('/search', async (request, reply) => {
    const { query = '', city = 'Vijayawada', limit = 20 } = request.query as any;

    const searchTerm = `%${query.trim()}%`;
    const skuRes = await db.query(
      `
      SELECT 
        s.id,
        s.sku_code AS "sku",
        s.name,
        c.name AS "category",
        b.name AS "brand",
        bs.name AS "series",
        s.unit_of_measure AS "unit",
        s.mrp_inr AS "mrp",
        s.selling_price_inr AS "sellingPrice",
        s.gst_rate_percent AS "gstPercent",
        s.hsn_code AS "hsnCode",
        s.image_url AS "imageUrl",
        s.is_certified AS "isCertified",
        s.certification_number AS "certificationNumber",
        s.rating,
        s.review_count AS "reviewCount",
        s.description,
        s.configuration,
        s.specification
      FROM skus s
      JOIN categories c ON s.category_id = c.id
      JOIN brands b ON s.brand_id = b.id
      JOIN brand_series bs ON s.series_id = bs.id
      WHERE s.is_active = TRUE
        AND (s.name ILIKE $1 OR s.sku_code ILIKE $1 OR b.name ILIKE $1 OR bs.name ILIKE $1 OR s.specification ILIKE $1)
      LIMIT $2
    `,
      [searchTerm, parseInt(limit, 10)]
    );

    // Attach nearby store availability for each SKU
    const items = await Promise.all(
      skuRes.rows.map(async (sku) => {
        const stockRes = await db.query(
          `
          SELECT 
            p.id AS "partnerId",
            p.business_name AS "storeName",
            p.type AS "partnerType",
            p.city,
            p.address,
            p.rating,
            inv.available_quantity AS "stockCount",
            inv.selling_price_inr AS "price"
          FROM partner_inventories inv
          JOIN partners p ON inv.partner_id = p.id
          WHERE inv.sku_code = $1 AND p.city = $2 AND inv.available_quantity > 0 AND p.status = 'VERIFIED'
        `,
          [sku.sku, city]
        );

        return {
          ...sku,
          nearbyStores: stockRes.rows.map((st, idx) => ({
            ...st,
            distanceKm: idx === 0 ? 2.5 : 8.2,
            deliveryEtaMin: idx === 0 ? 45 : 90,
          })),
        };
      })
    );

    return reply.send({
      total: items.length,
      city,
      items,
    });
  });

  // Single Product / SKU by ID or Code
  fastify.get('/catalog/products/:idOrSku', async (request, reply) => {
    const { idOrSku } = request.params as any;
    const { city = 'Vijayawada' } = request.query as any;

    const res = await db.query(
      `
      SELECT 
        s.id,
        s.sku_code AS "sku",
        s.name,
        c.name AS "category",
        b.name AS "brand",
        bs.name AS "series",
        s.unit_of_measure AS "unit",
        s.mrp_inr AS "mrp",
        s.selling_price_inr AS "sellingPrice",
        s.gst_rate_percent AS "gstPercent",
        s.hsn_code AS "hsnCode",
        s.image_url AS "imageUrl",
        s.is_certified AS "isCertified",
        s.certification_number AS "certificationNumber",
        s.rating,
        s.review_count AS "reviewCount",
        s.description,
        s.configuration,
        s.specification
      FROM skus s
      JOIN categories c ON s.category_id = c.id
      JOIN brands b ON s.brand_id = b.id
      JOIN brand_series bs ON s.series_id = bs.id
      WHERE s.id = $1 OR s.sku_code = $1
      LIMIT 1
    `,
      [idOrSku]
    );

    if (res.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Product Not Found',
        status: 404,
        detail: `Product with SKU or ID '${idOrSku}' was not found.`,
        instance: request.url,
      });
    }

    const product = res.rows[0];

    // Fetch stores holding this product
    const stockRes = await db.query(
      `
      SELECT 
        p.id AS "partnerId",
        p.business_name AS "storeName",
        p.type AS "partnerType",
        p.city,
        p.address,
        p.rating,
        inv.available_quantity AS "stockCount",
        inv.selling_price_inr AS "price"
      FROM partner_inventories inv
      JOIN partners p ON inv.partner_id = p.id
      WHERE inv.sku_code = $1 AND p.city = $2 AND inv.available_quantity > 0 AND p.status = 'VERIFIED'
    `,
      [product.sku, city]
    );

    const nearbyStores = stockRes.rows.map((st, idx) => ({
      ...st,
      distanceKm: idx === 0 ? 2.5 : 8.2,
      deliveryEtaMin: idx === 0 ? 45 : 90,
    }));

    return reply.send({
      ...product,
      nearbyStores,
    });
  });

  // Admin Master Product Creation
  fastify.post('/products', { preHandler: [authenticate, requireRole('ADMIN')] }, async (request, reply) => {
    const data = request.body as any;

    const newId = `prod-${Date.now()}`;
    await db.query(
      `INSERT INTO skus (id, sku_code, name, hsn_code, category_id, brand_id, series_id, unit_of_measure, mrp_inr, selling_price_inr, image_url, description, configuration, specification)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        newId,
        data.sku || `SKU-${Date.now()}`,
        data.name,
        data.hsnCode || '8544',
        data.categoryId || 'wires-cables',
        data.brandId || 'brand-polycab',
        data.seriesId || 'ser-poly-flamex',
        data.unit || 'Nos',
        data.mrp || 1000,
        data.sellingPrice || 800,
        data.imageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
        data.description,
        data.configuration,
        data.specification,
      ]
    );

    return reply.status(201).send({ id: newId, ...data });
  });
}
