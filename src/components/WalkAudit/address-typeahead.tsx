import { useState, useRef, useCallback } from "react";
import { useCombobox } from "downshift";
import * as s from "./walk-audit.module.css";

export type AddressSuggestion = {
  label: string;
  detail: string;
  lat: number;
  lng: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (lat: number, lng: number, label: string) => void;
  onClear: () => void;
  placeholder?: string;
};

const PHOTON_BASE = "https://photon.komoot.io/api";
const OCEANSIDE_LAT = 33.1959;
const OCEANSIDE_LNG = -117.3795;
const BBOX = "-117.45,33.15,-117.30,33.25";
const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;
const MAX_RESULTS = 5;

function formatFeature(f: any): AddressSuggestion {
  const p = f.properties ?? {};
  const coords = f.geometry?.coordinates ?? [];

  let label: string;
  if (p.housenumber && p.street) label = `${p.housenumber} ${p.street}`;
  else if (p.street) label = p.street;
  else if (p.name) label = p.name;
  else label = p.district ?? "Unknown";

  const detailParts = [p.district, p.city, p.state].filter(Boolean);
  if (detailParts[0] === label) detailParts.shift();
  const detail = detailParts.join(", ");

  return {
    label,
    detail,
    lat: coords[1],
    lng: coords[0],
  };
}

function deduplicateSuggestions(items: AddressSuggestion[]): AddressSuggestion[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.label}|${item.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchSuggestions(query: string): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    lat: String(OCEANSIDE_LAT),
    lon: String(OCEANSIDE_LNG),
    bbox: BBOX,
    limit: String(MAX_RESULTS),
    lang: "en",
  });

  const res = await fetch(`${PHOTON_BASE}?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return deduplicateSuggestions((data.features ?? []).map(formatFeature));
}

export default function AddressTypeahead({
  value,
  onChange,
  onSelect,
  onClear,
  placeholder = "Mission Ave & Cleveland St",
}: Props) {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedFetch = useCallback((inputValue: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!inputValue || inputValue.trim().length < MIN_CHARS) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(inputValue.trim());
      setItems(results);
      setLoading(false);
    }, DEBOUNCE_MS);
  }, []);

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
  } = useCombobox({
    items,
    inputValue: value,
    itemToString: (item) => item?.label ?? "",
    onInputValueChange: ({ inputValue, type }) => {
      if (type === useCombobox.stateChangeTypes.InputChange) {
        onChange(inputValue ?? "");
        debouncedFetch(inputValue ?? "");
      }
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (!selectedItem) return;
      const display = selectedItem.detail
        ? `${selectedItem.label}, ${selectedItem.detail}`
        : selectedItem.label;
      onChange(display);
      onSelect(selectedItem.lat, selectedItem.lng, display);
      setItems([]);
    },
    stateReducer: (_state, actionAndChanges) => {
      const { changes, type } = actionAndChanges;
      if (type === useCombobox.stateChangeTypes.InputBlur) {
        return { ...changes, inputValue: value };
      }
      return changes;
    },
  });

  const showMenu = isOpen && (items.length > 0 || loading);

  return (
    <div className={s.typeaheadWrap}>
      <div className={s.inputRow}>
        <input
          {...getInputProps({
            className: s.textInput,
            placeholder,
          })}
        />
        {value && (
          <button
            type="button"
            className={s.btnClear}
            onClick={() => {
              onChange("");
              setItems([]);
              onClear();
            }}
          >
            &#x2715;
          </button>
        )}
      </div>
      <ul
        {...getMenuProps()}
        className={showMenu ? s.typeaheadMenuOpen : s.typeaheadMenu}
      >
        {showMenu && (
          <>
            {loading && !items.length && (
              <li className={s.typeaheadLoading}>Searching...</li>
            )}
            {items.map((item, index) => (
              <li
                key={`${item.lat}-${item.lng}-${index}`}
                {...getItemProps({ item, index })}
                className={
                  highlightedIndex === index
                    ? s.typeaheadItemActive
                    : s.typeaheadItem
                }
              >
                <span className={s.typeaheadLabel}>{item.label}</span>
                {item.detail && (
                  <span className={s.typeaheadDetail}>{item.detail}</span>
                )}
              </li>
            ))}
          </>
        )}
      </ul>
    </div>
  );
}
