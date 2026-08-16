import { Receipt } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function RecordsPage() {
  return (
    <ComingSoon
      icon={Receipt}
      title="Records"
      description="Search, filter, and record income, expenses, and transfers here soon."
    />
  );
}
