const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf8');
content = content.replace("  | 'DISCOVERY_BUSINESS_IMPORTED'", "  | 'DISCOVERY_BUSINESS_IMPORTED'\n  | 'PROPOSAL_GENERATED'\n  | 'PROPOSAL_UPDATED'");
fs.writeFileSync('src/types/index.ts', content);
