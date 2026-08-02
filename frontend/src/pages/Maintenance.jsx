import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Wrench, Plus, Search, HelpCircle, Hammer,
  Clock, CheckCircle2, AlertTriangle, AlertOctagon, X, Upload
} from 'lucide-react';
import toast from 'react-hot-toast';

const Maintenance = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Owner action modal state
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // Update state inputs
  const [statusVal, setStatusVal] = useState('accepted');
  const [worker, setWorker] = useState('');
  const [cost, setCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Search/Filters states
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (priority) params.priority = priority;
      if (status) params.status = status;

      const { data } = await apiClient.get('/maintenance', { params });
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      toast.error('Failed to load maintenance requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [priority, status]);

  const onRaiseSubmit = async (data) => {
    const formData = new FormData();
    formData.append('category', data.category);
    formData.append('priority', data.priority);
    formData.append('description', data.description);
    
    if (selectedFile) {
      formData.append('images', selectedFile);
    }

    try {
      const res = await apiClient.post('/maintenance', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        toast.success('Maintenance ticket raised successfully.');
        setModalOpen(false);
        setSelectedFile(null);
        reset();
        fetchRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to file ticket.');
    }
  };

  const handleOwnerActionSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('status', statusVal);
    formData.append('assignedWorker', worker);
    formData.append('estimatedCost', cost);
    formData.append('resolutionNotes', notes);

    if (selectedFile) {
      formData.append('images', selectedFile);
    }

    try {
      const res = await apiClient.put(`/maintenance/${selectedRequest._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        toast.success('Ticket updated successfully!');
        setActionModalOpen(false);
        setSelectedFile(null);
        // Clear variables
        setWorker('');
        setCost(0);
        setNotes('');
        fetchRequests();
      }
    } catch (err) {
      toast.error('Failed to update ticket.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white Outfit">Maintenance & Support</h1>
          <p className="text-xs text-slate-500">File repair tickets and monitor resolution logs.</p>
        </div>
        {user.role === 'tenant' && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-500/20 transition-all duration-200"
          >
            <Plus className="w-4 h-4" /> Raise Ticket
          </button>
        )}
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted / In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {/* TICKETS LIST */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-panel py-16 text-center text-slate-400 rounded-2xl">
          <Wrench className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold">No maintenance tickets logged.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            let priorityBadge = 'bg-slate-100 text-slate-500';
            if (req.priority === 'medium') priorityBadge = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            if (req.priority === 'high') priorityBadge = 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse';

            let statusBadge = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            let StatusIcon = Clock;
            
            if (req.status === 'accepted') {
              statusBadge = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
              StatusIcon = Hammer;
            }
            if (req.status === 'resolved') {
              statusBadge = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
              StatusIcon = CheckCircle2;
            }
            if (req.status === 'rejected') {
              statusBadge = 'bg-red-500/10 text-red-500 border-red-500/20';
              StatusIcon = AlertOctagon;
            }

            return (
              <div
                key={req._id}
                className="glass-panel rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col md:flex-row justify-between gap-4 items-start md:items-center glass-card-hover"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                      {req.complaintId}
                    </span>
                    <span className="text-[10px] bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded-full font-bold">
                      {req.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${priorityBadge}`}>
                      {req.priority}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider ${statusBadge}`}>
                      <StatusIcon className="w-3 h-3" />
                      {req.status === 'accepted' ? 'In Progress' : req.status}
                    </span>
                  </div>

                  <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold">
                    Property: {req.property?.name} | Resident: {req.tenant?.name}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-2xl">
                    {req.description}
                  </p>

                  {/* Resolution notes display */}
                  {req.resolutionNotes && (
                    <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] text-slate-600 dark:text-slate-400 max-w-xl">
                      <strong>Resolution Notes:</strong> {req.resolutionNotes}
                      {req.assignedWorker && <span className="block mt-0.5 font-bold">Technician: {req.assignedWorker} | Cost: INR {req.estimatedCost}</span>}
                    </div>
                  )}

                  {/* Uploaded photos check */}
                  {(req.beforeImages?.length > 0 || req.afterImages?.length > 0) && (
                    <div className="flex gap-2 pt-2 overflow-x-auto">
                      {req.beforeImages?.map((url, i) => (
                        <div key={i} className="relative w-12 h-12 rounded-lg border overflow-hidden">
                          <img src={url} alt="Before" className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-slate-950/70 text-[7px] text-white text-center">Before</span>
                        </div>
                      ))}
                      {req.afterImages?.map((url, i) => (
                        <div key={i} className="relative w-12 h-12 rounded-lg border overflow-hidden">
                          <img src={url} alt="After" className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-950/70 text-[7px] text-white text-center">After</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Owner workflow actions */}
                {user.role === 'owner' && req.status !== 'resolved' && req.status !== 'rejected' && (
                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setStatusVal(req.status === 'pending' ? 'accepted' : 'resolved');
                      setActionModalOpen(true);
                    }}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 transition-all flex-shrink-0"
                  >
                    {req.status === 'pending' ? 'Accept Ticket' : 'Update / Settle'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TENANT: RAISE MAINTENANCE REQUEST MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Raise Repair Ticket
            </h3>

            <form onSubmit={handleSubmit(onRaiseSubmit)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">Problem Category</label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
                >
                  <option value="Electrical">Electrical</option>
                  <option value="Water">Water Supply</option>
                  <option value="Plumbing">Plumbing Leak</option>
                  <option value="Cleaning">Cleaning & Waste</option>
                  <option value="Internet">Internet Conn</option>
                  <option value="Security">Security Issue</option>
                  <option value="Furniture">Furniture Damage</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">Priority Level</label>
                <select
                  {...register('priority', { required: 'Priority is required' })}
                  className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
                >
                  <option value="low">Low priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">High emergency</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">Description</label>
                <textarea
                  rows="3"
                  placeholder="State the issue details..."
                  {...register('description', { required: 'Description is required' })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl glass-input resize-none"
                />
                {errors.description && <span className="text-[10px] text-red-500">{errors.description.message}</span>}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">Upload Photo Reference</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="text-xs w-full"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OWNER: PROCESS MAINTENANCE ACTION MODAL */}
      {actionModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <button onClick={() => setActionModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              Update Maintenance Request ({selectedRequest.complaintId})
            </h3>

            <form onSubmit={handleOwnerActionSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">Ticket Status</label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl glass-input"
                >
                  <option value="accepted">Accept / Mark In Progress</option>
                  <option value="resolved">Mark Resolved / Closed</option>
                  <option value="rejected">Reject Ticket</option>
                </select>
              </div>

              {statusVal !== 'rejected' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-0.5">Assigned Technician Name</label>
                    <input
                      type="text"
                      value={worker}
                      onChange={(e) => setWorker(e.target.value)}
                      placeholder="e.g. Ramesh Kumar Plumber"
                      className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-0.5">Repair Costs (INR)</label>
                    <input
                      type="number"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full px-3 py-1.5 text-xs rounded-xl glass-input"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-0.5">Resolution / Progress Notes</label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record worker notes or reject explanation..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl glass-input resize-none"
                  required
                />
              </div>

              {statusVal === 'resolved' && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-0.5">Upload Completion (After Image)</label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="text-xs w-full"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg"
                >
                  Update Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
