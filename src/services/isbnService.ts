export interface ISBNBookData {
  isbn: string;
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  pageCount: number;
  description: string;
  categories: string[];
  imageUrl: string;
  language: string;
}

// Utility function to clean unwanted metadata from titles
const cleanTitle = (title: string): string => {
  if (!title) return title;
  
  // Remove common format tags from library catalogs
  return title
    .replace(/\s*\[Texto impreso\]/gi, '')
    .replace(/\s*\[Recurso electrónico\]/gi, '')
    .replace(/\s*\[Libro electrónico\]/gi, '')
    .replace(/\s*\[Material gráfico\]/gi, '')
    .replace(/\s*\[Grabación sonora\]/gi, '')
    .replace(/\s*\[Videograbación\]/gi, '')
    .replace(/\s*\[Música impresa\]/gi, '')
    .replace(/\s*\[Manuscrito\]/gi, '')
    .replace(/\s*\[Microforma\]/gi, '')
    .replace(/\s*\[Objeto\]/gi, '')
    .replace(/\s*\[Cartografía\]/gi, '')
    .replace(/\s*:\s*$/, '') // Remove trailing colon
    .trim();
};

export const buscarLibroPorISBN = async (isbn: string): Promise<ISBNBookData | null> => {
  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '');

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}`
    );

    if (!response.ok) {
      console.error('Error en la respuesta de Google Books API');
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const bookInfo = data.items[0].volumeInfo;

    const fullTitle = bookInfo.subtitle 
      ? `${bookInfo.title}: ${bookInfo.subtitle}` 
      : bookInfo.title;

    const bookData: ISBNBookData = {
      isbn: cleanISBN,
      title: cleanTitle(fullTitle) || '',
      authors: bookInfo.authors || [],
      publisher: bookInfo.publisher || '',
      publishedDate: bookInfo.publishedDate || '',
      pageCount: bookInfo.pageCount || 0,
      description: bookInfo.description || '',
      categories: bookInfo.categories || [],
      imageUrl: bookInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      language: bookInfo.language || 'es'
    };

    return bookData;
  } catch (error) {
    console.error('Error al buscar libro por ISBN:', error);
    return null;
  }
};

export const buscarLibrosOpenLibrary = async (isbn: string): Promise<ISBNBookData | null> => {
  try {
    const cleanISBN = isbn.replace(/[-\s]/g, '');

    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`
    );

    if (!response.ok) {
      console.error('Error en la respuesta de Open Library API');
      return null;
    }

    const data = await response.json();
    const bookKey = `ISBN:${cleanISBN}`;

    if (!data[bookKey]) {
      return null;
    }

    const bookInfo = data[bookKey];

    const fullTitle = bookInfo.subtitle 
      ? `${bookInfo.title}: ${bookInfo.subtitle}` 
      : bookInfo.title;

    const bookData: ISBNBookData = {
      isbn: cleanISBN,
      title: cleanTitle(fullTitle) || '',
      authors: bookInfo.authors?.map((a: any) => a.name) || [],
      publisher: bookInfo.publishers?.[0]?.name || '',
      publishedDate: bookInfo.publish_date || '',
      pageCount: bookInfo.number_of_pages || 0,
      description: bookInfo.notes || '',
      categories: bookInfo.subjects?.map((s: any) => s.name).slice(0, 3) || [],
      imageUrl: bookInfo.cover?.large || bookInfo.cover?.medium || bookInfo.cover?.small || '',
      language: 'es'
    };

    return bookData;
  } catch (error) {
    console.error('Error al buscar en Open Library:', error);
    return null;
  }
};

const mergeBookData = (target: ISBNBookData | null, source: ISBNBookData | null, preferSourceForText: boolean = false): ISBNBookData | null => {
  if (!target) return source;
  if (!source) return target;

  return {
    ...target,
    title: (preferSourceForText && source.title) ? source.title : (target.title || source.title),
    authors: (preferSourceForText && source.authors && source.authors.length > 0) ? source.authors : ((target.authors && target.authors.length > 0) ? target.authors : source.authors),
    publisher: (preferSourceForText && source.publisher) ? source.publisher : (target.publisher || source.publisher),
    publishedDate: target.publishedDate || source.publishedDate,
    pageCount: target.pageCount || source.pageCount,
    description: target.description || source.description, // Keep description from target (usually Google) unless missing
    categories: (target.categories && target.categories.length > 0) ? target.categories : source.categories,
    imageUrl: target.imageUrl || source.imageUrl, // Keep image from target (usually Google)
    language: target.language || source.language,
    isbn: target.isbn || source.isbn
  };
};

