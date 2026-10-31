import { validateProductionConfig } from './production-config.mjs';
const result = validateProductionConfig();
if (!result.configured) {
  console.error('Production configuration invalid. Check field names: ' + result.issues.join(', '));
  process.exit(1);
}
console.log('Production configuration valid. No environment values logged.');
