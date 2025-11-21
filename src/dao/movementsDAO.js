
class MovementsDAO {
	constructor(database) {
		this.db = database;
	}

	getPaged(search, date, page, pageSize = 5) {
		const offset = (page - 1) * pageSize;

		let query = `SELECT m.*, p.name AS product_name FROM movements m LEFT JOIN products p ON p.id = m.product_id`;
		let params = [];
		if (search || date) {
			query += ` WHERE 1=1 `;
		}
		if (search) {
			query += ` AND (m.type LIKE ? OR m.note LIKE ? OR p.name LIKE ? OR m.price_per_unit LIKE ?)`;
			params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
		}
		if (date) {
			query += ` AND m.date LIKE ?`;
			params.push(`%${date}%`);
		}


		const totalQuery = `SELECT COUNT(*) AS count FROM (${query})  AS tmp`;
		const totalResult = this.db.prepare(totalQuery).get(params);
		const totalItems = totalResult.count;

		const order = ` ORDER BY m.date DESC `;
		const pagedQuery = query + order + ` LIMIT ? OFFSET ?`;
		const items = this.db
			.prepare(pagedQuery)
			.all([...params, pageSize, offset]);

		return {
			items,
			page,
			totalItems,
			totalPages: Math.ceil(totalItems / pageSize)
		};
	}

	add(m) {
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

	getAllForCSV() {
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

	getFiltered(filters) {
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

	delete(id) {
		const tx = this.db.transaction(id => {
			let movementToDelete = this.db.prepare(`select * FROM movements WHERE id = ?`).get(id);
			let sumOrSub = movementToDelete.type == "ENTRADA" ? '-' : '+';
			let delta = sumOrSub + movementToDelete.quantity;
			this.db.prepare(`UPDATE products set quantity = quantity + ? WHERE id = ?`)
				.run(delta, movementToDelete.product_id);

			this.db.prepare(`DELETE FROM movements WHERE id = ?`).run(id);
		});

		tx(id);
		return { ok: true };
	}

}

module.exports = MovementsDAO;

