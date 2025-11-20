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

}

module.exports = DB;