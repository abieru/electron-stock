const Database = require('better-sqlite3');

class DB {
	constructor(file) {
		this.db = new Database(file);

		// PRAGMAs que aumentan MUCHO la velocidad en disco
		this.db.pragma("journal_mode = WAL");
		this.db.pragma("synchronous = NORMAL");
		this.db.pragma("cache_size = -8000");   // ~8MB cache
		this.db.pragma("temp_store = MEMORY");

		// Integridad referencial
		this.db.pragma("foreign_keys = ON");
	}

	init() {
		const createProducts = `
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        min_quantity INTEGER NOT NULL DEFAULT 0,
        category TEXT,
        location TEXT
      );
    `;

		const createMovements = `
      CREATE TABLE IF NOT EXISTS movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        date TEXT NOT NULL,
        note TEXT,
        FOREIGN KEY(product_id) REFERENCES products(id)
      );
    `;

		this.db.prepare(createProducts).run();
		this.db.prepare(createMovements).run();

		// ÍNDICES para acelerar consultas
		this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_prod_name ON products(name);`).run();
		this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_mov_prod ON movements(product_id);`).run();
		this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_mov_date ON movements(date);`).run();
	}

	// Helpers básicos
	run(sql, params = {}) {
		return this.db.prepare(sql).run(params);
	}

	all(sql, params = {}) {
		return this.db.prepare(sql).all(params);
	}

	//
	// PRODUCTOS
	//
	getAllProducts() {
		return this.all(`
      SELECT * FROM products ORDER BY name
    `);
	}

	createProduct(p) {
		const stmt = this.db.prepare(`
      INSERT INTO products (name, quantity, min_quantity, category, location)
      VALUES (@name, @quantity, @min_quantity, @category, @location)
    `);

		const info = stmt.run(p);
		return { id: info.lastInsertRowid };
	}

	updateProduct(p) {
		const stmt = this.db.prepare(`
      UPDATE products
      SET name=@name, quantity=@quantity, min_quantity=@min_quantity,
          category=@category, location=@location
      WHERE id=@id
    `);

		stmt.run(p);
		return { ok: true };
	}

	deleteProduct(id) {
		const tx = this.db.transaction((id) => {
			// Borra movimientos primero (MUY importante para velocidad)
			this.db.prepare(`
        DELETE FROM movements WHERE product_id = ?
      `).run(id);

			// Ahora borra el producto
			this.db.prepare(`
        DELETE FROM products WHERE id = ?
      `).run(id);
		});

		tx(id);
		return { ok: true };
	}

	//
	// MOVIMIENTOS (OPTIMIZADO CON TRANSACCIÓN)
	//
	addMovement(m) {
		const date = new Date().toISOString();

		const doTransaction = this.db.transaction((data) => {
			// 1. Insert movement
			this.db.prepare(`
        INSERT INTO movements (product_id, type, quantity, date, note)
        VALUES (@product_id, @type, @quantity, @date, @note)
      `).run(data);

			// 2. Update stock
			const delta = data.type === "ENTRADA"
				? data.quantity
				: -Math.abs(data.quantity);

			this.db.prepare(`
        UPDATE products SET quantity = quantity + ? WHERE id = ?
      `).run(delta, data.product_id);
		});

		doTransaction({ ...m, date });

		return { ok: true };
	}

	getMovements() {
		return this.all(`
      SELECT mv.*, p.name AS product_name
      FROM movements mv
      LEFT JOIN products p ON p.id = mv.product_id
      ORDER BY date DESC
    `);
	}

	getLowStock() {
		return this.all(`
      SELECT * FROM products
      WHERE quantity < min_quantity
      ORDER BY name
    `);
	}

	//
	// SEARCH
	//
	searchProducts(text) {
		const like = `%${text}%`;
		return this.all(`
      SELECT * FROM products
      WHERE name LIKE ? OR category LIKE ? OR location LIKE ?
      ORDER BY name
    `, [like, like, like]);
	}

	getAllProductsForCSV() {
		return this.all(`
			SELECT id, name, quantity, min_quantity, category, location
			FROM products
			ORDER BY name
		`);
	}
}

module.exports = DB;
