import React, { useState } from 'react';
import { X, Key, Zap, Droplet, Clipboard, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';

const MoveWorkflowModal = ({ isOpen, onClose, type = 'in', onSubmit, tenantName = '', propertyName = '', securityDeposit = 0 }) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      electricityReading: 0,
      waterReading: 0,
      depositCollected: false,
      keyHandoverConfirmed: false,
      damageInspectionNotes: '',
      refundCalculated: securityDeposit,
      pendingDuesSettled: false
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
      {/* Modal Card container */}
      <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className={`p-2.5 rounded-xl ${type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
              {type === 'in' ? 'Tenant Move-In Process' : 'Tenant Move-Out Settlement'}
            </h3>
            <p className="text-xs text-slate-400">
              Property: {propertyName} | Tenant: {tenantName}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Electricity Meter */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                <Zap className="w-3.5 h-3.5 text-brand-500" />
                Electricity Reading
              </label>
              <input
                type="number"
                step="any"
                {...register('electricityReading', { required: 'Electricity reading is required' })}
                className="w-full px-3 py-2 text-sm rounded-xl glass-input"
              />
              {errors.electricityReading && (
                <span className="text-[10px] text-red-500">{errors.electricityReading.message}</span>
              )}
            </div>

            {/* Water Meter */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                <Droplet className="w-3.5 h-3.5 text-blue-500" />
                Water Reading
              </label>
              <input
                type="number"
                step="any"
                {...register('waterReading', { required: 'Water reading is required' })}
                className="w-full px-3 py-2 text-sm rounded-xl glass-input"
              />
              {errors.waterReading && (
                <span className="text-[10px] text-red-500">{errors.waterReading.message}</span>
              )}
            </div>
          </div>

          {type === 'in' ? (
            /* MOVE IN CHECKBOXES */
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('depositCollected')}
                  className="mt-1 rounded border-slate-300 dark:border-slate-800 text-brand-500 focus:ring-brand-500"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Security Deposit Collected (INR {securityDeposit.toLocaleString()})
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    Check if the lease security deposit has been fully received.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('keyHandoverConfirmed')}
                  className="mt-1 rounded border-slate-300 dark:border-slate-800 text-brand-500 focus:ring-brand-500"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Key Handover Confirmed
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    Check if property keys and access cards have been provided to the tenant.
                  </span>
                </div>
              </label>
            </div>
          ) : (
            /* MOVE OUT SETTLEMENT */
            <div className="space-y-4 pt-1">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                  <Clipboard className="w-3.5 h-3.5 text-brand-500" />
                  Damage Inspection Notes
                </label>
                <textarea
                  rows="2"
                  {...register('damageInspectionNotes')}
                  placeholder="Record any physical damages, repairs needed, paint conditions..."
                  className="w-full px-3 py-2 text-sm rounded-xl glass-input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Refundable Deposit (INR)
                  </label>
                  <input
                    type="number"
                    {...register('refundCalculated')}
                    className="w-full px-3 py-2 text-sm rounded-xl glass-input"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    Original security deposit: INR {securityDeposit}
                  </span>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/50 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('pendingDuesSettled')}
                      className="rounded border-slate-300 dark:border-slate-800 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Dues Cleared & Settled
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-lg transition-all duration-200 ${type === 'in' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'}`}
            >
              {type === 'in' ? 'Confirm Occupancy (Move-In)' : 'Complete Move-Out & Empty Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MoveWorkflowModal;
