/* Shared calculation and CSV logic. No browser or third-party dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QuoteCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LIMITS = Object.freeze({ people: 100000, months: 120, fee: 100000, vendors: 10 });
  function samples() {
    return { people: '100', months: '12', billing: 'once', vendors: [
      { id: 'gather', name: 'Gather & Co.', setup: '500', monthly: '150', person: '25' },
      { id: 'northstar', name: 'Northstar Events', setup: '1200', monthly: '95', person: '28' },
      { id: 'juniper', name: 'Juniper Studio', setup: '250', monthly: '220', person: '20' }
    ] };
  }
  function cents(value) {
    const s = String(value).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(s)) throw new Error('Enter an amount from 0 to 100,000 with up to 2 decimal places.');
    const [whole, fraction = ''] = s.split('.');
    const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(result) || result > LIMITS.fee * 100) throw new Error('Enter an amount from 0 to 100,000 with up to 2 decimal places.');
    return result;
  }
  function integer(value, min, max, label) {
    if (!/^\d+$/.test(String(value).trim()) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
      throw new Error(`${label} must be a whole number from ${min.toLocaleString('en-US')} to ${max.toLocaleString('en-US')}.`);
    }
    return Number(value);
  }
  function validate(state) {
    const errors = {};
    if (!state || typeof state !== 'object') return { state: 'The saved comparison is not valid.' };
    try { integer(state.people, 0, LIMITS.people, 'People'); } catch (e) { errors.people = e.message; }
    try { integer(state.months, 1, LIMITS.months, 'Contract length'); } catch (e) { errors.months = e.message; }
    if (!['once', 'monthly'].includes(state.billing)) errors.billing = 'Choose a valid per-person billing period.';
    if (!Array.isArray(state.vendors) || state.vendors.length > LIMITS.vendors) {
      errors.vendors = 'Use up to 10 vendors.';
      return errors;
    }
    state.vendors.forEach((v, i) => {
      if (!v || typeof v !== 'object') { errors[`${i}.name`] = 'The saved vendor is not valid.'; return; }
      if (typeof v.name !== 'string' || !v.name.trim() || v.name.length > 80) errors[`${i}.name`] = 'Enter a vendor name (1–80 characters).';
      for (const field of ['setup', 'monthly', 'person']) {
        try { cents(v[field]); } catch (e) { errors[`${i}.${field}`] = e.message; }
      }
    });
    return errors;
  }
  function compare(state) {
    const errors = validate(state);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const people = Number(state.people), months = Number(state.months);
    const rows = state.vendors.map((v, index) => {
      const setup = cents(v.setup), monthlyRate = cents(v.monthly), personRate = cents(v.person);
      const monthly = monthlyRate * months, person = personRate * people * (state.billing === 'monthly' ? months : 1);
      return { id: v.id, index, name: v.name.trim(), setup, monthlyRate, personRate, monthly, person, total: setup + monthly + person };
    }).sort((a, b) => a.total - b.total || a.index - b.index);
    const lowest = rows.length ? rows[0].total : null;
    const winners = rows.filter(r => r.total === lowest);
    const savings = rows.length > 1 ? rows[1].total - lowest : null;
    const savingPercent = rows.length > 1 && rows[1].total > 0 ? savings / rows[1].total * 100 : 0;
    return { rows, winners, lowest, savings, savingPercent, people, months, billing: state.billing };
  }
  function csvCell(value) {
    let s = String(value);
    // Prevent vendor names from becoming executable spreadsheet formulas.
    if (/^[\s\uFEFF]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function toCSV(state) {
    const result = compare(state);
    const headers = ['Vendor', 'Currency', 'People', 'Contract months', 'Per-person billing', 'Setup fee', 'Monthly fee', 'Per-person rate', 'Setup total', 'Monthly total', 'People total', 'Grand total', 'Above lowest cost', 'Lowest cost'];
    const amount = c => (c / 100).toFixed(2);
    const rows = result.rows.map(r => [r.name, 'USD', result.people, result.months, result.billing === 'once' ? 'Once' : 'Per month', amount(r.setup), amount(r.monthlyRate), amount(r.personRate), amount(r.setup), amount(r.monthly), amount(r.person), amount(r.total), amount(r.total - result.lowest), r.total === result.lowest ? 'Yes' : 'No']);
    return '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }
  return { LIMITS, samples, cents, validate, compare, toCSV };
});
