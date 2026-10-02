sed -i '/analytics/a \  { id: '\''automations'\'', label: '\''Automations'\'', icon: Power },' src/components/Navigation.tsx
sed -i '1s/^/import { Power } from "lucide-react";\n/' src/components/Navigation.tsx
