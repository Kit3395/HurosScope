import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Globe,
  Plus,
  Mail,
  Phone,
  Building,
} from 'lucide-react';
import { contactService, businessService } from '../services';
import { Contact, ContactVerificationStatus, ContactSource } from '../types';
import { DataCategoryPill } from '../components/DataCategoryPill';

export const ContactsPage: React.FC = () => {
  const contacts = contactService.getAll(false);
  const businesses = businessService.getAll(false);

  const [filterStatus, setFilterStatus] = useState<'ALL' | ContactVerificationStatus>('ALL');

  const filteredContacts = contacts.filter((c) => {
    if (filterStatus === 'ALL') return true;
    return c.verificationStatus === filterStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Verified Business Contacts</h1>
            <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-bold">
              PRIVACY SAFEGUARDED
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Strictly legitimate business prospecting. Mandates provenance sources and verification audits.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Status:</span>
          {(['ALL', 'VERIFIED', 'UNVERIFIED', 'FLAGGED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-xs ${
                filterStatus === status
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy Policy Enforcement Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Strict Privacy & Legitimate Outreach Policy</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The system enforces data minimization. Storage of passwords, financial credentials, government IDs, or sensitive private personal home data is strictly prohibited. Every contact is tied to an explicit public business source and carries a clear verification audit state.
        </p>
      </div>

      {/* Contacts List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map((contact) => {
          const associatedBiz = businessService.getById(contact.businessId);

          return (
            <div
              key={contact.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{contact.fullName}</h3>
                  <div className="text-xs text-slate-500">{contact.jobTitle || 'Business Contact'}</div>
                  {associatedBiz && (
                    <div className="text-xs text-cyan-700 font-semibold mt-1 flex items-center space-x-1">
                      <Building className="w-3.5 h-3.5" />
                      <span>{associatedBiz.crm.verifiedBusinessName}</span>
                    </div>
                  )}
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    contact.verificationStatus === 'VERIFIED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : contact.verificationStatus === 'FLAGGED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {contact.verificationStatus}
                </span>
              </div>

              {/* Direct Communication Channels */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-slate-900 font-medium">
                    {contact.businessEmail || <span className="text-rose-600 italic">Not verified</span>}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-slate-900 font-medium">
                    {contact.businessPhone || <span className="text-rose-600 italic">Not verified</span>}
                  </span>
                </div>
              </div>

              {/* Provenance & Audit Metadata */}
              <div className="space-y-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span>Source:</span>
                  <span className="font-semibold text-slate-700">{contact.source}</span>
                </div>
                {contact.sourceUrl && (
                  <div className="flex justify-between truncate">
                    <span>Source URL:</span>
                    <a
                      href={contact.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-700 hover:underline truncate max-w-[180px] font-medium"
                    >
                      {contact.sourceUrl}
                    </a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Verified By:</span>
                  <span className="font-mono text-slate-700 font-medium">{contact.verifiedBy || 'System'}</span>
                </div>
              </div>

              <div className="text-[10px] text-emerald-700 font-mono text-center font-medium bg-emerald-50 py-1 px-2 rounded-lg border border-emerald-100">
                ✓ {contact.complianceStatement}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
