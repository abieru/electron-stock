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


		const columns = this.db.prepare(`PRAGMA table_info(movements);`).all();
		const hasPrice = columns.some(col => col.name === "price_per_unit");

		if (!hasPrice) {
			this.db.prepare(`ALTER TABLE movements ADD COLUMN price_per_unit REAL;`).run();
		}

		this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_prod_name ON products(name);`).run();
		this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_mov_prod ON movements(product_id);`).run();
		this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_mov_date ON movements(date);`).run();
	}

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

	getProductsLazy() {
		const items = this.db.prepare(`SELECT name, quantity, id FROM products ORDER BY id`).all();
		return { items };
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
			SELECT id, name as nome, quantity as quantidade, min_quantity as quantidade_minima, category as fornecedor, location as localizacao
			FROM products
			ORDER BY name
		`).all();
	}


	getMovementPaged(search, date, page, pageSize) {
		const offset = (page - 1) * pageSize;

		let query = `SELECT m.*, p.name AS product_name FROM movements m LEFT JOIN products p ON p.id = m.product_id`;
		let params = [];
		if (search ||date) {
			query += ` WHERE`;
		}
		if (search) {
			query += ` m.type LIKE ? OR m.note LIKE ? OR p.name LIKE ? OR m.price_per_unit LIKE ?`;
			params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
		}
		if (date) {
			query += ` m.date LIKE ?`;
			params.push(`%${date}%`);
		}


		const totalQuery = `SELECT COUNT(*) AS count FROM (${query})`;
		const totalResult = this.db.prepare(totalQuery).get(params);
		const totalItems = totalResult.count;

		const order = ` ORDER BY date DESC `;
		const pagedQuery = query + order + ` LIMIT ? OFFSET ?`;
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

	addMovement(m) {
		const date = new Date().toISOString();

		const tx = this.db.transaction((data) => {
			this.db.prepare(`
				INSERT INTO movements (product_id, type, price_per_unit, quantity, date, note)
				VALUES (@product_id, @type, @price_per_unit, @quantity, @date, @note)
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

	getAllMovementsForCSV() {
		return this.db.prepare(`
			SELECT 
				m.id, 
				p.name as produto, 
				m.quantity as quantidade, 
				m.date as data, 
				m.note as descricao
			FROM movements m LEFT JOIN products p ON p.id = m.product_id
			ORDER BY name
		`).all();
	}

	getMovementsFiltered(filters) {
		const { start, end, type } = filters;
		const query = `
			SELECT m.*, p.name AS product_name 
			FROM movements m left JOIN products p ON p.id = m.product_id 
			WHERE m.price_per_unit IS NOT NULL AND
			m.date BETWEEN ? AND ?
			AND m.type = ?
		`;

		return this.db.prepare(query).all(start, end, type);
	}
		
	getLowStock() {
		return this.db.prepare(`
			SELECT * FROM products
			WHERE quantity < min_quantity
			ORDER BY name
		`).all();
	}

	deleteMovement(id) {
		const tx = this.db.transaction(id => {
			let movementToDelete = this.db.prepare(`select * FROM movements WHERE id = ?`).get(id);
			let sumOrSub = movementToDelete.type == "ENTRADA" ? '-' : '+';
			let delta =  sumOrSub + movementToDelete.quantity;
			this.db.prepare(`UPDATE products set quantity = quantity + ? WHERE id = ?`)
				.run(delta, movementToDelete.product_id);

			this.db.prepare(`DELETE FROM movements WHERE id = ?`).run(id);
		});

		tx(id);
		return { ok: true };
	}

}

module.exports = DB;