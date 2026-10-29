import { describe, expect, it } from 'vitest';
import { getDetailRows, getDisplayName, getSeriesNumber, humanizeKey } from '../entity-data';

const labels = { yes: 'Yes', no: 'No' };

describe('entity-data', () => {
  it('reads the series number only when it is a non-empty scalar', () => {
    expect(getSeriesNumber({ series_number: 'PO-1' })).toBe('PO-1');
    expect(getSeriesNumber({ series_number: 42 })).toBe('42');
    expect(getSeriesNumber({ series_number: ' ' })).toBeUndefined();
    expect(getSeriesNumber(null)).toBeUndefined();
  });

  it('humanizes keys', () => {
    expect(humanizeKey('purchase_order_date')).toBe('Purchase Order Date');
    expect(humanizeKey('vendorName')).toBe('Vendor Name');
    expect(humanizeKey('vendor_id')).toBe('Vendor ID');
  });

  it('names embedded records', () => {
    expect(getDisplayName({ id: 1, name: 'Kessie' })).toBe('Kessie');
    expect(getDisplayName({ first_name: 'Vivek', last_name: 'Kansara' })).toBe('Vivek Kansara');
    expect(getDisplayName({ id: 1 })).toBeUndefined();
  });

  it('summarises a record row into readable rows', () => {
    const rows = getDetailRows(
      {
        id: 14,
        series_number: 'PR-1',
        vendor_id: 16,
        vendor_data: { id: 16, name: 'Kessie Lewis', email: null },
        currency_data: { id: 3, name: 'Euro', symbol: '\u20ac' },
        department_id: null,
        department_data: {},
        status: 'Pending Approval',
        total_amount: 1250,
        is_rental: 0,
        narration: null,
        created_by: 13,
        created_user: { first_name: 'Vivek' },
        tags: ['a', 'b'],
        meta: { foo: 1 },
      },
      labels,
    );
    expect(rows.map((row) => [row.label, row.value])).toEqual([
      ['Vendor', 'Kessie Lewis'],
      ['Status', 'Pending Approval'],
      ['Is Rental', 'No'],
      ['Tags', ['a', 'b']],
      ['Meta', { foo: 1 }],
    ]);
  });
});
