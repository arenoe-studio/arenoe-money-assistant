
const PATTERNS = {
  price: /(\d+(?:[.,]\d+)?)\s*(k(?:b)?|r(?:b|ibu)?|(?=\s|$))/i
};

const input = 'Nasi Goreng 15k di Warteg Bahari pakai Cash';
const match = input.match(PATTERNS.price);

console.log('Input:', input);
console.log('Match full:', match ? match[0] : 'null');
console.log('Group 1 (number):', match ? match[1] : 'null');
console.log('Group 2 (suffix):', match ? match[2] : 'null');

import { parseCurrency } from './src/utils/currency';
if (match) {
    const val = parseCurrency(match[0]);
    console.log('Parsed Value:', val);
}
