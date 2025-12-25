import { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  User,
  MapPin,
  CreditCard,
  Building2, 
  School
} from "lucide-react";
import { Libro, Cliente } from "../../../types";
import {
  crearPedido,
  calcularTotalesPedido,
} from "../../../services/pedidoService";
import { obtenerLibros, buscarLibros } from "../../../services/libroService";
import { getClientes, crearCliente } from "../../../services/clienteService";
import { sendOrderConfirmationEmail, type OrderEmailData } from "../../../services/emailService";
import { useAuth } from "../../../context/AuthContext";
import { useSettings } from "../../../context/SettingsContext";
import "../../../styles/components/CrearPedido.css";

interface CrearPedidoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LineaPedido {
  id: string;
  libro_id?: number;
  libro?: Libro;
  cantidad: number;
  precio_unitario: number;
  es_externo?: boolean;
  nombre_externo?: string;
  url_externa?: string;
}

export default function CrearPedido({
  isOpen,
  onClose,
  onSuccess,
}: CrearPedidoProps) {
  const { user } = useAuth();
  const { formatPrice, settings } = useSettings();
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [loading, setLoading] = useState(false);

  // ... (rest of the component state)

  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);
  const [showClienteSuggestions, setShowClienteSuggestions] = useState(false);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const clienteAutocompleteRef = useRef<HTMLDivElement>(null);
  
  // New state for manual client entry
  const [clienteInputMode, setClienteInputMode] = useState<'search' | 'manual'>('search');
  const [saveClient, setSaveClient] = useState(true);
  const [manualClientData, setManualClientData] = useState({
      nombre: '',
      apellidos: '',
      email: '',
      nif: '',
      tipo: 'particular' as 'particular' | 'empresa' | 'institucion',
      telefono: '',
      direccion: '',
      ciudad: '',
      codigo_postal: '',
      provincia: '',
      pais: ''
  });

  const [libroSearch, setLibroSearch] = useState("");
  const [libroSeleccionado, setLibroSeleccionado] = useState<Libro | null>(
    null
  );
  const [showLibroSuggestions, setShowLibroSuggestions] = useState(false);
  const [filteredLibros, setFilteredLibros] = useState<Libro[]>([]);
  const libroAutocompleteRef = useRef<HTMLDivElement>(null);

  // Advanced Book Search State
  const [bookSearchMode, setBookSearchMode] = useState<'simple' | 'advanced'>('simple');
  const [advancedBookFilters, setAdvancedBookFilters] = useState({
      codigo: '',
      titulo: '',
      autor: '',
      isbn: '',
      editorial: '', // Note: Editorial search in service is via 'full' mode text or we might need specific logic if we want exact field.
      // For now, let's map 'editorial' to general search or handle it if service supports strict editorial string match without ID.
      // The current service update didn't explicitly add 'editorial' string filter, but 'full' search checks editorial.
      // However, if we want strict field, we might need to rely on 'full' search behavior or update service again.
      // Let's use 'titulo', 'autor', 'isbn', and for 'editorial' + 'codigo' we might need to be clever.
      // Actually, 'codigo' in advanced can map to 'search' param in service (default mode).
  });

  const [tipo, setTipo] = useState("perez_galdos");
  const [metodoPago, setMetodoPago] = useState("tarjeta");
  const [direccionEnvio, setDireccionEnvio] = useState("");
  const [transportista, setTransportista] = useState("");
  const [tracking, setTracking] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [cantidadTemporal, setCantidadTemporal] = useState(1);
  const [tipoProducto, setTipoProducto] = useState<"interno" | "externo">(
    "interno"
  );

  const [nombreExterno, setNombreExterno] = useState("");
  const [urlExterna, setUrlExterna] = useState("");
  const [precioExterno, setPrecioExterno] = useState(0);

  const [modoEntrada, setModoEntrada] = useState<"manual" | "pegar">("manual");
  const [plataformaOrigen, setPlataformaOrigen] = useState<'iberlibro' | 'uniliber' | null>(null);
  const [datosPegados, setDatosPegados] = useState("");

  useEffect(() => {
    if (isOpen) {
      cargarClientes();

    }
  }, [isOpen]);

  // ... (useEffects for filtering)

  useEffect(() => {
    if (clienteSearch.trim()) {
      const filtered = clientes
        .filter((cliente) => {
          const fullName = `${cliente.nombre || ''} ${cliente.apellidos || ''}`.toLowerCase();
          const search = clienteSearch.toLowerCase();
          return (
            fullName.includes(search) ||
            cliente.email?.toLowerCase().includes(search) ||
            cliente.nif?.toLowerCase().includes(search)
          );
        })
        .filter((c) => c.activo);
      setFilteredClientes(filtered);
    } else {
      setFilteredClientes(clientes.filter((c) => c.activo));
    }
  }, [clienteSearch, clientes]);

  const searchLibros = async () => {
      setLoading(true);
      try {
          const filters: any = {};
          
          if (bookSearchMode === 'simple') {
              if (!libroSearch.trim()) {
                  setFilteredLibros([]);
                  setLoading(false);
                  return;
              }
              filters.search = libroSearch;
              filters.searchMode = 'default'; 
          } else {
              if (advancedBookFilters.codigo) {
                  filters.search = advancedBookFilters.codigo;
                  filters.searchMode = 'default';
              }
              
              if (advancedBookFilters.titulo) filters.titulo = advancedBookFilters.titulo;
              if (advancedBookFilters.autor) filters.autor = advancedBookFilters.autor;
              if (advancedBookFilters.isbn) filters.isbn = advancedBookFilters.isbn;
          }

          const response = await obtenerLibros(1, 20, filters);
          
          // Map Book (service) to Libro (component state)
          // Note: Libro expects numeric ID, Book provides string ID. 
          // We assume Book ID is parseable to number for legacy compatibility or we update Component to handle string.
          // Given the component uses 'libro.id' for 'linea.libro_id' (number), we MUST parse.
          const mappedLibros: Libro[] = response.data.map(b => ({
              id: parseInt(b.id),
              titulo: b.title,
              autor: b.author,
              isbn: b.isbn || '',
              precio: b.price,
              stock: b.stock,
              imagen_url: b.coverImage,
              // Minimal required fields for UI
              editorial: { id: 0, nombre: b.publisher }, 
              categoria_id: 0, 
              legacy_id: b.code
          } as any));

          setFilteredLibros(mappedLibros);
          setShowLibroSuggestions(true);
      } catch (error) {
        console.error("Error searching books:", error);
      } finally {
        setLoading(false);
      }
  };

  // Remove debounce useEffect for search
  useEffect(() => {
     // Optional: Clear suggestions if inputs empty?
  }, [libroSearch, advancedBookFilters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        clienteAutocompleteRef.current &&
        !clienteAutocompleteRef.current.contains(event.target as Node)
      ) {
        setShowClienteSuggestions(false);
      }
      if (
        libroAutocompleteRef.current &&
        !libroAutocompleteRef.current.contains(event.target as Node)
      ) {
        setShowLibroSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cargarClientes = async () => {
    try {
      const data = await getClientes();
      setClientes(data);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };



  // ... (handlers)

  const handleSelectCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setClienteSearch(`${cliente.nombre} ${cliente.apellidos}`);
    setDireccionEnvio(cliente.direccion || "");
    setShowClienteSuggestions(false);
  };

  const handleSelectLibro = (libro: Libro) => {
    setLibroSeleccionado(libro);
    setLibroSearch(libro.titulo);
    setShowLibroSuggestions(false);
  };

  const agregarLinea = () => {
    if (cantidadTemporal <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }

    if (tipoProducto === "interno") {
      if (!libroSeleccionado) {
        alert("Seleccione un libro de las sugerencias");
        return;
      }

      const nuevaLinea: LineaPedido = {
        id: Date.now().toString(),
        libro_id: libroSeleccionado.id,
        libro: libroSeleccionado,
        cantidad: cantidadTemporal,
        precio_unitario: libroSeleccionado.precio,
        es_externo: false,
      };

      setLineas([...lineas, nuevaLinea]);
      setLibroSeleccionado(null);
      setLibroSearch("");
    } else {
      if (!nombreExterno.trim()) {
        alert("Ingrese el nombre del producto");
        return;
      }

      if (!urlExterna.trim()) {
        alert("Ingrese la URL de compra");
        return;
      }

      if (precioExterno <= 0) {
        alert("El precio debe ser mayor a 0");
        return;
      }

      const nuevaLinea: LineaPedido = {
        id: Date.now().toString(),
        cantidad: cantidadTemporal,
        precio_unitario: precioExterno,
        es_externo: true,
        nombre_externo: nombreExterno,
        url_externa: urlExterna,
      };

      setLineas([...lineas, nuevaLinea]);
      setNombreExterno("");
      setUrlExterna("");
      setPrecioExterno(0);
    }

    setCantidadTemporal(1);
  };

  const eliminarLinea = (lineaId: string) => {
    setLineas(lineas.filter((l) => l.id !== lineaId));
  };

  const actualizarCantidad = (lineaId: string, cantidad: number) => {
    if (cantidad <= 0) return;
    setLineas(lineas.map((l) => (l.id === lineaId ? { ...l, cantidad } : l)));
  };

  const actualizarPrecio = (lineaId: string, precio: number) => {
    if (precio < 0) return;
    setLineas(
      lineas.map((l) =>
        l.id === lineaId ? { ...l, precio_unitario: precio } : l
      )
    );
  };

  const parsearIberLibro = async (texto: string) => {
    setLoading(true);
    try {
        const cleanText = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // --- 1. Extract Header Info (Client, Address, Phone, IDs) ---
        let nombre = '';
        let direccion = '';
        let ciudad = '';
        let cp = '';
        let provincia = '';
        let pais = '';
        let telefono = '';
        
        let orderId = '';
        let abeBooksId = '';
        let fechaTramitado = '';
        let fechaEstimada = '';

        // Helper to find lines between start marker and end marker
        const getLinesBetween = (startRegex: RegExp, endRegex: RegExp) => {
             const startMatch = cleanText.match(startRegex);
             if (!startMatch || typeof startMatch.index === 'undefined') return [];
             const startIndex = startMatch.index + startMatch[0].length;
             
             const restText = cleanText.slice(startIndex);
             const endMatch = restText.match(endRegex);
             const endOffset = endMatch && typeof endMatch.index !== 'undefined' ? endMatch.index : restText.length;
             
             return restText.slice(0, endOffset).trim().split('\n').map(l => l.trim()).filter(Boolean);
        };

        // Parse "Para:" block for address
        const addressBlockLines = getLinesBetween(/^Para:/m, /Albarán de Envío|Phone:|Nº de pedido:/m);
        
        if (addressBlockLines.length > 0) {
            nombre = addressBlockLines[0]; // First line is name
            const addressLines = addressBlockLines.slice(1);
            direccion = addressLines.join(', '); // Full address string
            
            if (addressLines.length > 0) {
               const last = addressLines[addressLines.length - 1];
               if (last.match(/Spain|España/i)) pais = 'España';
               else if (last.match(/France|Francia/i)) pais = 'Francia';
               else pais = last; 
            }
 
            for (const line of addressLines) {
                 const cpMatch = line.match(/\b\d{5}\b/);
                 if (cpMatch) {
                     cp = cpMatch[0];
                     ciudad = line.replace(cp, '').trim(); 
                     break;
                 }
            }
        }

        const phoneMatch = cleanText.match(/Phone:\s*([\d\s\-\+\(\)]+)/i);
        if (phoneMatch) telefono = phoneMatch[1].trim();

        const idMatch = cleanText.match(/Nº de pedido:\s*(\d+)/i);
        if (idMatch) orderId = idMatch[1];

        const abeIdMatch = cleanText.match(/Nº de pedido AbeBooks:\s*(\d+)/i);
        if (abeIdMatch) abeBooksId = abeIdMatch[1];
        
        const tramitadoMatch = cleanText.match(/Tramitado:\s*([^\n]+)/i);
        if (tramitadoMatch) fechaTramitado = tramitadoMatch[1].trim();

        const estimadaMatch = cleanText.match(/Fecha estimada de entrega:\s*([^\n]+)/i);
        if (estimadaMatch) fechaEstimada = estimadaMatch[1].trim();

        // --- 2. Extract Items ---
        const tempItems: { title: string, author: string, ref: string, quantity: number }[] = [];
        
        const splitByEst = cleanText.split(/Fecha estimada de entrega:[^\n]+\n/);
        const contentAfterHeader = splitByEst.length > 1 ? splitByEst[1] : '';

        const lines = contentAfterHeader.split('\n');
        let descLines: string[] = [];
        let capturingDesc = false;

        for (const line of lines) {
             const trimLine = line.trim();
             if (!trimLine) continue;
             if (trimLine.startsWith('________________')) continue;
             if (trimLine.match(/^Artículo\s+Autor/)) continue; 
             if (trimLine.startsWith('Por favor, guarde')) break; 

             const itemMatch = trimLine.match(/^\d+\s+(.+)\s+(\d+)$/);
             
             if (itemMatch) {
                 let author = '';
                 let title = '';
                 let ref = itemMatch[2];
                 const middle = itemMatch[1];
                 
                 if (texto.includes('\t')) {
                     const parts = trimLine.split('\t').filter(p => p.trim());
                     if (parts.length >= 3) {
                         author = parts[1] || '';
                         title = parts[2] || '';
                         ref = parts[parts.length-1] || ref;
                     } else {
                         title = middle;
                     }
                 } else {
                     const gapSplit = middle.split(/\s{2,}/);
                     if (gapSplit.length >= 2) {
                         author = gapSplit[0];
                         title = gapSplit[1];
                     } else {
                         title = middle;
                     }
                 }

                 tempItems.push({
                     title,
                     author,
                     ref, // Legacy Code
                     quantity: 1
                 });
                 capturingDesc = false;
             } else if (trimLine === 'Descripción:') {
                 capturingDesc = true;
             } else if (capturingDesc) {
                 if (trimLine.match(/^Artículo\s+/)) {
                     capturingDesc = false;
                 } else {
                     descLines.push(trimLine);
                 }
             }
        }
        
        const description = descLines.join('\n');
        
        // --- 3. Resolve Items against DB (Async) ---
        const finalItems: LineaPedido[] = [];

        for (const item of tempItems) {
            let foundBook: Libro | null = null;
            if (item.ref) {
                // Search by legacy code
                // Note: buscarLibros returns fuzzy matches, we must filter for exact legacy_id if possible
                const results = await buscarLibros(item.ref);
                const exactMatch = results.find(b => b.code === item.ref);
                
                if (exactMatch) {
                     // Map to component Libro type
                     foundBook = {
                        id: parseInt(exactMatch.id),
                        titulo: exactMatch.title,
                        autor: exactMatch.author,
                        isbn: exactMatch.isbn || '',
                        precio: exactMatch.price,
                        stock: exactMatch.stock,
                        imagen_url: exactMatch.coverImage,
                        editorial: { id: 0, nombre: exactMatch.publisher }, 
                        categoria_id: 0, 
                        legacy_id: exactMatch.code
                     } as any;
                }
            }

            if (foundBook) {
                // Internal Item
                finalItems.push({
                    id: `int-${Date.now()}-${finalItems.length}`,
                    libro_id: foundBook.id,
                    libro: foundBook,
                    cantidad: item.quantity,
                    precio_unitario: foundBook.precio, // Uses DB price
                    es_externo: false
                });
            } else {
                // External Item
                finalItems.push({
                     id: `ab-${Date.now()}-${finalItems.length}`,
                     cantidad: item.quantity,
                     precio_unitario: 0, 
                     es_externo: true,
                     nombre_externo: `${item.title}${item.author ? ' - ' + item.author : ''} (Ref: ${item.ref})`,
                     url_externa: ''
                });
            }
        }

        // --- 4. Populate Form ---
        let finalObservaciones = '';
        if (abeBooksId) finalObservaciones += `AbeBooks ID: ${abeBooksId}\n`;
        if (orderId) finalObservaciones += `Pedido Nº: ${orderId}\n`;
        if (fechaTramitado) finalObservaciones += `Fecha: ${fechaTramitado}\n`;
        if (fechaEstimada) finalObservaciones += `Entrega Estimada: ${fechaEstimada}\n`;
        if (description) finalObservaciones += `\nDescripción:\n${description}`;

        setClienteSearch('');
        setManualClientData({
            nombre: nombre || '',
            apellidos: '',
            email: '',
            nif: '',
            tipo: 'particular',
            telefono: telefono,
            direccion: direccion,
            ciudad: ciudad,
            codigo_postal: cp,
            provincia: provincia,
            pais: pais || 'España'
        });
        setDireccionEnvio(direccion);
        setObservaciones(finalObservaciones);
        setLineas(finalItems);

        setDatosPegados("");
        setPlataformaOrigen(null);
        setClienteInputMode('manual');
        setModoEntrada("manual");

        setTimeout(() => setClienteInputMode('manual'), 100);
        
        const internalCount = finalItems.filter(i => !i.es_externo).length;
        alert(`Datos de IberLibro procesados.\nCliente: ${nombre}\nItems: ${finalItems.length} (${internalCount} encontrados en catálogo)`);
        
    } catch (e: any) {
        console.error('Error parsing IberLibro:', e);
        alert('Error al procesar datos de IberLibro: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  const parsearDatosPegados = async () => {
    if (!datosPegados.trim()) {
      alert("Por favor, pega la información del pedido");
      return;
    }

    if (plataformaOrigen === 'uniliber') {
        parsearUniliber(datosPegados);
        return;
    }
    
    if (plataformaOrigen === 'iberlibro') {
        await parsearIberLibro(datosPegados);
        return;
    }

    // Lógica por defecto / Genérica (IberLibro u otros)
    try {
      const lineasTexto = datosPegados.split("\n").filter((l) => l.trim());
      // ... (Rest of default logic existing in previous file)
      // Since I am replacing the function, I must include the original logic here if I don't want to break 'Default' behavior if platform is null?
      // But looking at UI, user must select platform now? 
      // The original code handled generics. Let's keep the generic logic as fallback or "Other".
      
      // ... [The original logic body for generic parsing] ...
      // To save tokens and avoid copy-pasting the massive block if not needed, 
      // I will assume the user mainly uses the specific parsers now.
      // But for safety, I will include a shortened version or the full original block if I can see it.
      // I viewed the file, so I have the original block. I will restore it.
      
      let clienteInfo = "";
      let direccion = "";
      let productosTexto: string[] = [];
      let metodoPagoTexto = "";
      let transportistaTexto = "";
      let trackingTexto = "";
      let observacionesTexto = "";

      for (const linea of lineasTexto) {
        const lineaLower = linea.toLowerCase();

        if (lineaLower.includes("cliente:") || lineaLower.includes("nombre:")) {
          clienteInfo = linea.split(":")[1]?.trim() || "";
        } else if (
          lineaLower.includes("dirección:") ||
          lineaLower.includes("direccion:")
        ) {
          direccion = linea.split(":")[1]?.trim() || "";
        } else if (
          lineaLower.includes("teléfono:") ||
          lineaLower.includes("telefono:") ||
          lineaLower.includes("tel:")
        ) {
          // Teléfono detectado pero no usado por ahora
        } else if (
          lineaLower.includes("email:") ||
          lineaLower.includes("correo:")
        ) {
          // Email detectado pero no usado por ahora
        } else if (
          lineaLower.includes("método de pago:") ||
          lineaLower.includes("metodo de pago:") ||
          lineaLower.includes("pago:")
        ) {
          metodoPagoTexto = linea.split(":")[1]?.trim().toLowerCase() || "";
        } else if (
          lineaLower.includes("transportista:") ||
          lineaLower.includes("envío:") ||
          lineaLower.includes("envio:")
        ) {
          transportistaTexto = linea.split(":")[1]?.trim() || "";
        } else if (
          lineaLower.includes("tracking:") ||
          lineaLower.includes("seguimiento:")
        ) {
          trackingTexto = linea.split(":")[1]?.trim() || "";
        } else if (
          lineaLower.includes("observaciones:") ||
          lineaLower.includes("notas:")
        ) {
          observacionesTexto = linea.split(":")[1]?.trim() || "";
        } else if (
          lineaLower.includes("producto:") ||
          lineaLower.includes("libro:") ||
          lineaLower.includes("título:") ||
          lineaLower.includes("titulo:")
        ) {
          productosTexto.push(linea);
        } else if (linea.match(/^\d+[\s\-x]+/)) {
          productosTexto.push(linea);
        }
      }

      if (clienteInfo) {
        setClienteSearch(clienteInfo);
      }

      if (direccion) {
        setDireccionEnvio(direccion);
      }

      if (metodoPagoTexto) {
        if (metodoPagoTexto.includes("tarjeta")) setMetodoPago("tarjeta");
        else if (metodoPagoTexto.includes("paypal")) setMetodoPago("paypal");
        else if (metodoPagoTexto.includes("transferencia"))
          setMetodoPago("transferencia");
        else if (metodoPagoTexto.includes("reembolso"))
          setMetodoPago("reembolso");
        else if (metodoPagoTexto.includes("efectivo") || metodoPagoTexto.includes("señal"))
          setMetodoPago("efectivo");
      }

      if (transportistaTexto) {
        const transportistaLower = transportistaTexto.toLowerCase();
        if (transportistaLower.includes("asm")) setTransportista("ASM");
        else if (transportistaLower.includes("gls")) setTransportista("GLS");
        else if (transportistaLower.includes("envialia"))
          setTransportista("Envialia");
        else setTransportista(transportistaTexto);
      }

      if (trackingTexto) {
        setTracking(trackingTexto);
      }

      if (observacionesTexto) {
        setObservaciones(observacionesTexto);
      }

      const nuevasLineas: LineaPedido[] = [];
      productosTexto.forEach((productoTexto, index) => {
        const match = productoTexto.match(
          /^(\d+)[\s\-x]+(.+?)(?:\s+[-–]\s+)?(?:(\d+[.,]\d{1,2})\s*€?)?$/i
        );

        if (match) {
          const cantidad = parseInt(match[1]);
          const nombre = match[2].trim();
          const precio = match[3] ? parseFloat(match[3].replace(",", ".")) : 0;

          nuevasLineas.push({
            id: `temp-${Date.now()}-${index}`,
            cantidad: cantidad || 1,
            precio_unitario: precio,
            es_externo: true,
            nombre_externo: nombre,
            url_externa: "",
          });
        } else {
          const nombreProducto = productoTexto
            .replace(/^(producto:|libro:|título:|titulo:)/i, "")
            .trim();
          if (nombreProducto) {
            nuevasLineas.push({
              id: `temp-${Date.now()}-${index}`,
              cantidad: 1,
              precio_unitario: 0,
              es_externo: true,
              nombre_externo: nombreProducto,
              url_externa: "",
            });
          }
        }
      });

      setLineas(nuevasLineas);
      setModoEntrada("manual");
      setDatosPegados("");

      alert(
        `Se han parseado ${nuevasLineas.length} producto(s) (Formato Genérico).`
      );
    } catch (error) {
      console.error("Error al parsear datos:", error);
      alert(
        "Error al procesar los datos pegados."
      );
    }
  };

  const parsearUniliber = async (texto: string) => {
      setLoading(true);
      try {
          // Normalize line endings
          const cleanText = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

          const extract = (regex: RegExp) => {
              const match = cleanText.match(regex);
              return match && match[1] ? match[1].trim() : '';
          };

          // Basic Fields (expecting colon/dot separator)
          const nombre = extract(/Nombre\s*[:\.]\s*([^\n]+)/i);
          const direccion = extract(/Direcci[óo]n\s*[:\.]\s*([^\n]+)/i);
          const poblacion = extract(/Poblaci[óo]n\s*[:\.]\s*([^\n]+)/i);
          const provincia = extract(/Provincia\s*[:\.]\s*([^\n]+)/i);
          const cp = extract(/(?:C\.?\s*Postal|CP|Postal)\s*[:\.]\s*([^\n]+)/i);
          const pais = extract(/Pa[íi]s\s*[:\.]\s*([^\n]+)/i);
          const email = extract(/(?:Email|E-mail)\s*[:\.]\s*([^\n]+)/i);
          const telefono = extract(/Tel[ée]fono\s*[:\.]\s*([^\n]+)/i);
          const movil = extract(/M[óo]vil\s*[:\.]\s*([^\n]+)/i);
          const referencia = extract(/Referencia\s*[:\.]\s*([^\n]+)/i);

          // Price extraction (handling "Precio total: X" or "Precio total\nX")
          let precioTotal = 0;
          const precioMatch = cleanText.match(/Precio\s*total(?:[:\.]\s*|\s*\n\s*)([\d.,]+)/i);
          if (precioMatch && precioMatch[1]) {
             precioTotal = parseFloat(precioMatch[1].replace(',', '.'));
          }

          // Title/Author/Description Heuristic
          // everything before "Precio total" and after "Referencia"
          let titulo = '';
          let autor = '';
          let descripcionLines: string[] = [];

          const parts = cleanText.split(/Precio\s*total/i);
          if (parts.length > 0) {
              let contentBlock = parts[0];
              // If Referencia exists, take content after it
              if (referencia) {
                  const refSplit = contentBlock.split(/Referencia\s*[:\.]\s*[^\n]+\n?/i);
                  if (refSplit.length > 1) contentBlock = refSplit[1];
              }

              // Split lines and exclude keys
              const lines = contentBlock.split('\n').map(l => l.trim()).filter(l => l);
              const infoLines = lines.filter(l => !l.match(/^(?:Nombre|Direcci|Poblaci|Provincia|Pa[íi]s|Email|Tel|M[óo]vil|Referencia)/i));
              
              if (infoLines.length > 0) {
                  titulo = infoLines[0]; // Assume first line is title
                  if (infoLines.length > 1) autor = infoLines[1]; // Second is author
                  if (infoLines.length > 2) descripcionLines = infoLines.slice(2);
              }
          }

          // Set Client Data
          setClienteSearch(''); // Clear search input
          setManualClientData({
              nombre: nombre || '',
              apellidos: '',
              email: email || '',
              nif: '',
              tipo: 'particular',
              telefono: movil || telefono || '',
              direccion: direccion || '',
              ciudad: poblacion || '',
              codigo_postal: cp || '',
              provincia: provincia || '',
              pais: pais || 'España'
          });
          setDireccionEnvio(`${direccion}, ${cp} ${poblacion}, ${provincia}`);
          
          // Set Description
          const descripcion = descripcionLines.join('\n').trim();
          if (descripcion) setObservaciones(descripcion);

          // --- Book Lookup by Ref ---
          const items: LineaPedido[] = [];
          let foundBook: Libro | null = null;
          
          if (referencia) {
               const results = await buscarLibros(referencia);
               const exactMatch = results.find(b => b.code === referencia);
               
               if (exactMatch) {
                    foundBook = {
                       id: parseInt(exactMatch.id),
                       titulo: exactMatch.title,
                       autor: exactMatch.author,
                       isbn: exactMatch.isbn || '',
                       precio: exactMatch.price,
                       stock: exactMatch.stock,
                       imagen_url: exactMatch.coverImage,
                       editorial: { id: 0, nombre: exactMatch.publisher }, 
                       categoria_id: 0, 
                       legacy_id: exactMatch.code
                    } as any;
               }
          }

          // Set Line Item
          if (foundBook) {
              items.push({
                   id: `int-uni-${Date.now()}`,
                   libro_id: foundBook.id,
                   libro: foundBook,
                   cantidad: 1,
                   precio_unitario: foundBook.precio, 
                   es_externo: false
              });
          } else if (titulo) {
             items.push({
                id: `uni-${Date.now()}`,
                cantidad: 1,
                precio_unitario: precioTotal > 0 ? precioTotal : 0, 
                es_externo: true,
                nombre_externo: `${titulo} ${autor ? '- ' + autor : ''} (Ref: ${referencia})`,
                url_externa: ''
             });
          }

          setLineas(items);
          setDatosPegados("");
          setClienteInputMode('manual');
          setModoEntrada("manual");
          
          // Force manual mode with delay to ensure UI update after re-render
          setTimeout(() => {
              setClienteInputMode('manual');
          }, 100);

          const foundMsg = foundBook ? `\n📕 Libro encontrado en catálogo: ${foundBook.titulo}` : '';
          alert(`Datos de Uniliber procesados.\nCliente detectado: "${nombre}"${foundMsg}`); 

      } catch (err) {
          console.error(err);
          alert("Error al procesar datos de Uniliber.");
      } finally {
          setLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for unparsed data
    if (modoEntrada === 'pegar' && datosPegados.trim().length > 0) {
        alert("⚠️ Has pegado datos pero no los has analizado.\n\nPor favor, haz clic en el botón 'Analizar y Rellenar Formulario' (icono de lupa) que está debajo del cuadro de texto para procesar los datos antes de guardar.");
        return;
    }

    let finalClienteId = clienteSeleccionado?.id;
    let effectiveMode = clienteInputMode;

    // Robustez: Si estamos en search pero tenemos datos manuales cargados (e.g. desde pegar) y no hay cliente seleccionado,
    // asumimos que el usuario quiere crear el cliente manual.
    if (effectiveMode === 'search' && !finalClienteId && manualClientData.nombre.trim()) {
        effectiveMode = 'manual';
    }

    // Handle Manual Client Creation
    if (effectiveMode === 'manual') {
        if (!manualClientData.nombre.trim()) {
            alert("El nombre del cliente es obligatorio");
            return;
        }

        setLoading(true);
        try {
            const newClient = await crearCliente({
                ...manualClientData,
                activo: saveClient, // If not saving, mark inactive
                notas: saveClient ? '' : 'Cliente temporal creado desde Crear Pedido',
                direccion: direccionEnvio, // Use shipping address as client address
                ciudad: '', // Optional: extract from address if possible or leave empty
                codigo_postal: '',
                provincia: '',
                pais: 'España'
            });

            if (newClient) {
                finalClienteId = newClient.id;
            } else {
                throw new Error("No se pudo crear el cliente temporal");
            }
        } catch (err: any) {
             console.error("Error creating manual client:", err);
             alert("Error al registrar el cliente: " + err.message);
             setLoading(false);
             return;
        }
    } else {
        if (!finalClienteId) {
            alert(`Debe seleccionar un cliente (Modo: ${clienteInputMode}, Manual: "${manualClientData.nombre}")`);
            return;
        }
    }

    if (lineas.length === 0) {
      alert("Agregue al menos un producto al pedido");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const detalles = lineas.map((linea) => {
        if (linea.es_externo) {
          return {
            cantidad: linea.cantidad,
            precio_unitario: linea.precio_unitario,
            nombre_externo: linea.nombre_externo,
            url_externa: linea.url_externa,
          };
        } else {
          return {
            libro_id: linea.libro_id!,
            cantidad: linea.cantidad,
            precio_unitario: linea.precio_unitario,
          };
        }
      });

      if (!user) {
        alert("Error: Usuario no autenticado");
        setLoading(false);
        return;
      }

      const pedido = await crearPedido({
        usuario_id: user.id,
        cliente_id: finalClienteId,
        tipo,
        metodo_pago: metodoPago,
        direccion_envio: direccionEnvio || undefined,
        transportista: transportista || undefined,
        tracking: tracking || undefined,
        observaciones: observaciones || undefined,
        detalles,
      });

      if (pedido) {
        // --- Email Notification Logic (Resend) ---
        const clientEmail = (clienteSeleccionado?.email || manualClientData.email || '').trim();
        const clientName = clienteSeleccionado 
          ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellidos || ''}`.trim()
          : `${manualClientData.nombre} ${manualClientData.apellidos}`.trim();
        
        // Send email if customer has email
        if (clientEmail) {
          const orderEmailData: OrderEmailData = {
            orderId: String(pedido.id),
            customerEmail: clientEmail,
            customerName: clientName,
            items: lineas.map(l => ({
              title: l.es_externo ? (l.nombre_externo || 'Producto externo') : (l.libro?.titulo || 'Libro sin título'),
              quantity: l.cantidad,
              price: l.precio_unitario
            })),
            subtotal: subtotal,
            tax: iva,
            taxRate: settings.billing.taxRate,
            shipping: 0, // Add shipping cost if available
            total: total,
            shippingAddress: direccionEnvio || 'Sin dirección especificada'
          };

          // Send email asynchronously (don't block order creation)
          sendOrderConfirmationEmail(orderEmailData)
            .then(result => {
              if (result.success) {
                console.log('✅ Email de confirmación enviado correctamente');
              } else {
                console.error('❌ Error al enviar email:', result.error);
              }
            })
            .catch(err => {
              console.error('❌ Excepción al enviar email:', err);
            });

          alert(`Pedido #${pedido.id} creado correctamente.\n\nSe enviará un email de confirmación a: ${clientEmail}`);
        } else {
          alert(`Pedido #${pedido.id} creado correctamente.\n\n⚠️ El cliente no tiene email. No se enviará confirmación automática.`);
        }

        resetForm();
        onSuccess();
        onClose();
      } else {
        alert("Error al crear el pedido");
      }
    } catch (error: any) {
      console.error("Error:", error);
      alert("Error al crear el pedido: " + (error.message || JSON.stringify(error)));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setClienteSearch("");
    setClienteSeleccionado(null);
    setClienteInputMode('search');
    setManualClientData({ 
        nombre: '', 
        apellidos: '', 
        email: '', 
        nif: '', 
        tipo: 'particular',
        telefono: '',
        direccion: '',
        ciudad: '',
        codigo_postal: '',
        provincia: '',
        pais: ''
    });
    setSaveClient(true);
    setTipo("perez_galdos");
    setMetodoPago("tarjeta");
    setDireccionEnvio("");
    setTransportista("");
    setTracking("");
    setObservaciones("");
    setLineas([]);
    setLibroSearch("");
    setLibroSeleccionado(null);
    setCantidadTemporal(1);
    setTipoProducto("interno");
    setNombreExterno("");
    setUrlExterna("");
    setPrecioExterno(0);
  };

  const taxRate = settings.billing.taxRate / 100; // Convert percentage to decimal
  const { subtotal, iva, total } = calcularTotalesPedido(
    lineas.map((l) => ({
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
    })),
    taxRate
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-crear-pedido" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <ShoppingCart size={24} />
            <h2>Crear Nuevo Pedido</h2>
          </div>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div
            className="form-section"
            style={{
              borderBottom: "2px solid #e5e7eb",
              paddingBottom: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div className="section-header" style={{ marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
                Modo de Entrada de Datos
              </h3>
            </div>

            <div className="mode-selector">
              <button
                type="button"
                onClick={() => setModoEntrada("manual")}
                className={`btn-mode ${modoEntrada === "manual" ? "active" : ""}`}
              >
                ✍️ Entrada Manual
              </button>
              <button
                type="button"
                onClick={() => setModoEntrada("pegar")}
                className={`btn-mode ${modoEntrada === "pegar" ? "active" : ""}`}
              >
                📋 Pegar Datos de Plataforma
              </button>
            </div>

            {modoEntrada === "pegar" && (
              <div className="paste-section">
                {!plataformaOrigen ? (
                    <div className="platform-selector" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', margin: '2rem 0' }}>
                        <button 
                            type="button" 
                            onClick={() => setPlataformaOrigen('iberlibro')}
                            className="btn-platform"
                            style={{ 
                                padding: '1rem 2rem', 
                                border: '2px solid var(--border-color)', 
                                borderRadius: '0.5rem', 
                                background: 'var(--bg-secondary)',
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                                fontWeight: 500
                            }}
                        >
                            📚 IberLibro
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setPlataformaOrigen('uniliber')}
                            className="btn-platform"
                             style={{ 
                                padding: '1rem 2rem', 
                                border: '2px solid var(--border-color)', 
                                borderRadius: '0.5rem', 
                                background: 'var(--bg-secondary)',
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                                fontWeight: 500
                            }}
                        >
                            📖 Uniliber
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button 
                                type="button" 
                                onClick={() => setPlataformaOrigen(null)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                                ← Volver
                            </button>
                            <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                {plataformaOrigen === 'iberlibro' ? 'IberLibro' : 'Uniliber'}
                            </span>
                        </div>

                        <label className="paste-label">
                          Pega aquí los datos del pedido de {plataformaOrigen === 'iberlibro' ? 'IberLibro' : 'Uniliber'}
                        </label>
                        <p className="paste-help-text">
                          Copia y pega toda la información del pedido de la plataforma. El sistema intentará extraer automáticamente los datos.
                        </p>
                        <textarea
                          value={datosPegados}
                          onChange={(e) => setDatosPegados(e.target.value)}
                          className="form-input paste-textarea"
                          rows={12}
                          placeholder={plataformaOrigen === 'iberlibro' 
                            ? "Ejemplo IberLibro:...\nCliente: Juan..." 
                            : "Ejemplo Uniliber:...\nPedido N:..."}
                        />
                        <button
                          type="button"
                          onClick={parsearDatosPegados}
                          className="btn-parse"
                        >
                          <Search size={18} />
                          Analizar y Rellenar Formulario
                        </button>
                    </>
                )}
              </div>
            )}

          </div>

          {modoEntrada === "manual" && (
            <>
              <div className="form-section">
                <div className="section-header">
                  <User size={20} />
                  <h3>Información del Cliente</h3>
                </div>

                 <div className="client-mode-selector" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                            type="radio" 
                            checked={clienteInputMode === 'search'} 
                            onChange={() => setClienteInputMode('search')}
                        />
                        Buscar Cliente Existente
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                            type="radio" 
                            checked={clienteInputMode === 'manual'} 
                            onChange={() => setClienteInputMode('manual')}
                        />
                        Introducir Datos Manualmente
                    </label>
                 </div>

                {clienteInputMode === 'search' ? (
                    <div className="form-grid">
                      <div
                        className="form-group full-width"
                        ref={clienteAutocompleteRef}
                        style={{ position: "relative" }}
                      >
                        <label>Buscar Cliente *</label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="text"
                            value={clienteSearch}
                            onChange={(e) => {
                              setClienteSearch(e.target.value);
                              setShowClienteSuggestions(true);
                              if (!e.target.value.trim()) {
                                setClienteSeleccionado(null);
                                setDireccionEnvio("");
                              }
                            }}
                            onFocus={() => setShowClienteSuggestions(true)}
                            placeholder="Buscar por nombre, email o NIF..."
                            className="form-input"
                            style={{ paddingLeft: "2.5rem" }}
                          />
                          <Search
                            size={18}
                            style={{
                              position: "absolute",
                              left: "0.75rem",
                              top: "50%",
                              transform: "translateY(-50%)",
                              pointerEvents: "none",
                            }}
                          />
                        </div>

                        {showClienteSuggestions && clienteSearch.trim() && (
                          <div className="autocomplete-suggestions">
                            {filteredClientes.length > 0 ? (
                              filteredClientes.slice(0, 8).map((cliente) => (
                                <div
                                  key={cliente.id}
                                  className="suggestion-item"
                                  onClick={() => handleSelectCliente(cliente)}
                                >
                                  <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {cliente.tipo === 'empresa' && <Building2 size={14} />}
                                    {cliente.tipo === 'institucion' && <School size={14} />}
                                    {(!cliente.tipo || cliente.tipo === 'particular') && <User size={14} />}
                                    {cliente.nombre} {cliente.tipo === 'particular' ? cliente.apellidos : ''}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.75rem",
                                      marginTop: "0.125rem",
                                      opacity: 0.8
                                    }}
                                  >
                                    {cliente.email || "Sin email"}{" "}
                                    {cliente.nif && `• NIF: ${cliente.nif}`}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div
                                style={{
                                  padding: "0.75rem",
                                  fontSize: "0.875rem",
                                  opacity: 0.8
                                }}
                              >
                                No se encontraron clientes
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                ) : (
                    <div className="manual-client-form">
                        {/* Type Selector */}
                        <div className="client-type-tabs" style={{ marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '0.5rem' }}>
                            {['particular', 'empresa', 'institucion'].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setManualClientData({...manualClientData, tipo: t as any})}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        border: 'none',
                                        background: manualClientData.tipo === t ? '#eff6ff' : 'transparent',
                                        color: manualClientData.tipo === t ? '#2563eb' : '#6b7280',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        borderRadius: '0.5rem 0.5rem 0 0',
                                        borderBottom: manualClientData.tipo === t ? '2px solid #2563eb' : '2px solid transparent'
                                    }}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>{manualClientData.tipo === 'particular' ? 'Nombre *' : (manualClientData.tipo === 'empresa' ? 'Razón Social *' : 'Nombre Institución *')}</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={manualClientData.nombre}
                                    onChange={(e) => setManualClientData({...manualClientData, nombre: e.target.value})}
                                    required 
                                />
                            </div>
                            
                            {manualClientData.tipo === 'particular' && (
                                <div className="form-group full-width">
                                    <label>Apellidos *</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={manualClientData.apellidos}
                                        onChange={(e) => setManualClientData({...manualClientData, apellidos: e.target.value})}
                                        required 
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Email</label>
                                <input 
                                    type="email" 
                                    className="form-input" 
                                    value={manualClientData.email}
                                    onChange={(e) => setManualClientData({...manualClientData, email: e.target.value})}
                                />
                            </div>

                            <div className="form-group">
                                <label>{manualClientData.tipo === 'particular' ? 'NIF/DNI' : 'CIF'}</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={manualClientData.nif}
                                    onChange={(e) => setManualClientData({...manualClientData, nif: e.target.value})}
                                />
                            </div>
                            
                            <div className="form-group full-width" style={{ marginTop: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={saveClient} 
                                        onChange={(e) => setSaveClient(e.target.checked)}
                                        style={{ width: 'auto', margin: 0 }}
                                    />
                                    <span>Guardar este cliente en la base de datos</span>
                                </label>
                                {!saveClient && <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem', marginLeft: '1.5rem' }}>El cliente se creará como inactivo solo para este pedido.</p>}
                            </div>
                        </div>
                    </div>
                )}

                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Tipo de Pedido</label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      className="form-select"
                    >
                      <option value="perez_galdos">Pérez Galdós</option>
                      <option value="galeon">Galeón</option>
                      <option value="iberlibro">IberLibro</option>
                      <option value="uniliber">Uniliber</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Método de Pago *</label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="tarjeta">Tarjeta</option>
                      <option value="paypal">PayPal</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="reembolso">Reembolso</option>
                      <option value="efectivo">Efectivo</option>
                    </select>
                  </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <MapPin size={20} />
                  <h3>Información de Envío</h3>
                </div>

                <div className="form-grid">
                    <div className="form-group full-width">
                    <label>Dirección de Envío</label>
                    <textarea
                      value={direccionEnvio}
                      onChange={(e) => setDireccionEnvio(e.target.value)}
                      className="form-textarea"
                      rows={2}
                      placeholder="Calle, número, piso, código postal, ciudad..."
                      maxLength={500}
                    />
                  </div>

                  <div className="form-group">
                    <label>Transportista</label>
                    <select
                      value={transportista}
                      onChange={(e) => setTransportista(e.target.value)}
                      className="form-select"
                    >
                      <option value="">Seleccione...</option>
                      <option value="MRW">MRW</option>
                      <option value="GLS">GLS</option>
                      <option value="Correos">Correos</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Número de Tracking</label>
                    <input
                      type="text"
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      className="form-input"
                      placeholder="Ej: 1234567890"
                      maxLength={50}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <ShoppingCart size={20} />
                  <h3>Productos del Pedido</h3>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label
                    className="label-tipo-producto"
                  >

                    Tipo de Producto
                  </label>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        value="interno"
                        checked={tipoProducto === "interno"}
                        onChange={(e) =>
                          setTipoProducto(
                            e.target.value as "interno" | "externo"
                          )
                        }
                      />
                      <span>Producto Interno (Base de Datos)</span>
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        value="externo"
                        checked={tipoProducto === "externo"}
                        onChange={(e) =>
                          setTipoProducto(
                            e.target.value as "interno" | "externo"
                          )
                        }
                      />
                      <span>Producto Externo (A pedir)</span>
                    </label>
                  </div>
                </div>

                {tipoProducto === "interno" ? (
                  <>
                  <div className="buscar-libro-container">
                      <div className="search-header">
                         <label className="label-tipo-producto">Buscar Libro (Base de Datos)</label> 
                         <button 
                            type="button" 
                            onClick={() => setBookSearchMode(prev => prev === 'simple' ? 'advanced' : 'simple')}
                            className="btn-link"
                         >
                            {bookSearchMode === 'simple' ? 'Búsqueda Avanzada' : 'Búsqueda Simple'}
                         </button>
                      </div>

                      {bookSearchMode === 'simple' ? (
                          <div className="simple-search-layout" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                              <div style={{ flex: 1, position: 'relative' }}>
                                  <div className="search-input-wrapper">
                                    <Search className="search-icon-absolute" size={18} />
                                    <input
                                      type="text"
                                      placeholder="Buscar por Código o ID..."
                                      value={libroSearch}
                                      onChange={(e) => setLibroSearch(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLibros())}
                                      className="input-search-simple"
                                      autoFocus={false}
                                    />
                                    <button 
                                        type="button"
                                        onClick={searchLibros}
                                        className="btn-search-trigger"
                                        style={{ marginLeft: '0.5rem' }}
                                    >
                                        Buscar
                                    </button>
                                  </div>
                                  
                                  {/* Suggestions (Simple Mode) */}
                                   {showLibroSuggestions && filteredLibros.length > 0 && (
                                      <div className="autocomplete-suggestions" ref={libroAutocompleteRef} style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {filteredLibros.map((libro) => (
                                          <div
                                            key={libro.id}
                                            className="suggestion-item"
                                            onClick={() => handleSelectLibro(libro)}
                                            style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: '1rem' }}
                                          >
                                            {libro.imagen_url ? (
                                                <img 
                                                    src={libro.imagen_url} 
                                                    alt={libro.titulo} 
                                                    style={{ width: '30px', height: '45px', objectFit: 'cover', borderRadius: '4px' }} 
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                />
                                            ) : (
                                                <div style={{ width: '30px', height: '45px', background: '#e2e8f0', borderRadius: '4px' }}></div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{libro.titulo}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                    {libro.autor} • Code: {libro.legacy_id || libro.id} • Stock: {libro.stock}
                                                </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                     {showLibroSuggestions && filteredLibros.length === 0 && (
                                        <div className="autocomplete-suggestions" style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                                            No se encontraron libros con los criterios de búsqueda.
                                        </div>
                                     )}
                              </div>

                              {/* Quantity & Add (Inline for Simple Mode) */}
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <label style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Cant:</label>
                                  <input
                                      type="text"
                                      inputMode="numeric"
                                      value={cantidadTemporal}
                                      onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) {
                                          setCantidadTemporal(Number(e.target.value));
                                        }
                                      }}
                                      className="form-input"
                                      placeholder="1"
                                      style={{ width: '80px', textAlign: 'center', padding: '0.5rem' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={agregarLinea}
                                    className="btn-agregar-linea"
                                    disabled={!libroSeleccionado}
                                  >
                                    <Plus size={18} />
                                    Agregar
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div style={{ position: 'relative' }}>
                              <div className="advanced-search-grid">
                                  <div className="form-group">
                                      <label style={{ fontSize: '0.75rem' }}>Código / ID</label>
                                      <input 
                                        type="text" 
                                        className="form-input" 
                                        value={advancedBookFilters.codigo}
                                        onChange={(e) => setAdvancedBookFilters(prev => ({...prev, codigo: e.target.value}))}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLibros())}
                                      />
                                  </div>
                                  <div className="form-group">
                                      <label style={{ fontSize: '0.75rem' }}>Título</label>
                                      <input 
                                        type="text" 
                                        className="form-input" 
                                        value={advancedBookFilters.titulo}
                                        onChange={(e) => setAdvancedBookFilters(prev => ({...prev, titulo: e.target.value}))}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLibros())}
                                      />
                                  </div>
                                  <div className="form-group">
                                      <label style={{ fontSize: '0.75rem' }}>Autor</label>
                                      <input 
                                        type="text" 
                                        className="form-input" 
                                        value={advancedBookFilters.autor}
                                        onChange={(e) => setAdvancedBookFilters(prev => ({...prev, autor: e.target.value}))}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLibros())}
                                      />
                                  </div>
                                  <div className="form-group">
                                      <label style={{ fontSize: '0.75rem' }}>ISBN</label>
                                      <input 
                                        type="text" 
                                        className="form-input" 
                                        value={advancedBookFilters.isbn}
                                        onChange={(e) => setAdvancedBookFilters(prev => ({...prev, isbn: e.target.value}))}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLibros())}
                                      />
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={searchLibros}
                                    className="btn-search-trigger"
                                    style={{ gridColumn: '1 / -1', marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
                                  >
                                      Buscar Libros
                                  </button>
                              </div>
                              
                              {/* Suggestions (Advanced Mode - Below Grid) */}
                               {showLibroSuggestions && filteredLibros.length > 0 && (
                                  <div className="autocomplete-suggestions" ref={libroAutocompleteRef} style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {filteredLibros.map((libro) => (
                                      <div
                                        key={libro.id}
                                        className="suggestion-item"
                                        onClick={() => handleSelectLibro(libro)}
                                        style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: '1rem' }}
                                      >
                                        {libro.imagen_url ? (
                                            <img 
                                                src={libro.imagen_url} 
                                                alt={libro.titulo} 
                                                style={{ width: '30px', height: '45px', objectFit: 'cover', borderRadius: '4px' }} 
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        ) : (
                                            <div style={{ width: '30px', height: '45px', background: '#e2e8f0', borderRadius: '4px' }}></div>
                                        )}
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{libro.titulo}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                {libro.autor} • Code: {libro.legacy_id || libro.id} • Stock: {libro.stock}
                                            </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                 {showLibroSuggestions && filteredLibros.length === 0 && (
                                    <div className="autocomplete-suggestions" style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                                        No se encontraron libros con los criterios de búsqueda.
                                    </div>
                                 )}

                              <div className="actions-row" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Cantidad:</label>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={cantidadTemporal}
                                        onChange={(e) => {
                                          if (/^\d*$/.test(e.target.value)) {
                                            setCantidadTemporal(Number(e.target.value));
                                          }
                                        }}
                                        className="form-input"
                                        style={{ width: '80px', textAlign: 'center', padding: '0.5rem' }}
                                      />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={agregarLinea}
                                    className="btn-agregar-linea"
                                    disabled={!libroSeleccionado}
                                  >
                                    <Plus size={18} />
                                    Agregar
                                  </button>
                              </div>
                          </div>
                      )}

                  </div>
                  </>
                ) : (
                  <>
                    <p
                      style={{
                        color: "#64748b",
                        fontSize: "0.875rem",
                        marginBottom: "1rem",
                      }}
                    >
                      Ingrese los detalles del producto externo que necesita
                      pedir.
                    </p>
                    <div className="agregar-producto-externo">
                      <div className="form-group" style={{ flex: 2 }}>
                        <label>Nombre del Producto *</label>
                        <input
                          type="text"
                          value={nombreExterno}
                          onChange={(e) => setNombreExterno(e.target.value)}
                          className="form-input"
                          placeholder="Nombre del libro o producto..."
                          maxLength={200}
                        />
                      </div>

                      <div className="form-group" style={{ flex: 2 }}>
                        <label>URL de Compra *</label>
                        <input
                          type="url"
                          value={urlExterna}
                          onChange={(e) => setUrlExterna(e.target.value)}
                          className="form-input"
                          placeholder="https://ejemplo.com/producto"
                          maxLength={500}
                        />
                      </div>

                      <div className="form-group" style={{ width: "120px" }}>
                        <label>Cantidad *</label>
                        <input
                          type="number"
                          min="1"
                          value={cantidadTemporal}
                          onChange={(e) =>
                            setCantidadTemporal(Number(e.target.value))
                          }
                          className="form-input"
                          placeholder="Cant."
                        />
                      </div>

                      <div className="form-group" style={{ width: "120px" }}>
                        <label>Precio *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={precioExterno}
                          onChange={(e) =>
                            setPrecioExterno(Number(e.target.value))
                          }
                          className="form-input"
                          placeholder="0.00"
                        />
                      </div>

                      <div
                        className="form-group"
                        style={{ alignSelf: "flex-end" }}
                      >
                        <button
                          type="button"
                          onClick={agregarLinea}
                          className="btn-agregar-linea"
                          disabled={
                            !nombreExterno || !urlExterna || precioExterno <= 0
                          }
                        >
                          <Plus size={18} />
                          Agregar
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {lineas.length > 0 && (
                  <>
                    <div
                      style={{
                        marginTop: "1.5rem",
                        marginBottom: "0.75rem",
                        fontWeight: 600,
                        color: "#1e293b",
                      }}
                    >
                      Productos agregados ({lineas.length})
                    </div>
                    <div className="lineas-table">
                      <div className="table-header">
                        <span>Producto</span>
                        <span>Cantidad</span>
                        <span>Precio Unit.</span>
                        <span>Subtotal</span>
                        <span></span>
                      </div>

                      {lineas.map((linea) => (
                        <div key={linea.id} className="table-row">
                          <div className="libro-nombre">
                            {linea.es_externo ? (
                              <>
                                <span className="badge-externo">EXTERNO</span>
                                <div>{linea.nombre_externo}</div>
                                {linea.url_externa && (
                                  <a
                                    href={linea.url_externa}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#3b82f6",
                                      textDecoration: "none",
                                    }}
                                  >
                                    Ver en tienda ↗
                                  </a>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="badge-interno">INTERNO</span>
                                <div>{linea.libro?.titulo}</div>
                              </>
                            )}
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={linea.cantidad}
                            onChange={(e) =>
                              actualizarCantidad(
                                linea.id,
                                Number(e.target.value)
                              )
                            }
                            className="input-cantidad"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={linea.precio_unitario}
                            onChange={(e) =>
                              actualizarPrecio(linea.id, Number(e.target.value))
                            }
                            className="input-precio"
                          />
                          <span className="subtotal-linea">
                            {formatPrice(
                              linea.cantidad * linea.precio_unitario
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => eliminarLinea(linea.id)}
                            className="btn-eliminar-linea"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {lineas.length > 0 && (
                  <div className="totales-preview">
                    <div className="total-row">
                      <span>Subtotal:</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="total-row">
                      <span>IVA ({settings.billing.taxRate}%):</span>
                      <span>{formatPrice(iva)}</span>
                    </div>
                    <div className="total-row final">
                      <span>TOTAL:</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-section">
                <div className="section-header">
                  <CreditCard size={20} />
                  <h3>Observaciones</h3>
                </div>

                <div className="form-group">
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="form-textarea"
                    rows={3}
                    placeholder="Notas adicionales sobre el pedido..."
                    maxLength={500}
                  />
                </div>
              </div>
            </>
          )}

          <div className="modal-footer">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="btn-cancelar"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-guardar"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar Pedido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
