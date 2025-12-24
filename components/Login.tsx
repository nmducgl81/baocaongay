import React, { useState, useMemo } from 'react';
import { User, Lock, LogIn, Key, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { login, users } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Find user avatar if username matches
  const matchedUser = useMemo(() => {
      return users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  }, [username, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(username, password);
      if (!success) {
        setError('Tên đăng nhập hoặc mật khẩu không đúng');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex flex-col justify-center items-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-100 transition-all duration-500 ease-in-out transform">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-center relative overflow-hidden">
          {/* Decorative background circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-x-10 -translate-y-10"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full translate-x-10 translate-y-10"></div>
          
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 backdrop-blur-md shadow-lg border-4 border-white/20 transition-all duration-500">
             {matchedUser && matchedUser.avatar ? (
                 <img 
                    src={matchedUser.avatar} 
                    alt="User Avatar" 
                    className="w-full h-full rounded-full object-cover animate-in fade-in zoom-in duration-300"
                 />
             ) : (
                 <div className="bg-white/20 w-full h-full flex items-center justify-center rounded-full">
                    <Lock className="text-white" size={32} />
                 </div>
             )}
          </div>
          
          <h2 className="text-2xl font-bold text-white tracking-tight">
              {matchedUser ? `Xin chào, ${matchedUser.name}` : 'DSA SALES EAST'}
          </h2>
          <p className="text-emerald-100 mt-2 font-medium opacity-90 text-sm">
              {matchedUser ? matchedUser.role : 'Hệ thống quản trị hiệu quả kinh doanh'}
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-emerald-900 mb-1.5">Tên đăng nhập</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-emerald-500" size={18} />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-10 py-3 border border-emerald-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-emerald-50/30 text-emerald-900 placeholder-emerald-300 transition-all font-medium"
                  placeholder="Nhập username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                {matchedUser && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-emerald-600 animate-in zoom-in">
                        <CheckCircle size={18} />
                    </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-900 mb-1.5">Mật khẩu</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="text-emerald-500" size={18} />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-emerald-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-emerald-50/30 text-emerald-900 placeholder-emerald-300 transition-all font-medium"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 font-medium flex items-center justify-center animate-pulse">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-emerald-200 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : (
                <>
                  <LogIn className="mr-2" size={18} /> Đăng Nhập
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      <div className="mt-6 text-emerald-600/60 text-xs font-medium">
        <a href="https://zalo.me/0867641331" target="_blank" rel="noreferrer" className="hover:text-emerald-700">Developed by DSS Nguyễn Minh Đức</a>
      </div>
    </div>
  );
};