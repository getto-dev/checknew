import React, { useState } from 'react';
import { X, PlusCircle, Check } from 'lucide-react';
import { EstimateItem } from '../types';

interface AddCustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: Omit<EstimateItem, 'id' | 'total'>) => void;
  defaultCategories: string[];
}

const COMMON_UNITS = ['м²', 'м.п.', 'шт', 'точка', 'комплект', 'комплекс', 'час', 'кг', 'мешок', 'м³', 'т'];

export const AddCustomItemModal: React.FC<AddCustomItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  defaultCategories,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(defaultCategories[0] || 'Индивидуальные работы');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [unit, setUnit] = useState('шт');
  const [customUnit, setCustomUnit] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [price, setPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [type, setType] = useState<'work' | 'material'>('work');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Введите наименование позиции');
      return;
    }
    const finalPrice = typeof price === 'number' ? price : parseFloat(String(price)) || 0;
    const finalQty = typeof quantity === 'number' ? quantity : parseFloat(String(quantity)) || 1;

    if (finalPrice < 0) {
      setError('Цена не может быть отрицательной');
      return;
    }
    if (finalQty <= 0) {
      setError('Количество должно быть больше 0');
      return;
    }

    const finalCat = isCustomCategory ? (customCategory.trim() || 'Индивидуальные работы') : category;
    const finalUnit = isCustomUnit ? (customUnit.trim() || 'шт') : unit;

    onAddItem({
      name: name.trim(),
      description: description.trim() || undefined,
      category: finalCat,
      unit: finalUnit,
      price: finalPrice,
      quantity: finalQty,
      type,
    });

    // Reset
    setName('');
    setDescription('');
    setPrice('');
    setQuantity(1);
    setError(null);
    onClose();
  };

  const previewTotal = (Number(price) || 0) * (Number(quantity) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-100 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Добавить свою позицию</h2>
              <p className="text-xs text-slate-400">Создайте индивидуальную работу или материал для сметы</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-xs text-red-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Тип позиции
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('work')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                  type === 'work'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                🛠️ Работа / Услуга
              </button>
              <button
                type="button"
                onClick={() => setType('material')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                  type === 'material'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                📦 Материал / Товар
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Наименование <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Монтаж инсталляции с переделкой стояка"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Описание / Примечание (необязательно)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Дополнительные детали, марка, параметры..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Категория
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-xs text-amber-400 hover:underline"
              >
                {isCustomCategory ? 'Выбрать из списка' : '+ Новая категория'}
              </button>
            </div>
            {isCustomCategory ? (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Введите название новой категории..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {defaultCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="Индивидуальные работы">Индивидуальные работы</option>
                <option value="Дополнительные материалы">Дополнительные материалы</option>
              </select>
            )}
          </div>

          {/* Unit of measurement */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Единица измерения
              </label>
              <button
                type="button"
                onClick={() => setIsCustomUnit(!isCustomUnit)}
                className="text-xs text-amber-400 hover:underline"
              >
                {isCustomUnit ? 'Выбрать из стандартных' : 'Своя единица'}
              </button>
            </div>

            {isCustomUnit ? (
              <input
                type="text"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="Например: рейс, смена, рулон"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {COMMON_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      unit === u
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price & Quantity Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Цена за ед., ₽ <span className="text-amber-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Количество <span className="text-amber-400">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="1"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Real-time total calculation badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-xs text-slate-400 font-medium">Стоимость позиции:</span>
            <span className="text-base font-bold text-amber-400 font-mono">
              {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(previewTotal)}
            </span>
          </div>

          {/* Submit */}
          <div className="flex gap-2.5 pt-2">
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
              Добавить в смету
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