export const buscarLibroPorISBNMultiple = async (isbn: string): Promise<ISBNBookData | null> => {
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  
  // Detectar ISBN Español (Empieza por 97884 o 84)
  const isSpanish = cleanISBN.startsWith('97884') || (cleanISBN.length === 10 && cleanISBN.startsWith('84'));

  if (isSpanish) {
      // ESTRATEGIA "PREMIUM" ESPAÑA (3 Vías)
      // Lanzamos las 3 consultas en paralelo para máxima velocidad
      const [bneResult, googleResult, olResult] = await Promise.all([
          buscarLibroBNE(isbn),
          buscarLibroPorISBN(isbn),
          buscarLibrosOpenLibrary(isbn)
      ]);

      // Si tenemos resultado de la BNE, es nuestra "Fuente de la Verdad" para el texto
      if (bneResult) {
          const finalResult = { ...bneResult };

          // 1. Intentamos enriquecer con Google Books (Prioridad Media: 1)
          if (googleResult) {
               // Portada y Sinopsis de Google son mejores
               if (googleResult.imageUrl) finalResult.imageUrl = googleResult.imageUrl;
               if (googleResult.description) finalResult.description = googleResult.description;
               if (googleResult.pageCount > 0) finalResult.pageCount = googleResult.pageCount;
               // Si la BNE tenía fecha corta (solo año), y Google tiene completa, usamos Google
               if (finalResult.publishedDate.length < 5 && googleResult.publishedDate.length > 4) {
                   finalResult.publishedDate = googleResult.publishedDate;
               }
          }

          // 2. Si todavía faltan datos, intentamos con OpenLibrary (Prioridad Media: 2)
          if (olResult) {
              if (!finalResult.imageUrl && olResult.imageUrl) finalResult.imageUrl = olResult.imageUrl;
              if (!finalResult.description && olResult.description) finalResult.description = olResult.description;
              if (!finalResult.pageCount && olResult.pageCount) finalResult.pageCount = olResult.pageCount;
          }

          return finalResult;
      }
      
      // Si BNE falla (raro en libro español), hacemos fallback al waterfall estándar abajo...
      // O podemos aprovechar que ya tenemos googleResult y olResult cargados para no repetir:
      
      let fallbackResult = googleResult;
      
      // Merge Google + OL si falta info
      if (!fallbackResult) {
          fallbackResult = olResult;
      } else {
          // Google existe, rellenamos huecos con OL
           const missingData = !fallbackResult.publisher || !fallbackResult.pageCount || !fallbackResult.description;
           if (missingData && olResult) {
               fallbackResult = mergeBookData(fallbackResult, olResult);
           }
      }
      
      return fallbackResult;
  }

  // ESTRATEGIA INTERNACIONAL (Waterfall Original)
  // 1. Google Books
  let result = await buscarLibroPorISBN(isbn);

  // Verificamos si faltan datos críticos
  const missingPublisher = !result || !result.publisher;
  const missingDescription = !result || !result.description;
  const missingPages = !result || !result.pageCount;
  
  if (result && !missingPublisher && !missingDescription && !missingPages) {
      return result;
  }

  // 2. Open Library
  if (!result || missingPublisher || missingDescription || missingPages) {
      const olResult = await buscarLibrosOpenLibrary(isbn);
      result = mergeBookData(result, olResult);
  }

  // 3. Fallback BNE (Por si acaso, aunque no tenga prefijo español estándar)
  const stillMissingPublisher = !result || !result.publisher;
  if (!result || stillMissingPublisher) {
      const bneResult = await buscarLibroBNE(isbn);
      result = mergeBookData(result, bneResult);
  }

  return result;
};

