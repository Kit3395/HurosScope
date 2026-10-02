const fs = require('fs');
let content = fs.readFileSync('src/services/intelligenceService.ts', 'utf8');
content = content.replace("import { Business, Lead, LeadScore, AIAnalysis, BusinessSourceType } from '../types';", "import { Business, Lead, LeadScore, AIAnalysis, BusinessSourceType, Proposal } from '../types';");
content = content.replace("import { generateId } from '../utils';", "import { generateId, generateStableId } from '../utils';");
fs.writeFileSync('src/services/intelligenceService.ts', content);
