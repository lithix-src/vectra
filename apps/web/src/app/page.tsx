"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import CenterWorkspacePane from "@/components/CenterWorkspacePane";
import LeftRailSnapView from "@/components/LeftRailSnapView";
import RightRailInspector from "@/components/RightRailInspector";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import CollectorAndCmdkModals from "@/components/modals/CollectorAndCmdkModals";
import IngestAndCypherModals from "@/components/modals/IngestAndCypherModals";
import RuntimeAndGatewayModals from "@/components/modals/RuntimeAndGatewayModals";
import { useVectraWorkspace } from "@/hooks/useVectraWorkspace";
import { CanonicalNodeItem } from "@/types/vectra";

export default function VectraAdvisoryWorkspace() {
  const ws = useVectraWorkspace();

  const getLensSummary = (node: CanonicalNodeItem | null) => {
    if (!node) return "";
    if (ws.variantLens === "cto") return node.summary_technical;
    if (ws.variantLens === "contrarian") return node.summary_contrarian;
    return node.summary_executive;
  };

  return (
    <div className="min-h-screen h-screen w-screen flex flex-col bg-[#090D14] text-slate-100 overflow-hidden">
      <WorkspaceHeader
        variantLens={ws.variantLens}
        onSelectLens={(lens, toastMsg) => {
          ws.setVariantLens(lens);
          ws.triggerToast(toastMsg);
        }}
        llmStatus={ws.llmStatus}
        collectorStatus={ws.collectorStatus}
        pptxDownloading={ws.pptxDownloading}
        onOpenMCPModal={() => {
          ws.fetchMCPGatewayStatus();
          ws.setMCPModalOpen(true);
        }}
        onOpenLLMModal={() => {
          ws.fetchLocalLLMStatus();
          ws.setLLMModalOpen(true);
        }}
        onOpenCollectorModal={() => {
          ws.fetchCollectorPacks();
          ws.setCollectorModalOpen(true);
        }}
        onOpenIngestModal={() => ws.setIngestModalOpen(true)}
        onOpenCmdk={() => ws.setCmdkOpen(true)}
        onLaunchBoardroom={ws.handleLaunchBoardroomMode}
        onDownloadPptx={ws.handleDownloadPptx}
      />

      {ws.statusToast && (
        <div
          id="vectra-status-toast"
          className="fixed bottom-4 right-4 z-50 bg-[#101722] border border-sky-400/60 text-sky-200 px-3.5 py-2 rounded shadow-2xl text-xs font-mono flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{ws.statusToast}</span>
        </div>
      )}

      <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">
        <LeftRailSnapView
          nodes={ws.visibleNodes}
          totalNodeCount={ws.nodes.length}
          nodeMatchMap={ws.nodeMatchMap}
          selectedNode={ws.selectedNode}
          activeVertical={ws.activeVertical}
          variantLens={ws.variantLens}
          contextQuery={ws.contextQuery}
          integrations={ws.integrations}
          collectorStatus={ws.collectorStatus}
          collectorBusyPackId={ws.collectorBusyPackId}
          onChangeContextQuery={ws.setContextQuery}
          onSelectNode={ws.setSelectedNodeId}
          onInspectNodeAssociations={(id) => {
            ws.setSelectedNodeId(id);
            ws.setRightTab("associations");
          }}
          onVerticalChange={ws.handleVerticalChange}
          onSimulateInboundNewsletter={ws.handleSimulateInboundNewsletter}
          onRunPublicCollectors={ws.handleRunPublicCollectors}
          onOpenCollectorModal={() => {
            ws.fetchCollectorPacks();
            ws.setCollectorModalOpen(true);
          }}
          onRefreshIntegration={ws.handleRefreshIntegration}
          onTriggerToast={ws.triggerToast}
          getLensSummary={getLensSummary}
        />

        <CenterWorkspacePane
          nodes={ws.visibleNodes}
          edges={ws.visibleEdges}
          selectedNode={ws.selectedNode}
          centerMode={ws.centerMode}
          variantLens={ws.variantLens}
          relationFilter={ws.relationFilter}
          lassoModeActive={ws.lassoModeActive}
          lassoNodeIds={ws.lassoNodeIds}
          connectModeSourceId={ws.connectModeSourceId}
          weightSliderValue={ws.weightSliderValue}
          onSetCenterMode={ws.setCenterMode}
          onSetRelationFilter={ws.setRelationFilter}
          onToggleLassoMode={() => {
            const nextState = !ws.lassoModeActive;
            ws.setLassoModeActive(nextState);
            if (nextState) {
              ws.triggerToast(
                "Lasso Mode ON: Drag a rectangle on the graph (or click Top 4) to scope subgraph"
              );
            }
          }}
          onQuickLassoSubgraph={ws.handleQuickLassoSubgraph}
          onOpenCypherModal={ws.handleOpenCypherModal}
          onToggleConnectNode={() => {
            if (!ws.selectedNode) return;
            if (ws.connectModeSourceId) {
              ws.setConnectModeSourceId(null);
            } else {
              ws.setConnectModeSourceId(ws.selectedNode.id);
              ws.triggerToast(
                `Click any target node on the graph to link from "${ws.selectedNode.title.slice(0, 24)}…"`
              );
            }
          }}
          onWeightCommit={ws.handleWeightCommit}
          onSelectNode={ws.setSelectedNodeId}
          onUpdateLassoNodes={ws.handleUpdateLassoNodes}
          onCreateEdgeBetween={ws.handleCreateEdgeBetween}
          onInspectSource={() => ws.setRightTab("citations")}
        />

        <RightRailInspector
          nodes={ws.nodes}
          edges={ws.edges}
          nodeMatchMap={ws.nodeMatchMap}
          selectedNode={ws.selectedNode}
          rightTab={ws.rightTab}
          variantLens={ws.variantLens}
          activeVertical={ws.activeVertical}
          contextQuery={ws.contextQuery}
          relationFilter={ws.relationFilter}
          lassoNodeIds={ws.lassoNodeIds}
          llmStatus={ws.llmStatus}
          copilotQuestion={ws.copilotQuestion}
          copilotLoading={ws.copilotLoading}
          copilotResponse={ws.copilotResponse}
          pptxDownloading={ws.pptxDownloading}
          briefDownloading={ws.briefDownloading}
          onSelectNode={ws.setSelectedNodeId}
          onSetRightTab={ws.setRightTab}
          onSetCopilotQuestion={ws.setCopilotQuestion}
          onSaveNote={ws.handleSaveNoteAndSyncWikilinks}
          onScopeNeighborhood={ws.handleScopeNeighborhood}
          onToggleLassoNode={ws.handleToggleLassoNode}
          onCreateTypedEdge={ws.handleCreateEdgeBetween}
          onQuickLassoSubgraph={ws.handleQuickLassoSubgraph}
          onOpenLLMModal={() => {
            ws.fetchLocalLLMStatus();
            ws.setLLMModalOpen(true);
          }}
          onOpenCypherModal={ws.handleOpenCypherModal}
          onRunCopilotQuery={ws.handleRunCopilotQuery}
          onDownloadPptx={ws.handleDownloadPptx}
          onDownloadBriefMarkdown={ws.handleDownloadBriefMarkdown}
          getLensSummary={getLensSummary}
        />
      </div>

      <IngestAndCypherModals
        ingestModalOpen={ws.ingestModalOpen}
        onCloseIngestModal={() => ws.setIngestModalOpen(false)}
        cypherModalOpen={ws.cypherModalOpen}
        onCloseCypherModal={() => ws.setCypherModalOpen(false)}
        selectedNode={ws.selectedNode}
        activeVertical={ws.activeVertical}
        cypherSql={ws.cypherSql}
        cypherGraphName={ws.cypherGraphName}
        cypherLoading={ws.cypherLoading}
        onSignalIngested={async (nodeId, toastMsg) => {
          await ws.fetchWorkspaceData(ws.activeVertical, true);
          if (nodeId) ws.setSelectedNodeId(nodeId);
          if (toastMsg) ws.triggerToast(toastMsg);
        }}
        onTriggerToast={ws.triggerToast}
      />

      <RuntimeAndGatewayModals
        llmModalOpen={ws.llmModalOpen}
        onCloseLLMModal={() => ws.setLLMModalOpen(false)}
        llmStatus={ws.llmStatus}
        llmProviderInput={ws.llmProviderInput}
        llmBaseUrlInput={ws.llmBaseUrlInput}
        llmModelInput={ws.llmModelInput}
        llmEmbedModelInput={ws.llmEmbedModelInput}
        llmSaving={ws.llmSaving}
        onSelectLLMProviderPreset={ws.handleSelectLLMProviderPreset}
        onChangeLLMBaseUrl={ws.setLLMBaseUrlInput}
        onChangeLLMModel={ws.setLLMModelInput}
        onChangeLLMEmbedModel={ws.setLLMEmbedModelInput}
        onSaveLocalLLMConfig={ws.handleSaveLocalLLMConfig}
        mcpModalOpen={ws.mcpModalOpen}
        onCloseMCPModal={() => ws.setMCPModalOpen(false)}
        mcpStatus={ws.mcpStatus}
        mcpTestResult={ws.mcpTestResult}
        onTestMCPToolCall={ws.handleTestMCPToolCall}
      />

      <CollectorAndCmdkModals
        collectorModalOpen={ws.collectorModalOpen}
        onCloseCollectorModal={() => ws.setCollectorModalOpen(false)}
        collectorStatus={ws.collectorStatus}
        collectorAllowLiveHttp={ws.collectorAllowLiveHttp}
        collectorBusyPackId={ws.collectorBusyPackId}
        onToggleAllowLiveHttp={ws.setCollectorAllowLiveHttp}
        onRunPublicCollectors={ws.handleRunPublicCollectors}
        onUpdateCollectorSchedule={ws.handleUpdateCollectorSchedule}
        cmdkOpen={ws.cmdkOpen}
        onCloseCmdk={() => ws.setCmdkOpen(false)}
        nodes={ws.nodes}
        onSelectLens={ws.setVariantLens}
        onSelectNode={ws.setSelectedNodeId}
        onDownloadPptx={ws.handleDownloadPptx}
        onDownloadBriefMarkdown={ws.handleDownloadBriefMarkdown}
        onOpenCollectorModal={() => {
          ws.fetchCollectorPacks();
          ws.setCollectorModalOpen(true);
        }}
      />
    </div>
  );
}
