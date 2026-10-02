sed -i 's/import { MapPin, Filter, X } from "lucide-react";/import { MapPin, Filter, X } from "lucide-react";/' src/pages/MapPage.tsx
sed -i '/import { useNavigate/d' src/pages/MapPage.tsx
sed -i 's/import.meta.env/(import.meta as any).env/g' src/pages/MapPage.tsx
