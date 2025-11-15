(async function () {
	console.log("Renderer cargado!");
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
	const movementProduct = $('#movement-product');
	const movementForm = $('#movement-form');
	const movementsList = $('#movements-list');
	const lowstockAlerts = $('#lowstock-alerts');
	const btnRefresh = $('#btn-refresh');
	const btnCSV = $('#btn-get-csv');
	const searchInput = $('#search-input');
	let currentPage = 1;
	const pageSize = 10;
	let totalProducts = 0;

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
				<td>${p.quantity}</td>
				<td>${p.min_quantity}</td>
				<td><button class="btn btn-sm btn-outline-primary btn-edit" data-id="${p.id}"><i class="fa-solid fa-pen-to-square"></i> Editar</button></td>
			`;
			frag.appendChild(tr);
		}
		productsTableBody.replaceChildren(frag);

		// listeners de edición
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
		renderMovementSelect(items);
	}
	function renderPagination() {
		const totalPages = Math.ceil(totalProducts / pageSize);

		$('#page-info').textContent = `Página ${currentPage} / ${totalPages}`;

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

	function renderMovementSelect(products) {
		const frag = document.createDocumentFragment();

		for (const p of products) {
			const opt = document.createElement("option");
			opt.value = p.id;
			opt.textContent = `${p.name} (${p.quantity})`;
			frag.appendChild(opt);
		}

		movementProduct.replaceChildren(frag);
	}


	async function loadMovements() {
		const mv = await window.api.getMovements();

		const frag = document.createDocumentFragment();
		for (const m of mv.slice(0, 10)) {
			const li = document.createElement("li");
			li.className = "list-group-item d-flex justify-content-between align-items-start";
			li.innerHTML = `
				<div>
					<strong>${m.product_name || "—"}</strong> — <small>${m.type}</small>
					<div><small>${new Date(m.date).toLocaleString()}</small></div>
					<div><small>${m.note || ""}</small></div>
				</div>
				<span class="badge bg-secondary rounded-pill">${m.quantity}</span>
			`;
			frag.appendChild(li);
		}
		movementsList.replaceChildren(frag);
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
		await loadProducts();
		await loadLowStock();
	});

	productCancel.addEventListener("click", resetProductForm);

	productDelete.addEventListener("click", async () => {
		if (!productId.value) return alert("Seleccione un produto.");
		if (!confirm("Excluir produto?")) return;

		await window.api.deleteProduct(Number(productId.value));

		resetProductForm();
		await loadProducts();
		await loadLowStock();
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
			product_id: Number(movementProduct.value),
			type: $("#movement-type").value,
			quantity: Number($("#movement-quantity").value),
			note: $("#movement-note").value.trim(),
		};

		if (!m.product_id || !m.quantity)
			return alert("Seleccione producto y cantidad válida.");

		await window.api.addMovement(m);

		$("#movement-quantity").value = 1;
		$("#movement-note").value = "";

		await loadProducts();
		await loadMovements();
		await loadLowStock();
	});

	btnRefresh.addEventListener("click", async () => {
		await loadProducts();
		await loadMovements();
		await loadLowStock();
	});

	btnCSV.addEventListener("click", async () => {
		const result = await window.api.exportCSV();
		if (result.ok) alert("CSV exportado correctamente!");
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

	await loadProducts();
	await loadMovements();
	await loadLowStock();
})();