// Nueva función para consultar la BNE via SRU
export const buscarLibroBNE = async (isbn: string): Promise<ISBNBookData | null> => {
  try {
    // Limpieza de ISBN
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    
    // API SRU de la BNE
    // Usamos un proxy si es necesario por CORS, pero intentamos directo primero.
    // Nota: La BNE suele permitir acceso, pero si falla por CORS, necesitaríamos un proxy.
    // Usamos el esquema 'dc' (Dublin Core) que es más fácil de parsear que MARCXML
    const url = `https://catalogo.bne.es/view/sru/34BNE_INST?version=1.2&operation=searchRetrieve&recordSchema=dc&query=alma.isbn=${cleanISBN}`;

    const response = await fetch(url);
    
    if (!response.ok) {
       return null;
    }

    const strXml = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(strXml, "text/xml");

    // Verificar si hay resultados
    const numberOfRecords = xmlDoc.getElementsByTagName("numberOfRecords")[0]?.textContent;
    if (!numberOfRecords || parseInt(numberOfRecords) === 0) {
        return null;
    }

    // Extraer datos del primer registro (Dublin Core)
    const record = xmlDoc.getElementsByTagName("srw_dc:dc")[0] || xmlDoc.getElementsByTagName("dc:dc")[0]; // Fallback namespace
    if (!record) return null;

    const getTagVal = (tagName: string) => {
        const el = record.getElementsByTagName("dc:" + tagName)[0];
        return el ? el.textContent : '';
    };

    const title = getTagVal("title") || '';
    const creator = getTagVal("creator") || getTagVal("contributor") || '';
    const publisher = getTagVal("publisher") || '';
    const date = getTagVal("date") || '';
    const description = getTagVal("description") || '';
    // Format specifically to just year if it's a full date, BNE often returns "2005" or "[2005]"
    const cleanDate = date.replace(/[\[\]]/g, '').substring(0, 4); 

    // BNE doesn't provide image URLs easily in DC, nor page count always cleanly.
    // We prioritize getting the publisher and basic info.
    
    const bookData: ISBNBookData = {
      isbn: cleanISBN,
      title: cleanTitle(title),
      authors: [creator],
      publisher: publisher,
      publishedDate: cleanDate,
      pageCount: 0, // BNE SRU DC often lacks this or puts it in format fields difficult to parse reliably without MARC.
      description: description,
      categories: [],
      imageUrl: '', // No image in SRU DC
      language: 'es'
    };

    return bookData;

  } catch (error) {
    console.error('Error buscando en BNE:', error);
    return null;
  }
};

export const buscarLibroPorTituloAutor = async (titulo: string, autor: string, anio?: number, editorial?: string): Promise<ISBNBookData | null> => {
  try {
    let query = `intitle:${encodeURIComponent(titulo)}+inauthor:${encodeURIComponent(autor)}`;
    
    if (editorial) {
      // Añadimos editorial para precisar más la edición
      query += `+inpublisher:${encodeURIComponent(editorial)}`;
    }

    if (anio) {
      // Añadimos el año a la búsqueda para refinar la edición
      query += `+${anio}`;
    }

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`
    );

    if (!response.ok) {
      console.error('Error en la respuesta de Google Books API');
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const bookInfo = data.items[0].volumeInfo;
    const isbn13 = bookInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier;
    const isbn10 = bookInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier;
    const isbn = isbn13 || isbn10 || '';

    const fullTitle = bookInfo.subtitle 
      ? `${bookInfo.title}: ${bookInfo.subtitle}` 
      : bookInfo.title;

    const bookData: ISBNBookData = {
      isbn: isbn.replace(/[-\s]/g, ''),
      title: fullTitle || '',
      authors: bookInfo.authors || [],
      publisher: bookInfo.publisher || '',
      publishedDate: bookInfo.publishedDate || '',
      pageCount: bookInfo.pageCount || 0,
      description: bookInfo.description || '',
      categories: bookInfo.categories || [],
      imageUrl: bookInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      language: bookInfo.language || 'es'
    };

    return bookData;
  } catch (error) {
    console.error('Error al buscar libro por título y autor:', error);
    return null;
  }
};
