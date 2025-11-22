
class ProductsDAO {
	constructor(database) {
		this.db = database;
	}

	getPaged(search, page, pageSize) {
		const offset = (page - 1) * pageSize;

		let query = `SELECT * FROM products `;
		let params = [];

		if (search) {
			query += `WHERE name LIKE ? OR category LIKE ?`;
			params.push(`%${search}%`, `%${search}%`);
		}

		const totalQuery = `SELECT COUNT(*) AS count FROM (${query})`;
		const totalResult = this.db.prepare(totalQuery).get(params);
		const totalItems = totalResult.count;

		const pagedQuery = query + `ORDER BY UPPER(name) ASC  LIMIT ? OFFSET ?`;

		const items = this.db
			.prepare(pagedQuery)
			.all(...params, pageSize, offset);

		return {
			items,
			page,
			totalItems,
			totalPages: Math.ceil(totalItems / pageSize)
		};
	}

	getLazy(search) {
		let params = [];
		let query = `SELECT name, quantity, id FROM products `;
		if (search && search?.trim() !== "") {
			query += `WHERE name LIKE ? OR category LIKE ? `;
			params.push(`%${search}%`, `%${search}%`);
		}
		query += `ORDER BY id `;
		const items = this.db.prepare(query).all(params);
		return { items };
	}

	create(p) {
		const info = this.db.prepare(`
            INSERT INTO products (name, quantity, min_quantity, category, location)
            VALUES (@name, @quantity, @min_quantity, @category, @location)
        `).run(p);
		return { id: info.lastInsertRowid };
	}

	update(p) {
		this.db.prepare(`
            UPDATE products
            SET name=@name, quantity=@quantity, min_quantity=@min_quantity,
                category=@category, location=@location
            WHERE id=@id
        `).run(p);
		return { ok: true };
	}

	delete(id) {
		const tx = this.db.transaction((id) => {
			this.db.prepare(`DELETE FROM movements WHERE product_id = ?`).run(id);
			this.db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
		});

		tx(id);
		return { ok: true };
	}


	getAllForCSV() {
		return this.db.prepare(`
            SELECT id, name as nome, quantity as quantidade, min_quantity as quantidade_minima, category as fornecedor, location as localizacao
            FROM products
            ORDER BY name
        `).all();
	}

	getLowStock() {
		return this.db.prepare(`
            SELECT * FROM products
            WHERE quantity < min_quantity
            ORDER BY name
        `).all();
	}
}

module.exports = ProductsDAO;