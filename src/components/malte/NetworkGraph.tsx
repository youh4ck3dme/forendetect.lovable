import { useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseAnalysis } from "@/forensic";
import { formatEur } from "@/forensic";

type EntityNodeData = {
  label: string;
  role: string;
  score: number;
  isShell: boolean;
  isPerson: boolean;
  selected: boolean;
  onPathHighlight: boolean;
};

function EntityNode({ data }: NodeProps) {
  const d = data as unknown as EntityNodeData;
  return (
    <div
      className={cn(
        "w-[132px] rounded-xl border-2 bg-card px-2 py-1.5 text-center shadow-card transition-colors",
        d.isShell ? "border-risk-high" : "border-border",
        d.selected && "ring-2 ring-primary",
        d.onPathHighlight && "bg-risk-high/10",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-1.5 !w-1.5 !bg-muted-foreground"
      />
      <div className="flex items-center justify-center gap-1">
        {d.isPerson ? (
          <User className="h-3 w-3 text-primary" aria-hidden />
        ) : (
          <Building2 className="h-3 w-3 text-primary" aria-hidden />
        )}
        <p className="truncate text-[10px] font-semibold">{d.label}</p>
      </div>
      <p className="truncate text-[9px] text-muted-foreground">{d.role}</p>
      <p
        className={cn(
          "text-[9px] font-semibold tnum",
          d.score >= 80
            ? "text-risk-high"
            : d.score >= 60
              ? "text-risk-medium"
              : "text-risk-low",
        )}
      >
        {d.score}/100
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-1.5 !w-1.5 !bg-muted-foreground"
      />
    </div>
  );
}

const nodeTypes = { entity: EntityNode };

export function NetworkGraph({
  analysis,
  selectedId,
  highlightedPathIds,
  onSelect,
}: {
  analysis: CaseAnalysis;
  selectedId?: string;
  highlightedPathIds?: string[];
  onSelect: (entityId: string) => void;
}) {
  const highlighted = useMemo(
    () => new Set(highlightedPathIds ?? []),
    [highlightedPathIds],
  );

  const nodes = useMemo<Node[]>(
    () =>
      analysis.entities.map((item) => ({
        id: item.entity.id,
        type: "entity",
        position: { x: item.entity.x * 6.4, y: item.entity.y * 6.4 },
        data: {
          label: item.entity.name,
          role: item.entity.role,
          score: item.score,
          isShell: item.isShell,
          isPerson: item.entity.kind === "person",
          selected: item.entity.id === selectedId,
          onPathHighlight: highlighted.has(item.entity.id),
        } satisfies EntityNodeData as unknown as Record<string, unknown>,
      })),
    [analysis, selectedId, highlighted],
  );

  const edges = useMemo<Edge[]>(() => {
    const relationEdges: Edge[] = analysis.case.relations.map((r) => ({
      id: `rel-${r.fromId}-${r.toId}-${r.label}`,
      source: r.fromId,
      target: r.toId,
      label: r.label,
      animated: false,
      style: { stroke: "var(--border)", strokeDasharray: "4 4" },
      labelStyle: { fontSize: 8, fill: "var(--muted-foreground)" },
      markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10 },
    }));

    const flowEdges: Edge[] = analysis.transactions.map((t) => {
      const onPath =
        highlighted.has(t.transaction.fromId) &&
        highlighted.has(t.transaction.toId);
      return {
        id: `tx-${t.transaction.id}`,
        source: t.transaction.fromId,
        target: t.transaction.toId,
        label: formatEur(t.transaction.amount),
        animated: onPath,
        style: {
          stroke: onPath
            ? "var(--risk-high)"
            : t.level === "critical" || t.level === "high"
              ? "var(--risk-medium)"
              : "var(--primary)",
          strokeWidth: onPath ? 2.5 : 1.5,
        },
        labelStyle: { fontSize: 8, fill: "var(--muted-foreground)" },
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
      };
    });

    return [...relationEdges, ...flowEdges];
  }, [analysis, highlighted]);

  return (
    <div className="h-[420px] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => onSelect(node.id)}
      >
        <Background gap={16} color="var(--border)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export default NetworkGraph;
