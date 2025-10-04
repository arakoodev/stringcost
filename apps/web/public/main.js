const form = document.getElementById('agent-form');
const promptField = document.getElementById('prompt');
const errorEl = document.getElementById('error');
const resultsEl = document.getElementById('results');
const currencyEl = document.getElementById('currency');
const totalEl = document.getElementById('total');
const rowsEl = document.getElementById('invoice-rows');
const outputEl = document.getElementById('raw-output');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  errorEl.textContent = '';

  const prompt = promptField.value.trim();
  if (!prompt) {
    errorEl.textContent = 'Prompt required';
    errorEl.classList.remove('hidden');
    return;
  }

  const submitButton = form.querySelector('button');
  submitButton.disabled = true;

  try {
    const response = await fetch('/api/agents/coffee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? 'Agent request failed');
    }

    const data = await response.json();
    currencyEl.textContent = data.invoice.currency;
    totalEl.textContent = data.invoice.total.toFixed(4);

    rowsEl.innerHTML = '';
    for (const item of data.invoice.lineItems) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.stepName}</td>
        <td>${item.actionType}</td>
        <td align="right">${item.total.toFixed(4)}</td>
      `;
      rowsEl.appendChild(row);
    }

    outputEl.textContent = JSON.stringify(data.output, null, 2);
    resultsEl.classList.remove('hidden');
  } catch (error) {
    errorEl.textContent = error instanceof Error ? error.message : String(error);
    errorEl.classList.remove('hidden');
  } finally {
    submitButton.disabled = false;
  }
});
