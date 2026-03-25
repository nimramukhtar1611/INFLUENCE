const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');

const resolvePath = (relativePath) => path.resolve(projectRoot, relativePath);

const readProjectFile = (relativePath) => {
  const absolutePath = resolvePath(relativePath);
  return fs.readFileSync(absolutePath, 'utf8');
};

const expectFileExists = (relativePath) => {
  const absolutePath = resolvePath(relativePath);
  expect(fs.existsSync(absolutePath)).toBe(true);
};

const expectFileContainsAll = (relativePath, snippets) => {
  const content = readProjectFile(relativePath);
  snippets.forEach((snippet) => {
    expect(content).toContain(snippet);
  });
};

module.exports = {
  expectFileExists,
  expectFileContainsAll
};
