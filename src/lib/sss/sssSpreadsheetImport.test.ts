import { describe, expect, it } from 'vitest';
import { filterSssRowsBySchool, parseSssSpreadsheetCsv } from '@/lib/sss/sssSpreadsheetImport';

const HEADER =
  'Last Name,First Name,School,Provider 1,Hours,Provider 2,Hours,Provider 3,Hours,DOB,Home Address,Parent 1,Parent 2,Email 1,Email 2,Contact 1,Phone 1,Contact 2,Phone 2,Contact 3,Phone 3';

describe('parseSssSpreadsheetCsv', () => {
  it('parses spreadsheet rows', () => {
    const csv = `${HEADER}\nAdler,Moshe,Torah Temimah,,,,,,,12/16/13,,Sorah,,sorah@test.com,,Mother,7185551212,,,,\n`;
    const { rows, errors } = parseSssSpreadsheetCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows[0]).toMatchObject({ lastName: 'Adler', firstName: 'Moshe', sourceSchool: 'Torah Temimah' });
  });
});

describe('filterSssRowsBySchool', () => {
  it('filters by substring', () => {
    const csv = `${HEADER}\nA,One,Torah Temimah,,,,,,,,,,,,,,,,,,,\nB,Two,Other,,,,,,,,,,,,,,,,,,,\n`;
    const { rows } = parseSssSpreadsheetCsv(csv);
    expect(filterSssRowsBySchool(rows, 'temim')).toHaveLength(1);
  });
});
