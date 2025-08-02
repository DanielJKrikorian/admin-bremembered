import React from 'react';
import { Edit, Save } from 'lucide-react';

interface EditableFieldProps {
  value: string;
  field: string;
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  onSave: () => void;
  onChange: (value: string) => void;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: 'text' | 'textarea' | 'tel' | 'image';
  icon?: React.ReactNode;
}

export default function EditableField({ value, field, editMode, setEditMode, onSave, onChange, onFileChange, type = 'text', icon }: EditableFieldProps) {
  return editMode ? (
    <div className="space-y-2">
      {type === 'image' ? (
        <>
          {value && <img src={value} alt={`${field} preview`} className="w-32 h-32 object-cover rounded-full" />}
          <input type="file" accept="image/*" onChange={onFileChange} className="w-full" />
        </>
      ) : type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder={`Enter ${field}`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder={`Enter ${field}`}
        />
      )}
      <div className="space-x-2">
        <button onClick={onSave} className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Save className="h-4 w-4 mr-1" /> Save
        </button>
        <button onClick={() => setEditMode(false)} className="inline-flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700">
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <div>
      {icon && <label className="text-sm font-medium text-gray-500 flex items-center">{icon} {field.charAt(0).toUpperCase() + field.slice(1)}</label>}
      {type === 'image' && value ? (
        <img src={value} alt={`${field} preview`} className="w-32 h-32 object-cover rounded-full mt-2" />
      ) : (
        <p className="text-sm text-gray-900">{value || `No ${field} provided`}</p>
      )}
      <button onClick={() => setEditMode(true)} className="mt-2 inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
        <Edit className="h-4 w-4 mr-1" /> Edit
      </button>
    </div>
  );
}