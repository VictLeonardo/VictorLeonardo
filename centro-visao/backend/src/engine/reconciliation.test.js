const test = require('node:test');
const assert = require('node:assert');
const { reconcileBatch } = require('./reconciliation');
const { transactions } = require('../data/seedTransactions');

test('casamento perfeito recebe faixa alta e concilia automaticamente', () => {
  const [r] = reconcileBatch([transactions[0]]); // TX0001
  assert.strictEqual(r.band, 'high');
  assert.strictEqual(r.autoReconciled, true);
  assert.ok(r.score >= 75);
});

test('NSU duplicado derruba o score (fraude/digitação)', () => {
  // TX0008 e TX0009 compartilham NSU100008
  const results = reconcileBatch(transactions);
  const tx8 = results.find((r) => r.transactionId === 'TX0008');
  const nsuCrit = tx8.breakdown.find((b) => b.criterion === 'nsuUnique');
  assert.strictEqual(nsuCrit.status, 'fail');
  assert.strictEqual(tx8.band, 'low');
});

test('loja divergente entre fontes é sinalizada', () => {
  const results = reconcileBatch(transactions);
  const tx7 = results.find((r) => r.transactionId === 'TX0007');
  const storeCrit = tx7.breakdown.find((b) => b.criterion === 'storeConsistent');
  assert.strictEqual(storeCrit.status, 'fail');
  assert.notStrictEqual(tx7.band, 'high');
});

test('breakdown sempre traz os 4 critérios com detalhe explicável', () => {
  const results = reconcileBatch(transactions);
  for (const r of results) {
    assert.strictEqual(r.breakdown.length, 4);
    for (const b of r.breakdown) {
      assert.ok(typeof b.detail === 'string' && b.detail.length > 0);
      assert.ok(['pass', 'partial', 'fail'].includes(b.status));
    }
    assert.ok(r.score >= 0 && r.score <= 100);
  }
});
