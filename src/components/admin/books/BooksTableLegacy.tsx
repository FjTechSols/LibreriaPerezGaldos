import { useState } from 'react';
import { Book } from '../../../types';
import { Edit2, Barcode, Trash2, Info } from 'lucide-react';

interface BooksTableLegacyProps {
  books: Book[];
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  onStockUpdate: (book: Book, amount: number) => void;
  onExpressOrder: (book: Book) => void;
  loading: boolean;
}

export function BooksTableLegacy({ 
  books, 
  onEdit, 
  onDelete, 
  onStockUpdate,
  onExpressOrder,
  loading 
}: BooksTableLegacyProps) {
  const [hoveredCode, setHoveredCode] = useState<{ code: string; top: number; left: number } | null>(null);
  const [hoveredDescription, setHoveredDescription] = useState<{ text: string; top: number; left: number } | null>(null);

  if (loading) {
     return (
        <div className="w-full h-64 flex items-center justify-center">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
     );
  }

  return (
    <div className="overflow-x-visible rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <table className="w-full text-left text-sm relative">
        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
           <tr>
             <th className="px-2 py-3 w-[100px]">Código / ISBN</th>
             <th className="px-2 py-3 min-w-[200px]">Título</th>
             <th className="px-2 py-3 min-w-[140px]">Autor</th>
             <th className="px-2 py-3 min-w-[140px]">Info</th>
             <th className="px-2 py-3 text-center w-[80px]">Stock</th>
             <th className="px-2 py-3 text-right w-[90px]">Precio</th>
             <th className="px-2 py-3 text-right w-[100px]">Acciones</th>
           </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
           {books.map((book) => (
             <tr key={book.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group text-sm relative">
               {/* 1. Code/ISBN */}
               <td className="px-2 py-2 align-top relative">
                 <div className="flex flex-col">
                    <div className="relative w-fit">
                        <span 
                            className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-help border-b border-dotted border-gray-400 dark:border-gray-500"
                            onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredCode({ code: book.code || 'S/C', top: rect.top, left: rect.left });
                            }}
                            onMouseLeave={() => setHoveredCode(null)}
                        >
                            {book.code || 'S/C'}
                        </span>
                    </div>
                    {book.isbn && book.isbn !== 'N/A' && (
                        <span className="text-[11px] text-gray-500 font-mono break-all leading-tight mt-0.5">
                            {book.isbn}
                        </span>
                    )}
                 </div>
               </td>

               {/* 2. Title + Cover Preview */}
               <td className="px-2 py-2 align-top">
                  <div className="flex gap-2 relative">
                     {book.coverImage && (
                        <div className="flex-shrink-0 mt-0.5">
                            <img 
                                src={book.coverImage} 
                                alt="" 
                                className="w-8 h-12 object-cover rounded shadow-sm opacity-90 group-hover:opacity-100 transition-opacity"
                            />
                        </div>
                     )}
                     <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1">
                            {book.description && (
                                <div className="relative flex-shrink-0 mt-0.5">
                                    <Info 
                                        size={14} 
                                        className="text-gray-400 hover:text-blue-500 cursor-help"
                                        onMouseEnter={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setHoveredDescription({ text: book.description || '', top: rect.top, left: rect.left });
                                        }}
                                        onMouseLeave={() => setHoveredDescription(null)}
                                    />
                                </div>
                            )}
                            <span className="block font-medium text-gray-900 dark:text-white leading-tight mb-1">
                                {book.title}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {book.isNew && <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">NUEVO</span>}
                            {book.isOnSale && <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">OFERTA</span>}
                            {book.featured && <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">DESTACADO</span>}
                            {book.condition === 'nuevo' && <span className="px-1.5 py-0.5 rounded-sm text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-100 dark:border-blue-800">NUEVO</span>}
                        </div>
                     </div>
                  </div>
               </td>

               {/* 3. Author */}
               <td className="px-2 py-2 align-top">
                   <span className="text-gray-700 dark:text-gray-300 leading-tight block">
                       {book.author}
                   </span>
               </td>

               {/* 4. Info (Rich Data) */}
               <td className="px-2 py-2 align-top">
                   <div className="flex flex-col gap-0.5 text-xs text-gray-600 dark:text-gray-400">
                       {book.publisher && (
                           <span className="truncate" title={`Editorial: ${book.publisher}`}>
                               {book.publisher}
                           </span>
                       )}
                       <div className="flex gap-2 text-[11px] text-gray-500 dark:text-gray-500">
                           {book.publicationYear > 0 && <span>{book.publicationYear}</span>}
                           {book.pages > 0 && <span>• {book.pages} págs.</span>}
                       </div>
                       {book.category && (
                           <span className="italic text-gray-500 dark:text-gray-500 truncate" title="Categoría">
                               {book.category}
                           </span>
                       )}
                       {book.language && (
                           <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                               {book.language}
                           </span>
                       )}
                       <span className="text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                           Ubic: {book.ubicacion || 'Sin Ubic.'}
                       </span>
                   </div>
               </td>

               {/* 5. Stock */}
               <td className="px-2 py-2 align-top text-center">
                   <div className="flex items-center justify-center gap-1">
                       <button 
                         onClick={() => onStockUpdate(book, -1)}
                         className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 text-red-600 dark:hover:bg-red-900/30 dark:text-red-400 transition-colors"
                       >
                           -
                       </button>
                       <span className={`font-bold w-6 text-center ${book.stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                           {book.stock}
                       </span>
                       <button 
                         onClick={() => onStockUpdate(book, 1)}
                         className="w-5 h-5 flex items-center justify-center rounded hover:bg-green-100 text-green-600 dark:hover:bg-green-900/30 dark:text-green-400 transition-colors"
                       >
                           +
                       </button>
                   </div>
               </td>

               {/* 6. Price */}
               <td className="px-2 py-2 align-top text-right">
                   <div className="font-bold text-gray-900 dark:text-white">
                       {book.price.toFixed(2)}€
                   </div>
                   {book.originalPrice !== undefined && book.originalPrice > book.price && (
                       <span className="block text-xs text-gray-400 line-through">
                           {book.originalPrice.toFixed(2)}€
                       </span>
                   )}
               </td>

               {/* 7. Actions */}
               <td className="px-2 py-2 align-top text-right">
                   <div className="flex flex-col items-end gap-1">
                       <div className="flex gap-1">
                           <button 
                             onClick={() => onExpressOrder(book)}
                             className="p-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 dark:text-yellow-400 transition-colors"
                             title="Pedido Express"
                           >
                               <Barcode size={14} />
                           </button>
                       </div>
                       <div className="flex gap-1">
                           <button 
                             onClick={() => onEdit(book)}
                             className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors"
                             title="Editar"
                           >
                               <Edit2 size={14} />
                           </button>
                           <button 
                             onClick={() => onDelete(book.id)}
                             className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 transition-colors"
                             title="Eliminar"
                           >
                               <Trash2 size={14} />
                           </button>
                       </div>
                   </div>
               </td>
             </tr>
           ))}
           
           {books.length === 0 && (
               <tr>
                   <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                       No se encontraron libros.
                   </td>
               </tr>
           )}
        </tbody>
      </table>

      {/* Fixed Code Projection Overlay */}
      {hoveredCode && (
        <div 
            className="fixed z-[9999] bg-white dark:bg-gray-900 border-2 border-blue-600 shadow-2xl rounded-2xl p-6 pointer-events-none animate-in fade-in zoom-in-95 duration-200 pb-8 pr-12 min-w-[max-content]"
            style={{ 
                top: hoveredCode.top - 10,
                left: hoveredCode.left,
            }}
        >
            <span className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mb-1.5 block">Código Legacy</span>
            <span className="text-6xl font-black text-gray-900 dark:text-white tracking-widest font-mono leading-none block">
                {hoveredCode.code}
            </span>
        </div>
      )}

      {/* Fixed Description Tooltip Overlay */}
      {hoveredDescription && (
        <div 
            className="fixed z-[9999] bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 max-w-sm pointer-events-none animate-in fade-in zoom-in-95 duration-200"
            style={{ 
                top: hoveredDescription.top,
                left: hoveredDescription.left + 24, // Shift right of icon
            }}
        >
            <div className="font-semibold mb-1 border-b border-gray-700 pb-1">Descripción</div>
            <p className="leading-relaxed">{hoveredDescription.text}</p>
        </div>
      )}
    </div>
  );
}
