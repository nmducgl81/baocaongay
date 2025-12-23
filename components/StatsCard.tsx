import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  trend?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'orange';
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, trend, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    red: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 sm:p-4 md:p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start gap-1">
        <div className="min-w-0">
          <p className="text-[0.625rem] sm:text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 mb-0.5 truncate uppercase tracking-tighter">{title}</p>
          <h3 className="text-xs sm:text-lg md:text-2xl font-black text-gray-900 dark:text-white truncate">{value}</h3>
        </div>
        <div className={`p-1.5 md:p-2.5 rounded-lg ${colorClasses[color]} shadow-sm flex-shrink-0 ml-1`}>
          {icon || <Activity size={18} />}
        </div>
      </div>
      {trend && (
        <div className="mt-2 md:mt-4 flex items-center text-[0.6rem] sm:text-xs md:text-sm">
          <ArrowUpRight size={14} className="text-emerald-500 mr-1 flex-shrink-0" />
          <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate">{trend}</span>
          <span className="text-gray-400 dark:text-gray-500 ml-1 sm:ml-2 hidden sm:inline">vs last month</span>
        </div>
      )}
    </div>
  );
};