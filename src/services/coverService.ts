
export const searchBookCover = async (
  query: { isbn?: string; title?: string; author?: string; year?: string }
): Promise<string | null> => {
  try {
    let q = '';
    
    // Prioritize ISBN if available
    if (query.isbn && query.isbn.length > 9) {
      const cleanISBN = query.isbn.replace(/[-\s]/g, '');
      q = `isbn:${cleanISBN}`;
    } else {
      // Build composite query
      const parts = [];
      if (query.title) parts.push(`intitle:${query.title}`);
      if (query.author) parts.push(`inauthor:${query.author}`);
      
      if (parts.length === 0) return null;
      q = parts.join('+');
    }

    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1`);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const book = data.items[0];
      const imageLinks = book.volumeInfo?.imageLinks;
      
      if (imageLinks) {
        // Prefer largest available
        const url = imageLinks.extraLarge || imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail;
        if (url) {
           return url.replace('http://', 'https://');
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error searching book cover:', error);
    return null;
  }
};
