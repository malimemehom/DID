import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Node, Edge, MarkerType, Position } from 'reactflow';
import dagre from 'dagre';
import RabbitFlow from './RabbitFlow';
import MainNode from './nodes/MainNode';
import QuestionNode from './nodes/QuestionNode';
import AuthModal from './AuthModal';
import ChatFrame from './ChatFrame';
import '../styles/search.css';
import { searchRabbitHole } from '../services/api';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { getHistorySessions, saveHistorySession, deleteHistorySession, renameHistorySession, HistorySession, RabbitHoleExport, ConversationMessage } from '../services/history';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 600;
const nodeHeight = 500;
const questionNodeWidth = 300;
const questionNodeHeight = 100;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({
    rankdir: 'LR',
    nodesep: 800,
    ranksep: 500,
    marginx: 100,
    align: 'DL',
    ranker: 'tight-tree'
  });

  const allNodes = dagreGraph.nodes();
  allNodes.forEach((node: string) => dagreGraph.removeNode(node));

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.id === 'main' ? nodeWidth : questionNodeWidth,
      height: node.id === 'main' ? nodeHeight : questionNodeHeight
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (node.id === 'main' ? nodeWidth / 2 : questionNodeWidth / 2),
        y: nodeWithPosition.y - (node.id === 'main' ? nodeHeight / 2 : questionNodeHeight / 2)
      },
      targetPosition: Position.Left,
      sourcePosition: Position.Right
    };
  });

  return { nodes: newNodes, edges };
};

interface Source {
  title: string;
  url: string;
  uri: string;
  author: string;
  image: string;
}

interface ImageData {
  url: string;
  thumbnail: string;
  description: string;
}

interface SearchResponse {
  response: string;
  followUpQuestions: string[];
  sources: Source[];
  images: ImageData[];
  contextualQuery: string;
}

// ─── JSON Import/Export types are now in history.ts ────────────────────────

interface SearchViewProps {
  onGoToDashboard?: () => void;
}

