(function () {
	const inputsGrid = document.getElementById('inputs-grid');
	const shortenBtn = document.getElementById('shorten-btn');
	const resultsEl = document.getElementById('results');

	function createRow(index) {
		const urlInput = document.createElement('input');
		urlInput.type = 'text';
		urlInput.placeholder = `https://example.com/page-${index + 1}`;

		const validityInput = document.createElement('input');
		validityInput.type = 'number';
		validityInput.min = '0';
		validityInput.placeholder = 'e.g. 60';

		const shortcodeInput = document.createElement('input');
		shortcodeInput.type = 'text';
		shortcodeInput.placeholder = 'optional';

		inputsGrid.appendChild(urlInput);
		inputsGrid.appendChild(validityInput);
		inputsGrid.appendChild(shortcodeInput);

		return { urlInput, validityInput, shortcodeInput };
	}

	const rows = Array.from({ length: 5 }, (_, i) => createRow(i));

	function renderResults(items) {
		resultsEl.innerHTML = '';
		items.forEach(item => {
			const div = document.createElement('div');
			div.className = 'result-item';
			if (item.error) {
				div.innerHTML = `<div class="error">Row ${item.index + 1}: ${item.error}</div>`;
			} else {
				const expiryText = item.expiry ? ` (expires: ${new Date(item.expiry).toLocaleString()})` : '';
				div.innerHTML = `<strong>Row ${item.index + 1}:</strong> <a href="${item.shortLink}" target="_blank" rel="noopener noreferrer">${item.shortLink}</a>${expiryText}`;
			}
			resultsEl.appendChild(div);
		});
	}

	shortenBtn.addEventListener('click', async () => {
		shortenBtn.disabled = true;
		resultsEl.innerHTML = '';
		try {
			const payload = rows
				.map((r) => {
					const url = r.urlInput.value.trim();
					if (!url) return null;
					const validityRaw = r.validityInput.value.trim();
					const validity = validityRaw === '' ? undefined : Number(validityRaw);
					const shortcodeRaw = r.shortcodeInput.value.trim();
					const shortcode = shortcodeRaw === '' ? undefined : shortcodeRaw;
					return { url, validity, shortcode };
				})
				.filter(Boolean);

			if (payload.length === 0) {
				renderResults([{ index: 0, error: 'Enter at least one URL' }]);
				return;
			}

			if (payload.length > 5) {
				renderResults([{ index: 0, error: 'Maximum 5 URLs allowed' }]);
				return;
			}

			const res = await fetch('/shorturls/batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || `Request failed: ${res.status}`);
			}

			const data = await res.json();
			renderResults(data);
		} catch (e) {
			renderResults([{ index: 0, error: e.message || 'Unexpected error' }]);
		} finally {
			shortenBtn.disabled = false;
		}
	});
})(); 