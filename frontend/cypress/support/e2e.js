import './commands.js';

Cypress.on('uncaught:exception', () => {
  return false;
});