const SearchView: React.FC<SearchViewProps> = ({ onGoToDashboard }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentConcept, setCurrentConcept] = useState<string>('');
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  const [showLeftChat, setShowLeftChat] = useState(false);
  const [showRightChat, setShowRightChat] = useState(false);
  const [selectedSourceNodeId, setSelectedSourceNodeId] = useState<string>('');
  const [importToast, setImportToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sidebar and History
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    getHistorySessions().then(setSessions);
  }, [user]);

  const onAskFollowUpRef = useRef<(nodeId: string) => void>(() => { });
  onAskFollowUpRef.current = (nodeId: string) => {
    setSelectedSourceNodeId(nodeId);
    setFollowUpInput('');
    setShowFollowUpModal(true);
  };

  const onDeleteNodeRef = useRef<(nodeId: string) => void>(() => { });
  onDeleteNodeRef.current = (nodeId: string) => {
    // Collect all descendants (including the node itself) to remove
    const getDescendants = (id: string, currentEdges: Edge[]): string[] => {
      const children = currentEdges.filter(e => e.source === id).map(e => e.target);
      return [id, ...children.flatMap(childId => getDescendants(childId, currentEdges))];
    };

    const nodesToRemove = getDescendants(nodeId, edgesRef.current);

    const updatedNodes = nodesRef.current.filter(n => !nodesToRemove.includes(n.id));
    const updatedEdges = edgesRef.current.filter(e =>
      !nodesToRemove.includes(e.source) && !nodesToRemove.includes(e.target)
    );

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(updatedNodes, updatedEdges);

    nodesRef.current = layoutedNodes;
    edgesRef.current = layoutedEdges;
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // After deleting nodes, if there are no main nodes left, reset to new session
    const hasMainNode = layoutedNodes.some(n => n.type === 'mainNode');
    if (!hasMainNode) {
      setSearchResult(null);
    }
  };

  // nodeTypes is memoized once; MainNode receives a stable wrapper that reads the latest ref
  const nodeTypes = useMemo(() => ({
    mainNode: (props: React.ComponentProps<typeof MainNode>) => (
      <MainNode
        {...props}
        data={{
          ...props.data,
          onAskFollowUp: () => onAskFollowUpRef.current(props.id),
          onDeleteNode: () => onDeleteNodeRef.current(props.id)
        }}
      />
    ),
    questionNode: (props: React.ComponentProps<typeof QuestionNode>) => (
      <QuestionNode
        {...props}
        data={{
          ...props.data,
          onDeleteNode: () => onDeleteNodeRef.current(props.id)
        }}
      />
    )
  }), []);
  const activeRequestRef = useRef<{ [key: string]: AbortController | null }>({});
  // Refs to always hold the latest state values, avoiding stale closures
  const edgesRef = useRef<Edge[]>([]);
  const nodesRef = useRef<Node[]>([]);

  const handleAddCustomFollowUp = () => {
    const question = followUpInput.trim();
    if (!question) return;

    // Find the last expanded main node to connect to
    const sourceId = selectedSourceNodeId || (
      nodesRef.current.filter(n => n.type === 'mainNode' && n.data.isExpanded).at(-1)?.id
      ?? nodesRef.current[0]?.id
      ?? 'main'
    );

    const uniqueId = `question-custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNode: Node = {
      id: uniqueId,
      type: 'questionNode',
      data: {
        label: question,
        isExpanded: false,
        content: '',
        images: [],
        sources: [],
        isCustom: true
      },
      position: { x: 0, y: 0 }
    };
    const newEdge: Edge = {
      id: `edge-${uniqueId}`,
      source: sourceId,
      target: uniqueId,
      style: { stroke: 'rgba(248, 248, 248, 0.8)', strokeWidth: 1.5 },
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(248, 248, 248, 0.8)' }
    };

    const mergedEdges = [...edgesRef.current, newEdge];
    const { nodes: layoutedNodes } = getLayoutedElements(
      [...nodesRef.current, newNode],
      mergedEdges
    );
    edgesRef.current = mergedEdges;
    nodesRef.current = layoutedNodes;
    setEdges(mergedEdges);
    setNodes(layoutedNodes);

    setFollowUpInput('');
    setShowFollowUpModal(false);
  };

  const saveCurrentSession = useCallback(async () => {
    if (!query && nodesRef.current.length === 0) return; // don't save empty

    const sessionId = currentSessionId || crypto.randomUUID();
    const newSession: HistorySession = {
      id: sessionId,
      timestamp: Date.now(),
      version: '1.0',
      query,
      currentConcept,
      conversationHistory,
      nodes: nodesRef.current,
      edges: edgesRef.current
    };

    // Save to backend
    await saveHistorySession(newSession);

    // Immediately update local state without re-fetching
    setSessions(prev => {
      const exists = prev.some(s => s.id === newSession.id);
      if (exists) {
        return prev.map(s => s.id === newSession.id ? newSession : s);
      }
      return [newSession, ...prev].sort((a, b) => b.timestamp - a.timestamp);
    });

    if (!currentSessionId) setCurrentSessionId(sessionId);
  }, [query, currentConcept, conversationHistory, currentSessionId]);

  useEffect(() => {
    if (nodes.length > 0) {
      const timeoutId = setTimeout(() => {
        saveCurrentSession();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, query, currentConcept, conversationHistory, saveCurrentSession]);

  const handleSelectSession = useCallback((session: HistorySession) => {
    setCurrentSessionId(session.id);
    setQuery(session.query || '');
    setCurrentConcept(session.currentConcept || '');
    setConversationHistory(session.conversationHistory || []);

    const loadedNodes = session.nodes || [];
    const loadedEdges = session.edges || [];
    nodesRef.current = loadedNodes;
    edgesRef.current = loadedEdges;
    setNodes(loadedNodes);
    setEdges(loadedEdges);

    if (loadedNodes.length > 0) {
      setSearchResult({
        response: '',
        followUpQuestions: [],
        sources: [],
        images: [],
        contextualQuery: session.query || '',
      } as SearchResponse);
    } else {
      setSearchResult(null);
    }

    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const handleNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setQuery('');
    setCurrentConcept('');
    setConversationHistory([]);
    nodesRef.current = [];
    edgesRef.current = [];
    setNodes([]);
    setEdges([]);
    setSearchResult(null);

    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const handleDeleteSession = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteHistorySession(id);
    const updatedSessions = await getHistorySessions();
    setSessions(updatedSessions);
    if (currentSessionId === id) {
      handleNewSession();
    }
  }, [currentSessionId, handleNewSession]);

  const handleRenameSession = useCallback(async (id: string, newName: string) => {
    await renameHistorySession(id, newName);
    const updatedSessions = await getHistorySessions();
    setSessions(updatedSessions);
    if (currentSessionId === id) {
      setQuery(newName);
    }
  }, [currentSessionId]);

  // useDeckHoverAnimation(thothDeckRef);
  // useDeckHoverAnimation(anubisDeckRef);
  // useDeckHoverAnimation(isisDeckRef);

  // ─── JSON Export ────────────────────────────────────────────────────────────
  const handleExportJSON = useCallback(() => {
    const payload: RabbitHoleExport = {
      version: '1.0',
      query,
      currentConcept,
      conversationHistory,
      nodes: nodesRef.current,
      edges: edgesRef.current,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (query || 'rabbitholes').replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '_').slice(0, 40);
    a.download = `rabbitholes_${safeName}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [query, currentConcept, conversationHistory]);

  // ─── JSON Import ─────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setImportToast(msg);
    setTimeout(() => setImportToast(null), 3000);
  }, []);

  const handleImportJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data: RabbitHoleExport = JSON.parse(evt.target?.result as string);

        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          showToast('✗ 无效的 JSON 格式：缺少 nodes 或 edges');
          return;
        }

        if (data.query) setQuery(data.query);
        if (data.currentConcept) setCurrentConcept(data.currentConcept);
        if (data.conversationHistory) setConversationHistory(data.conversationHistory);

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(data.nodes, data.edges);
        nodesRef.current = layoutedNodes;
        edgesRef.current = layoutedEdges;
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        setSearchResult({
          response: '',
          followUpQuestions: [],
          sources: [],
          images: [],
          contextualQuery: data.query || '',
        } as SearchResponse);

        showToast(`✓ 导入成功：${layoutedNodes.length} 个节点`);
      } catch {
        showToast('✗ JSON 解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  useEffect(() => {
    const activeRequests = activeRequestRef.current;
    return () => {
      Object.values(activeRequests).forEach(controller => {
        if (controller) {
          controller.abort();
        }
      });
    };
  }, []);

  const handleNodeClick = async (node: Node) => {
    if (!node.id.startsWith('question-') || node.data.isExpanded) return;

    // Check if there are any active requests
    const hasActiveRequests = Object.values(activeRequestRef.current).some(controller => controller !== null);
    if (hasActiveRequests) return;

    if (activeRequestRef.current[node.id]) {
      activeRequestRef.current[node.id]?.abort();
    }

    const abortController = new AbortController();
    activeRequestRef.current[node.id] = abortController;

    const questionText = node.data.label;
    setIsLoading(true);

    try {
      // Use nodesRef to avoid stale closure when reading current nodes
      const lastMainNode = nodesRef.current.find(n => n.type === 'mainNode' && n.data.isExpanded);
      if (lastMainNode) {
        const newHistoryEntry: ConversationMessage = {
          user: lastMainNode.data.label,
          assistant: lastMainNode.data.content
        };
        setConversationHistory(prev => [...prev, newHistoryEntry]);
      }

      setNodes(prevNodes => {
        const updated = prevNodes.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              type: 'mainNode',
              style: {
                ...n.style,
                width: nodeWidth,

              },
              data: {
                ...n.data,
                content: 'Loading...',
                isExpanded: true
              }
            };
          }
          return n;
        });
        nodesRef.current = updated;
        return updated;
      });

      const response = await searchRabbitHole({
        query: questionText,
        previousConversation: conversationHistory,
        concept: currentConcept,
        followUpMode: 'expansive'
      }, abortController.signal);

      if (activeRequestRef.current[node.id] === abortController) {
        setNodes(prevNodes => {
          const transformedNodes = prevNodes.map(n => {
            if (n.id === node.id) {
              return {
                ...n,
                type: 'mainNode',
                style: {
                  ...n.style,
                  width: nodeWidth,

                  opacity: 1,
                  cursor: 'default'
                },
                data: {
                  label: response.shortTitle || response.contextualQuery || questionText,
                  content: response.response,
                  images: response.images?.map((img: ImageData) => img.url),
                  sources: response.sources,
                  isExpanded: true
                }
              };
            }
            return n;
          });

          const newFollowUpNodes: Node[] = response.followUpQuestions.map((question: string, index: number) => {
            const uniqueId = `question-${node.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`;
            return {
              id: uniqueId,
              type: 'default',
              data: {
                label: question,
                isExpanded: false,
                content: '',
                images: [],
                sources: []
              },
              position: { x: 0, y: 0 },
              style: {
                width: questionNodeWidth,
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: '8px',
                fontSize: '14px',
                textAlign: 'left',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer'
              }
            };
          });

          // Use edgesRef to read the latest edges, avoiding stale closure
          const currentEdges = edgesRef.current;
          const newEdges: Edge[] = newFollowUpNodes.map((followUpNode) => ({
            id: `edge-${followUpNode.id}`,
            source: node.id,
            target: followUpNode.id,
            style: {
              stroke: 'rgba(248, 248, 248, 0.8)',
              strokeWidth: 1.5
            },
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: 'rgba(248, 248, 248, 0.8)'
            }
          }));

          const mergedEdges = [...currentEdges, ...newEdges];
          const { nodes: finalLayoutedNodes } = getLayoutedElements(
            [...transformedNodes, ...newFollowUpNodes],
            mergedEdges
          );

          // Update edgesRef and state together
          edgesRef.current = mergedEdges;
          setEdges(mergedEdges);

          nodesRef.current = finalLayoutedNodes;
          return finalLayoutedNodes;
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError' && activeRequestRef.current[node.id] === abortController) {
        console.error('Failed to process node click:', error);

        setNodes(prevNodes => {
          const updated = prevNodes.map(n => {
            if (n.id === node.id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  isExpanded: false
                },
                style: {
                  ...node.style,
                  opacity: 1
                }
              };
            }
            return n;
          });
          nodesRef.current = updated;
          return updated;
        });
      }
    } finally {
      if (activeRequestRef.current[node.id] === abortController) {
        activeRequestRef.current[node.id] = null;
        setIsLoading(false);
      }
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setIsLoading(true);
      const loadingNode: Node = {
        id: 'main',
        type: 'mainNode',
        data: {
          label: query,
          content: 'Loading...',
          images: [],
          sources: [],
          isExpanded: true
        },
        position: { x: 0, y: 0 },
        style: {
          width: nodeWidth,

          cursor: 'default'
        }
      };

      setNodes([loadingNode]);
      setEdges([]);

      const response = await searchRabbitHole({
        query,
        previousConversation: conversationHistory,
        concept: currentConcept,
        followUpMode: 'expansive'
      });
      setSearchResult(response);

      const mainNode: Node = {
        ...loadingNode,
        data: {
          label: response.shortTitle || response.contextualQuery || query,
          content: response.response,
          images: response.images?.map((img: ImageData) => img.url),
          sources: response.sources,
          isExpanded: true
        }
      };
      // Use AI-generated follow-up questions
      const followUpNodes: Node[] = response.followUpQuestions.map((question: string, index: number) => {
        return {
          id: `question-${index}`,
          type: 'questionNode',
          data: {
            label: question,
            isExpanded: false,
            content: '',
            images: [],
            sources: [],
            isCustom: false
          },
          position: { x: 0, y: 0 }
        };
      });

      const edges: Edge[] = followUpNodes.map((_, index) => ({
        id: `edge-${index}`,
        source: 'main',
        target: `question-${index}`,
        style: {
          stroke: 'rgba(248, 248, 248, 0.8)',
          strokeWidth: 1.5
        },
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'rgba(248, 248, 248, 0.8)'
        }
      }));


      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        [mainNode, ...followUpNodes],
        edges
      );

      // Keep refs in sync with initial search result
      nodesRef.current = layoutedNodes;
      edgesRef.current = layoutedEdges;
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };



  // ─── Toast notification ───────────────────────────────────────────────────
  const toastEl = importToast ? (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full bg-[#1a1a1a] border border-white/15 text-white/80 text-sm font-light shadow-2xl transition-all duration-300">
      {importToast}
    </div>
  ) : null;

  const renderMainContent = () => {
    if (!searchResult) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full overflow-y-auto relative bg-transparent">
          <a
            href="https://github.com/AsyncFuncAI/rabbitholes"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed top-6 right-6 z-50 transform hover:scale-110 transition-transform duration-300 group"
          >
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-[#00f2ff] via-[#7000ff] to-[#00f2ff] rounded-full opacity-0 group-hover:opacity-20 transition duration-500 blur-sm animate-gradient-xy"></div>
              <svg
                className="w-8 h-8 text-white/50 hover:text-white/90 transition-colors duration-300"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
          </a>
          <div className="w-full max-w-2xl mx-auto text-center relative z-10">
            <div className="mb-12 animate-cyber-pulse">
              <svg className="w-32 h-32 mx-auto" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background outer ring */}
                <circle cx="50" cy="50" r="48" stroke="rgba(0, 242, 255, 0.1)" strokeWidth="0.5" />
                
                {/* Rotating outer dash ring */}
                <circle cx="50" cy="50" r="45" stroke="#00f2ff" strokeWidth="1" strokeLinecap="round" className="cyber-svg-ring opacity-60" />
                
                {/* Rotating inner dash ring */}
                <circle cx="50" cy="50" r="38" stroke="#7000ff" strokeWidth="1" strokeLinecap="round" className="cyber-svg-ring-reverse opacity-40" />
                
                {/* Central Hexagon */}
                <path d="M50 25L71.6506 37.5V62.5L50 75L28.3494 62.5V37.5L50 25Z" fill="rgba(0, 242, 255, 0.05)" stroke="#00f2ff" strokeWidth="2" className="animate-pulse-glow" />
                
                {/* Core Circle */}
                <circle cx="50" cy="50" r="10" fill="#00f2ff" className="animate-pulse opacity-80" />
                <circle cx="50" cy="50" r="15" stroke="#7000ff" strokeWidth="0.5" className="animate-spin-slow" />
                
                {/* Crosshair lines */}
                <line x1="50" y1="20" x2="50" y2="10" stroke="#00f2ff" strokeWidth="1" />
                <line x1="50" y1="80" x2="50" y2="90" stroke="#00f2ff" strokeWidth="1" />
                <line x1="20" y1="50" x2="10" y2="50" stroke="#00f2ff" strokeWidth="1" />
                <line x1="80" y1="50" x2="90" y2="50" stroke="#00f2ff" strokeWidth="1" />
              </svg>
            </div>

            <div className="mb-8">
              <h1 className="text-4xl font-bold tracking-[0.3em] uppercase animate-glitch">
                <span className="neon-text-cyan">LOGIC</span>
                <span className="text-white/20">:</span>
                <span className="neon-text-purple">SET</span>
              </h1>
              <p className="mt-4 text-white/40 text-xs tracking-[0.2em] font-light uppercase">
                Compiling_perspectives
              </p>
            </div>

            <div className="relative w-full max-w-xl mx-auto group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00f2ff] via-[#7000ff] to-[#00f2ff] rounded-full opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-gradient-xy blur-md"></div>
              <input
                type="text"
                className="w-full px-6 py-4 rounded-full bg-[#0d0d0d]/80 text-white/90 border border-white/10 focus:border-[#00f2ff]/40 focus:outline-none placeholder-white/20 shadow-2xl backdrop-blur-xl font-light tracking-wide transition-all duration-300"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
                placeholder="Ask your question..."
                disabled={isLoading}
              />
              {isLoading ? (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-5 h-5 border border-white/20 rounded-full animate-spin border-t-white/80"></div>
                </div>
              ) : (
                <button
                  onClick={handleSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-white/5 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-[#00f2ff]/60 hover:text-[#00f2ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}
            </div>

          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full bg-transparent overflow-hidden">
        <RabbitFlow
          initialNodes={nodes}
          initialEdges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
        />

        {/* Floating Chat Toggle Buttons (Visible after search) */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center gap-6">
          {!showLeftChat && (
            <button
              onClick={() => setShowLeftChat(true)}
              className="px-6 py-2.5 rounded-full cyber-glass neon-border-cyan neon-text-cyan text-sm hover:bg-cyan-500/10 transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(0,242,255,0.15)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              开启左侧逻辑分析
            </button>
          )}
          {!showRightChat && (
            <button
              onClick={() => setShowRightChat(true)}
              className="px-6 py-2.5 rounded-full cyber-glass neon-border-purple neon-text-purple text-sm hover:bg-purple-500/10 transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(112,0,255,0.15)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              开启右侧深度推演
            </button>
          )}
        </div>

        {/* Modal overlay */}
        {showFollowUpModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowFollowUpModal(false); }}
          >
            <div className="w-full max-w-md mx-4 bg-[#111111] border border-white/15 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-white/80 text-sm font-light tracking-[0.15em] uppercase mb-4">
                Ask a Follow Up
              </h3>

              {/* Branch-from node picker */}
              {(() => {
                const mainNodes = nodesRef.current.filter(n => n.type === 'mainNode' && n.data.isExpanded);
                if (mainNodes.length <= 1) return null;
                return (
                  <div className="mb-4">
                    <p className="text-white/40 text-xs tracking-wider uppercase mb-2">Branch from</p>
                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                      {mainNodes.map(n => (
                        <button
                          key={n.id}
                          onClick={() => setSelectedSourceNodeId(n.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-light transition-all duration-150 border truncate max-w-[180px] ${selectedSourceNodeId === n.id
                            ? 'bg-white/15 border-white/40 text-white'
                            : 'bg-transparent border-white/15 text-white/50 hover:border-white/30 hover:text-white/70'
                            }`}
                          title={n.data.label}
                        >
                          {n.data.label.length > 28 ? n.data.label.slice(0, 28) + '…' : n.data.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2c2c2c] via-[#3c3c3c] to-[#2c2c2c] rounded-xl opacity-30 group-focus-within:opacity-60 transition duration-500 blur-sm" />
                <textarea
                  autoFocus
                  className="relative w-full px-4 py-3 rounded-xl bg-[#0d0d0d] text-white/90 border border-white/10 focus:border-white/25 focus:outline-none placeholder-white/25 text-sm font-light resize-none leading-relaxed"
                  rows={3}
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddCustomFollowUp();
                    }
                    if (e.key === 'Escape') setShowFollowUpModal(false);
                  }}
                  placeholder="What else would you like to explore?"
                />
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowFollowUpModal(false)}
                  className="px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomFollowUp}
                  disabled={!followUpInput.trim()}
                  className="px-5 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Add Branch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-white">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onImportClick={() => fileInputRef.current?.click()}
        onExportClick={handleExportJSON}
        onGoToDashboard={onGoToDashboard}
        showExport={!!searchResult}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onLoginClick={() => setIsAuthModalOpen(true)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <div className={`flex-1 relative h-full flex flex-col overflow-hidden bg-[#050505] transition-all duration-300`}>
        {/* Cyberpunk Background Layers */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 cyber-grid opacity-30" />
          <div className="absolute inset-0 cyber-grid-dots opacity-20" />
          <div className="nebula-glow" />
          <div className="scanline" />
          <div className="absolute inset-0 cyber-overlay" />
        </div>

        {/* Toggle switch for desktop/mobile when sidebar is closed */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-40 p-2 rounded-lg bg-transparent hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Open Sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportJSON}
        />
        {toastEl}

        {renderMainContent()}

        {/* Chat Frames */}
        {showLeftChat && (
          <ChatFrame
            title="左侧 逻辑分析"
            side="left"
            topic={query}
            onClose={() => setShowLeftChat(false)}
          />
        )}
        {showRightChat && (
          <ChatFrame
            title="右侧 深度推演"
            side="right"
            topic={query}
            onClose={() => setShowRightChat(false)}
          />
        )}
      </div>
    </div>
  );
};

export default SearchView; 