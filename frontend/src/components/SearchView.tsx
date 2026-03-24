import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Edge, MarkerType, Node, Position } from 'reactflow';
import dagre from 'dagre';
import RabbitFlow from './RabbitFlow';
import MainNode from './nodes/MainNode';
import QuestionNode from './nodes/QuestionNode';
import AuthModal from './AuthModal';
import ChatFrame from './ChatFrame';
import Sidebar from './Sidebar';
import '../styles/search.css';
import { searchRabbitHole } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  ConversationMessage,
  deleteHistorySession,
  getHistorySessions,
  HistorySession,
  RabbitHoleExport,
  renameHistorySession,
  saveHistorySession,
} from '../services/history';

const nodeWidth = 600;
const nodeHeight = 500;
const questionNodeWidth = 300;
const questionNodeHeight = 100;

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
  shortTitle?: string;
}

interface SearchViewProps {
  onGoToDashboard?: () => void;
  onUpdateDebateInfo?: (sources: Source[], sessionId: string | null) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: 'LR',
    nodesep: 100,
    ranksep: nodes.some((node) => node.type === 'mainNode' && node.data.isExpanded) ? 200 : 120,
    marginx: 200,
    marginy: 160,
    align: 'UL',
    ranker: 'tight-tree',
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.type === 'mainNode' ? nodeWidth : questionNodeWidth,
      height: node.type === 'mainNode' ? nodeHeight : questionNodeHeight,
    });
  });

  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
  dagre.layout(dagreGraph);

  return {
    nodes: nodes.map((node) => {
      const position = dagreGraph.node(node.id);
      if (!position) return node;

      return {
        ...node,
        position: {
          x: position.x - (node.type === 'mainNode' ? nodeWidth / 2 : questionNodeWidth / 2),
          y: position.y - (node.type === 'mainNode' ? nodeHeight / 2 : questionNodeHeight / 2),
        },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
      };
    }),
    edges,
  };
};

const createQuestionNode = (id: string, label: string, isCustom = false): Node => ({
  id,
  type: 'questionNode',
  data: {
    label,
    isExpanded: false,
    content: '',
    images: [],
    sources: [],
    isCustom,
  },
  position: { x: 0, y: 0 },
});

const createEdge = (source: string, target: string, isDark: boolean): Edge => ({
  id: `edge-${target}`,
  source,
  target,
  style: {
    stroke: isDark ? 'rgba(191, 172, 130, 0.45)' : 'rgba(127, 147, 169, 0.45)',
    strokeWidth: 1.6,
  },
  type: 'smoothstep',
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: isDark ? 'rgba(191, 172, 130, 0.45)' : 'rgba(127, 147, 169, 0.45)',
  },
});

