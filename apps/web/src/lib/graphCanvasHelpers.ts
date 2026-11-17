import { RelationType } from "@/types/vectra";

export const RELATION_COLOR: Record<RelationType, string> = {
  ENABLES: "#38BDF8",
  CASE_STUDY_OF: "#10B981",
  REGULATES: "#F59E0B",
  CONFLICTS_WITH: "#F43F5E",
  REPLACES: "#94A3B8",
};

export const RELATION_FRIENDLY: Record<RelationType, string> = {
  ENABLES: "Enables",
  CASE_STUDY_OF: "Case Study",
  REGULATES: "Regulates",
  CONFLICTS_WITH: "Conflicts",
  REPLACES: "Replaces",
};

export const MATURITY_COLOR: Record<string, string> = {
  production_scale: "#10B981",
  pilot: "#38BDF8",
  research: "#F59E0B",
};

/**
 * Installs balanced repulsion, gentle centering gravity (keeping disconnected topics inside view),
 * and elliptical label-aware collision separation so nodes and titles never stack on top of each other.
 */
export function installSpaciousGraphForces(fg: any): void {
  if (!fg || typeof fg.d3Force !== "function") return;

  fg.d3Force("charge")?.strength?.(-250);
  fg.d3Force("link")?.distance?.(142);

  let gNodes: any[] = [];
  const gravityForce: any = (alpha: number) => {
    for (const n of gNodes) {
      n.vx = (n.vx || 0) - (n.x || 0) * 0.11 * alpha;
      n.vy = (n.vy || 0) - (n.y || 0) * 0.14 * alpha;
    }
  };
  gravityForce.initialize = (initNodes: any[]) => {
    gNodes = initNodes;
  };
  fg.d3Force("gravity", gravityForce);

  let cNodes: any[] = [];
  const collideForce: any = () => {
    const minDx = 138;
    const minDy = 84;
    for (let i = 0; i < cNodes.length; i++) {
      for (let j = i + 1; j < cNodes.length; j++) {
        const a = cNodes[i];
        const b = cNodes[j];
        const dx = (b.x || 0) - (a.x || 0);
        const dy = (b.y || 0) - (a.y || 0);
        const nx = dx / minDx;
        const ny = dy / minDy;
        const distSq = nx * nx + ny * ny;
        if (distSq < 1 && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist) * 0.48;
          const px = (dx / dist) * push;
          const py = (dy / dist) * push;
          a.x -= px;
          a.y -= py;
          b.x += px;
          b.y += py;
        } else if (distSq <= 0.0001) {
          a.x -= 14;
          b.x += 14;
        }
      }
    }
  };
  collideForce.initialize = (initNodes: any[]) => {
    cNodes = initNodes;
  };
  fg.d3Force("collide", collideForce);
}

export function paintGraphLinkLabel(
  link: any,
  ctx: CanvasRenderingContext2D,
  globalScale: number
): void {
  const start = link.source;
  const end = link.target;
  if (typeof start !== "object" || typeof end !== "object") return;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const label = RELATION_FRIENDLY[link.relation_type as RelationType] || link.relation_type;

  const fontSize = Math.min(11, Math.max(8, 9.5 / Math.max(0.75, globalScale)));
  ctx.save();
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(9, 13, 20, 0.92)";
  ctx.fillRect(midX - textWidth / 2 - 4, midY - fontSize / 2 - 2, textWidth + 8, fontSize + 4);
  ctx.fillStyle = link.is_user_created
    ? "#FBBF24"
    : RELATION_COLOR[link.relation_type as RelationType] || "#CBD5E1";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, midX, midY);
  ctx.restore();
}

export function paintGraphNode(
  node: any,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  opts: {
    selectedNodeId: string | null;
    hoveredNodeId: string | null;
    neighborIds: Set<string>;
    lassoNodeIds: string[];
    connectModeSourceId: string | null;
  }
): void {
  const score = Number(node.composite_score || 80);
  const radius = Math.max(11, Math.min(18, 8.5 + Math.sqrt(score) * 0.4));
  const isSelected = node.id === opts.selectedNodeId;
  const isHovered = node.id === opts.hoveredNodeId;
  const isNeighbor = opts.neighborIds.has(node.id);
  const isLassoed = opts.lassoNodeIds.includes(node.id);
  const isConnectSource = node.id === opts.connectModeSourceId;
  const dimmed = Boolean(
    opts.selectedNodeId && !isSelected && !isNeighbor && !isLassoed && !isHovered
  );
  const fillColor = MATURITY_COLOR[node.maturity_stage] || "#38BDF8";

  ctx.save();
  ctx.globalAlpha = dimmed ? 0.45 : 1.0;

  if (isSelected || isLassoed || isConnectSource || isNeighbor || isHovered) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + (isSelected ? 5 : 3.5), 0, 2 * Math.PI, false);
    ctx.strokeStyle = isConnectSource
      ? "#F43F5E"
      : isSelected || isHovered
      ? "#38BDF8"
      : isLassoed
      ? "#F59E0B"
      : "rgba(56, 189, 248, 0.45)";
    ctx.lineWidth = (isSelected ? 2.4 : 1.5) / Math.max(0.75, globalScale);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = isSelected ? "#132338" : "#101722";
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = fillColor;
  ctx.stroke();

  const scoreFontSize = Math.max(8, Math.min(10.5, radius * 0.62));
  ctx.font = `700 ${scoreFontSize}px JetBrains Mono, monospace`;
  ctx.fillStyle = "#F8FAFC";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(Math.round(score)), node.x, node.y);

  const maxChars = isSelected || isHovered ? 34 : 23;
  const shortTitle =
    node.title.length > maxChars ? `${node.title.slice(0, maxChars - 1)}…` : node.title;
  const labelFontSize = Math.min(11.5, Math.max(8.5, 10 / Math.max(0.8, globalScale)));
  ctx.font = `${isSelected ? 600 : 500} ${labelFontSize}px Inter, system-ui, sans-serif`;
  const tw = ctx.measureText(shortTitle).width;
  const labelY = node.y + radius + labelFontSize + 4;

  ctx.fillStyle = isSelected ? "rgba(14, 116, 144, 0.38)" : "rgba(15, 23, 42, 0.9)";
  ctx.fillRect(node.x - tw / 2 - 5, labelY - labelFontSize / 2 - 2.5, tw + 10, labelFontSize + 5);
  ctx.fillStyle = isSelected ? "#7DD3FC" : "#E2E8F0";
  ctx.fillText(shortTitle, node.x, labelY);
  ctx.restore();
}
