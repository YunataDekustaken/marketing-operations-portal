import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRequests } from '../hooks/useRequests';
import { useAuth } from '../hooks/useAuth';
import { Send, Paperclip, X, AlertTriangle, History, Info } from 'lucide-react';
import { Brand, RequestType, Priority } from '../types';
import { addBusinessDays, isBefore, startOfDay, parseISO } from 'date-fns';

export default function SubmitRequest({ onComplete }: { onComplete: () => void }) {
  const { createRequest } = useRequests();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form States
  const [title, setTitle] = useState('');
  const [requestorName, setRequestorName] = useState(profile?.displayName || '');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState<Brand>('STLAF');
  const [requestType, setRequestType] = useState<RequestType>('Photo/Video Editing');
  const [priority, setPriority] = useState<Priority>('Normal');
  const [dateNeeded, setDateNeeded] = useState('');
  const [attachmentLink, setAttachmentLink] = useState('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftDate, setDraftDate] = useState<string | null>(null);
  
  // TAT States
  const [tatWarning, setTatWarning] = useState<string | null>(null);
  const [tatAcknowledged, setTatAcknowledged] = useState(false);
  
  const isMarketing = profile?.role === 'marketing_supervisor' || profile?.role === 'marketing_member';

  useEffect(() => {
    const handleDuplicate = (e: any) => {
      const task = e.detail;
      if (task) {
        setTitle(`Copy of ${task.requestTitle}`);
        setRequestorName(task.requestorName || profile?.displayName || '');
        setDescription(task.description || '');
        setBrand(task.brand || 'STLAF');
        setRequestType(task.requestType || 'Photo/Video Editing');
        setPriority(task.priority || 'Normal');
        // Don't duplicate dateNeeded as it should be fresh
        setDateNeeded('');
        setAttachmentLink(task.requestAttachmentLink || '');
        setShowDraftBanner(false);
        setError(null);
        setFile(null);
      }
    };

    window.addEventListener('duplicate-request', handleDuplicate);
    return () => window.removeEventListener('duplicate-request', handleDuplicate);
  }, [profile]);

  useEffect(() => {
    const savedDraft = localStorage.getItem('submitRequest_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setDraftDate(format(new Date(draft.savedAt), 'MMM d, yyyy h:mm a'));
        setShowDraftBanner(true);
      } catch (e) {
        console.error('Error parsing draft:', e);
      }
    }
  }, []);

  const saveDraft = () => {
    const draft = {
      title,
      requestorName,
      description,
      brand,
      requestType,
      priority,
      dateNeeded,
      attachmentLink,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('submitRequest_draft', JSON.stringify(draft));
    alert('Draft saved locally!');
  };

  const restoreDraft = () => {
    const savedDraft = localStorage.getItem('submitRequest_draft');
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      setTitle(draft.title || '');
      setRequestorName(draft.requestorName || '');
      setDescription(draft.description || '');
      setBrand(draft.brand || 'STLAF');
      setRequestType(draft.requestType || 'Photo/Video Editing');
      setPriority(draft.priority || 'Normal');
      setDateNeeded(draft.dateNeeded || '');
      setAttachmentLink(draft.attachmentLink || '');
      setShowDraftBanner(false);
    }
  };

  const discardDraft = () => {
    localStorage.removeItem('submitRequest_draft');
    setShowDraftBanner(false);
  };

  useEffect(() => {
    if (!dateNeeded) {
      setTatWarning(null);
      setTatAcknowledged(false);
      return;
    }

    const today = startOfDay(new Date());
    const selectedDate = startOfDay(parseISO(dateNeeded));
    
    let requiredDays = 3; // Default Normal
    if (priority === 'Urgent') requiredDays = 1;
    if (priority === 'Low') requiredDays = 7;

    const minDate = addBusinessDays(today, requiredDays);

    if (isBefore(selectedDate, minDate)) {
      setTatWarning("We cannot guarantee the highest quality or prioritization due to the short notice. Please refer to the Turnaround Time guidelines to ensure the best and most efficient output from the marketing team.");
    } else {
      setTatWarning(null);
      setTatAcknowledged(false);
    }
  }, [priority, dateNeeded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only PDF, JPG, and PNG files are allowed for direct upload.');
        setFile(null);
        return;
      }

      if (selectedFile.size > maxSize) {
        setError('File size exceeds 5MB. Please provide a Google Drive link instead.');
        setFile(null);
        return;
      }

      setError(null);
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (tatWarning && !tatAcknowledged) {
      setError("Please acknowledge the short notice warning or adjust your 'Date Needed' to follow the TAT guidelines.");
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const data = {
      requestTitle: title,
      requestorName: requestorName,
      description: description,
      brand: brand,
      requestType: requestType,
      priority: priority,
      dateNeeded: dateNeeded,
      requestAttachmentLink: formData.get('attachmentLink') as string,
      tatAcknowledged: tatAcknowledged,
    };

    try {
      await createRequest(data, file || undefined);
      localStorage.removeItem('submitRequest_draft');
      onComplete();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = title.trim() !== '' && 
                      (isMarketing || requestorName.trim() !== '') &&
                      description.trim() !== '' && 
                      dateNeeded !== '' && 
                      (!tatWarning || tatAcknowledged);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {showDraftBanner && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-3 text-blue-800 dark:text-blue-300">
            <History size={18} />
            <p className="text-sm font-medium">You have a saved draft from {draftDate}. Would you like to restore it?</p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={restoreDraft} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">Restore</button>
            <button onClick={discardDraft} className="px-3 py-1.5 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors">Discard</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Request Title</label>
              <input
                name="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Social Media Graphics"
                className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-black/5 text-black dark:text-white"
              />
            </div>
            {!isMarketing && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Requestor's Name</label>
                <input
                  name="requestorName"
                  required
                  value={requestorName}
                  onChange={(e) => setRequestorName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-black/5 text-black dark:text-white"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Detailed Description</label>
            <textarea
              name="description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific details about the deliverables, dimensions, and goals..."
              className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-black/5 resize-none text-black dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Brand</label>
              <select 
                name="brand" 
                value={brand}
                onChange={(e) => setBrand(e.target.value as Brand)}
                className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-black/5 text-black dark:text-white"
              >
                <option value="STLAF">STLAF</option>
                <option value="MassagedailyPH">MassagedailyPH</option>
                <option value="LuxeLounge">LuxeLounge</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Type of Request</label>
              <select 
                name="type" 
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as RequestType)}
                className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-black/5 text-black dark:text-white"
              >
                <option value="Photo/Video Editing">Photo/Video Editing</option>
                <option value="Social Media Content">Social Media Content</option>
                <option value="Graphic Design">Graphic Design</option>
                <option value="Marketing Collateral">Marketing Collateral</option>
                <option value="Website / Digital">Website / Digital</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Priority</label>
              <select 
                name="priority" 
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-black/5 text-black dark:text-white"
              >
                <option value="Low">Low (7 Days)</option>
                <option value="Normal">Normal (3 Days)</option>
                <option value="Urgent">Urgent (1 Day)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Date Needed</label>
              <input
                type="date"
                name="dateNeeded"
                value={dateNeeded}
                onChange={(e) => setDateNeeded(e.target.value)}
                required
                className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-black/5 text-black dark:text-white"
              />
            </div>
          </div>

          {tatWarning && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start space-x-3 text-amber-800 dark:text-amber-400">
                <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                <p className="text-xs font-medium leading-relaxed">
                  {tatWarning}
                </p>
              </div>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={tatAcknowledged}
                    onChange={(e) => {
                      setTatAcknowledged(e.target.checked);
                      if (e.target.checked) setError(null);
                    }}
                    className="w-4 h-4 rounded border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                  I acknowledge and agree to these conditions
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Attachment (Optional)</label>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-start space-x-3">
                <Info className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={16} />
                <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-tight">
                  Accepted: PDF, JPG, PNG • Max size: 5MB • For videos or larger files, use the Google Drive link field below.
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-black dark:text-white">
                  <Paperclip size={16} />
                  <span className="text-sm font-medium">Choose File</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                </label>
                {file && (
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between text-sm text-black/60 dark:text-white/60 bg-black/5 dark:bg-white/10 px-3 py-1 rounded-full">
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold">{(file.size / (1024 * 1024)).toFixed(2)}MB / 5MB</span>
                        <button type="button" onClick={() => setFile(null)} className="hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${file.size > 5 * 1024 * 1024 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min((file.size / (5 * 1024 * 1024)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
              )}

              <div>
                <p className="text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest mb-1">Or provide a Google Drive Link (for videos or files &gt; 5MB)</p>
                <input
                  name="attachmentLink"
                  value={attachmentLink}
                  onChange={(e) => setAttachmentLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-black/5 text-sm text-black dark:text-white"
                />
                <p className="text-[10px] text-gray-500 dark:text-white/40 mt-1 italic">* Make sure the link is set to "Anyone with the link can view"</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-4">
            <button
              type="button"
              onClick={saveDraft}
              className="flex-1 flex items-center justify-center space-x-3 bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 py-4 rounded-xl font-semibold hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            >
              <History size={20} />
              <span>Save Draft</span>
            </button>
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="flex-[2] flex items-center justify-center space-x-3 bg-[#141414] dark:bg-white dark:text-black text-white py-4 rounded-xl font-semibold hover:bg-black dark:hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-black/10 dark:shadow-white/5"
            >
              <Send size={20} />
              <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
