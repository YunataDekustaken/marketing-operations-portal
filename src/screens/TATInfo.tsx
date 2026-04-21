import React from 'react';
import { Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function TATInfo() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white dark:bg-white/5 rounded-3xl p-10 border border-black/5 dark:border-white/5 shadow-sm">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-[#141414] dark:bg-white/10 rounded-2xl flex items-center justify-center">
            <Clock className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#141414] dark:text-white">Marketing Request Turnaround Time (TAT)</h1>
            <p className="text-black/50 dark:text-white/50 text-sm">Guidelines for processing and production times.</p>
          </div>
        </div>

        <p className="text-black/70 dark:text-white/70 leading-relaxed mb-10">
          To ensure that all departments receive quality marketing support, requests are processed based on priority and workload. 
          Please submit requests as early as possible.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Urgent */}
          <div className="p-6 rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 mb-4">
              <span className="text-xl">🔴</span>
              <h3 className="font-bold uppercase tracking-wider text-sm">Urgent</h3>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300 mb-4">1 Business Day</p>
            <p className="text-xs text-red-600/70 dark:text-red-400/70 font-medium mb-4 italic">For time-sensitive requests that require immediate attention.</p>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-red-600/40 dark:text-red-400/40 uppercase tracking-widest">Examples</p>
              <ul className="text-xs text-red-800 dark:text-red-200 space-y-1 list-disc list-inside">
                <li>Social media announcements</li>
                <li>Last-minute event materials</li>
                <li>Critical marketing updates</li>
              </ul>
            </div>
          </div>

          {/* Normal */}
          <div className="p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 mb-4">
              <span className="text-xl">🟠</span>
              <h3 className="font-bold uppercase tracking-wider text-sm">Normal</h3>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mb-4">3 Business Days</p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 font-medium mb-4 italic">Standard marketing requests fall under this category.</p>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-amber-600/40 dark:text-amber-400/40 uppercase tracking-widest">Examples</p>
              <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                <li>Social media graphics</li>
                <li>Simple video edits</li>
                <li>Standard marketing materials</li>
                <li>Internal promotional content</li>
              </ul>
            </div>
          </div>

          {/* Low */}
          <div className="p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-4">
              <span className="text-xl">🟢</span>
              <h3 className="font-bold uppercase tracking-wider text-sm">Low Priority</h3>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mb-4">7 Business Days</p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-medium mb-4 italic">For non-urgent or large requests that require more production time.</p>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-emerald-600/40 dark:text-emerald-400/40 uppercase tracking-widest">Examples</p>
              <ul className="text-xs text-emerald-800 dark:text-emerald-200 space-y-1 list-disc list-inside">
                <li>Campaign materials</li>
                <li>Branding work</li>
                <li>Complex design projects</li>
                <li>Longer video edits</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
          <div className="flex items-center space-x-2 text-black/40 dark:text-white/40 mb-4">
            <Info size={16} />
            <h4 className="text-xs font-bold uppercase tracking-widest">Important Notes</h4>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <li className="flex items-start space-x-3">
              <CheckCircle className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" size={14} />
              <p className="text-sm text-black/60 dark:text-white/60">Turnaround time starts once the request is approved and assigned.</p>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" size={14} />
              <p className="text-sm text-black/60 dark:text-white/60">Requests that require revisions may extend the completion time.</p>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" size={14} />
              <p className="text-sm text-black/60 dark:text-white/60">Requests with complete details and attachments are processed faster.</p>
            </li>
            <li className="flex items-start space-x-3">
              <AlertTriangle className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" size={14} />
              <p className="text-sm text-black/60 dark:text-white/60 font-medium">Please submit requests as early as possible to avoid delays.</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
