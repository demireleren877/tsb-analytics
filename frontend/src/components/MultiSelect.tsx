import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  maxDisplay?: number;
  allLabel?: string;
  showAllOption?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Seçim yapın...',
  label,
  maxDisplay = 2,
  allLabel = 'Tümü',
  showAllOption = true,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const clearAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (selected.length === 0) {
      return placeholder;
    }
    if (selected.length === options.length && showAllOption) {
      return allLabel;
    }
    if (selected.length <= maxDisplay) {
      return selected
        .map((v) => options.find((o) => o.value === v)?.label || v)
        .join(', ');
    }
    return `${selected.length} seçili`;
  };

  const isAllSelected = selected.length === options.length;

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && <label className="text-sm font-medium">{label}</label>}

      <div className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-accent flex items-center justify-between min-h-[40px]"
        >
          <span className={selected.length === 0 ? 'text-muted-foreground' : ''}>
            {getDisplayText()}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 border rounded-md bg-background shadow-lg">
            {/* Search Input */}
            <div className="p-2 border-b">
              <input
                type="text"
                placeholder="Ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 p-2 border-b text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="text-primary hover:underline"
              >
                Tümünü Seç
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-primary hover:underline"
              >
                Temizle
              </button>
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {showAllOption && (
                <label
                  className={`flex items-center gap-2 cursor-pointer hover:bg-accent p-2 border-b ${
                    isAllSelected ? 'bg-primary/5' : ''
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded border flex items-center justify-center ${
                      isAllSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-input'
                    }`}
                  >
                    {isAllSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="text-sm font-medium">{allLabel}</span>
                </label>
              )}
              {filteredOptions.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 cursor-pointer hover:bg-accent p-2 border-b last:border-b-0 ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-input'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleOption(option.value);
                      }}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span
                      className="text-sm flex-1"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleOption(option.value);
                      }}
                    >
                      {option.label}
                    </span>
                  </label>
                );
              })}
              {filteredOptions.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Sonuç bulunamadı
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Tags */}
      {selected.length > 0 && selected.length < options.length && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.slice(0, 5).map((value) => {
            const option = options.find((o) => o.value === value);
            return (
              <div
                key={value}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs"
              >
                <span>{option?.label || value}</span>
                <button
                  type="button"
                  onClick={() => toggleOption(value)}
                  className="text-primary hover:text-primary/70"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {selected.length > 5 && (
            <div className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              +{selected.length - 5} daha
            </div>
          )}
        </div>
      )}
    </div>
  );
}
