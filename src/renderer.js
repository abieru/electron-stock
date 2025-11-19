(async function () {
	const $ = (sel) => document.querySelector(sel);
	// DOM
	const productForm = $('#product-form');
	const productId = $('#product-id');
	const nameInput = $('#product-name');
	const quantityInput = $('#product-quantity');
	const minInput = $('#product-min');
	const categoryInput = $('#product-category');
	const locationInput = $('#product-location');
	const productCancel = $('#product-cancel');
	const productDelete = $('#product-delete');
	const productsTableBody = $('#products-table tbody');
	const movementProductSelect = $('#movement-product');
	const movementForm = $('#movement-form');
	const movementsList = $('#movements-list');
	const lowstockAlerts = $('#lowstock-alerts');
	const btnRefresh = $('#btn-refresh');
	const btnCSV = $('#btn-get-csv');
	const btnCSVMovement = $('#btn-get-csv-movement');
	const searchInput = $('#search-input');
	const searchInputMovement = $('#search-input-movement');
	const searchData = $("#search-data");

	let currentPage = 1;
	let currentPageMovement = 1;
	const pageSize = 10;
	const pageSizeMovement = 5;
	let totalProducts = 0;
	let totalMovements = 0;

	let cachedProducts = [];

	function escapeHtml(t) {
		return String(t)
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;");
	}

	function renderProducts(products) {
		const frag = document.createDocumentFragment();

		for (const p of products) {
			const tr = document.createElement("tr");
			tr.innerHTML = `
				<td>${escapeHtml(p.name)}</td>
				<td>${p.category}</td>
				<td>${p.quantity}</td>
				<td>${p.min_quantity}</td>
				<td><button class="btn btn-sm btn-outline-primary btn-edit" data-id="${p.id}"><i class="fa-solid fa-pen-to-square"></i> Editar</button></td>
			`;
			frag.appendChild(tr);
		}
		productsTableBody.replaceChildren(frag);

		productsTableBody.querySelectorAll(".btn-edit").forEach((btn) => {
			btn.onclick = () => {
				const id = Number(btn.dataset.id);
				const product = cachedProducts.find((x) => x.id === id);

				productId.value = product.id;
				nameInput.value = product.name;
				quantityInput.value = product.quantity;
				minInput.value = product.min_quantity;
				categoryInput.value = product.category || "";
				locationInput.value = product.location || "";
			};
		});
	}

	async function loadProducts(page = 1) {
		currentPage = page;
		const search = searchInput.value;
		const { items, totalItems, totalPages } =
			await window.api.getProductsPaged(search, currentPage, pageSize);

		cachedProducts = items;
		totalProducts = totalItems;

		renderProducts(items);
		renderPagination();
	}

	async function loadMovements(page = 1) {
		currentPageMovement = page;
		const search = searchInputMovement.value;
		const date = searchData.value;
		const { items, totalItems, totalPages } =
			await window.api.getMovementPaged(search, date, currentPageMovement, pageSizeMovement);

		totalMovements = totalItems;
		const frag = document.createDocumentFragment();
		for (const m of items) {
			const li = document.createElement("li");
			li.className = "list-group-item d-flex justify-content-between align-items-start";
			li.innerHTML = `
				<div>
					<strong>${m.product_name || "—"}</strong> —  <span class="badge ${ m.type == "ENTRADA" ? 'bg-success' : 'bg-danger' } rounded-pill">${m.type}</span>
					<div>Preço Unitário: ${m.price_per_unit ?? 0}  R$</div>	
					<div><small>${new Date(m.date).toLocaleString()}</small></div>
					<div><small>${m.note || ""}</small></div>
				</div>
				<div>
					<span title="Quantidade" class="badge bg-secondary rounded-pill">${m.quantity}</span>
					<button class="btn btn-sm btn-danger btn-delete-movement" data-id="${m.id}"><i class="fa-solid fa-trash"></i></button>
				</div>
			`;
			frag.appendChild(li);
		}
		movementsList.replaceChildren(frag);
		renderPaginationMovements();

		movementsList.querySelectorAll(".btn-delete-movement").forEach(btn => {
			btn.onclick = async () => {
				const id = Number(btn.dataset.id);
				if (!confirm("Esta ação é irreversível, realmente deseja excluir este movimento?")) {
						return;
					}
					await window.api.deleteMovement(Number(id));
					await Promise.all([
						loadProducts(),
						loadLowStock(),
						loadMovements(),
						renderMovementSelect()
					]);
				};
		});
	}

	function renderPagination() {
		const totalPages = Math.ceil(totalProducts / pageSize);

		$('#page-info').textContent = `Página ${currentPage} / ${totalPages} (Total: ${totalProducts})`;

		$('#prev-page').disabled = currentPage <= 1;
		$('#next-page').disabled = currentPage >= totalPages;
	}

	$('#prev-page').addEventListener('click', () => {
		if (currentPage > 1) loadProducts(currentPage - 1);
	});

	$('#next-page').addEventListener('click', () => {
		const totalPages = Math.ceil(totalProducts / pageSize);
		if (currentPage < totalPages) loadProducts(currentPage + 1);
	});

	function renderPaginationMovements() {
		const totalPages = Math.ceil(totalMovements / pageSizeMovement);

		$('#page-info-movement').textContent = `Página ${currentPageMovement} / ${totalPages} (Total: ${totalMovements})`;

		$('#prev-page-movement').disabled = currentPageMovement <= 1;
		$('#next-page-movement').disabled = currentPageMovement >= totalPages;
	}

	$('#prev-page-movement').addEventListener('click', () => {
		if (currentPageMovement > 1) loadMovements(currentPageMovement - 1);
	});

	$('#next-page-movement').addEventListener('click', () => {
		const totalPages = Math.ceil(totalMovements / pageSizeMovement);
		if (currentPageMovement < totalPages) loadMovements(currentPageMovement + 1);
	});

	async function renderMovementSelect() {
		const { items } = await window.api.getProductsLazy();
		
		const frag = document.createDocumentFragment();

		for (const p of items) {
			const opt = document.createElement("option");
			opt.value = p.id;
			opt.textContent = `${p.name} (${p.quantity})`;
			frag.appendChild(opt);
		}

		movementProductSelect.replaceChildren(frag);
	}

	async function loadLowStock() {
		const low = await window.api.lowStock();
		lowstockAlerts.innerHTML = "";

		if (!low.length) return;

		const div = document.createElement("div");
		div.className = "lowstock";
		div.innerHTML = `
			<strong>Produtos abaixo do mínimo:</strong>
			<ul>
				${low
				.map((p) => `<li>${escapeHtml(p.name)} — ${p.quantity} (mín ${p.min_quantity})</li>`)
				.join("")}
			</ul>
		`;
		lowstockAlerts.appendChild(div);
	}

	productForm.addEventListener("submit", async (e) => {
		e.preventDefault();

		const p = {
			id: productId.value ? Number(productId.value) : undefined,
			name: nameInput.value.trim(),
			quantity: Number(quantityInput.value) || 0,
			min_quantity: Number(minInput.value) || 0,
			category: categoryInput.value.trim(),
			location: locationInput.value.trim(),
		};

		if (p.id) {
			await window.api.updateProduct(p);
		} else {
			await window.api.createProduct(p);
		}

		resetProductForm();
		await Promise.all([
			loadProducts(),
			loadLowStock(),
			renderMovementSelect()
		]);

	});

	productCancel.addEventListener("click", resetProductForm);

	productDelete.addEventListener("click", async () => {
		if (!productId.value) return alert("Seleccione un produto.");
		if (!confirm("Excluir produto?")) return;

		await window.api.deleteProduct(Number(productId.value));

		resetProductForm();
		await Promise.all([
			loadProducts(),
			loadLowStock(),
			renderMovementSelect()
		]);
	});

	function resetProductForm() {
		productId.value = "";
		nameInput.value = "";
		quantityInput.value = 0;
		minInput.value = 0;
		categoryInput.value = "";
		locationInput.value = "";
	}

	movementForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const m = {
			product_id: Number(movementProductSelect.value),
			type: $("#movement-type").value,
			price_per_unit: parseFloat($("#movement-price").value) || 0,
			quantity: Number($("#movement-quantity").value),
			note: $("#movement-note").value.trim(),
		};

		if (!m.product_id || !m.quantity)
			return alert("Seleccione o produto e quantidade.");

		await window.api.addMovement(m);

		$("#movement-quantity").value = 1;
		$("#movement-note").value = "";
		$("#movement-price").value = 0;

		await loadProducts();
		await loadMovements();
		await loadLowStock();
		await renderMovementSelect();
	});

	btnRefresh.addEventListener("click", async () => {
		await Promise.all([
			loadProducts(),
			loadLowStock(),
			loadMovements(),
			renderMovementSelect()
		]);
	});

	btnCSV.addEventListener("click", async () => {
		const result = await window.api.exportCSV();
		if (result.ok) alert("CSV exportado corretamente!");
	});

	btnCSVMovement.addEventListener("click", async () => {
		const result = await window.api.exportCSVMovement();
		if (result.ok) alert("CSV exportado corretamente!");
	});

	function debounce(fn, delay = 200) {
		let timer;
		return (...args) => {
			clearTimeout(timer);
			timer = setTimeout(() => fn(...args), delay);
		};
	}

	searchInput.addEventListener(
		"input",
		debounce(() => loadProducts(), 120)
	);

	searchInputMovement.addEventListener(
		"input",
		debounce(() => loadMovements(), 120)
	);

	searchData.addEventListener(
		"input",
		debounce(() => loadMovements(), 120)
	);


	await Promise.all([
		loadProducts(),
		loadLowStock(),
		loadMovements(),
		renderMovementSelect()
	]);

})();
