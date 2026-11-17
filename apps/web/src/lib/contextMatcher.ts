import {
  AssociativeEdgeItem,
  CanonicalNodeItem,
  RelationType,
  VariantLens,
} from "@/types/vectra";

export interface ContextFilterState {
  query: string;
  activeVertical: string;
  variantLens: VariantLens;
  relationFilter: RelationType | "ALL";
}

export interface ContextSnippetMatch {
  facet: string;
  excerpt: string;
  matchedTerms: string[];
}

export interface NodeContextMatchResult {
  nodeId: string;
  matchesExpression: boolean;
  matchScore: number;
  matchedFacets: string[];
  primarySnippet: ContextSnippetMatch | null;
  associationCount: number;
  subscriberCitationCount: number;
}

export interface ResolvedAssociation {
  edge: AssociativeEdgeItem;
  direction: "incoming" | "outgoing";
  peerNode: CanonicalNodeItem;
  sharedVerticals: string[];
}

function extractAroundTerm(text: string, term: string, maxLen = 135): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const idx = clean.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1 || clean.length <= maxLen) {
    return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
  }
  const start = Math.max(0, idx - 36);
  const end = Math.min(clean.length, start + maxLen);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < clean.length ? "…" : "";
  return `${prefix}${clean.slice(start, end)}${suffix}`;
}

