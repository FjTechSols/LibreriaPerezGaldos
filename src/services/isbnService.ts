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
      title: fullTitle || '',
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

export const buscarLibroPorISBNMultiple = async (isbn: string): Promise<ISBNBookData | null> => {
  let result = await buscarLibroPorISBN(isbn);

  if (!result) {
    result = await buscarLibrosOpenLibrary(isbn);
  }

  return result;
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
