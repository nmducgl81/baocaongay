import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleHardReset = () => {
    if (window.confirm('Thao tác này sẽ xóa toàn bộ dữ liệu lưu trên máy để sửa lỗi. Bạn có chắc chắn không?')) {
        localStorage.clear();
        window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="bg-red-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="text-red-600 w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Đã xảy ra lỗi!</h1>
            <p className="text-gray-500 mb-6 text-sm">
              Ứng dụng gặp sự cố không mong muốn. Thường do dữ liệu cũ bị xung đột.
            </p>
            <div className="bg-red-50 p-3 rounded-lg text-left text-xs font-mono text-red-600 mb-6 overflow-auto max-h-32">
                {this.state.error?.toString()}
            </div>
            
            <div className="flex flex-col gap-3">
                <button
                onClick={() => window.location.reload()}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center"
                >
                <RefreshCw size={18} className="mr-2" /> Thử tải lại trang
                </button>
                
                <button
                onClick={this.handleHardReset}
                className="w-full bg-white border border-red-200 text-red-600 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center"
                >
                <Trash2 size={18} className="mr-2" /> Xóa dữ liệu & Reset
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}