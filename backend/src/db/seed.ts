import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { db } from './connection.js';

export async function seedDatabase(): Promise<void> {
  console.log('[Seed] Seeding database with realistic ElectraKart production data...');

  // Hash standard password: "password123"
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Users
  const users = [
    {
      id: 'usr-customer-1',
      email: 'anil.reddy@gmail.com',
      phone_number: '+919848199882',
      password_hash: passwordHash,
      full_name: 'Anil Kumar Reddy',
      role: 'CUSTOMER',
      city: 'Vijayawada',
      pincode: '520002',
    },
    {
      id: 'usr-retailer-1',
      email: 'murali.vjaelec@gmail.com',
      phone_number: '+919848012345',
      password_hash: passwordHash,
      full_name: 'Murali Krishna Raju (Vijayawada Electricals)',
      role: 'RETAILER',
      city: 'Vijayawada',
      pincode: '520002',
    },
    {
      id: 'usr-distributor-1',
      email: 'dispatch@abcdistributors.in',
      phone_number: '+918662548900',
      password_hash: passwordHash,
      full_name: 'Venkat Rao Choudhary (ABC Central Hub)',
      role: 'DISTRIBUTOR',
      city: 'Vijayawada',
      pincode: '520007',
    },
    {
      id: 'usr-admin-1',
      email: 'admin@electrakart.com',
      phone_number: '+919999900000',
      password_hash: passwordHash,
      full_name: 'Super Admin Console',
      role: 'ADMIN',
      city: 'Vijayawada',
      pincode: '520002',
    },
    {
      id: 'usr-customer-2',
      email: 'ravi.teja@gmail.com',
      phone_number: '+919848199883',
      password_hash: passwordHash,
      full_name: 'Ravi Teja Sharma',
      role: 'CUSTOMER',
      city: 'Guntur',
      pincode: '522002',
    },
  ];

  for (const u of users) {
    await db.query(
      `INSERT INTO users (id, email, phone_number, password_hash, full_name, role, city, pincode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         phone_number = EXCLUDED.phone_number,
         password_hash = EXCLUDED.password_hash,
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role,
         city = EXCLUDED.city,
         pincode = EXCLUDED.pincode`,
      [u.id, u.email, u.phone_number, u.password_hash, u.full_name, u.role, u.city, u.pincode]
    );
  }

  // 2. Seed Customer Details
  await db.query(
    `INSERT INTO customers (user_id, trade_account_type, billing_gstin, company_name, credit_limit_inr)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO NOTHING`,
    ['usr-customer-1', 'HOMEOWNER', '37AAAAA0000A1Z5', 'Reddy Electrical Works', 150000.0]
  );
  await db.query(
    `INSERT INTO customers (user_id, trade_account_type, billing_gstin, company_name, credit_limit_inr)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO NOTHING`,
    ['usr-customer-2', 'CONTRACTOR', '37BBBAA1111A1Z1', 'Teja Electrical Installations', 200000.0]
  );

  // 2.5 Seed Customer Addresses (Multi-address & location provenance)
  const addresses = [
    {
      id: 'addr-cust1-home',
      user_id: 'usr-customer-1',
      recipient_name: 'Anil Kumar Reddy',
      phone_number: '+919848199882',
      address_line1: 'Flat 402, Sri Krishna Residency, Moghalrajpuram',
      address_line2: 'Near Siddhartha College',
      landmark: 'Siddhartha College',
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      pincode: '520010',
      country: 'India',
      address_type: 'HOME',
      is_default: true,
      source: 'SAVED_ADDRESS',
      latitude: 16.5062,
      longitude: 80.6517,
      normalized_address: 'Flat 402, Sri Krishna Residency, Moghalrajpuram, Near Siddhartha College, Vijayawada, Andhra Pradesh 520010',
    },
    {
      id: 'addr-cust1-office',
      user_id: 'usr-customer-1',
      recipient_name: 'Anil Kumar Reddy',
      phone_number: '+919848199882',
      address_line1: 'D.No 29-14-52, Prakasam Road, Governorpet',
      address_line2: 'Opposite State Bank',
      landmark: 'SBI Governorpet',
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      pincode: '520002',
      country: 'India',
      address_type: 'OFFICE',
      is_default: false,
      source: 'MANUAL',
      latitude: 16.5175,
      longitude: 80.6322,
      normalized_address: 'D.No 29-14-52, Prakasam Road, Governorpet, Opposite State Bank, Vijayawada, Andhra Pradesh 520002',
    },
    {
      id: 'addr-cust2-home',
      user_id: 'usr-customer-2',
      recipient_name: 'Ravi Teja Sharma',
      phone_number: '+919848199883',
      address_line1: '12-4-88 Brodipet 4th Line',
      address_line2: 'Near Hindu College Ground',
      landmark: 'Hindu College Ground',
      city: 'Guntur',
      state: 'Andhra Pradesh',
      pincode: '522002',
      country: 'India',
      address_type: 'HOME',
      is_default: true,
      source: 'SAVED_ADDRESS',
      latitude: 16.3067,
      longitude: 80.4365,
      normalized_address: '12-4-88 Brodipet 4th Line, Near Hindu College Ground, Guntur, Andhra Pradesh 522002',
    },
  ];

  for (const a of addresses) {
    await db.query(
      `INSERT INTO addresses (id, user_id, recipient_name, phone_number, address_line1, address_line2, landmark, city, state, pincode, country, address_type, is_default, source, latitude, longitude, normalized_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (id) DO UPDATE SET
         recipient_name = EXCLUDED.recipient_name,
         phone_number = EXCLUDED.phone_number,
         address_line1 = EXCLUDED.address_line1,
         city = EXCLUDED.city,
         pincode = EXCLUDED.pincode,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         is_default = EXCLUDED.is_default,
         normalized_address = EXCLUDED.normalized_address`,
      [
        a.id, a.user_id, a.recipient_name, a.phone_number, a.address_line1, a.address_line2,
        a.landmark, a.city, a.state, a.pincode, a.country, a.address_type, a.is_default,
        a.source, a.latitude, a.longitude, a.normalized_address
      ]
    );
  }

  // 3. Seed Partners
  const partners = [
    {
      id: 'partner-vja-elec-1',
      business_name: 'Vijayawada Electricals & Hardware',
      legal_entity_name: 'Vijayawada Electricals Pvt Ltd',
      owner_name: 'Murali Krishna Raju',
      type: 'RETAILER',
      phone: '+91 98480 12345',
      email: 'murali.vjaelec@gmail.com',
      gstin: '37AAAAA1234A1Z5',
      pan: 'AAAAA1234A',
      bank_account: '91201004829104',
      bank_ifsc: 'SBIN0001842',
      status: 'VERIFIED',
      commission_rate_percent: 5.5,
      delivery_radius_km: 8.0,
      service_radius_km: 12.0,
      latitude: 16.5167,
      longitude: 80.6333,
      is_active: true,
      rating: 4.9,
      total_orders_fulfilled: 684,
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      pincode: '520002',
      address: 'Shop 14, Besant Road, Governorpet, Vijayawada',
    },
    {
      id: 'partner-anchor-exclusive',
      business_name: 'Sri Balaji Anchor World & Switchgear',
      legal_entity_name: 'Sri Balaji Electrical Agencies',
      owner_name: 'Ramesh Babu Gutta',
      type: 'RETAILER',
      phone: '+91 94401 55678',
      email: 'sribalaji.anchor@gmail.com',
      gstin: '37BBBBB5678B1Z2',
      pan: 'BBBBB5678B',
      bank_account: '50200039102938',
      bank_ifsc: 'HDFC0000259',
      status: 'VERIFIED',
      commission_rate_percent: 6.0,
      delivery_radius_km: 10.0,
      service_radius_km: 15.0,
      latitude: 16.5200,
      longitude: 80.6400,
      is_active: true,
      rating: 4.8,
      total_orders_fulfilled: 412,
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      pincode: '520003',
      address: 'Eluru Road, Near Old Bus Stand, Vijayawada',
    },
    {
      id: 'dist-abc-vja-hub',
      business_name: 'ABC Electrical Distributors Central Hub',
      legal_entity_name: 'ABC Logistics & Distribution LLP',
      owner_name: 'Venkat Rao Choudhary',
      type: 'DISTRIBUTOR',
      phone: '+91 866 2548900',
      email: 'dispatch@abcdistributors.in',
      gstin: '37CCCCC9012C1Z8',
      pan: 'CCCCC9012C',
      bank_account: '002805001290',
      bank_ifsc: 'ICIC0000028',
      status: 'VERIFIED',
      commission_rate_percent: 3.5,
      delivery_radius_km: 35.0,
      service_radius_km: 45.0,
      latitude: 16.5000,
      longitude: 80.6800,
      is_active: true,
      rating: 5.0,
      total_orders_fulfilled: 1420,
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      pincode: '520007',
      address: 'Plot 48, Auto Nagar Industrial Area, Vijayawada',
    },
    {
      id: 'partner-pending-1',
      business_name: 'Krishna Power & Cables Mart',
      legal_entity_name: 'Krishna Power Mart',
      owner_name: 'Suresh Varma',
      type: 'RETAILER',
      phone: '+91 97000 44321',
      email: 'krishnapower.vja@outlook.com',
      gstin: '37EEEEE7890E1Z4',
      pan: 'EEEEE7890E',
      bank_account: '38192019283',
      bank_ifsc: 'SBIN0004128',
      status: 'PENDING',
      commission_rate_percent: 6.0,
      delivery_radius_km: 7.0,
      service_radius_km: 7.0,
      latitude: 16.4950,
      longitude: 80.6550,
      is_active: false,
      rating: 0.0,
      total_orders_fulfilled: 0,
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      pincode: '520010',
      address: 'Patamata Main Road, Vijayawada',
    },
    {
      id: 'partner-vskp-elec',
      business_name: 'Vizag Coastal Power & Cables',
      legal_entity_name: 'Vizag Coastal Electrical Supplies LLP',
      owner_name: 'Satyanarayana Murthy',
      type: 'RETAILER',
      phone: '+91 891 2567890',
      email: 'vizag.elec@gmail.com',
      gstin: '37FFFFF1234F1Z9',
      pan: 'FFFFF1234F',
      bank_account: '1092837465',
      bank_ifsc: 'SBIN0000952',
      status: 'VERIFIED',
      commission_rate_percent: 5.0,
      delivery_radius_km: 15.0,
      service_radius_km: 15.0,
      latitude: 17.7041,
      longitude: 83.2977,
      is_active: true,
      rating: 4.7,
      total_orders_fulfilled: 250,
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      pincode: '530001',
      address: 'Main Road, Jagadamba Centre, Visakhapatnam',
    },
    {
      id: 'partner-inactive-1',
      business_name: 'Suspended Power Mart',
      legal_entity_name: 'Suspended Power Mart LLP',
      owner_name: 'Nagarjuna Rao',
      type: 'RETAILER',
      phone: '+91 98489 99999',
      email: 'inactive@gmail.com',
      gstin: '37GGGGG9999G1Z1',
      pan: 'GGGGG9999G',
      bank_account: '9999888877',
      bank_ifsc: 'HDFC0000123',
      status: 'SUSPENDED',
      commission_rate_percent: 6.0,
      delivery_radius_km: 10.0,
      service_radius_km: 10.0,
      latitude: 16.5100,
      longitude: 80.6300,
      is_active: false,
      rating: 2.1,
      total_orders_fulfilled: 50,
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      pincode: '520002',
      address: 'Governorpet, Vijayawada',
    },
  ];

  for (const p of partners) {
    await db.query(
      `INSERT INTO partners (id, business_name, legal_entity_name, owner_name, type, phone, email, gstin, pan, bank_account, bank_ifsc, status, commission_rate_percent, delivery_radius_km, service_radius_km, latitude, longitude, is_active, rating, total_orders_fulfilled, city, state, pincode, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
       ON CONFLICT (id) DO UPDATE SET
         business_name = EXCLUDED.business_name,
         status = EXCLUDED.status,
         commission_rate_percent = EXCLUDED.commission_rate_percent,
         service_radius_km = EXCLUDED.service_radius_km,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         is_active = EXCLUDED.is_active`,
      [
        p.id,
        p.business_name,
        p.legal_entity_name,
        p.owner_name,
        p.type,
        p.phone,
        p.email,
        p.gstin,
        p.pan,
        p.bank_account,
        p.bank_ifsc,
        p.status,
        p.commission_rate_percent,
        p.delivery_radius_km,
        p.service_radius_km,
        p.latitude,
        p.longitude,
        p.is_active,
        p.rating,
        p.total_orders_fulfilled,
        p.city,
        p.state,
        p.pincode,
        p.address,
      ]
    );
  }

  // 4. Seed Stores
  await db.query(
    `INSERT INTO stores (id, partner_id, store_name, address, city, delivery_radius_km, service_radius_km, latitude, longitude, is_accepting_orders, is_active, contact_phone)
     VALUES 
      ('store-vja-1', 'partner-vja-elec-1', 'Vijayawada Electricals & Hardware (Governorpet)', 'Shop 14, Besant Road, Governorpet, Vijayawada', 'Vijayawada', 8.0, 8.0, 16.5167, 80.6333, TRUE, TRUE, '+91 98480 12345'),
      ('store-anchor-1', 'partner-anchor-exclusive', 'Sri Balaji Anchor World (Eluru Rd)', 'Eluru Road, Near Old Bus Stand, Vijayawada', 'Vijayawada', 10.0, 10.0, 16.5200, 80.6400, TRUE, TRUE, '+91 94401 55678')
     ON CONFLICT (id) DO UPDATE SET
       service_radius_km = EXCLUDED.service_radius_km,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       is_active = EXCLUDED.is_active`
  );

  // 5. Seed Warehouses
  const warehouses = [
    {
      id: 'wh-vja-autonagar',
      partner_id: 'dist-abc-vja-hub',
      warehouse_name: 'Vijayawada Central Logistics Hub (Hub 1)',
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      pincode: '520007',
      address: 'Plot 48, Auto Nagar Phase 2, Vijayawada - 520007',
      latitude: 16.5000,
      longitude: 80.6800,
      capacity_sq_ft: 35000,
      total_skus: 840,
      total_inventory_units: 46200,
      low_stock_count: 14,
      out_of_stock_count: 2,
      reserved_stock_units: 3100,
      incoming_stock_units: 8500,
      service_radius_km: 50.0,
      is_active: true,
    },
    {
      id: 'wh-hyd-sanathnagar',
      partner_id: 'dist-abc-vja-hub',
      warehouse_name: 'Hyderabad Regional Depot (Hub 2)',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500018',
      address: 'Industrial Estate, Sanathnagar, Hyderabad - 500018',
      latitude: 17.4560,
      longitude: 78.4410,
      capacity_sq_ft: 60000,
      total_skus: 1250,
      total_inventory_units: 98000,
      low_stock_count: 21,
      out_of_stock_count: 5,
      reserved_stock_units: 7400,
      incoming_stock_units: 16000,
      service_radius_km: 40.0,
      is_active: true,
    },
    {
      id: 'wh-vskp-gajuwaka',
      partner_id: 'dist-abc-vja-hub',
      warehouse_name: 'Visakhapatnam Coastal Logistics Depot (Hub 3)',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      pincode: '530012',
      address: 'BHPV Post, Gajuwaka, Visakhapatnam - 530012',
      latitude: 17.6900,
      longitude: 83.2100,
      capacity_sq_ft: 28000,
      total_skus: 620,
      total_inventory_units: 31500,
      low_stock_count: 8,
      out_of_stock_count: 1,
      reserved_stock_units: 1950,
      incoming_stock_units: 5200,
      service_radius_km: 40.0,
      is_active: true,
    },
    {
      id: 'wh-inactive-closed',
      partner_id: 'dist-abc-vja-hub',
      warehouse_name: 'Vijayawada Old Satellite Depot (Closed)',
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      pincode: '520001',
      address: 'Old Bus Stand Road, Vijayawada',
      latitude: 16.5100,
      longitude: 80.6200,
      capacity_sq_ft: 5000,
      total_skus: 0,
      total_inventory_units: 0,
      low_stock_count: 0,
      out_of_stock_count: 0,
      reserved_stock_units: 0,
      incoming_stock_units: 0,
      service_radius_km: 10.0,
      is_active: false,
    },
  ];

  for (const wh of warehouses) {
    await db.query(
      `INSERT INTO warehouses (id, partner_id, warehouse_name, city, state, pincode, address, latitude, longitude, capacity_sq_ft, total_skus, total_inventory_units, low_stock_count, out_of_stock_count, reserved_stock_units, incoming_stock_units, service_radius_km, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (id) DO UPDATE SET
         total_inventory_units = EXCLUDED.total_inventory_units,
         incoming_stock_units = EXCLUDED.incoming_stock_units,
         service_radius_km = EXCLUDED.service_radius_km,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         is_active = EXCLUDED.is_active,
         pincode = EXCLUDED.pincode`,
      [
        wh.id,
        wh.partner_id,
        wh.warehouse_name,
        wh.city,
        wh.state,
        wh.pincode,
        wh.address,
        wh.latitude,
        wh.longitude,
        wh.capacity_sq_ft,
        wh.total_skus,
        wh.total_inventory_units,
        wh.low_stock_count,
        wh.out_of_stock_count,
        wh.reserved_stock_units,
        wh.incoming_stock_units,
        wh.service_radius_km,
        wh.is_active,
      ]
    );
  }

  // 6. Seed Categories
  const categories = [
    { id: 'wires-cables', name: 'Wires & Cables', slug: 'wires-and-cables', description: 'FR, FRLSH & Zero Halogen copper wires', icon_name: 'Cable', display_order: 1 },
    { id: 'switches-sockets', name: 'Switches & Sockets', slug: 'switches-and-sockets', description: 'Modular plates, switches, shuttered sockets', icon_name: 'ToggleRight', display_order: 2 },
    { id: 'fans', name: 'Fans', slug: 'fans', description: 'BEE 5-Star BLDC energy saving ceiling fans', icon_name: 'Fan', display_order: 3 },
    { id: 'lighting', name: 'Lighting', slug: 'lighting', description: 'LED recessed panel lights, batten tubes, floodlights', icon_name: 'Lightbulb', display_order: 4 },
    { id: 'mcb-switchgear', name: 'MCBs & Switchgear', slug: 'mcb-and-switchgear', description: 'Miniature circuit breakers, isolators, RCCBs & distribution boards', icon_name: 'ShieldAlert', display_order: 5 },
    { id: 'conduits-pipes', name: 'Conduits & Pipes', slug: 'conduits-and-pipes', description: 'Heavy & medium gauge PVC electrical conduits, junction boxes & bends', icon_name: 'Box', display_order: 6 },
    { id: 'solar-ups', name: 'Solar & UPS Systems', slug: 'solar-and-ups', description: 'Pure sine wave inverters, solar panels & tubular tall backup batteries', icon_name: 'Sun', display_order: 7 },
    { id: 'tools-testers', name: 'Tools & Testers', slug: 'tools-and-testers', description: 'Digital multimeters, insulation megger testers, wire strippers & crimpers', icon_name: 'Wrench', display_order: 8 },
    { id: 'smart-home', name: 'Smart Home Automation', slug: 'smart-home-automation', description: 'WiFi touch switchboards, smart curtain controllers & smart relays', icon_name: 'Cpu', display_order: 9 },
  ];

  for (const c of categories) {
    await db.query(
      `INSERT INTO categories (id, name, slug, description, icon_name, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [c.id, c.name, c.slug, c.description, c.icon_name, c.display_order]
    );
  }

  // 7. Seed Brands
  const brands = [
    { id: 'brand-polycab', name: 'Polycab', is_popular: true },
    { id: 'brand-anchor', name: 'Anchor by Panasonic', is_popular: true },
    { id: 'brand-havells', name: 'Havells', is_popular: true },
    { id: 'brand-legrand', name: 'Legrand', is_popular: true },
    { id: 'brand-schneider', name: 'Schneider Electric', is_popular: true },
    { id: 'brand-finolex', name: 'Finolex', is_popular: true },
    { id: 'brand-philips', name: 'Philips', is_popular: true },
  ];

  for (const b of brands) {
    await db.query(
      `INSERT INTO brands (id, name, is_popular)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [b.id, b.name, b.is_popular]
    );
  }

  // 8. Seed Series
  const series = [
    { id: 'ser-poly-flamex', brand_id: 'brand-polycab', name: 'FlameX FR' },
    { id: 'ser-poly-prosafe', brand_id: 'brand-polycab', name: 'ProSafe RCCB' },
    { id: 'ser-anc-roma', brand_id: 'brand-anchor', name: 'Roma Classic' },
    { id: 'ser-anc-penta', brand_id: 'brand-anchor', name: 'Penta' },
    { id: 'ser-hav-stealth', brand_id: 'brand-havells', name: 'Stealth Air' },
    { id: 'ser-leg-arteor', brand_id: 'brand-legrand', name: 'Arteor' },
    { id: 'ser-sch-acti9', brand_id: 'brand-schneider', name: 'Acti9 xC60' },
    { id: 'ser-fin-frlsh', brand_id: 'brand-finolex', name: 'FRLSH Flame Retardant' },
    { id: 'ser-phi-stellar', brand_id: 'brand-philips', name: 'Stellar LED' },
  ];

  for (const s of series) {
    await db.query(
      `INSERT INTO brand_series (id, brand_id, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [s.id, s.brand_id, s.name]
    );
  }

  // 9. Seed Canonical SKUs (Master Catalog)
  const skus = [
    {
      id: 'prod-pol-25-red',
      sku_code: 'POL-WX-25-RED-90M',
      name: 'Polycab FlameX FR 2.5 sq.mm Red (90m Coil)',
      hsn_code: '8544',
      category_id: 'wires-cables',
      brand_id: 'brand-polycab',
      series_id: 'ser-poly-flamex',
      unit_of_measure: 'Coil (90m)',
      mrp_inr: 3650.0,
      selling_price_inr: 3100.0,
      image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
      certification_number: 'IS 694 : 2010',
      description: 'Single Core Class 5 Flexible Bare Electrolytic Copper, 1100V Grade Flame Retardant PVC insulated.',
      configuration: 'Single Core, 2.5 sq.mm',
      specification: '2.5 sq.mm Red, 1100V, 24A current capacity',
    },
    {
      id: 'prod-pol-15-yel',
      sku_code: 'POL-WX-15-YEL-90M',
      name: 'Polycab FlameX FR 1.5 sq.mm Yellow (90m Coil)',
      hsn_code: '8544',
      category_id: 'wires-cables',
      brand_id: 'brand-polycab',
      series_id: 'ser-poly-flamex',
      unit_of_measure: 'Coil (90m)',
      mrp_inr: 2380.0,
      selling_price_inr: 1980.0,
      image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
      certification_number: 'IS 694 : 2010',
      description: 'Standard domestic lighting circuit conductor with high thermal oxygen index.',
      configuration: 'Single Core, 1.5 sq.mm',
      specification: '1.5 sq.mm Yellow, 1100V, 16A current capacity',
    },
    {
      id: 'prod-anc-rom-6m-plt',
      sku_code: 'ANC-ROM-6M-PLT-WHT',
      name: 'Anchor Roma Classic 6-Module Plate with Base Frame White',
      hsn_code: '8538',
      category_id: 'switches-sockets',
      brand_id: 'brand-anchor',
      series_id: 'ser-anc-roma',
      unit_of_measure: 'Nos',
      mrp_inr: 230.0,
      selling_price_inr: 185.0,
      image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600',
      certification_number: 'IS 3854 : 1997',
      description: 'UV stabilized high-gloss modular cover plate with anti-corrosive zinc plated metal grid frame.',
      configuration: '6 Module Horizontal Grid',
      specification: 'Gloss White, Polycarbonate frame, 222mm x 86mm',
    },
    {
      id: 'prod-anc-rom-8m-plt',
      sku_code: 'ANC-ROM-8M-PLT-WHT',
      name: 'Anchor Roma Classic 8-Module Plate with Base Frame White',
      hsn_code: '8538',
      category_id: 'switches-sockets',
      brand_id: 'brand-anchor',
      series_id: 'ser-anc-roma',
      unit_of_measure: 'Nos',
      mrp_inr: 290.0,
      selling_price_inr: 240.0,
      image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600',
      certification_number: 'IS 3854 : 1997',
      description: 'UV stabilized high-gloss 8-module cover plate with robust metal base frame.',
      configuration: '8 Module Rectangular Grid',
      specification: 'Gloss White, Polycarbonate, 245mm x 86mm',
    },
    {
      id: 'prod-anc-rom-6a1w',
      sku_code: 'ANC-ROM-6A1W-WHT',
      name: 'Anchor Roma Classic 6A 1-Way Modular Switch (Pack of 10)',
      hsn_code: '8536',
      category_id: 'switches-sockets',
      brand_id: 'brand-anchor',
      series_id: 'ser-anc-roma',
      unit_of_measure: 'Pack (10 Nos)',
      mrp_inr: 560.0,
      selling_price_inr: 460.0,
      image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600',
      certification_number: 'IS 3854 : 1997',
      description: 'Silver nickel contact tips ensuring spark-free switching tested for over 100,000 cycles.',
      configuration: '1 Module Rocker',
      specification: '6A 240V AC 1-Way',
    },
    {
      id: 'prod-anc-pen-6a1w',
      sku_code: 'ANC-PEN-6A1W-WHT',
      name: 'Anchor Penta 6A 1-Way Piano Switch White (Box of 20)',
      hsn_code: '8536',
      category_id: 'switches-sockets',
      brand_id: 'brand-anchor',
      series_id: 'ser-anc-penta',
      unit_of_measure: 'Box (20 Nos)',
      mrp_inr: 510.0,
      selling_price_inr: 420.0,
      image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600',
      certification_number: 'IS 3854 : 1997',
      description: 'India’s most trusted traditional piano type switch with heavy urea-formaldehyde body.',
      configuration: 'Traditional Surface Flush',
      specification: '6A 240V AC Piano',
    },
    {
      id: 'prod-leg-art-16as',
      sku_code: 'LEG-ART-16AS-MG',
      name: 'Legrand Arteor 16A Shuttered Socket Magnesium',
      hsn_code: '8536',
      category_id: 'switches-sockets',
      brand_id: 'brand-legrand',
      series_id: 'ser-leg-arteor',
      unit_of_measure: 'Nos',
      mrp_inr: 640.0,
      selling_price_inr: 520.0,
      image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600',
      certification_number: 'IS 1293 : 2005',
      description: 'Premium universal multi-standard socket with child safety shutters and metallic magnesium finish.',
      configuration: '2 Module Euro-US-India Pin',
      specification: '16A 250V AC Heavy Appliance Rated',
    },
    {
      id: 'prod-hav-stl-1200',
      sku_code: 'HAV-STL-1200-BLU',
      name: 'Havells Stealth Air 1200mm Ceiling Fan Indigo Blue',
      hsn_code: '8414',
      category_id: 'fans',
      brand_id: 'brand-havells',
      series_id: 'ser-hav-stealth',
      unit_of_measure: 'Nos',
      mrp_inr: 8950.0,
      selling_price_inr: 7350.0,
      image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600',
      certification_number: 'BEE 5-Star Energy Certified',
      description: 'Super-efficient 28W BLDC motor with aerodynamically contoured low-noise composite blades.',
      configuration: '1200mm (48 Inch) Sweep',
      specification: '28W Power Consumption, 280 m3/min Air Delivery, RF Remote',
    },
    {
      id: 'prod-sch-act-16a',
      sku_code: 'SCH-ACT-16A-SP',
      name: 'Schneider Acti9 xC60 16A Single Pole MCB',
      hsn_code: '8536',
      category_id: 'mcb-switchgear',
      brand_id: 'brand-schneider',
      series_id: 'ser-sch-acti9',
      unit_of_measure: 'Nos',
      mrp_inr: 360.0,
      selling_price_inr: 295.0,
      image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600',
      certification_number: 'IS/IEC 60898-1',
      description: 'Industrial grade 10kA breaking capacity miniature circuit breaker with VisiSafe status window.',
      configuration: 'Single Pole (SP), 1 Module DIN Rail',
      specification: '16A, C-Curve, 10kA Breaking Capacity',
    },
    {
      id: 'prod-pol-rccb-63a',
      sku_code: 'POL-RCCB-63A-4P30',
      name: 'Polycab 63A 4-Pole 30mA Human Protection RCCB',
      hsn_code: '8536',
      category_id: 'mcb-switchgear',
      brand_id: 'brand-polycab',
      series_id: 'ser-poly-prosafe',
      unit_of_measure: 'Nos',
      mrp_inr: 3950.0,
      selling_price_inr: 3250.0,
      image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600',
      certification_number: 'IS 12640-1',
      description: 'Core balance current transformer residual current breaker for complete shock and fire protection.',
      configuration: '4 Pole (4P), 3-Phase Main Distribution',
      specification: '63A 415V AC, 30mA Trip Sensitivity',
    },
  ];

  for (const sku of skus) {
    await db.query(
      `INSERT INTO skus (id, sku_code, name, hsn_code, category_id, brand_id, series_id, unit_of_measure, mrp_inr, selling_price_inr, image_url, certification_number, description, configuration, specification)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (sku_code) DO UPDATE SET
         name = EXCLUDED.name,
         selling_price_inr = EXCLUDED.selling_price_inr,
         mrp_inr = EXCLUDED.mrp_inr`,
      [
        sku.id,
        sku.sku_code,
        sku.name,
        sku.hsn_code,
        sku.category_id,
        sku.brand_id,
        sku.series_id,
        sku.unit_of_measure,
        sku.mrp_inr,
        sku.selling_price_inr,
        sku.image_url,
        sku.certification_number,
        sku.description,
        sku.configuration,
        sku.specification,
      ]
    );
  }

  // 10. Seed Partner Inventory
  const inventories = [
    {
      id: 'inv-vja-pol-25',
      partner_id: 'partner-vja-elec-1',
      sku_id: 'prod-pol-25-red',
      sku_code: 'POL-WX-25-RED-90M',
      in_stock_quantity: 14,
      reserved_quantity: 3,
      available_quantity: 11,
      low_stock_threshold: 5,
      purchase_cost_inr: 2720.0,
      selling_price_inr: 3100.0,
    },
    {
      id: 'inv-vja-pol-15',
      partner_id: 'partner-vja-elec-1',
      sku_id: 'prod-pol-15-yel',
      sku_code: 'POL-WX-15-YEL-90M',
      in_stock_quantity: 25,
      reserved_quantity: 2,
      available_quantity: 23,
      low_stock_threshold: 6,
      purchase_cost_inr: 1740.0,
      selling_price_inr: 1980.0,
    },
    {
      id: 'inv-anc-6m-plt',
      partner_id: 'partner-anchor-exclusive',
      sku_id: 'prod-anc-rom-6m-plt',
      sku_code: 'ANC-ROM-6M-PLT-WHT',
      in_stock_quantity: 45,
      reserved_quantity: 6,
      available_quantity: 39,
      low_stock_threshold: 10,
      purchase_cost_inr: 155.0,
      selling_price_inr: 185.0,
    },
    {
      id: 'inv-anc-6a1w',
      partner_id: 'partner-anchor-exclusive',
      sku_id: 'prod-anc-rom-6a1w',
      sku_code: 'ANC-ROM-6A1W-WHT',
      in_stock_quantity: 30,
      reserved_quantity: 2,
      available_quantity: 28,
      low_stock_threshold: 5,
      purchase_cost_inr: 390.0,
      selling_price_inr: 460.0,
    },
    {
      id: 'inv-anc-art-16as',
      partner_id: 'partner-anchor-exclusive',
      sku_id: 'prod-leg-art-16as',
      sku_code: 'LEG-ART-16AS-MG',
      in_stock_quantity: 18,
      reserved_quantity: 4,
      available_quantity: 14,
      low_stock_threshold: 5,
      purchase_cost_inr: 440.0,
      selling_price_inr: 520.0,
    },
    {
      id: 'inv-hub-fan-stl',
      partner_id: 'dist-abc-vja-hub',
      sku_id: 'prod-hav-stl-1200',
      sku_code: 'HAV-STL-1200-BLU',
      in_stock_quantity: 85,
      reserved_quantity: 3,
      available_quantity: 82,
      low_stock_threshold: 10,
      purchase_cost_inr: 6600.0,
      selling_price_inr: 7350.0,
    },
    {
      id: 'inv-hub-pol-25',
      partner_id: 'dist-abc-vja-hub',
      sku_id: 'prod-pol-25-red',
      sku_code: 'POL-WX-25-RED-90M',
      in_stock_quantity: 55,
      reserved_quantity: 5,
      available_quantity: 50,
      low_stock_threshold: 10,
      purchase_cost_inr: 2700.0,
      selling_price_inr: 3100.0,
    },
    {
      id: 'inv-hub-anc-6m',
      partner_id: 'dist-abc-vja-hub',
      sku_id: 'prod-anc-rom-6m-plt',
      sku_code: 'ANC-ROM-6M-PLT-WHT',
      in_stock_quantity: 110,
      reserved_quantity: 10,
      available_quantity: 100,
      low_stock_threshold: 15,
      purchase_cost_inr: 150.0,
      selling_price_inr: 185.0,
    },
    {
      id: 'inv-vskp-pol-25',
      partner_id: 'partner-vskp-elec',
      sku_id: 'prod-pol-25-red',
      sku_code: 'POL-WX-25-RED-90M',
      in_stock_quantity: 100,
      reserved_quantity: 0,
      available_quantity: 100,
      low_stock_threshold: 10,
      purchase_cost_inr: 2700.0,
      selling_price_inr: 3100.0,
    },
    {
      id: 'inv-inactive-pol-25',
      partner_id: 'partner-inactive-1',
      sku_id: 'prod-pol-25-red',
      sku_code: 'POL-WX-25-RED-90M',
      in_stock_quantity: 100,
      reserved_quantity: 0,
      available_quantity: 100,
      low_stock_threshold: 10,
      purchase_cost_inr: 2700.0,
      selling_price_inr: 3100.0,
    },
  ];

  for (const inv of inventories) {
    await db.query(
      `INSERT INTO partner_inventories (id, partner_id, sku_id, sku_code, in_stock_quantity, reserved_quantity, available_quantity, low_stock_threshold, purchase_cost_inr, selling_price_inr)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (partner_id, sku_code) DO UPDATE SET
         in_stock_quantity = EXCLUDED.in_stock_quantity,
         reserved_quantity = EXCLUDED.reserved_quantity,
         available_quantity = EXCLUDED.available_quantity,
         selling_price_inr = EXCLUDED.selling_price_inr`,
      [
        inv.id,
        inv.partner_id,
        inv.sku_id,
        inv.sku_code,
        inv.in_stock_quantity,
        inv.reserved_quantity,
        inv.available_quantity,
        inv.low_stock_threshold,
        inv.purchase_cost_inr,
        inv.selling_price_inr,
      ]
    );
  }

  // 11. Seed Mapping Queue (for Admin)
  const queue = [
    {
      id: 'map-1',
      raw_term: 'Anchor 6M switch box with plate',
      retailer_name: 'Vijayawada Electricals & Hardware',
      retailer_id: 'partner-vja-elec-1',
      suggested_sku: 'ANC-ROM-6M-PLT-WHT',
      suggested_name: 'Anchor Roma Classic 6-Module Cover Plate with Base Frame White',
      confidence_score: 0.94,
      status: 'MATCHED',
    },
    {
      id: 'map-2',
      raw_term: 'Anchor 6-9 switch 20 nos',
      retailer_name: 'Krishna Power & Cables Mart',
      retailer_id: 'partner-pending-1',
      suggested_sku: 'ANC-PEN-6A1W-WHT',
      suggested_name: 'Anchor Penta 6A 1-Way Piano Switch White',
      confidence_score: 0.72,
      status: 'NEEDS_ADMIN_REVIEW',
    },
  ];

  for (const q of queue) {
    await db.query(
      `INSERT INTO catalog_mapping_queue (id, raw_term, retailer_name, retailer_id, suggested_sku, suggested_name, confidence_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [q.id, q.raw_term, q.retailer_name, q.retailer_id, q.suggested_sku, q.suggested_name, q.confidence_score, q.status]
    );
  }

  // 12. Seed Notifications
  const notifications = [
    {
      id: 'notif-1',
      user_id: 'usr-customer-1',
      role: 'CUSTOMER',
      title: 'Order EK-10025 Dispatched',
      message: 'Part 1 of your order has been dispatched from Vijayawada Electricals with OTP 4821.',
      type: 'ORDER_UPDATE',
      link_action_url: '/orders/ord-10025',
    },
    {
      id: 'notif-2',
      user_id: 'usr-retailer-1',
      role: 'RETAILER',
      title: 'New Order Received',
      message: 'You have a new fulfillment allocation for 3 coils Polycab 2.5 sq.mm FR wire.',
      type: 'ORDER_UPDATE',
      link_action_url: '/retailer',
    },
    {
      id: 'notif-3',
      user_id: 'usr-admin-1',
      role: 'ADMIN',
      title: 'Partner Onboarding Pending',
      message: 'Krishna Power & Cables Mart submitted GST documentation for verification.',
      type: 'KYC_STATUS',
      link_action_url: '/admin',
    },
  ];

  for (const n of notifications) {
    await db.query(
      `INSERT INTO notifications (id, user_id, role, title, message, type, link_action_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [n.id, n.user_id, n.role, n.title, n.message, n.type, n.link_action_url]
    );
  }

  console.log('[Seed] Database seeding completed successfully!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(() => {
      console.log('[Seed] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
