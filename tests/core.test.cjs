/* Optional developer check: node --test tests/core.test.cjs */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');

test('sample quotes have independently verified totals, ranking and savings', () => {
  const result = C.compare(C.samples());
  assert.deepEqual(result.rows.map(r => [r.name, r.total]), [['Gather & Co.', 480000], ['Juniper Studio', 489000], ['Northstar Events', 514000]]);
  assert.equal(result.savings, 9000);
  assert.equal(result.rows[0].setup, 50000);
  assert.equal(result.rows[0].monthly, 180000);
  assert.equal(result.rows[0].person, 250000);
  assert.equal(result.savingPercent, 9000 / 489000 * 100);
});
test('headcount changes the winning vendor', () => {
  const state = C.samples(); state.people = '200';
  const result = C.compare(state);
  assert.equal(result.rows[0].name, 'Juniper Studio');
  assert.equal(result.lowest, 689000);
  assert.equal(result.savings, 41000);
});
test('monthly per-person fees multiply by people AND months', () => {
  const state = C.samples(); state.billing = 'monthly';
  const result = C.compare(state);
  assert.equal(result.rows[0].name, 'Juniper Studio');
  assert.equal(result.lowest, 2689000);
  assert.equal(result.savings, 541000);
  assert.deepEqual(result.rows.map(r => r.total), [2689000, 3230000, 3594000]);
});
test('shorter contract changes totals and winner', () => {
  const state = C.samples(); state.months = '1';
  const result = C.compare(state);
  assert.equal(result.lowest, 247000);
  assert.equal(result.rows[0].name, 'Juniper Studio');
  assert.equal(result.savings, 68000);
});
test('zero people still include setup and monthly fees', () => {
  const state = C.samples(); state.people = '0';
  assert.deepEqual(C.compare(state).rows.map(r => r.total), [230000,234000,289000]);
});
test('decimal money uses exact integer cents', () => {
  const state = C.samples(); state.people = '3'; state.months = '3';
  state.vendors = [{ id: 'a', name: 'Decimal vendor', setup: '0.10', monthly: '0.20', person: '0.30' }];
  assert.equal(C.compare(state).lowest, 160);
  assert.equal(C.cents('1.01'), 101);
  assert.equal(C.cents('99999.99'), 9999999);
});
test('ties report every winner and zero savings', () => {
  const state = C.samples(); state.vendors = state.vendors.slice(0,2).map(v => ({ ...v, setup: '0', monthly: '0', person: '0' }));
  const result = C.compare(state);
  assert.equal(result.winners.length, 2);
  assert.equal(result.lowest, 0);
  assert.equal(result.savings, 0);
  assert.equal(result.savingPercent, 0);
});
test('one vendor has no savings baseline; empty list has no winner', () => {
  const state = C.samples(); state.vendors.length = 1;
  assert.equal(C.compare(state).savings, null);
  state.vendors.length = 0;
  assert.equal(C.compare(state).lowest, null);
  assert.deepEqual(C.compare(state).winners, []);
});
test('invalid input is rejected instead of producing misleading totals', () => {
  for (const value of ['', '-1', 'NaN', 'Infinity', '1.001', '1e3', '100000.01']) assert.throws(() => C.cents(value));
  for (const [key, value] of [['people','1.5'], ['people','100001'], ['people',''], ['months','0'], ['months','121'], ['billing','weekly']]) {
    const state = C.samples(); state[key] = value;
    assert.throws(() => C.compare(state));
  }
  const state = C.samples(); state.vendors[0].name = '   ';
  assert.throws(() => C.compare(state));
});
test('upper limits retain safe integer precision', () => {
  const state = { people: '100000', months: '120', billing: 'monthly', vendors: [{id:'x',name:'Maximum',setup:'100000',monthly:'100000',person:'100000'}] };
  const result = C.compare(state);
  assert.equal(result.lowest, 120001210000000);
  assert.ok(Number.isSafeInteger(result.lowest));
});
test('malformed saved comparisons fail validation without crashing', () => {
  assert.ok(Object.keys(C.validate(null)).length);
  const state = C.samples(); state.vendors = [null];
  assert.ok(Object.keys(C.validate(state)).length);
});
test('CSV contains scenario, rate, component, total and ranking columns', () => {
  const csv = C.toCSV(C.samples());
  assert.ok(csv.startsWith('\uFEFF"Vendor"'));
  assert.equal(csv.split('\r\n').filter(Boolean).length, 4);
  assert.ok(csv.includes('"Gather & Co.","USD","100","12","Once","500.00","150.00","25.00","500.00","1800.00","2500.00","4800.00","0.00","Yes"'));
});
test('CSV escapes commas, quotes, newlines and spreadsheet formulas', () => {
  const state = C.samples();
  state.vendors[0].name = 'Acme, "Best"\nEvents';
  state.vendors[1].name = ' =SUM(1,2)';
  state.vendors[2].name = '@danger';
  const csv = C.toCSV(state);
  assert.ok(csv.includes('"Acme, ""Best""\nEvents"'));
  assert.ok(csv.includes('"\'=SUM(1,2)"'));
  assert.ok(csv.includes('"\'@danger"'));
});
