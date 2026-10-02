const fs = require('fs');
let content = fs.readFileSync('src/components/LeadDetailPanel.tsx', 'utf8');
content = content.replace(/import { import { import {/g, 'import { ShieldAlert,');
content = content.replace(/import { import {/g, 'import {');
fs.writeFileSync('src/components/LeadDetailPanel.tsx', content);
