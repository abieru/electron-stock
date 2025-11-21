function runMigrations(db) {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            min_quantity INTEGER NOT NULL DEFAULT 0,
            category TEXT,
            location TEXT
        );
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            date TEXT NOT NULL,
            note TEXT,
            price_per_unit REAL,
            FOREIGN KEY(product_id) REFERENCES products(id)
        );
    `).run();

    db.prepare(`CREATE INDEX IF NOT EXISTS idx_prod_name ON products(name);`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_mov_prod ON movements(product_id);`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_mov_date ON movements(date);`).run();
}

module.exports = { runMigrations };