const SearchView: React.FC<SearchViewProps> = ({ onGoToDashboard, onUpdateDebateInfo, theme, onToggleTheme }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentConcept, setCurrentConcept] = useState('');
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  const [selectedSourceNodeId, setSelectedSourceNodeId] = useState('');
  const [showLeftChat, setShowLeftChat] = useState(false);
  const [showRightChat, setShowRightChat] = useState(false);
  const [importToast, setImportToast] = useState<string | null>(null);
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const activeRequestRef = useRef<Record<string, AbortController | null>>({});

  const isDark = theme === 'dark';
  const frameClass = isDark
    ? 'bg-[linear-gradient(180deg,#111827_0%,#0f172a_58%,#1f2937_100%)] text-slate-100'
    : 'bg-[linear-gradient(180deg,#ece5d8_0%,#d8e1ea_58%,#f6f1e8_100%)] text-slate-900';
  const heroPanelClass = isDark
    ? 'bg-[linear-gradient(145deg,rgba(15,23,42,0.92),rgba(30,41,59,0.88))] border border-slate-700/80 text-slate-100 shadow-[0_28px_90px_rgba(2,6,23,0.45)]'
    : 'bg-[linear-gradient(145deg,rgba(245,238,226,0.94),rgba(214,224,234,0.92))] border border-white/70 text-slate-900 shadow-[0_28px_90px_rgba(71,85,105,0.18)]';
  const chipClass = isDark
    ? 'bg-slate-800/80 border border-slate-700 text-amber-300'
    : 'bg-white/65 border border-white/80 text-amber-700';
  const inputClass = isDark
    ? 'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:bg-slate-950/90'
    : 'border-white/80 bg-white/70 text-slate-800 placeholder:text-slate-400 focus:border-amber-300 focus:bg-white';
  const floatingButtonClass = isDark
    ? 'bg-slate-900/78 border border-slate-700 text-slate-200 hover:text-amber-300 shadow-[0_18px_40px_rgba(2,6,23,0.35)]'
    : 'bg-white/70 border border-white/80 text-slate-700 hover:text-amber-700 shadow-[0_18px_40px_rgba(148,163,184,0.18)]';

  const syncGraphState = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nextNodes, nextEdges);
    nodesRef.current = layoutedNodes;
    edgesRef.current = layoutedEdges;
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, []);

  const showToast = useCallback((message: string) => {
    setImportToast(message);
    setTimeout(() => setImportToast(null), 3000);
  }, []);

  useEffect(() => {
    getHistorySessions().then(setSessions);
  }, [user]);

  useEffect(() => {
    if (!onUpdateDebateInfo) return;

    const allSources: Source[] = [];
    const seen = new Set<string>();
    nodes.forEach((node) => {
      if (node.type !== 'mainNode' || !Array.isArray(node.data?.sources)) return;
      node.data.sources.forEach((source: Source) => {
        if (seen.has(source.url)) return;
        seen.add(source.url);
        allSources.push(source);
      });
    });
    onUpdateDebateInfo(allSources, currentSessionId);
  }, [currentSessionId, nodes, onUpdateDebateInfo]);

  useEffect(() => {
    const activeRequests = activeRequestRef.current;
    return () => {
      Object.values(activeRequests).forEach((controller) => controller?.abort());
    };
  }, []);

  const saveCurrentSession = useCallback(async () => {
    if (!query && nodesRef.current.length === 0) return;

    const sessionId = currentSessionId || crypto.randomUUID();
    const nextSession: HistorySession = {
      id: sessionId,
      timestamp: Date.now(),
      version: '1.0',
      query,
      currentConcept,
      conversationHistory,
      nodes: nodesRef.current,
      edges: edgesRef.current,
    };

    await saveHistorySession(nextSession);

    setSessions((prev) => {
      const exists = prev.some((session) => session.id === nextSession.id);
      return exists
        ? prev.map((session) => (session.id === nextSession.id ? nextSession : session))
        : [nextSession, ...prev].sort((a, b) => b.timestamp - a.timestamp);
    });

    if (!currentSessionId) setCurrentSessionId(sessionId);
  }, [conversationHistory, currentConcept, currentSessionId, query]);

  useEffect(() => {
    if (nodes.length === 0) return;
    const timeoutId = setTimeout(saveCurrentSession, 1000);
    return () => clearTimeout(timeoutId);
  }, [conversationHistory, currentConcept, edges, nodes, query, saveCurrentSession]);

  const handleSelectSession = useCallback((session: HistorySession) => {
    setCurrentSessionId(session.id);
    setQuery(session.query || '');
    setCurrentConcept(session.currentConcept || '');
    setConversationHistory(session.conversationHistory || []);
    nodesRef.current = session.nodes || [];
    edgesRef.current = session.edges || [];
    setNodes(nodesRef.current);
    setEdges(edgesRef.current);
    setSearchResult(
      nodesRef.current.length > 0
        ? { response: '', followUpQuestions: [], sources: [], images: [], contextualQuery: session.query || '' }
        : null
    );
    if (window.innerWidth < 768) setIsSidebarOpen(false);
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
    setError(null);
    setSelectedSourceNodeId('');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, []);

  const handleDeleteSession = useCallback(async (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    await deleteHistorySession(id);
    setSessions(await getHistorySessions());
    if (currentSessionId === id) handleNewSession();
  }, [currentSessionId, handleNewSession]);

  const handleRenameSession = useCallback(async (id: string, newName: string) => {
    await renameHistorySession(id, newName);
    setSessions(await getHistorySessions());
    if (currentSessionId === id) setQuery(newName);
  }, [currentSessionId]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const collect = (id: string, currentEdges: Edge[]): string[] => {
      const children = currentEdges.filter((edge) => edge.source === id).map((edge) => edge.target);
      return [id, ...children.flatMap((childId) => collect(childId, currentEdges))];
    };

    const nodesToRemove = collect(nodeId, edgesRef.current);
    const nextNodes = nodesRef.current.filter((node) => !nodesToRemove.includes(node.id));
    const nextEdges = edgesRef.current.filter(
      (edge) => !nodesToRemove.includes(edge.source) && !nodesToRemove.includes(edge.target)
    );
    syncGraphState(nextNodes, nextEdges);
    if (!nextNodes.some((node) => node.type === 'mainNode')) setSearchResult(null);
  }, [syncGraphState]);

  const handleOpenFollowUp = useCallback((nodeId: string) => {
    setSelectedSourceNodeId(nodeId);
    setFollowUpInput('');
    setShowFollowUpModal(true);
  }, []);

  const nodeTypes = useMemo(() => ({
    mainNode: (props: React.ComponentProps<typeof MainNode>) => (
      <MainNode
        {...props}
        data={{
          ...props.data,
          theme,
          onAskFollowUp: () => handleOpenFollowUp(props.id),
          onDeleteNode: () => handleDeleteNode(props.id),
        }}
      />
    ),
    questionNode: (props: React.ComponentProps<typeof QuestionNode>) => (
      <QuestionNode
        {...props}
        data={{ ...props.data, theme, onDeleteNode: () => handleDeleteNode(props.id) }}
      />
    ),
  }), [handleDeleteNode, handleOpenFollowUp, theme]);

  const handleAddCustomFollowUp = () => {
    const question = followUpInput.trim();
    if (!question) return;

    const expandedMainNodes = nodesRef.current.filter((node) => node.type === 'mainNode' && node.data.isExpanded);
    const sourceId = selectedSourceNodeId || expandedMainNodes[expandedMainNodes.length - 1]?.id || nodesRef.current[0]?.id || 'main';

    const newNode = createQuestionNode(`question-custom-${Date.now()}`, question, true);
    syncGraphState(
      [...nodesRef.current, newNode],
      [...edgesRef.current, createEdge(sourceId, newNode.id, isDark)]
    );

    setFollowUpInput('');
    setShowFollowUpModal(false);
    setSelectedSourceNodeId('');
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setError(null);
    setIsLoading(true);

    const loadingNode: Node = {
      id: 'main',
      type: 'mainNode',
      data: {
        label: query,
        content: 'Loading...',
        images: [],
        sources: [],
        isExpanded: true,
      },
      position: { x: 0, y: 0 },
      style: { width: nodeWidth, cursor: 'default' },
    };

    syncGraphState([loadingNode], []);

    try {
      const response = await searchRabbitHole({
        query,
        previousConversation: conversationHistory,
        concept: currentConcept,
        followUpMode: 'expansive',
      });

      setSearchResult(response);

      const mainNode: Node = {
        ...loadingNode,
        data: {
          label: response.shortTitle || response.contextualQuery || query,
          content: response.response,
          images: response.images?.map((image: ImageData) => image.url),
          sources: response.sources,
          isExpanded: true,
        },
      };

      const followUpNodes = response.followUpQuestions.map((question: string, index: number) =>
        createQuestionNode(`question-${Date.now()}-${index}`, question)
      );
      const followUpEdges = followUpNodes.map((node: Node) => createEdge(mainNode.id, node.id, isDark));

      syncGraphState([mainNode, ...followUpNodes], followUpEdges);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : '搜索失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeClick = async (node: Node) => {
    if (!node.id.startsWith('question-') || node.data.isExpanded) return;
    if (Object.values(activeRequestRef.current).some(Boolean)) return;

    activeRequestRef.current[node.id]?.abort();
    const abortController = new AbortController();
    activeRequestRef.current[node.id] = abortController;
    setIsLoading(true);

    try {
      const lastMainNode = nodesRef.current.find((candidate) => candidate.type === 'mainNode' && candidate.data.isExpanded);
      if (lastMainNode) {
        setConversationHistory((prev) => [...prev, { user: lastMainNode.data.label, assistant: lastMainNode.data.content }]);
      }

      const pendingNodes = nodesRef.current.map((currentNode) => {
        if (currentNode.id !== node.id) return currentNode;
        return {
          ...currentNode,
          type: 'mainNode',
          style: { ...currentNode.style, width: nodeWidth },
          data: { ...currentNode.data, content: 'Loading...', isExpanded: true },
        };
      });
      syncGraphState(pendingNodes, edgesRef.current);

      const response = await searchRabbitHole({
        query: node.data.label,
        previousConversation: conversationHistory,
        concept: currentConcept,
        followUpMode: 'expansive',
      }, abortController.signal);

      if (activeRequestRef.current[node.id] !== abortController) return;

      setSearchResult(response);

      const transformedNodes = nodesRef.current.map((currentNode) => {
        if (currentNode.id !== node.id) return currentNode;
        return {
          ...currentNode,
          type: 'mainNode',
          style: { ...currentNode.style, width: nodeWidth, opacity: 1, cursor: 'default' },
          data: {
            label: response.shortTitle || response.contextualQuery || node.data.label,
            content: response.response,
            images: response.images?.map((image: ImageData) => image.url),
            sources: response.sources,
            isExpanded: true,
          },
        };
      });

      const remainingEdges = edgesRef.current.filter((edge) => edge.source !== node.id);
      const nextQuestionNodes = response.followUpQuestions.map((question: string, index: number) =>
        createQuestionNode(`question-${node.id}-${Date.now()}-${index}`, question)
      );
      const nextEdges = nextQuestionNodes.map((questionNode: Node) => createEdge(node.id, questionNode.id, isDark));

      syncGraphState([...transformedNodes, ...nextQuestionNodes], [...remainingEdges, ...nextEdges]);
    } catch (nodeError) {
      if (!(nodeError instanceof Error && nodeError.name === 'AbortError')) {
        setError(nodeError instanceof Error ? nodeError.message : '展开节点失败，请稍后重试');
      }
    } finally {
      if (activeRequestRef.current[node.id] === abortController) activeRequestRef.current[node.id] = null;
      setIsLoading(false);
    }
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const data: RabbitHoleExport = JSON.parse(loadEvent.target?.result as string);
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          showToast('导入失败：文件缺少节点或连线数据');
          return;
        }

        if (data.query) setQuery(data.query);
        if (data.currentConcept) setCurrentConcept(data.currentConcept);
        if (data.conversationHistory) setConversationHistory(data.conversationHistory);

        syncGraphState(data.nodes, data.edges);
        setSearchResult({ response: '', followUpQuestions: [], sources: [], images: [], contextualQuery: data.query || '' });
        const importedSessionId = crypto.randomUUID();
        setCurrentSessionId(importedSessionId);

        if (data.debateDashboardData) {
          localStorage.setItem(`debateDashboard_${importedSessionId}`, JSON.stringify(data.debateDashboardData));
        }

        showToast(`导入成功：共恢复 ${data.nodes.length} 个节点`);
      } catch {
        showToast('导入失败：JSON 文件格式不正确');
      }
    };
    reader.readAsText(file);
  };

  const handleExportJSON = useCallback(() => {
    let debateDashboardData = null;
    if (currentSessionId) {
      const raw = localStorage.getItem(`debateDashboard_${currentSessionId}`);
      if (raw) {
        try {
          debateDashboardData = JSON.parse(raw);
        } catch {
          debateDashboardData = null;
        }
      }
    }

    const allSources: Source[] = [];
    const seen = new Set<string>();
    nodesRef.current.forEach((node) => {
      if (node.type !== 'mainNode' || !Array.isArray(node.data?.sources)) return;
      node.data.sources.forEach((source: Source) => {
        if (seen.has(source.url)) return;
        seen.add(source.url);
        allSources.push(source);
      });
    });

    const payload: RabbitHoleExport = {
      version: '1.0',
      query,
      currentConcept,
      conversationHistory,
      nodes: nodesRef.current,
      edges: edgesRef.current,
      debateDashboardData,
      collectedSources: allSources,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const safeName = (query || 'rabbitholes').replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '_').slice(0, 40);
    anchor.download = `rabbitholes_${safeName}_${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [conversationHistory, currentConcept, currentSessionId, query]);

  const toastEl = importToast ? (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full bg-[#1a1a1a] border border-white/15 text-white/80 text-sm font-light shadow-2xl transition-all duration-300">
      {importToast}
    </div>
  ) : null;

  const renderMainContent = () => {
    if (!searchResult) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full overflow-y-auto relative bg-transparent px-6 py-10">
          <div className={`w-full max-w-5xl mx-auto text-center relative z-10 rounded-[36px] px-6 py-10 md:px-12 md:py-14 ${heroPanelClass}`}>
            <div className="absolute top-5 left-5 z-20">
              <button onClick={onToggleTheme} className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase backdrop-blur-xl ${chipClass}`}>
                {isDark ? '日间模式' : '夜间模式'}
              </button>
            </div>

            <div className="mb-12 flex justify-center soft-float">
              <div className={`relative h-36 w-36 rounded-[36px] border ${isDark ? 'border-amber-300/20 bg-[radial-gradient(circle_at_30%_30%,rgba(191,162,106,0.3),rgba(92,117,146,0.18)_45%,rgba(15,23,42,0.94)_100%)]' : 'border-white/80 bg-[radial-gradient(circle_at_30%_30%,rgba(189,160,111,0.24),rgba(127,147,169,0.16)_45%,rgba(255,255,255,0.96)_100%)]'} shadow-[0_30px_80px_rgba(15,23,42,0.2)]`}>
                <div className={`absolute inset-4 rounded-[28px] border ${isDark ? 'border-slate-700/70' : 'border-white/80'}`} />
                <div className={`absolute inset-7 rounded-[24px] ${isDark ? 'bg-[linear-gradient(135deg,rgba(191,162,106,0.48),rgba(124,138,162,0.18))]' : 'bg-[linear-gradient(135deg,rgba(189,160,111,0.34),rgba(127,147,169,0.16))]'}`} />
                <div className={`absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-[18px] ${isDark ? 'bg-[linear-gradient(135deg,#c3a96b,#6b7a92)]' : 'bg-[linear-gradient(135deg,#c1a06d,#90a0b6)]'} shadow-[0_18px_36px_rgba(15,23,42,0.24)]`} />
              </div>
            </div>

            <div className="mb-8">
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${chipClass}`}>
                Cinematic Inquiry Engine
              </div>
              <h1 className={`mt-6 text-4xl md:text-6xl font-semibold tracking-tight ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>
                让复杂议题更有层次，也更容易看清
              </h1>
              <p className={`mt-4 mx-auto max-w-2xl text-base md:text-lg leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                用更克制的电影感组织信息层级，在搜索、展开与推演之间保持专注，把结构和重点都放回界面中心。
              </p>
            </div>

            <div className="relative w-full max-w-xl mx-auto group">
              <input
                type="text"
                className={`w-full rounded-[28px] px-6 py-5 text-base shadow-[0_18px_40px_rgba(15,23,42,0.16)] outline-none backdrop-blur-xl transition-all duration-300 ${inputClass}`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyPress={(event) => event.key === 'Enter' && handleSearch()}
                placeholder="输入你想探索的问题、概念或命题"
                disabled={isLoading}
              />
              {isLoading ? (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 rounded-full border-2 border-amber-200/50 border-t-amber-500 animate-spin" />
                </div>
              ) : (
                <button onClick={handleSearch} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-white transition-all duration-200 hover:brightness-105 ${isDark ? 'bg-[linear-gradient(135deg,#b8a06a,#7c8aa2)] shadow-[0_20px_45px_rgba(0,0,0,0.28)]' : 'bg-[linear-gradient(135deg,#bda06f,#7f93a9)] shadow-[0_20px_45px_rgba(71,85,105,0.24)]'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}
            </div>

            {error && (
              <div className={`mt-4 p-3 rounded-[22px] max-w-xl mx-auto ${isDark ? 'border border-rose-500/30 bg-rose-950/40' : 'border border-rose-200 bg-rose-50'}`}>
                <p className={`text-sm ${isDark ? 'text-rose-200' : 'text-red-500'}`}>提示：{error}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    const mainNodes = nodes.filter((node) => node.type === 'mainNode' && node.data.isExpanded);

    return (
      <div className="relative w-full h-full bg-transparent overflow-hidden">
        <RabbitFlow initialNodes={nodes} initialEdges={edges} nodeTypes={nodeTypes} onNodeClick={handleNodeClick} />

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center gap-4">
          {!showLeftChat && (
            <button onClick={() => setShowLeftChat(true)} className={`rounded-full px-5 py-3 text-sm transition-all duration-300 flex items-center gap-2 backdrop-blur-xl ${floatingButtonClass}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              质询
            </button>
          )}
          {!showRightChat && (
            <button onClick={() => setShowRightChat(true)} className={`rounded-full px-5 py-3 text-sm transition-all duration-300 flex items-center gap-2 backdrop-blur-xl ${floatingButtonClass}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              答询
            </button>
          )}
        </div>

        {showFollowUpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-md" onClick={(event) => event.target === event.currentTarget && setShowFollowUpModal(false)}>
            <div className="w-full max-w-md mx-4 soft-panel-strong border border-white/85 rounded-[28px] p-6 shadow-2xl">
              <h3 className="text-slate-700 text-sm font-semibold tracking-[0.15em] uppercase mb-4">添加追问</h3>

              {mainNodes.length > 1 && (
                <div className="mb-4">
                  <p className="text-slate-500 text-xs tracking-[0.16em] uppercase mb-2">从哪个主卡片继续</p>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                    {mainNodes.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => setSelectedSourceNodeId(node.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all duration-150 max-w-[180px] truncate ${
                          selectedSourceNodeId === node.id
                            ? 'bg-slate-700 text-white border-slate-700'
                            : 'bg-white/65 text-slate-600 border-white/80 hover:border-slate-300 hover:text-slate-800'
                        }`}
                        title={node.data.label}
                      >
                        {node.data.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                autoFocus
                className="relative w-full px-4 py-3 rounded-[22px] bg-white/75 text-slate-800 border border-white/80 focus:border-sky-200 focus:outline-none placeholder:text-slate-400 text-sm resize-none leading-relaxed shadow-[0_14px_35px_rgba(148,163,184,0.12)]"
                rows={3}
                value={followUpInput}
                onChange={(event) => setFollowUpInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleAddCustomFollowUp();
                  }
                  if (event.key === 'Escape') setShowFollowUpModal(false);
                }}
                placeholder="输入你想继续追问的新方向"
              />
              <div className="flex items-center justify-end gap-3 mt-4">
                <button onClick={() => setShowFollowUpModal(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-200">取消</button>
                <button onClick={handleAddCustomFollowUp} disabled={!followUpInput.trim()} className="px-5 py-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 text-white text-sm font-semibold hover:brightness-105 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200">添加追问</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${frameClass}`}>
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
        theme={theme}
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} theme={theme} />
      <div className={`flex-1 relative h-full flex flex-col overflow-hidden transition-all duration-300 ${frameClass}`}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 soft-mesh opacity-70" />
          <div className="absolute inset-0 soft-grid-dots opacity-50" />
          <div className="soft-orb soft-orb--one soft-float" />
          <div className="soft-orb soft-orb--two soft-float" />
          <div className="soft-orb soft-orb--three soft-float" />
        </div>
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} className={`absolute top-4 left-4 z-40 p-3 rounded-2xl backdrop-blur-xl ${floatingButtonClass}`} title="Open Sidebar">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
        {toastEl}
        {renderMainContent()}
        {showLeftChat && <ChatFrame title="左侧 质询" side="left" topic={query} onClose={() => setShowLeftChat(false)} theme={theme} />}
        {showRightChat && <ChatFrame title="右侧 答询" side="right" topic={query} onClose={() => setShowRightChat(false)} theme={theme} />}
      </div>
    </div>
  );
};

export default SearchView;
