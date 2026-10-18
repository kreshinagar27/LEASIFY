// src/pages/Apartments.jsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import apiClient from '../services/api';
import { Plus, Building, Edit, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Apartments = () => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { furnishedStatus: 'furnished' }
  });

  const fetchApartments = async () => {
    setLoading(true);
    try { const { data } = await apiClient.get('/apartments'); if (data.success) setApartments(data.data); }
    catch { toast.error('Failed to load apartments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchApartments(); }, []);

  const onSubmit = async (formData) => {
    try { const res = await apiClient.post('/apartments', formData); if (res.data.success) { toast.success('Apartment added'); setModalOpen(false); reset(); fetchApartments(); } }
    catch { toast.error('Add failed'); }
  };

  const handleDelete = async (id) => {
    try { const res = await apiClient.delete(`/apartments/${id}`); if (res.data.success) { toast.success('Apartment deleted'); fetchApartments(); } }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white Outfit">Apartments</h1>
        <button onClick={() => { setModalOpen(true); setActiveTab('basic'); }} className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Apartment
        </button>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i=> <div key={i} className="h-48 glass-panel rounded-2xl animate-pulse bg-slate-200/50 dark:bg-slate-900/50" />)}
        </div>
      ) : apartments.length===0 ? (
        <div className="py-12 text-center text-slate-400 glass-panel rounded-2xl border">
          <Building className="w-12 h-12 mx-auto mb-2 text-slate-400 opacity-60" />
          <p className="text-sm font-semibold">No apartments found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apartments.map(ap => (
            <div key={ap._id} className="glass-panel rounded-2xl overflow-hidden border shadow-lg flex flex-col">
              <div className="h-40 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                <Building className="w-12 h-12 text-slate-500" />
              </div>
              <div className="p-4 flex-1">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white truncate Outfit">{ap.apartmentNumber||'Apartment'}</h3>
                <p className="text-xs text-slate-600">Floor: {ap.floorNumber||'—'}</p>
                <p className="text-xs text-slate-600">Area: {ap.areaSqFt? `${ap.areaSqFt} sq ft` : '—'}</p>
                <p className="text-xs text-slate-600">Rent: {ap.rent? `₹${ap.rent.toLocaleString()}` : '—'}</p>
                <p className="text-xs text-slate-600">Status: {ap.status||'—'}</p>
              </div>
              <div className="flex gap-2 p-2 border-t">
                <Link to={`/apartments/${ap._id}`} className="flex-1 text-center text-xs bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
                  <Eye className="w-3.5 h-3.5 inline-block mr-1" /> View
                </Link>
                <button onClick={()=>{}} className="p-1 text-slate-600 hover:text-slate-800"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={()=>handleDelete(ap._id)} className="p-1 text-red-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="font-extrabold text-lg Outfit">Add New Apartment</h3>
              <button onClick={()=>setModalOpen(false)} className="text-xl">×</button>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={()=>setActiveTab('basic')} className={`px-3 py-1 rounded ${activeTab==='basic'?'bg-brand-500 text-white':'bg-slate-100'}`}>Basic</button>
              <button onClick={()=>setActiveTab('specs')} className={`px-3 py-1 rounded ${activeTab==='specs'?'bg-brand-500 text-white':'bg-slate-100'}`}>Specifications</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {activeTab==='basic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold mb-1">Apartment Number *</label><input type="text" placeholder="A-402" {...register('apartmentNumber',{required:'Required'})} className="w-full px-3 py-2 text-xs rounded glass-input"/>{errors.apartmentNumber && <span className="text-xs text-red-500">{errors.apartmentNumber.message}</span>}</div>
                  <div><label className="block text-xs font-semibold mb-1">Floor Number *</label><input type="number" placeholder="4" {...register('floorNumber',{required:'Required'})} className="w-full px-3 py-2 text-xs rounded glass-input"/>{errors.floorNumber && <span className="text-xs text-red-500">{errors.floorNumber.message}</span>}</div>
                  <div><label className="block text-xs font-semibold mb-1">Area (sq ft) *</label><input type="number" placeholder="1200" {...register('areaSqFt',{required:'Required'})} className="w-full px-3 py-2 text-xs rounded glass-input"/>{errors.areaSqFt && <span className="text-xs text-red-500">{errors.areaSqFt.message}</span>}</div>
                  <div><label className="block text-xs font-semibold mb-1">Rent (₹) *</label><input type="number" placeholder="18000" {...register('rent',{required:'Required'})} className="w-full px-3 py-2 text-xs rounded glass-input"/>{errors.rent && <span className="text-xs text-red-500">{errors.rent.message}</span>}</div>
                </div>
              )}
              {activeTab==='specs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold mb-1">Bedrooms</label><input type="number" placeholder="2" {...register('bedrooms')} className="w-full px-3 py-2 text-xs rounded glass-input"/></div>
                  <div><label className="block text-xs font-semibold mb-1">Bathrooms</label><input type="number" placeholder="2" {...register('bathrooms')} className="w-full px-3 py-2 text-xs rounded glass-input"/></div>
                  <div><label className="block text-xs font-semibold mb-1">Balconies</label><input type="number" placeholder="1" {...register('balconies')} className="w-full px-3 py-2 text-xs rounded glass-input"/></div>
                  <div><label className="block text-xs font-semibold mb-1">Furnishing Status</label><select {...register('furnishedStatus')} className="w-full px-2 py-2 text-xs rounded glass-input"><option value="furnished">Furnished</option><option value="semi-furnished">Semi-Furnished</option><option value="unfurnished">Unfurnished</option></select></div>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={()=>setModalOpen(false)} className="px-4 py-2 text-xs rounded border">Cancel</button><button type="submit" className="px-5 py-2 text-xs bg-brand-500 text-white rounded hover:bg-brand-600">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Apartments;
