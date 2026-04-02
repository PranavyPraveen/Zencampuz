const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const files = [
  'src/App.jsx',
  'src/components/Sidebar.jsx',
  'src/components/Header.jsx',
  'src/auth/AuthContext.jsx',
  'src/hooks/usePermissions.js',
  'src/pages/admin/RBACPanel.jsx',
];

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  try {
    const code = fs.readFileSync(fullPath, 'utf-8');
    babel.transformSync(code, {
      filename: fullPath,
      presets: ['@babel/preset-react'],
      ast: true
    });
    console.log(`✅ [OK] ${file}`);
  } catch (err) {
    console.error(`❌ [ERROR] ${file}`);
    console.error(err.message);
  }
}