export function tokenizeContextQuery(rawQuery: string): string[] {
  return rawQuery
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

export function getNodeAssociations(
  nodeId: string,
  nodes: CanonicalNodeItem[],
  edges: AssociativeEdgeItem[],
  relationFilter: RelationType | "ALL" = "ALL"
): {
  incoming: ResolvedAssociation[];
  outgoing: ResolvedAssociation[];
  neighborIds: string[];
} {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const focal = nodeMap.get(nodeId);
  const focalVerts = new Set(focal?.industry_verticals || []);
  const incoming: ResolvedAssociation[] = [];
  const outgoing: ResolvedAssociation[] = [];
  const neighborSet = new Set<string>();

  for (const edge of edges) {
    if (relationFilter !== "ALL" && edge.relation_type !== relationFilter) {
      continue;
    }
    if (edge.source_node_id === nodeId) {
      const peer = nodeMap.get(edge.target_node_id);
      if (peer) {
        neighborSet.add(peer.id);
        outgoing.push({
          edge,
          direction: "outgoing",
          peerNode: peer,
          sharedVerticals: (peer.industry_verticals || []).filter((v) => focalVerts.has(v)),
        });
      }
    } else if (edge.target_node_id === nodeId) {
      const peer = nodeMap.get(edge.source_node_id);
      if (peer) {
        neighborSet.add(peer.id);
        incoming.push({
          edge,
          direction: "incoming",
          peerNode: peer,
          sharedVerticals: (peer.industry_verticals || []).filter((v) => focalVerts.has(v)),
        });
      }
    }
  }

  incoming.sort((a, b) => b.edge.weight - a.edge.weight);
  outgoing.sort((a, b) => b.edge.weight - a.edge.weight);
  return { incoming, outgoing, neighborIds: Array.from(neighborSet) };
}

export function evaluateNodeContextMatch(
  node: CanonicalNodeItem,
  edges: AssociativeEdgeItem[],
  allNodes: CanonicalNodeItem[],
  filter: ContextFilterState
): NodeContextMatchResult {
  const terms = tokenizeContextQuery(filter.query);
  const { incoming, outgoing } = getNodeAssociations(
    node.id,
    allNodes,
    edges,
    filter.relationFilter
  );
  const allAssocs = [...outgoing, ...incoming];
  const associationCount = allAssocs.length;
  const subscriberCitationCount = node.sources.filter(
    (s) => s.provenance_license === "subscriber_licensed"
  ).length;

  if (filter.relationFilter !== "ALL" && associationCount === 0) {
    return {
      nodeId: node.id,
      matchesExpression: false,
      matchScore: 0,
      matchedFacets: [],
      primarySnippet: null,
      associationCount: 0,
      subscriberCitationCount,
    };
  }

  const activeLensLabel =
    filter.variantLens === "cto"
      ? "CTO Architecture"
      : filter.variantLens === "contrarian"
      ? "Contrarian Failure Mode"
      : "C-Suite ROI Thesis";
  const activeLensText =
    filter.variantLens === "cto"
      ? node.summary_technical
      : filter.variantLens === "contrarian"
      ? node.summary_contrarian
      : node.summary_executive;

  const searchableFields: { facet: string; text: string; weight: number }[] = [
    { facet: "Title", text: `${node.title} ${node.slug}`, weight: 32 },
    { facet: activeLensLabel, text: activeLensText, weight: 26 },
    {
      facet: "Variant Claims",
      text: `${node.claim_production} ${node.claim_builder} ${node.claim_vendor}`,
      weight: 20,
    },
    {
      facet: "Citation Evidence",
      text: node.sources
        .map((s) => `${s.exact_quote} ${s.source_name} ${s.author_handle} ${s.provenance_license}`)
        .join(" "),
      weight: 22,
    },
    {
      facet: "[[Field Note]]",
      text: `${node.consultant_note || ""} ${(node.extracted_wikilinks || []).join(" ")}`,
      weight: 18,
    },
    {
      facet: "Edge Association",
      text: allAssocs
        .map((a) => `${a.edge.relation_type} ${a.edge.consultant_note} ${a.peerNode.title}`)
        .join(" "),
      weight: 20,
    },
    {
      facet: "Vertical & Stage",
      text: `${(node.industry_verticals || []).join(" ")} ${node.maturity_stage}`,
      weight: 14,
    },
  ];

  if (terms.length === 0) {
    const facets: string[] = [activeLensLabel];
    if (filter.activeVertical !== "All Verticals") {
      facets.unshift(filter.activeVertical);
    }
    if (filter.relationFilter !== "ALL") {
      facets.push(`${filter.relationFilter} (${associationCount})`);
    } else if (associationCount > 0) {
      facets.push(`${associationCount} Associations`);
    }
    if (subscriberCitationCount > 0) {
      facets.push(`${subscriberCitationCount} Subscriber Exclusive`);
    }

    const defaultExcerpt =
      filter.relationFilter !== "ALL" && allAssocs[0]
        ? `${allAssocs[0].edge.relation_type} (${allAssocs[0].peerNode.title}): ${allAssocs[0].edge.consultant_note}`
        : activeLensText;

    return {
      nodeId: node.id,
      matchesExpression: true,
      matchScore: Math.min(99, Math.round(node.composite_score / 3.2)),
      matchedFacets: facets.slice(0, 4),
      primarySnippet: {
        facet: filter.relationFilter !== "ALL" ? `${filter.relationFilter} Rationale` : activeLensLabel,
        excerpt: extractAroundTerm(defaultExcerpt, "", 140),
        matchedTerms: [],
      },
      associationCount,
      subscriberCitationCount,
    };
  }

  const matchedFacets: string[] = [];
  let bestSnippet: ContextSnippetMatch | null = null;
  let score = 0;

  // Require every query token to appear in at least one facet of the node/associations
  const combinedCorpus = searchableFields.map((f) => f.text.toLowerCase()).join(" ");
  const allTermsPresent = terms.every((term) => combinedCorpus.includes(term));
  if (!allTermsPresent) {
    return {
      nodeId: node.id,
      matchesExpression: false,
      matchScore: 0,
      matchedFacets: [],
      primarySnippet: null,
      associationCount,
      subscriberCitationCount,
    };
  }

  for (const field of searchableFields) {
    const lower = field.text.toLowerCase();
    const hits = terms.filter((t) => lower.includes(t));
    if (hits.length > 0) {
      matchedFacets.push(field.facet);
      score += field.weight * (hits.length / terms.length);
      if (!bestSnippet) {
        bestSnippet = {
          facet: field.facet,
          excerpt: extractAroundTerm(field.text, hits[0], 135),
          matchedTerms: hits,
        };
      }
    }
  }

  return {
    nodeId: node.id,
    matchesExpression: true,
    matchScore: Math.min(100, Math.round(35 + score)),
    matchedFacets: matchedFacets.slice(0, 4),
    primarySnippet: bestSnippet,
    associationCount,
    subscriberCitationCount,
  };
}
