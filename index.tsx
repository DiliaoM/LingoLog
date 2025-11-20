import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  Library, 
  Languages, 
  ArrowRight, 
  Loader2, 
  Trash2,
  BookMarked,
  GraduationCap,
  MessageCircleQuestion,
  MessageSquareText,
  Volume2
} from "lucide-react";

// --- Types ---

interface GrammarPoint {
  pattern: string;
  explanation: string;
}

interface VocabularyItem {
  word: string;
  reading: string;
  meaning: string;
  partOfSpeech: string;
}

interface AnalysisResult {
  id: string;
  timestamp: number;
  original: string;
  translation: string;
  language: string;
  grammarPoints: GrammarPoint[];
  vocabulary: VocabularyItem[];
}

interface QaResult {
  id: string;
  timestamp: number;
  question: string;
  answer: string;
  relatedSentence?: string;
}

// --- API Service ---

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

const analyzeSentence = async (sentence: string): Promise<Omit<AnalysisResult, 'id' | 'timestamp'>> => {
  const ai = getAI();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Analyze the following sentence for a language learner (primarily Japanese, but detect if otherwise). 
    Provide a natural English translation.
    Break down the grammar concepts used (particles, conjugations, sentence structures).
    List the vocabulary words with their reading (furigana/romaji) and meaning.
    
    Sentence: "${sentence}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          language: { type: Type.STRING },
          translation: { type: Type.STRING },
          grammarPoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pattern: { type: Type.STRING, description: "The grammar structure, particle, or conjugation form" },
                explanation: { type: Type.STRING, description: "Clear explanation of how it is used here" }
              }
            }
          },
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING, description: "The dictionary form or word as it appears" },
                reading: { type: Type.STRING, description: "Pronunciation (e.g., Hiragana/Romaji)" },
                meaning: { type: Type.STRING, description: "English meaning" },
                partOfSpeech: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return JSON.parse(text);
};

const askTutor = async (question: string, context?: string): Promise<string> => {
  const ai = getAI();

  const prompt = `You are a helpful and friendly language tutor. 
  User Question: "${question}"
  ${context ? `Context (The user is currently studying this sentence): "${context}"` : ''}
  
  Answer clearly and concisely. If comparing terms, use bullet points. Use Markdown for formatting.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "I couldn't generate an answer.";
};

// --- Helper Functions ---

const speak = (text: string, languageName: string = "") => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  const synth = window.speechSynthesis;
  if (synth.speaking) {
    synth.cancel();
  }

  const u = new SpeechSynthesisUtterance(text);
  
  // Simple mapping
  let lang = 'en-US';
  const l = (languageName || '').toLowerCase();
  if (l.includes('japanese')) lang = 'ja-JP';
  else if (l.includes('spanish')) lang = 'es-ES';
  else if (l.includes('french')) lang = 'fr-FR';
  else if (l.includes('german')) lang = 'de-DE';
  else if (l.includes('chinese')) lang = 'zh-CN';
  else if (l.includes('korean')) lang = 'ko-KR';
  else if (l.includes('italian')) lang = 'it-IT';
  else if (l.includes('russian')) lang = 'ru-RU';
  else if (l.includes('portuguese')) lang = 'pt-BR';
  
  u.lang = lang;
  u.rate = 0.9; // Slightly slower for clarity
  synth.speak(u);
};

// --- Components ---

const Header = () => (
  <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
    <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center space-x-2 text-emerald-600">
        <GraduationCap className="w-8 h-8" />
        <span className="font-extrabold text-xl tracking-tight text-slate-800">Lingo<span className="text-emerald-500">Log</span></span>
      </div>
    </div>
  </header>
);

const Nav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: 'analyze', label: 'Analyze', icon: Sparkles },
    { id: 'notebook', label: 'Notebook', icon: BookMarked },
    { id: 'dictionary', label: 'Dictionary', icon: Library },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe md:pb-0 md:relative md:border-t-0 md:bg-transparent md:mb-8">
      <div className="flex justify-around items-center h-16 md:max-w-md md:mx-auto md:bg-white md:rounded-full md:shadow-lg md:h-14 md:px-2 md:border md:border-slate-100">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col md:flex-row items-center justify-center w-full md:w-auto md:px-6 md:space-x-2 transition-colors duration-200 ${
                isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`w-6 h-6 md:w-5 md:h-5 ${isActive ? 'text-emerald-600' : ''}`} />
              <span className={`text-[10px] md:text-sm font-bold mt-1 md:mt-0 ${isActive ? 'text-emerald-700' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const MarkdownText = ({ text }: { text: string }) => {
  // Very simple markdown rendering for bold and bullet points
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-slate-700 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <div key={i} className="flex items-start space-x-2 ml-2"><span className="text-emerald-500 mt-1.5">•</span><span>{line.substring(2)}</span></div>;
        }
        // Simple bold check
        const parts = line.split(/(\*\*.*?\*\*)/);
        return (
          <p key={i} className="min-h-[1rem]">
            {parts.map((part, j) => 
              part.startsWith('**') && part.endsWith('**') 
                ? <strong key={j} className="font-bold text-slate-900">{part.slice(2, -2)}</strong> 
                : part
            )}
          </p>
        );
      })}
    </div>
  );
};

