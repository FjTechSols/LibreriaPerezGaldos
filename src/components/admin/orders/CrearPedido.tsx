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
  School,
  Truck,
  ArrowLeft
} from "lucide-react";
import { Libro, Cliente } from "../../../types";
import {
  crearPedido,
  calcularTotalesPedido,
} from "../../../services/pedidoService";
import { obtenerLibros, buscarLibros } from "../../../services/libroService";
import { getClientes, crearCliente } from "../../../services/clienteService";
import { sendOrderConfirmationEmail, sendStoreOrderRegisteredEmail, type OrderEmailData } from "../../../services/emailService";
import { useAuth } from "../../../context/AuthContext";
import { useSettings } from "../../../context/SettingsContext";
import "../../../styles/components/CrearPedido.css";
import { MessageModal } from "../../MessageModal"; // Import MessageModal

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
  
  // State for MessageModal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalConfig, setMessageModalConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'error';
    onConfirm?: () => void;
  }>({ title: '', message: '', type: 'info' });

  const showModal = (
    title: string, 
    message: string, 
    type: 'info' | 'error' = 'info',
    onConfirm?: () => void
  ) => {
    setMessageModalConfig({ title, message, type, onConfirm });
    setShowMessageModal(true);
  };
  
  // State for client creation modal
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteModalData, setClienteModalData] = useState({
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
      pais: 'España',
      notas: '',
      activo: true,
      persona_contacto: '',
      cargo: '',
      web: ''
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
  
  // Shipping Type State
  const [tipoEnvio, setTipoEnvio] = useState<'envio' | 'recogida'>('envio');

  // Signal / Deposit State
  const [esSenal, setEsSenal] = useState(false);
  const [importeSenal, setImporteSenal] = useState("");

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
          const filters: any = {
              availability: 'inStock' // Filter out 0 stock books
          };
          
          if (bookSearchMode === 'simple') {
              if (!libroSearch.trim()) {
                  setFilteredLibros([]);
                  setLoading(false);
                  return;
              }
              filters.search = libroSearch;
              filters.searchMode = 'default'; // Enable optimized numeric search 
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
              legacy_id: b.code,
              descripcion: b.description
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
      const response = await getClientes();
      setClientes(response.data || []);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const handleOpenClienteModal = () => {
    setClienteModalData({
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
      pais: 'España',
      notas: '',
      activo: true,
      persona_contacto: '',
      cargo: '',
      web: ''
    });
    setShowClienteModal(true);
  };

  const handleCloseClienteModal = () => {
    setShowClienteModal(false);
  };

  const handleSubmitClienteModal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!clienteModalData.nombre.trim()) {
      showModal('Error', 'El nombre es obligatorio', 'error');
      return;
    }

    if (clienteModalData.tipo === 'particular' && !clienteModalData.apellidos.trim()) {
      showModal('Error', 'Los apellidos son obligatorios para particulares', 'error');
      return;
    }

    try {
      const nuevoCliente = await crearCliente(clienteModalData);
      
      if (!nuevoCliente) {
        showModal('Error', 'Error al crear cliente', 'error');
        return;
      }
      
      // Reload clients list
      await cargarClientes();
      
      // Auto-select the new client
      setClienteSeleccionado(nuevoCliente);
      setClienteSearch(`${nuevoCliente.nombre} ${nuevoCliente.apellidos || ''}`);
      setDireccionEnvio(nuevoCliente.direccion || '');
      
      // Close modal
      handleCloseClienteModal();
      
      showModal('Éxito', 'Cliente creado exitosamente');
    } catch (error) {
      console.error('Error creating client:', error);
      showModal('Error', 'Error al crear cliente', 'error');
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
      showModal('Error', "La cantidad debe ser mayor a 0", 'error');
      return;
    }

    if (tipoProducto === "interno") {
      if (!libroSeleccionado) {
        showModal('Error', "Seleccione un libro de las sugerencias", 'error');
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
        showModal('Error', "Ingrese el nombre del producto", 'error');
        return;
      }

      if (!urlExterna.trim()) {
        showModal('Error', "Ingrese la URL de compra", 'error');
        return;
      }

      if (precioExterno <= 0) {
        showModal('Error', "El precio debe ser mayor a 0", 'error');
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
        console.log('--- IberLibro Raw Data (v2) ---');
        console.log(texto);
        console.log('-------------------------------');

        const cleanText = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = cleanText.split('\n');

        // --- 1. Client & Address (Block "Para:") ---
        let nombre = '';
        let calle = '';
        let cp = '';
        let ciudad = '';
        let provincia = '';
        let pais = 'España'; // Default
        
        // Find start: "Para:"
        const paraIndex = lines.findIndex(l => l.trim().match(/^Para:/i));
        let addressBlock: string[] = [];

        if (paraIndex !== -1) {
            // Read lines until we hit a "Stop Word"
            for (let i = paraIndex + 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue; 
                if (line.match(/^(?:ADUANAS|CUSTOMS|Albar[áa]n|N[°º] de pedido|Phone)/i)) break;
                addressBlock.push(line);
            }
        }

        if (addressBlock.length > 0) {
            nombre = addressBlock[0];
            const remaining = addressBlock.slice(1);

            // Parsing Strategy: Reverse / Pattern Matching
            if (remaining.length > 0) {
                // Check Last Line for Country
                const lastLine = remaining[remaining.length - 1];
                if (lastLine.match(/Spain|España|France|Alemania|Germany|Portugal|Italy|Italia|United Kingdom|Reino Unido/i)) {
                    pais = remaining.pop()!;
                }

                // Look for CP Line (Start with 4-5 digits)
                // Example: "28043 Madrid"
                const cpIndex = remaining.findIndex(l => l.match(/^\d{4,5}\b/));
                
                if (cpIndex !== -1) {
                    // Street is everything before CP
                    calle = remaining.slice(0, cpIndex).join(', ');

                    // Parse CP + City
                    const cpLine = remaining[cpIndex];
                    const cpMatch = cpLine.match(/^(\d{4,5})\s+(.+)$/);
                    if (cpMatch) {
                         cp = cpMatch[1];
                         ciudad = cpMatch[2].trim();
                    } else {
                         cp = cpLine; // Only digits?
                    }

                    // Lines AFTER CP line are usually Province or repeated City
                    // Example: "28043 Madrid" \n "Madrid"
                    const afterCp = remaining.slice(cpIndex + 1);
                    if (afterCp.length > 0) {
                        provincia = afterCp.join(', ');
                    } else {
                        // If no province line, assume province = city for Spain capitals usually
                        provincia = ciudad;
                    }

                } else {
                    // Fallback: No CP found, everything is Street
                    calle = remaining.join(', ');
                }
            }
        }

        // --- 2. Observations Block (ADUANAS -> Phone) ---
        // User wants: "encapsularlo en observaciones del envio desde aduanas/custom hasta nº phone"
        let observaciones = '';
        const aduanasIndex = lines.findIndex(l => l.match(/^(?:ADUANAS|CUSTOMS)/i));
        const phoneIndex = lines.findIndex(l => l.match(/^Phone:/i));
        
        // Fallback: If no ADUANAS, try finding "Albarán" or verify start
        const obsStartIndex = aduanasIndex !== -1 ? aduanasIndex : (paraIndex !== -1 ? paraIndex + addressLines.length + 1 : -1);
        
        if (obsStartIndex !== -1 && phoneIndex !== -1 && phoneIndex > obsStartIndex) {
            // Capture lines in between
            const obsLines = lines.slice(obsStartIndex, phoneIndex).map(l => l.trim()).filter(Boolean);
            observaciones = obsLines.join('\n');
        }

        // --- 3. Phone ---
        let telefono = '';
        if (phoneIndex !== -1) {
            const phoneMatch = lines[phoneIndex].match(/Phone:\s*([^\n]+)/i);
            if (phoneMatch) telefono = phoneMatch[1].trim();
        }

        // --- 4. Items (Reference Priority) ---
        // Look for line starting with digit, then text, ending with Reference (digits)
        // Sample: "1 BORGES... 02273892"
        const items: LineaPedido[] = [];
        let foundBook: Libro | null = null;
        
        // Find header "Artículo Autor Título" to locate start of items
        const itemHeaderIndex = lines.findIndex(l => l.match(/Art[íi]culo\s+Autor\s+T[íi]tulo/i));
        
        if (itemHeaderIndex !== -1) {
             // Process lines after header
             for (let i = itemHeaderIndex + 1; i < lines.length; i++) {
                 const line = lines[i].trim();
                 if (!line) continue;
                 if (line.startsWith('Descripción:')) break; // Stop at description
                 
                 // Regex to capture: Qty (start), Middle content, Reference (end)
                 // Assumption: Reference is numeric and at the end
                 const match = line.match(/^(\d+)\s+(.+?)\s+(\d+)$/);
                 
                 if (match) {
                     const qty = parseInt(match[1]);
                     const reference = match[3]; // The "Nº de referencia"
                     const middle = match[2]; // Author + Title mixed
                     
                     console.log(`🔎 Procesando Item Ref: ${reference}`);

                     // DB Lookup
                     const results = await buscarLibros(reference);
                     const exactMatch = results.find(b => 
                         String(b.code) === String(reference) || 
                         String(b.id) === String(reference)
                     );

                     if (exactMatch) {
                         console.log('✅ Libro encontrado:', exactMatch.title);
                         foundBook = {
                             id: parseInt(exactMatch.id),
                             titulo: exactMatch.title,
                             autor: exactMatch.author,
                             isbn: exactMatch.isbn || '',
                             precio: exactMatch.price,
                             stock: exactMatch.stock,
                             imagen_url: exactMatch.coverImage,
                             editorial: { id: 0, nombre: exactMatch.publisher }, 
                             legacy_id: exactMatch.code,
                             descripcion: exactMatch.description
                         } as any;

                         items.push({
                            id: `int-iber-${Date.now()}`,
                            libro_id: foundBook.id,
                            libro: foundBook,
                            cantidad: qty,
                            precio_unitario: foundBook.precio,
                            es_externo: false
                         });
                     } else {
                         // External Item fallback
                         items.push({
                             id: `iber-${Date.now()}`,
                             cantidad: qty,
                             precio_unitario: 0, // Price not detected in line, defaulting 0
                             es_externo: true,
                             nombre_externo: `${middle} (Ref: ${reference})`,
                             url_externa: ''
                         });
                     }
                 }
             }
        }

        // --- 5. Populate Form ---
        setClienteSearch('');
        
        // Full address string for Order Shipping Label (Combined)
        const fullAddressLabel = [calle, cp, ciudad, provincia, pais].filter(Boolean).join(', ');
        setDireccionEnvio(fullAddressLabel);
        
        setObservaciones(observaciones);
        setLineas(items);

        // Client Logic (Find or Setup Modal)
         if (nombre) {
              // Try to find existing client matches (Name or Phone)
              const matchingClients = clientes.filter(c => {
                  const nameMatch = c.nombre.toLowerCase().includes(nombre.toLowerCase());
                  const phoneMatch = telefono && (c.telefono?.includes(telefono) || c.movil?.includes(telefono));
                  return nameMatch || phoneMatch;
              });

              if (matchingClients.length === 1) {
                  setClienteSeleccionado(matchingClients[0]);
                  if (matchingClients[0].direccion) setDireccionEnvio(matchingClients[0].direccion);
              } else if (matchingClients.length > 1) {
                  setClienteSearch(nombre);
              } else {
                   // New Client Setup
                   setClienteModalData({
                      tipo: 'particular',
                      nombre: nombre,
                      apellidos: '', 
                      email: '', // IberLibro format doesn't show email in this snippet
                      nif: '',
                      telefono: telefono,
                      direccion: calle, // Structured Street
                      ciudad: ciudad,     // Structured City
                      codigo_postal: cp,  // Structured CP
                      provincia: provincia, // Structured Province
                      pais: pais,         // Structured Country
                      persona_contacto: '',
                      cargo: '',
                      web: '',
                      notas: `Cliente importado de IberLibro`,
                      activo: true
                  });
                  
                  // Heuristic Split Name
                  const nameParts = nombre.split(' ');
                  if (nameParts.length > 1) {
                       const fName = nameParts[0];
                       const lName = nameParts.slice(1).join(' ');
                       setClienteModalData(prev => ({ ...prev, nombre: fName, apellidos: lName }));
                  }
                  
                  setShowClienteModal(true);
              }
         }

        setDatosPegados("");
        setModoEntrada("manual");
        
        const status = foundBook ? `✅ Libro encontrado` : `⚠️ Libro NO encontrado o externo`;
        showModal('Datos IberLibro Procesados', `Cliente: ${nombre}\nItems: ${items.length}\n${status}`);

    } catch (e: any) {
        console.error('Error parsing IberLibro:', e);
        showModal('Error', 'Error al procesar datos de IberLibro: ' + e.message, 'error');
    } finally {
        setLoading(false);
    }
  };

  const parsearDatosPegados = async () => {
    if (!datosPegados.trim()) {
      showModal('Aviso', "Por favor, pega la información del pedido", 'info');
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

      setModoEntrada("manual");
      setDatosPegados("");

      showModal('Éxito', `Se han parseado ${nuevasLineas.length} producto(s) (Formato Genérico).`);
    } catch (error) {
      console.error("Error al parsear datos:", error);
      showModal('Error', "Error al procesar los datos pegados.", 'error');
    }
  };

  const parsearUniliber = async (texto: string) => {
      setLoading(true);
      try {
          console.log('--- Uniliber Raw Data (v2) ---');
          console.log(texto);
          console.log('------------------------------');

          // Normalize line endings
          const cleanText = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

          // --- 1. Helper for Robust Extraction ---
          // Matches "Label: Value" allowing for loose separators and trailing spaces
          const extract = (labelPattern: string) => {
              // Regex matches: Label + (optional separator) + Capture Group (Value until newline)
              const regex = new RegExp(`${labelPattern}\\s*[:\\.-]\\s*([^\\n]+)`, 'i');
              const match = cleanText.match(regex);
              return match && match[1] ? match[1].trim() : '';
          };

          // --- 2. Extract Key Fields ---
          // REFERENCE (Key for DB Lookup)
          const referencia = extract('(?:Referencia|Ref\\.?|Nº Pedido|Pedido)');

          // CONTACT & ADDRESS
          const nombre = extract('(?:Nombre|Cliente)');
          const direccion = extract('Direcci[óo]n');
          const poblacion = extract('(?:Poblaci[óo]n|Ciudad|Localidad)');
          const provincia = extract('Provincia');
          const pais = extract('Pa[íi]s');
          
          // Postal Code: Explicitly handle "C. Postal", "CP", "Código Postal"
          const cpRaw = extract('(?:C\\.?\\s*Postal|C\\.?P\\.?|Código Postal|CP)');
          // Sanitize to just digits (handle cases like "18600 (Granada)")
          const codigoPostal = cpRaw.match(/\d{4,5}/)?.[0] || '';

          const email = extract('Email');
          const telefono = extract('(?:Teléfono|Tlf|Tel)');
          const movil = extract('(?:Móvil|Movil)');

          // PRICE extraction
          // Handles "Precio total\n33.00 €" or "Precio total: 33.00 €"
          let precioTotal = 0;
          const precioMatch = cleanText.match(/Precio\s*total(?:\s*[:\.-])?(?:\s*\n\s*|\s+)([\d.,]+)/i);
          if (precioMatch && precioMatch[1]) {
             precioTotal = parseFloat(precioMatch[1].replace(',', '.'));
          }

          // --- 3. BOOK STRATEGY ---
          const items: LineaPedido[] = [];
          let foundBook: Libro | null = null;
          let bookInfoLog = '';

          // A: Try DB Lookup by Reference (Primary Strategy)
          if (referencia) {
               console.log(`🔎 Buscando referencia: ${referencia}`);
               // buscarLibros is fuzzy, so we filter results for exact match on 'code' (legacy_id) or 'id'
               const results = await buscarLibros(referencia);
               
               const exactMatch = results.find(b => 
                   String(b.code) === String(referencia) || 
                   String(b.id) === String(referencia)
               );
               
               if (exactMatch) {
                    console.log('✅ Libro encontrado en DB:', exactMatch.title);
                    // Map service Book to component Libro
                    foundBook = {
                       id: parseInt(exactMatch.id),
                       titulo: exactMatch.title,
                       autor: exactMatch.author,
                       isbn: exactMatch.isbn || '',
                       precio: exactMatch.price, // Use DB price
                       stock: exactMatch.stock,
                       imagen_url: exactMatch.coverImage,
                       editorial: { id: 0, nombre: exactMatch.publisher }, 
                       categoria_id: 0, 
                       legacy_id: exactMatch.code,
                       descripcion: exactMatch.description
                    } as any;
               }
          }

          // B: Fallback Text Parsing (If no DB match)
          let tituloFallback = '';
          let autorFallback = '';
          
          if (!foundBook) {
              // Heuristic: Line after Reference is usually Title
              const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
              const refLineIndex = lines.findIndex(l => l.match(/^(?:Referencia|Ref)/i));
              
              if (refLineIndex !== -1 && refLineIndex + 1 < lines.length) {
                  // Assume next line is Title if it doesn't look like a header
                  const nextLine = lines[refLineIndex+1];
                  if (!nextLine.includes(':')) {
                      tituloFallback = nextLine;
                      // Assume line after Title is Author?
                      if (refLineIndex + 2 < lines.length) {
                          const afterTitle = lines[refLineIndex+2];
                          if (!afterTitle.includes(':') && !afterTitle.match(/Cartoné|Tapa|Rústica/i)) {
                              autorFallback = afterTitle;
                          }
                      }
                  }
              }
              // Backup strategy via filtered lines if above failed
              if (!tituloFallback) {
                  const contentLines = lines.filter(l => 
                      !l.includes(':') && // Not a field
                      !l.match(/^\d+/) && // Not a number
                      !l.includes('€') // Not a price
                  );
                  if (contentLines.length > 0) tituloFallback = contentLines[0];
              }
          }

          // C: Construct Item Line
          if (foundBook) {
              items.push({
                   id: `int-uni-${Date.now()}`,
                   libro_id: foundBook.id,
                   libro: foundBook,
                   cantidad: 1,
                   precio_unitario: foundBook.precio, 
                   es_externo: false
              });
              bookInfoLog = `Libro ID: ${foundBook.legacy_id || foundBook.id}`;
          } else {
              items.push({
                 id: `uni-${Date.now()}`,
                 cantidad: 1,
                 precio_unitario: precioTotal > 0 ? precioTotal : 0, 
                 es_externo: true,
                 nombre_externo: tituloFallback 
                    ? `${tituloFallback} ${autorFallback ? '- ' + autorFallback : ''} (Ref: ${referencia})` 
                    : `Producto Uniliber (Ref: ${referencia})`,
                 url_externa: ''
              });
              bookInfoLog = `Producto Externo (Ref: ${referencia})`;
          }

          setLineas(items);

          // --- 4. CLIENT LOGIC ---
          setClienteSearch(''); 
          
          // Construct Address
          const addressParts = [direccion, codigoPostal, poblacion, provincia, pais].filter(Boolean);
          // Dedup if province == city
          const uniqueAddressParts = addressParts.filter((item, index) => addressParts.indexOf(item) === index);
          const fullAddress = uniqueAddressParts.join(', ');
          
          setDireccionEnvio(fullAddress);
          
          // Contact Phone Logic (Prefer Mobile, then Phone)
          const contactPhone = movil || telefono || '';

          // Find or Setup Client
          if (nombre) {
              // Try to find existing client by name OR email
              const matchingClients = clientes.filter(c => {
                  const nameMatch = c.nombre.toLowerCase().includes(nombre.toLowerCase());
                  const emailMatch = email && c.email && c.email.toLowerCase() === email.toLowerCase();
                  return nameMatch || emailMatch;
              });

              if (matchingClients.length === 1) {
                  // Found single match
                  setClienteSeleccionado(matchingClients[0]);
                  if (matchingClients[0].direccion) {
                      setDireccionEnvio(matchingClients[0].direccion);
                  }
                  // Update email/phone if missing in DB? (Optional enhancement)
              } else if (matchingClients.length > 1) {
                  setClienteSearch(nombre);
              } else {
                  // New Client Modal Data
                  setClienteModalData({
                      tipo: 'particular',
                      nombre: nombre,
                      apellidos: '', // Uniliber usually gives "Name Surname Surname" in one string. Logic to split?
                      // Simple split heuristic:
                      email: email,
                      nif: '',
                      telefono: contactPhone,
                      direccion: direccion,
                      ciudad: poblacion,
                      codigo_postal: codigoPostal,
                      provincia: provincia,
                      pais: pais || 'España',
                      persona_contacto: '',
                      cargo: '',
                      web: '',
                      notas: `Cliente importado de Uniliber (Ref Pedido: ${referencia})`,
                      activo: true
                  });
                  
                  // Auto-split name for modal convenience
                  const nameParts = nombre.split(' ');
                  if (nameParts.length > 1) {
                       const fName = nameParts[0];
                       const lName = nameParts.slice(1).join(' ');
                       setClienteModalData(prev => ({ ...prev, nombre: fName, apellidos: lName }));
                  }

                  setShowClienteModal(true);
              }
          }

          setDatosPegados("");
          setModoEntrada("manual");

          const statusMsg = foundBook 
            ? `✅ Libro encontrado en catálogo (${foundBook.titulo})` 
            : `⚠️ Libro NO encontrado en catálogo (Añadido como externo)`;
            
          showModal('Datos Uniliber Procesados', 
            `Cliente: ${nombre}\nCP: ${codigoPostal}\nEmail: ${email || 'No detectado'}\n${statusMsg}`
          ); 

      } catch (err: any) {
          console.error(err);
          showModal('Error', "Error al procesar datos de Uniliber: " + err.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for unparsed data
    if (modoEntrada === 'pegar' && datosPegados.trim().length > 0) {
        showModal('Atención', "⚠️ Has pegado datos pero no los has analizado.\n\nPor favor, haz clic en el botón 'Analizar y Rellenar Formulario' (icono de lupa) que está debajo del cuadro de texto para procesar los datos antes de guardar.", 'error');
        return;
    }

    let finalClienteId = clienteSeleccionado?.id;
    
    if (!finalClienteId) {
        showModal('Error', "Debe seleccionar un cliente. Use el buscador o cree uno nuevo con el botón 'Nuevo Cliente'.", 'error');
        return;
    }

    if (lineas.length === 0) {
      showModal('Error', "Agregue al menos un producto al pedido", 'error');
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
        showModal('Error', "Error: Usuario no autenticado", 'error');
        setLoading(false);
        return;
      }

      // Logic: Prepend Signal info to Observaciones if applicable
      let finalObservaciones = observaciones || "";
      const importeSenalNum = parseFloat(importeSenal) || 0;
      
      if (esSenal && importeSenalNum > 0) {
          const restante = Math.max(0, total - importeSenalNum);
          const senalInfo = `[PAGO Y SEÑAL: ${importeSenalNum.toFixed(2)}€ | RESTANTE: ${restante.toFixed(2)}€]`;
          finalObservaciones = `${senalInfo}\n${finalObservaciones}`.trim();
      }

      const pedido = await crearPedido({
        usuario_id: user.id,
        cliente_id: finalClienteId,
        tipo,
        metodo_pago: metodoPago,
        direccion_envio: direccionEnvio || undefined,
        transportista: transportista || undefined,
        tracking: tracking || undefined,
        observaciones: finalObservaciones || undefined,
        detalles,
      });

      if (pedido) {
        // --- Email Notification Logic (Resend) ---
        const clientEmail = (clienteSeleccionado?.email || '').trim();
        const clientName = clienteSeleccionado 
          ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellidos || ''}`.trim()
          : '';
        
        // Send email if customer has email
        if (clientEmail) {
          const orderEmailData: OrderEmailData = {
            emailType: 'order_confirmation',
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
          if (['perez_galdos', 'galeon', 'express'].includes(tipo)) {
              let storeName = 'Librería Pérez Galdós';
              if (tipo === 'galeon') storeName = 'Librería Galeón';

              const items = lineas.map(l => ({
                   title: l.libro?.titulo || l.nombre_externo || 'Producto',
                   quantity: l.cantidad,
                   price: l.precio_unitario,
                   author: l.libro?.autor,
                   ref: l.libro?.codigo || l.libro?.legacy_id?.toString()
              }));

              // Use new function for Store Orders
              sendStoreOrderRegisteredEmail(
                 pedido.id.toString(),
                 clientEmail,
                 pedido.cliente?.nombre as string || 'Cliente',
                 total,
                 items,
                 storeName
              ).then(result => {
                  if (result.success) {
                    console.log('✅ Email de registro de pedido enviado');
                  } else {
                    console.error('❌ Error enviando email registro:', result.error);
                  }
              });
          } else {
             // Default / Internal
             sendOrderConfirmationEmail(orderEmailData)
                .then(result => {
                  if (result.success) {
                    // console.log('✅ Email de confirmación enviado correctamente');
                  } else {
                    console.error('❌ Error al enviar email:', result.error);
                  }
                })
                .catch(err => {
                  console.error('❌ Excepción al enviar email:', err);
                });
          }

          const closeCallback = () => {
              resetForm();
              onSuccess();
              onClose();
          };

          showModal(
            'Pedido Creado', 
            `Pedido #${pedido.id} creado correctamente.\n\nSe enviará un email de confirmación a: ${clientEmail}`,
            'info',
            closeCallback
          );
        } else {
          const closeCallback = () => {
              resetForm();
              onSuccess();
              onClose();
          };
          showModal(
            'Pedido Creado', 
            `Pedido #${pedido.id} creado correctamente.\n\n⚠️ El cliente no tiene email. No se enviará confirmación automática.`, 
            'info',
            closeCallback
          );
        }
        // Removed explicit calls here, relying on callback
      } else {
        showModal('Error', "Error al crear el pedido", 'error');
      }
    } catch (error: any) {
      console.error("Error:", error);
      showModal('Error', "Error al crear el pedido: " + (error.message || JSON.stringify(error)), 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setClienteSearch("");
    setClienteSeleccionado(null);
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
    
    // Reset new states
    setTipoEnvio('envio');
    setEsSenal(false);
    setImporteSenal("");
    setModoEntrada("manual");
    setDatosPegados("");
    setPlataformaOrigen(null);
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
    <div className="modal-overlay">
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
                                border: '2px solid var(--border-subtle)', 
                                borderRadius: '0.5rem', 
                                background: 'var(--bg-surface)',
                                color: 'var(--text-main)',
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
                                border: '2px solid var(--border-subtle)', 
                                borderRadius: '0.5rem', 
                                background: 'var(--bg-surface)',
                                color: 'var(--text-main)',
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

                        <div className="platform-modal-header-row">
                            <button 
                                type="button" 
                                onClick={() => setPlataformaOrigen(null)}
                                className="btn-secondary"
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.25rem', 
                                    padding: '0.5rem 1rem',
                                    background: 'var(--bg-surface)',
                                    color: 'var(--text-main)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <ArrowLeft size={16} /> Volver
                            </button>
                            <span className="badge-platform">
                                {plataformaOrigen === 'iberlibro' ? (
                                    <>📚 IberLibro</>
                                ) : (
                                    <>📖 Uniliber</>
                                )}
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
                          className="btn-analyze"
                          style={{ width: 'auto', display: 'flex', margin: '1rem auto 0 auto', padding: '0.75rem 2rem', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}
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
                <div className="order-section-header">
                  <ShoppingCart size={20} />
                  <h3>Productos del Pedido</h3>
                </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <label className="label-tipo-producto">
                      Tipo de Producto
                    </label>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
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
                      <div className="search-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                         <label className="label-tipo-producto">Buscar Libro (Base de Datos)</label> 
                         <button 
                            type="button" 
                            onClick={() => setBookSearchMode(prev => prev === 'simple' ? 'advanced' : 'simple')}
                            className="btn-link"
                            style={{ whiteSpace: 'nowrap' }}
                         >
                            {bookSearchMode === 'simple' ? 'Búsqueda Avanzada' : 'Búsqueda Simple'}
                         </button>
                      </div>

                      {bookSearchMode === 'simple' ? (
                          <div className="simple-search-layout" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <div style={{ flex: '1 1 300px', position: 'relative' }}>
                                  <div className="search-input-wrapper">
                                    <div className="search-field-container" style={{ position: 'relative', flex: 1 }}>
                                      <Search className="search-icon-absolute" size={18} />
                                      <input
                                        type="text"
                                        placeholder="Buscar por Código o ID..."
                                        value={libroSearch}
                                        onChange={(e) => setLibroSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLibros())}
                                        className="input-search-simple"
                                        style={{ width: '100%' }}
                                        autoFocus={false}
                                      />
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={searchLibros}
                                        className="btn-search-trigger"
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
                                            <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{libro.titulo}</div>
                                                <div style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.9rem' }}>{libro.precio?.toFixed(2)}€</div>
                                              </div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                                                <span>{libro.autor}</span>
                                                <span>•</span>
                                                <span>Code: {libro.legacy_id || libro.id}</span>
                                                <span>•</span>
                                                <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '1px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.75rem' }}>
                                                    Stock: {libro.stock}
                                                </span>
                                            </div>
                                              {libro.descripcion && (
                                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                      {libro.descripcion.length > 100 ? `${libro.descripcion.substring(0, 100)}...` : libro.descripcion}
                                                  </div>
                                              )}
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
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: '1 1 auto', justifyContent: 'flex-start' }}>
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
                                      style={{ width: '100px', textAlign: 'center', padding: '0.5rem' }} 
                                  />
                                  <button
                                    type="button"
                                    onClick={agregarLinea}
                                    className="btn-agregar-linea"
                                    disabled={!libroSeleccionado}
                                    style={{ whiteSpace: 'nowrap' }}
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
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{libro.titulo}</div>
                                              <div style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '0.9rem' }}>{libro.precio?.toFixed(2)}€</div>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                                                <span>{libro.autor}</span>
                                                <span>•</span>
                                                <span>Code: {libro.legacy_id || libro.id}</span>
                                                <span>•</span>
                                                <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '1px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '0.75rem' }}>
                                                    Stock: {libro.stock}
                                                </span>
                                            </div>
                                            {libro.descripcion && (
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {libro.descripcion.length > 100 ? `${libro.descripcion.substring(0, 100)}...` : libro.descripcion}
                                                </div>
                                            )}
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
                    <div className="agregar-producto-externo" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ flex: '1 1 300px' }}>
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

                      <div className="form-group" style={{ flex: '1 1 300px' }}>
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

                      <div className="form-group" style={{ flex: '1 1 120px' }}>
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
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div className="form-group" style={{ flex: '1 1 120px' }}>
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
                          style={{ width: '100%' }}
                        />
                      </div>

                      <div
                        className="form-group"
                        style={{ flex: '0 0 auto' }}
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
                <div className="order-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={20} />
                    <h3>Información del Cliente</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenClienteModal}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                  >
                    <Plus size={16} />
                    Nuevo Cliente
                  </button>
                </div>



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
                  
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={esSenal}
                        onChange={(e) => {
                            setEsSenal(e.target.checked);
                            if (!e.target.checked) setImporteSenal("");
                        }}
                        style={{ width: "1.2rem", height: "1.2rem" }}
                      />
                      Pago y Señal (A cuenta)
                    </label>
                    
                    {esSenal && (
                        <div style={{ marginTop: "0.5rem", display: "flex", gap: "1rem", alignItems: "center", background: "var(--bg-tertiary)", padding: "1rem", borderRadius: "0.5rem", border: "1px solid var(--border-color)" }}>
                            <div style={{ flex: "0 0 auto" }}>
                                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>Importe Abonado (€)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={importeSenal}
                                    onChange={(e) => {
                                        // Allow only numbers and one dot/comma
                                        const val = e.target.value.replace(',', '.');
                                        if (!val || /^\d*\.?\d{0,2}$/.test(val)) {
                                            setImporteSenal(val);
                                        }
                                    }}
                                    placeholder="0.00"
                                    className="form-input"
                                    style={{ width: "120px" }}
                                />
                            </div>
                            <div style={{ flex: "1 1 auto", fontSize: "1rem" }}>
                                <span style={{ color: "var(--text-secondary)", marginRight: "0.5rem" }}>Restante a Pagar:</span>
                                <span style={{ fontWeight: 700, color: (total - (parseFloat(importeSenal) || 0)) > 0 ? "var(--danger-color)" : "var(--success-color)" }}>
                                    {formatPrice(Math.max(0, total - (parseFloat(importeSenal) || 0)))}
                                </span>
                            </div>
                        </div>
                    )}
                  </div>
              </div>

              <div className="form-section">
                <div className="order-section-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={20} />
                    <h3>Información de Envío</h3>
                  </div>
                  
                  {/* Shipping Type Toggle */}
                  <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                      <button
                        type="button"
                        onClick={() => {
                            setTipoEnvio('envio');
                            if (clienteSeleccionado?.direccion) {
                                setDireccionEnvio(clienteSeleccionado.direccion);
                            } else {
                                setDireccionEnvio("");
                            }
                        }}
                        style={{
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.875rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            background: tipoEnvio === 'envio' ? 'var(--primary-color)' : 'transparent',
                            color: tipoEnvio === 'envio' ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            transition: 'all 0.2s'
                        }}
                      >
                         <Truck size={14} /> Envío
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                            setTipoEnvio('recogida');
                            setDireccionEnvio("RECOGIDA EN LIBRERÍA");
                            setTransportista("");
                            setTracking("");
                        }}
                        style={{
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.875rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            background: tipoEnvio === 'recogida' ? 'var(--primary-color)' : 'transparent',
                            color: tipoEnvio === 'recogida' ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            transition: 'all 0.2s'
                        }}
                      >
                         <Building2 size={14} /> Recogida
                      </button>
                  </div>
                </div>

                {tipoEnvio === 'envio' ? (
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
                ) : (
                    <div style={{ 
                        padding: '1.5rem', 
                        background: 'rgba(34, 197, 94, 0.1)', 
                        border: '1px solid rgba(34, 197, 94, 0.2)', 
                        borderRadius: '0.5rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem',
                        color: 'var(--text-primary)'
                    }}>
                        <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            background: 'var(--success-color)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#fff',
                            flexShrink: 0
                        }}>
                             <Building2 size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Recogida en Librería</h4>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                El cliente recogerá el pedido en la tienda física. No se requiere envío.
                            </p>
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

      {/* Client Creation Modal */}
      {showClienteModal && (
        <div className="modal-overlay" onClick={handleCloseClienteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="text-gray-900 dark:text-white">Crear Nuevo Cliente</h2>
              <button onClick={handleCloseClienteModal} className="modal-close">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitClienteModal}>
              <div className="modal-body">
                {/* Client Type Tabs */}
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '0.5rem' }}>
                  {(['particular', 'empresa', 'institucion'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setClienteModalData({...clienteModalData, tipo: t})}
                      style={{
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        background: clienteModalData.tipo === t ? '#eff6ff' : 'transparent',
                        color: clienteModalData.tipo === t ? '#2563eb' : '#6b7280',
                        fontWeight: 500,
                        cursor: 'pointer',
                        borderRadius: '0.5rem 0.5rem 0 0',
                        borderBottom: clienteModalData.tipo === t ? '2px solid #2563eb' : '2px solid transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      {t === 'particular' && <User size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />}
                      {t === 'empresa' && <Building2 size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />}
                      {t === 'institucion' && <School size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>{clienteModalData.tipo === 'particular' ? 'Nombre *' : (clienteModalData.tipo === 'empresa' ? 'Razón Social *' : 'Nombre Institución *')}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.nombre}
                      onChange={(e) => setClienteModalData({...clienteModalData, nombre: e.target.value})}
                      required 
                    />
                  </div>
                  
                  {clienteModalData.tipo === 'particular' && (
                    <div className="form-group full-width">
                      <label>Apellidos *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={clienteModalData.apellidos}
                        onChange={(e) => setClienteModalData({...clienteModalData, apellidos: e.target.value})}
                        required 
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={clienteModalData.email}
                      onChange={(e) => setClienteModalData({...clienteModalData, email: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>{clienteModalData.tipo === 'particular' ? 'NIF/DNI' : 'CIF'}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.nif}
                      onChange={(e) => setClienteModalData({...clienteModalData, nif: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Teléfono</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      value={clienteModalData.telefono}
                      onChange={(e) => setClienteModalData({...clienteModalData, telefono: e.target.value})}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Dirección</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.direccion}
                      onChange={(e) => setClienteModalData({...clienteModalData, direccion: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Ciudad</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.ciudad}
                      onChange={(e) => setClienteModalData({...clienteModalData, ciudad: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Código Postal</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.codigo_postal}
                      onChange={(e) => setClienteModalData({...clienteModalData, codigo_postal: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Provincia</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.provincia}
                      onChange={(e) => setClienteModalData({...clienteModalData, provincia: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>País</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={clienteModalData.pais}
                      onChange={(e) => setClienteModalData({...clienteModalData, pais: e.target.value})}
                    />
                  </div>

                  {clienteModalData.tipo !== 'particular' && (
                    <>
                      <div className="form-group">
                        <label>Persona de Contacto</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={clienteModalData.persona_contacto}
                          onChange={(e) => setClienteModalData({...clienteModalData, persona_contacto: e.target.value})}
                        />
                      </div>

                      <div className="form-group">
                        <label>Cargo</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={clienteModalData.cargo}
                          onChange={(e) => setClienteModalData({...clienteModalData, cargo: e.target.value})}
                        />
                      </div>

                      <div className="form-group full-width">
                        <label>Sitio Web</label>
                        <input 
                          type="url" 
                          className="form-input" 
                          value={clienteModalData.web}
                          onChange={(e) => setClienteModalData({...clienteModalData, web: e.target.value})}
                        />
                      </div>
                    </>
                  )}

                  <div className="form-group full-width">
                    <label>Notas</label>
                    <textarea 
                      className="form-textarea" 
                      value={clienteModalData.notas}
                      onChange={(e) => setClienteModalData({...clienteModalData, notas: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={handleCloseClienteModal} className="btn-cancelar">
                  Cancelar
                </button>
                <button type="submit" className="btn-guardar" style={{ color: '#ffffff' }}>
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Modal Component */}
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={messageModalConfig.title}
        message={messageModalConfig.message}
        type={messageModalConfig.type}
        onConfirm={messageModalConfig.onConfirm}
      />
    </div>
  );
}
