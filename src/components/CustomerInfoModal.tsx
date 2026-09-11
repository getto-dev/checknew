import React, { useState, useEffect } from 'react';
import { X, FileText, Check, Building2, User, Phone, MapPin, Calendar, MessageSquare } from 'lucide-react';
import { Estimate } from '../types';

interface CustomerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: Estimate;
  onSave: (updated: Partial<Estimate>) => void;
}

export const CustomerInfoModal: React.FC<CustomerInfoModalProps> = ({
  isOpen,
  onClose,
  estimate,
  onSave,
}) => {
  const [title, setTitle] = useState(estimate.title || '');
  const [customer, setCustomer] = useState(estimate.customer || '');
  const [companyName, setCompanyName] = useState(estimate.companyName || '');
  const [phone, setPhone] = useState(estimate.phone || '');
  const [address, setAddress] = useState(estimate.address || '');
  const [date, setDate] = useState(estimate.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(estimate.notes || '');

  useEffect(() => {
    setTitle(estimate.title || '');
    setCustomer(estimate.customer || '');
    setCompanyName(estimate.companyName || '');
    setPhone(estimate.phone || '');
    setAddress(estimate.address || '');
    setDate(estimate.date || new Date().toISOString().split('T')[0]);
    setNotes(estimate.notes || '');
  }, [estimate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    onSave({
      title: title.trim(),
      customer: customer.trim(),
      companyName: companyName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      date: date || today,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-100 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Параметры сметы</h2>
              <p className="text-xs text-slate-400">Незаполненные поля не будут отображаться в итоговой смете</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Название проекта / сметы
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Ремонт квартиры ЖК Панорама, кв. 42"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customer */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Клиент / Заказчик
              </label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="ФИО или организация"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                Компания / Подрядчик
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="ИП Иванов А.В. / ООО МастерСтрой"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Phone */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                Телефон
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 000-00-00"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Дата сметы
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Адрес объекта
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="г. Москва, ул. Ленина, д. 15, кв. 42"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              Условия / Примечания к смете
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Гарантия на работы 24 месяца. Предоплата 30%. Черновые материалы включены по факту закупки."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-semibold text-slate-300 transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-sm font-bold text-slate-950 transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
