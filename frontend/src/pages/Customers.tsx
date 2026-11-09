import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Customer } from '../types';
import {
  Users, Plus, Search, Phone, Mail, MapPin, IndianRupee,
  CreditCard, X, Check, Sparkles
} from 'lucide-react';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const loadCustomers = async () => {
    try {
      const data = await api.listCustomers(searchTerm || undefined);
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [searchTerm]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCustomer(newCustomer);
      setIsAddModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      await loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to add customer');
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#F8F5ED]">
      
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#28332C] tracking-tight flex items-center gap-2">
            Customer Directory & Khata
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E4EFE6] text-[#3C9970] border border-[#789B82]/30">
              {customers.length} Accounts
            </span>
          </h1>
          <p className="text-xs text-[#7D887F] font-medium mt-0.5">
            Maintain digital customer ledgers, purchase histories, and credit (Udhar) balances.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#52745F] hover:bg-[#3D5747] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E5E9E3] flex items-center gap-3 w-full sm:w-96 shadow-xs">
        <Search className="w-4 h-4 text-[#52745F]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by customer name or phone..."
          className="w-full bg-transparent text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none font-medium"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-2xl border border-[#E5E9E3] hover:border-[#789B82] transition-all shadow-xs space-y-4 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#EDF5EF] text-[#52745F] font-black flex items-center justify-center text-sm border border-[#E5E9E3]">
                  {c.name[0]?.toUpperCase() || 'C'}
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#28332C] group-hover:text-[#52745F] transition-colors">{c.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#7D887F] font-medium">
                    <Phone className="w-3 h-3 text-[#52745F]" />
                    <span>{c.phone}</span>
                  </div>
                </div>
              </div>

              {c.address && (
                <div className="flex items-start gap-1.5 text-xs text-[#7D887F]">
                  <MapPin className="w-3.5 h-3.5 text-[#7D887F] shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{c.address}</span>
                </div>
              )}
            </div>

            {/* Financial Ledger Footer */}
            <div className="pt-3 border-t border-[#E5E9E3] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#7D887F] block">Total Purchases</span>
                <span className="font-mono font-bold text-[#28332C]">₹{c.total_purchases.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#7D887F] block">Khata Credit (ఉధార్)</span>
                <span className={`font-mono font-black ${c.credit_balance > 0 ? 'text-[#D97706]' : 'text-[#3C9970]'}`}>
                  ₹{c.credit_balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-[#E5E9E3] rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3">
              <h3 className="text-sm font-black text-[#28332C] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#52745F]" />
                Register New Customer Khata
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-xl text-[#7D887F] hover:text-[#28332C] hover:bg-[#EDF5EF]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#7D887F] block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="e.g. Ramesh Reddy"
                  className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#7D887F] block mb-1">Mobile Phone Number</label>
                <input
                  type="tel"
                  required
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-mono font-bold focus:outline-none focus:border-[#789B82]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#7D887F] block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="e.g. customer@example.com"
                  className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] focus:outline-none focus:border-[#789B82]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#7D887F] block mb-1">Address / Landmark</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="e.g. Near Temple Street, Tenali"
                  className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] focus:outline-none focus:border-[#789B82]"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E5E9E3] text-xs font-bold text-[#7D887F] hover:bg-[#EDF5EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#52745F] hover:bg-[#3D5747] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Customers;