const AnalyzeTab = ({ 
  onAnalyze, 
  isAnalyzing, 
  lastResult,
  onAskTutor,
  qaResult
}: { 
  onAnalyze: (text: string) => void, 
  isAnalyzing: boolean, 
  lastResult: AnalysisResult | null,
  onAskTutor: (q: string) => void,
  qaResult: QaResult | null
}) => {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<'analysis' | 'qa'>('analysis');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    if (mode === 'analysis') {
      onAnalyze(input);
    } else {
      onAskTutor(input);
    }
  };

  const showQa = qaResult && (!lastResult || qaResult.timestamp > lastResult.timestamp);

  return (
    <div className="space-y-6 pb-24">
      
      {/* Input Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => { setMode('analysis'); }}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center space-x-2 transition-colors ${
              mode === 'analysis' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Analyze Sentence</span>
          </button>
          <button
            onClick={() => { setMode('qa'); }}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center space-x-2 transition-colors ${
              mode === 'qa' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <MessageCircleQuestion className="w-4 h-4" />
            <span>Ask Tutor</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative p-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'analysis' 
              ? "Paste a sentence here... (e.g. 猫はベッドで寝ています)" 
              : lastResult 
                ? `Ask about the previous sentence or anything else...` 
                : "Ask a grammar question (e.g. What is the difference between は and が?)"}
            className="w-full min-h-[120px] p-4 rounded-xl text-lg outline-none resize-none placeholder:text-slate-300 text-slate-700 bg-transparent"
            disabled={isAnalyzing}
          />
          
          {mode === 'qa' && lastResult && (
             <div className="px-4 pb-2">
               <div className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded inline-flex items-center max-w-full truncate">
                 <span className="mr-1 font-bold">Context:</span> 
                 <span className="truncate">{lastResult.original}</span>
               </div>
             </div>
          )}

          <div className="flex justify-between items-center px-2 pb-2">
            <span className="text-xs text-slate-400 font-semibold px-2">
              {input.length > 0 ? `${input.length} chars` : ''}
            </span>
            <button
              type="submit"
              disabled={!input.trim() || isAnalyzing}
              className={`rounded-xl px-6 py-2.5 font-bold text-white flex items-center space-x-2 transition-all ${
                !input.trim() || isAnalyzing 
                  ? 'bg-slate-200 cursor-not-allowed' 
                  : mode === 'analysis'
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-md hover:shadow-lg'
                    : 'bg-indigo-500 hover:bg-indigo-600 shadow-md hover:shadow-lg'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  {mode === 'analysis' ? <Sparkles className="w-5 h-5" /> : <MessageSquareText className="w-5 h-5" />}
                  <span>{mode === 'analysis' ? 'Explain' : 'Ask Tutor'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Display Logic */}
      {showQa && qaResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-3xl shadow-xl border-b-4 border-indigo-100 overflow-hidden">
             <div className="bg-indigo-50 p-6 border-b border-indigo-100">
               <div className="flex items-center space-x-2 mb-3">
                <span className="px-3 py-1 bg-white text-indigo-600 text-xs font-bold uppercase tracking-wide rounded-full shadow-sm">
                  Tutor Answer
                </span>
                <span className="text-indigo-300 text-xs">Just now</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800">{qaResult.question}</h3>
             </div>
             <div className="p-6">
               <MarkdownText text={qaResult.answer} />
             </div>
          </div>
          {qaResult.relatedSentence && (
             <button 
               onClick={() => onAnalyze(qaResult.relatedSentence!)}
               className="block mx-auto text-sm text-slate-400 hover:text-emerald-600 underline decoration-dotted"
             >
               Return to sentence analysis
             </button>
          )}
        </div>
      )}

      {!showQa && lastResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Result Card */}
          <div className="bg-white rounded-3xl shadow-xl border-b-4 border-slate-100 overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <div className="flex items-center space-x-2 mb-3">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wide rounded-full">
                  {lastResult.language}
                </span>
                <span className="text-slate-400 text-xs">Analysis</span>
              </div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-relaxed">
                  {lastResult.original}
                </h2>
                <button 
                  onClick={() => speak(lastResult.original, lastResult.language)}
                  className="p-2 rounded-full bg-white shadow-sm text-slate-400 hover:text-emerald-600 hover:shadow transition-all shrink-0"
                  title="Listen"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </div>
              <p className="text-lg text-slate-600 font-medium">
                {lastResult.translation}
              </p>
            </div>

            <div className="p-6 space-y-8">
              {/* Grammar Section */}
              <div>
                <h3 className="flex items-center space-x-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                  <BookOpen className="w-4 h-4" />
                  <span>Grammar Breakdown</span>
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {lastResult.grammarPoints.map((point, i) => (
                    <div key={i} className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <div className="font-bold text-amber-800 mb-1">{point.pattern}</div>
                      <div className="text-sm text-amber-900/80 leading-snug">{point.explanation}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vocab Section */}
              <div>
                <h3 className="flex items-center space-x-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                  <Languages className="w-4 h-4" />
                  <span>Vocabulary</span>
                </h3>
                <div className="divide-y divide-slate-100">
                  {lastResult.vocabulary.map((vocab, i) => (
                    <div key={i} className="py-3 flex items-center justify-between group hover:bg-slate-50 transition-colors rounded-lg px-2 -mx-2">
                      <div>
                        <div className="flex items-baseline space-x-2">
                          <span className="font-bold text-slate-700 text-lg">{vocab.word}</span>
                          <button 
                            onClick={() => speak(vocab.word, lastResult.language)}
                            className="text-slate-300 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
                            title="Listen"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <span className="text-sm text-slate-400 pl-1">{vocab.reading}</span>
                        </div>
                        <div className="text-sm text-slate-500">{vocab.meaning}</div>
                      </div>
                      <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-1 rounded">
                        {vocab.partOfSpeech}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center text-sm text-slate-400 pb-8">
            Saved to Notebook & Dictionary automatically
          </div>
        </div>
      )}
    </div>
  );
};

const NotebookTab = ({ items, onDelete }: { items: AnalysisResult[], onDelete: (id: string) => void }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <BookMarked className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-semibold">Your notebook is empty</p>
        <p className="text-sm">Analyze sentences to fill this up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 px-2">My Sentence Notebook</h2>
      {items.map((item) => {
        const isExpanded = expandedId === item.id;
        return (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-200 hover:shadow-md">
            <div 
              className="p-5 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </div>
                   <button 
                    onClick={(e) => { e.stopPropagation(); speak(item.original, item.language); }}
                    className="text-slate-300 hover:text-emerald-600 p-1 transition-colors"
                    title="Listen"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  className="text-slate-300 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-2">{item.original}</h3>
              <p className="text-slate-500">{item.translation}</p>
            </div>

            {isExpanded && (
              <div className="px-5 pb-5 pt-0 bg-slate-50/50 border-t border-slate-100">
                <div className="mt-4 grid gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Grammar</h4>
                    <ul className="space-y-2">
                      {item.grammarPoints.map((g, idx) => (
                        <li key={idx} className="text-sm">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mr-2">{g.pattern}</span>
                          <span className="text-slate-600">{g.explanation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Vocabulary</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.vocabulary.map((v, idx) => (
                        <div 
                          key={idx} 
                          onClick={(e) => { e.stopPropagation(); speak(v.word, item.language); }}
                          className="text-xs bg-white border border-slate-200 px-2 py-1 rounded shadow-sm cursor-pointer hover:border-emerald-300 hover:text-emerald-600 transition-colors flex items-center gap-1"
                        >
                          <span className="font-bold">{v.word}</span>
                          <Volume2 className="w-2.5 h-2.5 opacity-50" />
                          <span className="mx-1 text-slate-300">|</span>
                          <span className="text-slate-500">{v.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const DictionaryTab = ({ items }: { items: AnalysisResult[] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Aggregate all vocabulary with simple deduping logic that preserves the language context
  const allVocab = items
    .flatMap(item => item.vocabulary.map(v => ({ ...v, language: item.language })))
    .reduce((acc, curr) => {
      if (!acc.some(v => v.word === curr.word)) {
        acc.push(curr);
      }
      return acc;
    }, [] as (VocabularyItem & { language: string })[])
    .sort((a, b) => a.word.localeCompare(b.word));

  const filteredVocab = allVocab.filter(v => 
    v.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.meaning.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.reading.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-24 h-[calc(100vh-120px)] flex flex-col">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 px-2">My Dictionary</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 mb-4 flex items-center">
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <input 
          type="text" 
          placeholder="Search words..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 outline-none text-slate-700 placeholder:text-slate-300"
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-slate-200">
        {filteredVocab.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {searchTerm ? "No words found matching your search." : "No words yet. Analyze sentences to build your dictionary!"}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0">
              <tr>
                <th className="px-4 py-3 border-b border-slate-100">Word</th>
                <th className="px-4 py-3 border-b border-slate-100">Meaning</th>
                <th className="px-4 py-3 border-b border-slate-100 hidden md:table-cell">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVocab.map((vocab, i) => (
                <tr key={i} className="hover:bg-emerald-50/30 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-slate-700">{vocab.word}</div>
                      <button 
                        onClick={() => speak(vocab.word, vocab.language)}
                        className="text-slate-300 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs text-emerald-600 font-mono">{vocab.reading}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {vocab.meaning}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                    <span className="bg-slate-100 px-2 py-1 rounded-full">{vocab.partOfSpeech}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-2 text-center text-xs text-slate-400">
        {filteredVocab.length} words collected
      </div>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState("analyze");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [qaResult, setQaResult] = useState<QaResult | null>(null);
  
  // Load history from local storage
  useEffect(() => {
    const saved = localStorage.getItem("lingolog_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history
  useEffect(() => {
    localStorage.setItem("lingolog_history", JSON.stringify(history));
  }, [history]);

  const handleAnalyze = async (text: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSentence(text);
      const fullResult: AnalysisResult = {
        ...result,
        id: Date.now().toString(),
        timestamp: Date.now(),
        original: text
      };
      
      setHistory(prev => [fullResult, ...prev]);
    } catch (error) {
      console.error(error);
      alert("Sorry, I couldn't analyze that sentence. Please check your API key or internet connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAskTutor = async (question: string) => {
    setIsAnalyzing(true);
    try {
      const context = history.length > 0 ? history[0].original : undefined;
      const answer = await askTutor(question, context);
      setQaResult({
        id: Date.now().toString(),
        timestamp: Date.now(),
        question,
        answer,
        relatedSentence: context
      });
    } catch (error) {
      console.error(error);
      alert("Sorry, I couldn't get an answer right now.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this sentence from your notebook?")) {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Header />
      
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-6">
        {activeTab === 'analyze' && (
          <AnalyzeTab 
            onAnalyze={handleAnalyze} 
            onAskTutor={handleAskTutor}
            isAnalyzing={isAnalyzing} 
            lastResult={history.length > 0 ? history[0] : null}
            qaResult={qaResult}
          />
        )}
        
        {activeTab === 'notebook' && (
          <NotebookTab items={history} onDelete={handleDelete} />
        )}
        
        {activeTab === 'dictionary' && (
          <DictionaryTab items={history} />
        )}
      </main>
      
      <Nav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);