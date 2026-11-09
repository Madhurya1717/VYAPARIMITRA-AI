import React from 'react';
import { Mic, Phone, MessageSquare, Sparkles, BookOpen, ExternalLink, HelpCircle, ArrowRight } from 'lucide-react';
import { ShopkeeperMascot, AIRobotAssistant } from '../components/Illustrations';

export const Help: React.FC = () => {
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#F8F5ED]">
      {/* Header */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E4EFE6] border border-[#789B82]/30 text-[#3C9970] text-xs font-bold">
            <HelpCircle className="w-3.5 h-3.5 text-[#52745F]" />
            <span>Merchant Support & Kirana Voice Guide</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#28332C] tracking-tight">
            Help & Voice Command Guide
          </h1>
          <p className="text-xs text-[#7D887F] font-medium max-w-xl leading-relaxed">
            Learn how to operate VyapariMitra AI with natural spoken Telugu, English, and Tenglish voice commands powered by Gnani.ai Prisma & Timbre.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ShopkeeperMascot size={56} />
          <AIRobotAssistant size={56} />
        </div>
      </div>

      {/* Spoken Voice Commands Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Sales & Billing Commands */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E9E3] shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EDF5EF] text-[#52745F] flex items-center justify-center font-bold">
              ₹
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#28332C]">Sales & POS Billing</h3>
              <p className="text-[11px] text-[#7D887F]">అమ్మకాలు & బిల్లింగ్</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[#F8F5ED] rounded-xl border border-[#E5E9E3] space-y-1">
              <span className="font-bold text-[#28332C] block font-sans">"రెండు కేజీల పంచదార బిల్ చెయ్యి"</span>
              <p className="text-[11px] text-[#7D887F]">Adds 2 kg Refined Sugar to customer bill.</p>
            </div>
            <div className="p-3 bg-[#F8F5ED] rounded-xl border border-[#E5E9E3] space-y-1">
              <span className="font-bold text-[#28332C] block font-sans">"Add 5 packets Aashirvaad Atta"</span>
              <p className="text-[11px] text-[#7D887F]">Bills 5 packets of Atta in Indian English.</p>
            </div>
          </div>
        </div>

        {/* Stock & Inventory Commands */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E9E3] shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EDF5EF] text-[#52745F] flex items-center justify-center font-bold">
              📦
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#28332C]">Inventory & Stock In</h3>
              <p className="text-[11px] text-[#7D887F]">స్టాక్ & సరుకు నిల్వలు</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[#F8F5ED] rounded-xl border border-[#E5E9E3] space-y-1">
              <span className="font-bold text-[#28332C] block font-sans">"ఆయిల్ స్టాక్ ఎంత ఉంది?"</span>
              <p className="text-[11px] text-[#7D887F]">Checks current Sunflower Oil inventory.</p>
            </div>
            <div className="p-3 bg-[#F8F5ED] rounded-xl border border-[#E5E9E3] space-y-1">
              <span className="font-bold text-[#28332C] block font-sans">"స్టాక్ లో 50 కేజీల బియ్యం చేర్చండి"</span>
              <p className="text-[11px] text-[#7D887F]">Adds 50kg rice to current stock ledger.</p>
            </div>
          </div>
        </div>

        {/* Business Analytics & Khata */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E9E3] shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EDF5EF] text-[#52745F] flex items-center justify-center font-bold">
              📊
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#28332C]">Analytics & Totals</h3>
              <p className="text-[11px] text-[#7D887F]">రోజువారీ లెక్కలు & నివేదికలు</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[#F8F5ED] rounded-xl border border-[#E5E9E3] space-y-1">
              <span className="font-bold text-[#28332C] block font-sans">"ఈరోజు అమ్మకాలు ఎంత అయ్యాయి?"</span>
              <p className="text-[11px] text-[#7D887F]">Speaks today's revenue and order count.</p>
            </div>
            <div className="p-3 bg-[#F8F5ED] rounded-xl border border-[#E5E9E3] space-y-1">
              <span className="font-bold text-[#28332C] block font-sans">"Show low stock products"</span>
              <p className="text-[11px] text-[#7D887F]">Lists items that require immediate restocking.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Support Info */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5E9E3] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EDF5EF] text-[#52745F] flex items-center justify-center font-bold">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-[#28332C]">Need Direct Help or Technical Support?</div>
            <div className="text-[11px] text-[#7D887F]">Contact Sri Lakshmi Kirana Technical Helpdesk or Gnani.ai Support</div>
          </div>
        </div>
        <div className="font-mono font-bold text-[#52745F]">
          +91 98765 43210 &bull; support@vyaparimitra.ai
        </div>
      </div>

    </div>
  );
};

export default Help;
