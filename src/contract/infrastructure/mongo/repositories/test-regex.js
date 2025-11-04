// Test para verificar el regex correcto
const cart = '{\\"branch\\":\\"67565e0566c5d8a60202adb8\\",\\"vehicles\\":[{\\"vehicle\\":{\\"_id\\":\\"6768eaffeae4731140d57ad8\\",\\"name\\":\\"S-25\\"},\\"total\\":6370,\\"dates\\":{\\"start\\":\\"2025-11-11T12:00:00.000Z\\",\\"end\\":\\"2025-11-20T11:00:00.000Z\\"}}]}';

// Probar diferentes regex
const regex1 = /\\"start\\":\\"2025-11/;
const regex2 = /\\"start\\":\\"([^"]+)\\"/;
const regex3 = /\\"start\\":\\"([\d-]+)/;

console.log('Cart:', cart);
console.log('\nTest 1 (fecha específica):', regex1.test(cart));
console.log('Test 2 (captura completa):', regex2.test(cart));
console.log('Test 3 (captura fecha):', regex3.test(cart));

const match = cart.match(regex3);
console.log('\nMatch:', match);
if (match) {
  console.log('Fecha extraída:', match[1]);
}
