class ProductsService {
	constructor(dao) {
		this.dao = dao;
	}

	getPaged(search, page, pageSize) {
		return this.dao.getPaged(search, page, pageSize);
	}

	getLazy(search) {
		return this.dao.getLazy(search);
	}

	create(p) {
		return this.dao.create(p);
	}

	update(p) {
		return this.dao.update(p);
	}

	delete(id) {
		return this.dao.delete(id);
	}


	getAllForCSV() {
		return this.dao.getAllForCSV();
	}

	getLowStock() {
		return this.dao.getLowStock();
	}
}

module.exports = ProductsService;
