const Database = require('better-sqlite3');

class DB {
    constructor(file) {
        this.db = new Database(file);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("synchronous = NORMAL");
        this.db.pragma("cache_size = -8000");
        this.db.pragma("temp_store = MEMORY");
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

        this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_prod_name ON products(name);`).run();
        this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_mov_prod ON movements(product_id);`).run();
        this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_mov_date ON movements(date);`).run();
    }

    // ======================
    // PAGINACIÓN REAL
    // ======================

	getProductsPaged(search, page, pageSize) {
		const offset = (page - 1) * pageSize;

		let query = `SELECT * FROM products`;
		let params = [];

		if (search) {
			query += ` WHERE name LIKE ? OR category LIKE ?`;
			params.push(`%${search}%`, `%${search}%`);
		}

		// Obtener total
		const totalQuery = `SELECT COUNT(*) AS count FROM (${query})`;
		const totalResult = this.db.prepare(totalQuery).get(params);
		const totalItems = totalResult.count;

		// Obtener página
		const pagedQuery = query + ` LIMIT ? OFFSET ?`;
		const pagedItems = this.db
			.prepare(pagedQuery)
			.all(...params, pageSize, offset);

		return {
			items: pagedItems,
			page,
			totalItems,
			totalPages: Math.ceil(totalItems / pageSize)
		};
	}


    getTotalProducts() {
        const row = this.db.prepare(`
            SELECT COUNT(*) AS total FROM products
        `).get();
        return row.total;
    }

    // ======================
    // CRUD EXISTENTE
    // ======================

    getAllProducts() {
        return this.db.prepare(`SELECT * FROM products ORDER BY name`).all();
    }

    createProduct(p) {
        const info = this.db.prepare(`
            INSERT INTO products (name, quantity, min_quantity, category, location)
            VALUES (@name, @quantity, @min_quantity, @category, @location)
        `).run(p);
        return { id: info.lastInsertRowid };
    }

    updateProduct(p) {
        this.db.prepare(`
            UPDATE products
            SET name=@name, quantity=@quantity, min_quantity=@min_quantity,
                category=@category, location=@location
            WHERE id=@id
        `).run(p);
        return { ok: true };
    }

    deleteProduct(id) {
        const tx = this.db.transaction((id) => {
            this.db.prepare(`DELETE FROM movements WHERE product_id = ?`).run(id);
            this.db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
        });

        tx(id);
        return { ok: true };
    }

    addMovement(m) {
        const date = new Date().toISOString();

        const tx = this.db.transaction((data) => {
            this.db.prepare(`
                INSERT INTO movements (product_id, type, quantity, date, note)
                VALUES (@product_id, @type, @quantity, @date, @note)
            `).run(data);

            const delta = data.type === "ENTRADA"
                ? data.quantity
                : -Math.abs(data.quantity);

            this.db.prepare(`
                UPDATE products SET quantity = quantity + ? WHERE id = ?
            `).run(delta, data.product_id);
        });

        tx({ ...m, date });
        return { ok: true };
    }

    getMovements() {
        return this.db.prepare(`
            SELECT mv.*, p.name AS product_name
            FROM movements mv
            LEFT JOIN products p ON p.id = mv.product_id
            ORDER BY date DESC
        `).all();
    }

    getLowStock() {
        return this.db.prepare(`
            SELECT * FROM products
            WHERE quantity < min_quantity
            ORDER BY name
        `).all();
    }

    searchProducts(text) {
        const like = `%${text}%`;
        return this.db.prepare(`
            SELECT * FROM products
            WHERE name LIKE ? OR category LIKE ? OR location LIKE ?
            ORDER BY name
        `).all(like, like, like);
    }

    getAllProductsForCSV() {
        return this.db.prepare(`
            SELECT id, name, quantity, min_quantity, category, location
            FROM products
            ORDER BY name
        `).all();
    }
}

module.exports = DB;
