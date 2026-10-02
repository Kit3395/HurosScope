sed -i '/getOutreachForLead:/i \  getAllOutreach: (): OutreachActivity[] => {\n    return repository.getAllOutreachActivities();\n  },\n' src/services/index.ts
