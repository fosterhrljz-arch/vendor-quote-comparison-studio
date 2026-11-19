(function () {
  'use strict';
  const C = window.QuoteCore;
  const $ = id => document.getElementById(id);
  const KEY = 'vendor-quote-comparison-studio.v1';
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state = C.samples(), removed = null, announceTimer, storageAvailable = true, loadMessage = '';
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored.version !== 1 || !stored.state || Object.keys(C.validate(stored.state)).length) throw new Error('Invalid saved data');
      state = stored.state;
      // IDs are only used locally and are not trusted from saved storage.
      state.vendors.forEach((v, i) => { v.id = `restored-${i}`; });
    }
  } catch (e) {
    if (e instanceof SyntaxError || e.message === 'Invalid saved data') loadMessage = 'Saved data could not be read. Sample quotes restored.';
    else storageAvailable = false;
  }
  function save(valid) {
    if (!valid) { $('save-status').textContent = 'Changes with errors are not saved. Correct the highlighted fields.'; return; }
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, state }));
      storageAvailable = true;
    } catch { storageAvailable = false; }
    $('save-status').textContent = loadMessage || (storageAvailable ? 'Saved in this browser · No account needed' : 'Browser storage unavailable · Keep this tab open and export your results.');
    loadMessage = '';
  }
  function vendorMarkup(v, i) {
    return `<article class="vendor" data-index="${i}" aria-label="Vendor ${i + 1}">
      <div class="vendor-top"><span class="vendor-number" aria-hidden="true">${i + 1}</span><label class="sr-only" for="name-${i}">Vendor ${i + 1} name</label><input id="name-${i}" class="vendor-name" data-field="name" value="${esc(v.name)}" maxlength="80" required autocomplete="off" aria-describedby="error-${i}"><button type="button" class="remove" data-remove="${i}" aria-label="Remove vendor ${i + 1}" title="Remove vendor">×</button></div>
      <div class="fees">${[['setup','Setup fee'],['monthly','Monthly fee'],['person','Per person']].map(([field,label]) => `<div class="fee"><label for="${field}-${i}">${label}</label><div class="money-field"><span aria-hidden="true">$</span><input id="${field}-${i}" data-field="${field}" type="number" inputmode="decimal" value="${esc(v[field])}" min="0" max="100000" step="0.01" required aria-label="Vendor ${i + 1} ${label.toLowerCase()} in USD" aria-describedby="error-${i}"></div></div>`).join('')}</div>
      <p class="error-message" id="error-${i}" hidden></p></article>`;
  }
  function renderVendors() {
    $('vendors').innerHTML = state.vendors.length ? state.vendors.map(vendorMarkup).join('') : '<div class="empty-state"><h3>Your next quote starts here.</h3><p>Add a vendor to build your comparison, or reset the examples to explore.</p></div>';
    $('vendor-count').textContent = `${state.vendors.length} / ${C.LIMITS.vendors} vendors`;
    $('add').disabled = state.vendors.length >= C.LIMITS.vendors;
  }
  function syncScenario() {
    for (const field of ['people','months','billing']) $(field).value = state[field];
  }
  function announce(message) {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { $('announcement').textContent = message; }, 350);
  }
  function update() {
    const errors = C.validate(state), valid = Object.keys(errors).length === 0;
    for (const field of ['people','months','billing']) $(field).setAttribute('aria-invalid', String(Boolean(errors[field])));
    const scenarioErrors = ['people','months','billing'].filter(k => errors[k]).map(k => errors[k]);
    $('scenario-error').textContent = scenarioErrors.join(' ');
    $('scenario-error').hidden = !scenarioErrors.length;
    state.vendors.forEach((v, i) => {
      const messages = [];
      for (const field of ['name','setup','monthly','person']) {
        const message = errors[`${i}.${field}`];
        $(`${field}-${i}`).setAttribute('aria-invalid', String(Boolean(message)));
        if (message) messages.push(`${{name:'Name',setup:'Setup fee',monthly:'Monthly fee',person:'Per person'}[field]}: ${message}`);
      }
      $(`error-${i}`).textContent = messages.join(' ');
      $(`error-${i}`).hidden = !messages.length;
    });
    $('export').disabled = !valid || !state.vendors.length;
    $('formula').textContent = 'Total = setup + monthly × months + per-person × people' + (state.billing === 'monthly' ? ' × months' : '');
    save(valid);
    if (!valid) {
      $('results').innerHTML = '<div class="empty-state"><h3>Let’s check those numbers.</h3><p>Correct the highlighted fields to see an accurate comparison. No totals are shown while a quote is incomplete.</p></div>';
      announce('Comparison paused. Correct the highlighted fields.');
      return;
    }
    const result = C.compare(state);
    if (!result.rows.length) {
      $('results').innerHTML = '<div class="empty-state"><h3>A clear comparison is one quote away.</h3><p>Add your first vendor to see the total. Add a second to compare savings.</p></div>';
      announce('No vendors. Add a vendor to compare quotes.');
      return;
    }
    const {rows, winners, lowest, savings} = result;
    let winnerName = winners.map(r => r.name).join(' & ');
    let savingsText = rows.length === 1 ? 'Add another vendor to compare savings.' : winners.length > 1 ? `${winners.length} vendors share the lowest cost. Savings between them: ${money(0)}.` : `Save <strong>${money(savings)}</strong> (${result.savingPercent.toFixed(1)}%) vs. ${esc(rows[1].name)}.`;
    const maxTotal = Math.max(...rows.map(r => r.total));
    const segments = row => ['setup','monthly','person'].map(key => {
      const width = maxTotal ? row[key] / maxTotal * 100 : 0;
      const percent = row.total ? row[key] / row.total * 100 : 0;
      return `<span class="segment ${key}" style="width:${width}%" title="${{setup:'Setup',monthly:'Monthly',person:'People'}[key]}: ${money(row[key])}">${width >= 15 ? percent.toFixed(1) + '%' : ''}</span>`;
    }).join('');
    $('results').innerHTML = `<div class="winner"><div class="winner-copy"><span class="winner-label">${winners.length > 1 ? 'Tied for lowest cost' : rows.length === 1 ? 'Total cost' : 'Lowest total cost'}</span><h3>${esc(winnerName)}</h3><p class="saving">${savingsText}</p></div><div class="winner-total ${lowest >= 100000000 ? 'long-amount' : ''}"><div class="winner-amount">${money(lowest)}</div><span class="total-caption">over ${result.months} ${result.months === 1 ? 'month' : 'months'}</span></div></div>
      <div class="chart" role="img" aria-label="Total costs, lowest first. ${esc(rows.map(r => r.name + ': ' + money(r.total)).join('; '))}. Detailed costs are in the table below.">${rows.map(r => `<div class="chart-row"><span class="chart-name">${esc(r.name)}</span><div class="bar-track" aria-hidden="true">${segments(r)}</div><span class="chart-total">${money(r.total)}</span></div>`).join('')}</div>
      <div class="legend" aria-hidden="true"><span><i class="swatch setup"></i>Setup</span><span><i class="swatch monthly"></i>Monthly × ${result.months}</span><span><i class="swatch person"></i>People × ${result.people.toLocaleString('en-US')}${result.billing === 'monthly' ? ' × ' + result.months : ''}</span></div>
      <div class="table-scroll" role="region" aria-label="Cost breakdown table; scroll horizontally if needed" tabindex="0"><table><caption>Cost breakdown · Full contract · Lowest first</caption><thead><tr><th scope="col">Vendor</th><th scope="col">Setup</th><th scope="col">Monthly</th><th scope="col">People</th><th scope="col">Total</th></tr></thead><tbody>${rows.map(r => `<tr><th scope="row">${esc(r.name)}</th><td>${money(r.setup)}</td><td>${money(r.monthly)}</td><td>${money(r.person)}</td><td>${money(r.total)}</td></tr>`).join('')}</tbody></table></div>
      <p class="results-note">Bars share the same scale. Percentages show each vendor’s cost mix. Per-person fees are charged ${result.billing === 'once' ? 'once' : 'each month'}; setup is charged once.</p>`;
    announce(`${winners.length > 1 ? 'Lowest cost tie' : 'Lowest cost'}: ${winnerName}, ${money(lowest)}.${rows.length > 1 ? ' Savings versus the next option: ' + money(savings) + '.' : ''}`);
  }
  $('vendors').addEventListener('input', event => {
    const field = event.target.dataset.field;
    if (!field) return;
    const index = Number(event.target.closest('.vendor').dataset.index);
    state.vendors[index][field] = event.target.value;
    update();
  });
  for (const field of ['people','months','billing']) $(field).addEventListener('input', () => { state[field] = $(field).value; update(); });
  $('vendors').addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    const index = Number(button.dataset.remove);
    removed = { vendor: state.vendors.splice(index, 1)[0], index };
    $('undo-message').hidden = false;
    renderVendors(); update();
    const nextRemove = document.querySelector(`[data-remove="${Math.min(index, state.vendors.length - 1)}"]`);
    (nextRemove || $('add')).focus();
  });
  $('undo').addEventListener('click', () => {
    if (!removed || state.vendors.length >= C.LIMITS.vendors) return;
    const index = Math.min(removed.index, state.vendors.length);
    state.vendors.splice(index, 0, removed.vendor);
    removed = null; $('undo-message').hidden = true;
    renderVendors(); update(); $(`name-${index}`).focus();
  });
  $('add').addEventListener('click', () => {
    if (state.vendors.length >= C.LIMITS.vendors) return;
    state.vendors.push({ id: `vendor-${Date.now()}`, name: `Vendor ${state.vendors.length + 1}`, setup: '0', monthly: '0', person: '0' });
    if (state.vendors.length >= C.LIMITS.vendors) $('undo-message').hidden = true;
    renderVendors(); update();
    const input = $(`name-${state.vendors.length - 1}`); input.focus(); input.select();
  });
  $('reset').addEventListener('click', () => {
    $('reset-dialog').returnValue = '';
    $('reset-dialog').showModal();
  });
  $('reset-dialog').addEventListener('close', () => {
    if ($('reset-dialog').returnValue !== 'reset') return;
    state = C.samples(); removed = null; $('undo-message').hidden = true;
    syncScenario(); renderVendors(); update(); $('reset').focus();
  });
  $('export').addEventListener('click', () => {
    if ($('export').disabled) return;
    const blob = new Blob([C.toCSV(state)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'vendor-quote-comparison.csv'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    announce('CSV export requested. Check your browser downloads.');
  });
  syncScenario(); renderVendors(); update();
})();
