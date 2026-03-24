import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  NodeTypes,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  ConnectionLineType,
  Position,
  MiniMap,
} from 'reactflow';
import dagre from '@dagrejs/dagre';
import 'reactflow/dist/style.css';

import { usePostHog } from 'posthog-js/react';

interface RabbitFlowProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  nodeTypes: NodeTypes;
  onNodeClick?: (node: Node) => void;
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const hasExpandedNodes = nodes.some((node) => node.type === 'mainNode' && node.data.isExpanded);

  dagreGraph.setGraph({
    rankdir: 'LR',
    nodesep: 100,
    ranksep: hasExpandedNodes ? 200 : 120,
    marginx: 200,
    marginy: hasExpandedNodes ? 200 : 120,
    align: 'UL',
    ranker: 'tight-tree',
  });

  nodes.forEach((node) => {
    const isMainNode = node.type === 'mainNode';
    dagreGraph.setNode(node.id, {
      width: isMainNode ? 600 : 300,
      height: isMainNode ? 500 : 100
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const fallback = dagreGraph.node(node.id);
    const isMainNode = node.type === 'mainNode';
    const width = isMainNode ? 600 : 300;
    const height = isMainNode ? 500 : 100;
    const position = {
      x: fallback.x - width / 2,
      y: fallback.y - height / 2,
    };

    return {
      ...node,
      position,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    };
  });

  return { nodes: newNodes, edges };
};

const RabbitFlow: React.FC<RabbitFlowProps> = ({
  initialNodes,
  initialEdges,
  nodeTypes,
  onNodeClick
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  React.useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: ConnectionLineType.SmoothStep,
            animated: true
          },
          eds
        )
      ),
    [setEdges]
  );

  const posthog = usePostHog();

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (posthog) {
        posthog.capture('node_clicked', {
          nodeId: node.id,
          nodeType: node.type,
          label: node.data?.label || '',
          position: node.position,
        });
      }

      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [onNodeClick, posthog]  // important: add posthog to dependency array
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: 'rgba(127, 147, 169, 0.35)', strokeWidth: 1.5 }
        }}
        fitView
        zoomOnScroll={true}
        panOnScroll={false}
        zoomOnPinch={true}
        preventScrolling={false}
        style={{ backgroundColor: 'transparent' }}
      >
        <Controls
          className="!bg-white/80 !border-white/80 !shadow-[0_16px_40px_rgba(148,163,184,0.18)] !rounded-2xl"
        />
        <MiniMap
          style={{
            backgroundColor: 'rgba(255,255,255,0.78)',
            border: '1px solid rgba(255,255,255,0.85)',
            borderRadius: '18px',
          }}
          nodeColor="#94a3b8"
          maskColor="rgba(226, 232, 240, 0.72)"
          className="!bottom-4 !right-4"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.4}
          color="rgba(148, 163, 184, 0.22)"
        />
      </ReactFlow>
    </div>
  );
};

export default RabbitFlow; 
