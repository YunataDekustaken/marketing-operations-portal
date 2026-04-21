import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { RequestStatus, Priority, Brand, Department } from '../types';

export interface FilterState {
  search: string;
  status: RequestStatus | '';
  priority: Priority | '';
  brand: Brand | '';
  department: Department | '';
  assignedTo: string;
}

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resultCount: number;
  totalCount: number;
  members?: { uid: string; displayName: string }[];
}

export default function FilterBar({ filters, setFilters, resultCount, totalCount, members }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClear = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      brand: '',
      department: '',
      assignedTo: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(val => val !== '');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-black/10 dark:border-white/10 p-4 mb-6 shadow-sm transition-colors">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by title, ID, requestor, or description..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all dark:text-white"
          />
        </div>

        {/* Mobile Toggle & Actions */}
        <div className="flex items-center justify-between md:justify-end gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Showing {resultCount} of {totalCount}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`md:hidden p-2 rounded-lg border transition-colors flex items-center gap-2 ${
                isExpanded || hasActiveFilters 
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' 
                  : 'bg-white text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClear}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1"
                title="Clear all filters"
              >
                <X className="w-4 h-4" />
                <span className="text-sm font-medium hidden md:inline">Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Dropdowns */}
      <div className={`mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 ${isExpanded ? 'block' : 'hidden md:grid'}`}>
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as RequestStatus | '' }))}
          className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="For Review">For Review</option>
          <option value="Revision Needed">Revision Needed</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          value={filters.priority}
          onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as Priority | '' }))}
          className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white"
        >
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Normal">Normal</option>
          <option value="Urgent">Urgent</option>
        </select>

        <select
          value={filters.brand}
          onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value as Brand | '' }))}
          className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white"
        >
          <option value="">All Brands</option>
          <option value="STLAF">STLAF</option>
          <option value="MassagedailyPH">MassagedailyPH</option>
          <option value="LuxeLounge">LuxeLounge</option>
        </select>

        <select
          value={filters.department}
          onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value as Department | '' }))}
          className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white"
        >
          <option value="">All Departments</option>
          <option value="Litigation">Litigation</option>
          <option value="Corporate">Corporate</option>
          <option value="HR">HR</option>
          <option value="Accounting">Accounting</option>
          <option value="Operations">Operations</option>
          <option value="Marketing">Marketing</option>
        </select>

        {members && (
          <select
            value={filters.assignedTo}
            onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
            className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white"
          >
            <option value="">All Members</option>
            <option value="Unassigned">Unassigned</option>
            {members.map(m => (
              <option key={m.uid} value={m.uid}>{m.displayName}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
