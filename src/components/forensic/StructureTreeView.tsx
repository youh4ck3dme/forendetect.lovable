"use client";

import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  FileCode,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  FileText,
} from "lucide-react";
import type { ForensicStructureNode } from "@/forensic/sandbox/forensic-engine";

interface StructureTreeViewProps {
  tree: ForensicStructureNode[];
}

function TreeNodeItem({ node }: { node: ForensicStructureNode }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="text-xs font-mono">
      <div
        onClick={() => hasChildren && setOpen(!open)}
        className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/[0.04] transition-colors cursor-pointer ${node.warning ? "bg-danger/10 text-danger border border-danger/30" : "text-[#DDD]"}`}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {node.type === "folder" ? (
          open ? (
            <FolderOpen className="h-4 w-4 text-brand shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-brand shrink-0" />
          )
        ) : node.type === "stream" || node.type === "object" ? (
          <FileCode className="h-4 w-4 text-[#F5A623] shrink-0" />
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        )}

        <span className="font-semibold truncate">{node.name}</span>

        {node.warning && (
          <span className="flex items-center gap-1 text-[10px] text-danger font-bold ml-auto shrink-0">
            <AlertTriangle className="h-3 w-3" /> Rizikový uzol
          </span>
        )}

        {node.details && (
          <span className="text-[11px] text-[#666] ml-auto shrink-0 truncate max-w-[240px]">
            {node.details}
          </span>
        )}
      </div>

      {hasChildren && open && (
        <div className="pl-5 border-l border-border/50 ml-2 mt-0.5 space-y-0.5">
          {node.children!.map((child, idx) => (
            <TreeNodeItem key={idx} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StructureTreeView({ tree }: StructureTreeViewProps) {
  if (!tree || tree.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground border border-border rounded-xl bg-surface">
        Pre tento typ súboru nie je k dispozícii stromová dekompozícia.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-[#0B0B0E] p-4 space-y-2">
      <div className="flex items-center justify-between border-b border-border pb-2 text-xs text-[#888]">
        <span>Vnútorná objektová dekompozícia kontajnera</span>
        <span>Objekty / Streamy</span>
      </div>
      <div className="space-y-1">
        {tree.map((node, idx) => (
          <TreeNodeItem key={idx} node={node} />
        ))}
      </div>
    </div>
  );
}
