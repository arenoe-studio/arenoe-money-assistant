
import { parseCurrency } from './src/utils/currency';

const input = '15k';
console.log(`Input: "${input}"`);
for(let i=0; i<input.length; i++) {
    console.log(`Char ${i}: ${input[i]} (${input.charCodeAt(i)})`);
}

const result = parseCurrency(input);
console.log(`Result: ${result}`);

if (result !== 15000) {
    console.error('FAIL: Expected 15000');
    process.exit(1);
} else {
    console.log('PASS');
}
