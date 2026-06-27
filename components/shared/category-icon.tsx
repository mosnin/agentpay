import {
  TrendingUp,
  Microscope,
  Code2,
  Database,
  Palette,
  Workflow,
  Landmark,
  ShieldCheck,
  LifeBuoy,
  Server,
  Sparkles,
  type LucideProps,
} from "lucide-react";

const MAP: Record<string, React.ComponentType<LucideProps>> = {
  Growth: TrendingUp,
  Research: Microscope,
  Coding: Code2,
  Data: Database,
  Design: Palette,
  Operations: Workflow,
  Finance: Landmark,
  Security: ShieldCheck,
  "Customer Support": LifeBuoy,
  Infrastructure: Server,
};

export function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = MAP[category] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}
