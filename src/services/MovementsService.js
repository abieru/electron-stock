class MovementsService {
	constructor(dao) {
		this.dao = dao;
	}

	getPaged(productId, page, pageSize) {
		return this.dao.getPaged(productId, page, pageSize);
	}
	add(m) {
		return this.dao.add(m);
	}

	getAllForCSV() {
		return this.dao.getAllForCSV();
	}

	getFiltered(filter) {
		return this.dao.getFiltered(filter);
	}

	delete(id) {
		return this.dao.delete(id);
	}

}

module.exports = MovementsService;
