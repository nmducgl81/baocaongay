import React, { useState, useEffect } from 'react';
import { KnowledgeArticle, User } from '../types';
import { BookOpen, Search, ChevronDown, ChevronUp, Plus, Edit2, Trash2, X, Save, Clock, User as UserIcon } from 'lucide-react';
import { db } from '../services/firebase'; // Assuming we will hook this up later, currently using local state for demo if needed
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

interface KnowledgeBaseProps {
  currentUser: User;
  onClose: () => void;
}

// Mock Data for Initial State (or if offline)
const INITIAL_ARTICLES: KnowledgeArticle[] = [
  {
    id: '1',
    title: 'Quy trình thẩm định hồ sơ vay tín chấp',
    content: '1. Tiếp nhận hồ sơ.\n2. Kiểm tra CIC.\n3. Thẩm định qua điện thoại.\n4. Thẩm định thực địa (nếu có).\n5. Phê duyệt khoản vay.',
    author: 'Admin System',
    date: '2023-10-25',
    role: 'DSA'
  },
  {
    id: '2',
    title: 'Cách xử lý từ chối khi khách hàng chê lãi cao',
    content: 'Hãy so sánh lãi suất với lợi ích dòng tiền. Phân tích số tiền trả hàng tháng phù hợp với thu nhập thay vì chỉ nhìn vào % lãi suất năm. Nhấn mạnh vào thủ tục đơn giản và tốc độ giải ngân.',
    author: 'RSM Nguyen Van A',
    date: '2023-11-01',
    role: 'DSA'
  }
];

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ currentUser, onClose }) => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>(INITIAL_ARTICLES);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<KnowledgeArticle>>({});

  const canEdit = ['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role);

  // Load data logic (Mock for now, ready for Firebase)
  useEffect(() => {
     // In a real app, fetch from Firestore here
     // const fetchArticles = async () => { ... }
  }, []);

  const handleSave = () => {
    if (!editingArticle.title || !editingArticle.content) {
        alert("Vui lòng nhập tiêu đề và nội dung");
        return;
    }

    if (editingArticle.id) {
        // Update
        setArticles(prev => prev.map(a => a.id === editingArticle.id ? { ...a, ...editingArticle } as KnowledgeArticle : a));
    } else {
        // Create
        const newArticle: KnowledgeArticle = {
            id: Date.now().toString(),
            title: editingArticle.title!,
            content: editingArticle.content!,
            author: currentUser.name,
            date: new Date().toISOString().split('T')[0],
            role: 'DSA' // Default visible to all
        };
        setArticles(prev => [newArticle, ...prev]);
    }
    setIsEditing(false);
    setEditingArticle({});
  };

  const handleDelete = (id: string) => {
      if(window.confirm("Bạn có chắc muốn xóa bài viết này?")) {
          setArticles(prev => prev.filter(a => a.id !== id));
      }
  };

  const filteredArticles = articles.filter(a => 
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-2xl border-t-4 border-blue-600 p-4 md:p-6 max-w-4xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 min-h-[80vh] flex flex-col">
       
       {/* HEADER */}
       <div className="flex justify-between items-center mb-6 pb-4 border-b border-blue-100">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-700 flex-shrink-0">
            <BookOpen size={24} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-bold text-blue-950 truncate">Kiến thức nghiệp vụ</h2>
            <p className="text-xs md:text-sm text-blue-600 font-medium truncate">Cập nhật quy trình & kỹ năng bán hàng</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
             {canEdit && (
                 <button 
                    onClick={() => {
                        setEditingArticle({});
                        setIsEditing(true);
                    }}
                    className="p-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                 >
                     <Plus size={20} />
                 </button>
             )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={24}/></button>
        </div>
      </div>

      {isEditing ? (
          /* EDITOR VIEW */
          <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95">
              <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tiêu đề bài viết</label>
                  <input 
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                    placeholder="Nhập tiêu đề..."
                    value={editingArticle.title || ''}
                    onChange={e => setEditingArticle({...editingArticle, title: e.target.value})}
                  />
              </div>
              <div className="mb-4 flex-1 flex flex-col">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nội dung (Hỗ trợ xuống dòng)</label>
                  <textarea 
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none flex-1 min-h-[300px] text-base leading-relaxed"
                    placeholder="Nhập nội dung kiến thức..."
                    value={editingArticle.content || ''}
                    onChange={e => setEditingArticle({...editingArticle, content: e.target.value})}
                  />
              </div>
              <div className="flex gap-3">
                  <button onClick={() => setIsEditing(false)} className="flex-1 py-3 border border-gray-300 rounded-lg font-bold text-gray-600">Hủy</button>
                  <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 flex items-center justify-center">
                      <Save size={18} className="mr-2"/> Lưu Bài Viết
                  </button>
              </div>
          </div>
      ) : (
          /* LIST VIEW */
          <div className="flex-1 flex flex-col">
              {/* Search */}
              <div className="relative mb-4">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder="Tìm kiếm bài viết..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>

              {/* List */}
              <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
                  {filteredArticles.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 italic">Không tìm thấy bài viết nào.</div>
                  ) : (
                      filteredArticles.map(article => {
                          const isExpanded = expandedId === article.id;
                          return (
                              <div key={article.id} className={`border rounded-xl transition-all duration-300 ${isExpanded ? 'border-blue-300 bg-blue-50/30 shadow-md' : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'}`}>
                                  <div 
                                    className="p-4 cursor-pointer flex justify-between items-start"
                                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                                  >
                                      <div className="flex-1 pr-4">
                                          <h3 className={`font-bold text-base md:text-lg mb-1 ${isExpanded ? 'text-blue-800' : 'text-gray-800'}`}>{article.title}</h3>
                                          <div className="flex items-center text-xs text-gray-400 space-x-3">
                                              <span className="flex items-center"><UserIcon size={10} className="mr-1"/> {article.author}</span>
                                              <span className="flex items-center"><Clock size={10} className="mr-1"/> {article.date}</span>
                                          </div>
                                      </div>
                                      <div className="text-gray-400 mt-1">
                                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                      </div>
                                  </div>
                                  
                                  {isExpanded && (
                                      <div className="px-4 pb-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                          <div className="h-px w-full bg-blue-100 mb-3"></div>
                                          <div className="text-gray-700 leading-relaxed text-sm md:text-base whitespace-pre-line">
                                              {article.content}
                                          </div>
                                          {canEdit && (
                                              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-dashed border-gray-200">
                                                  <button 
                                                    onClick={(e) => { e.stopPropagation(); setEditingArticle(article); setIsEditing(true); }}
                                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center"
                                                  >
                                                      <Edit2 size={14} className="mr-1"/> Sửa
                                                  </button>
                                                  <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(article.id); }}
                                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold flex items-center"
                                                  >
                                                      <Trash2 size={14} className="mr-1"/> Xóa
                                                  </button>
                                              </div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          );
                      })
                  )}
              </div>
          </div>
      )}
    </div>
  );
};