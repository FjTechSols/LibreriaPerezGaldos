import { Book } from '../types';

type BookTranslations = {
  [bookId: string]: {
    es: { title: string; description: string; category: string };
    en: { title: string; description: string; category: string };
    fr: { title: string; description: string; category: string };
  };
};

export const bookTranslations: BookTranslations = {
  '1': {
    es: {
      title: 'El Quijote de la Mancha',
      description: 'La obra maestra de la literatura española que narra las aventuras del ingenioso hidalgo Don Quijote y su fiel escudero Sancho Panza.',
      category: 'Clásicos'
    },
    en: {
      title: 'Don Quixote',
      description: 'The masterpiece of Spanish literature that narrates the adventures of the ingenious gentleman Don Quixote and his faithful squire Sancho Panza.',
      category: 'Classics'
    },
    fr: {
      title: 'Don Quichotte',
      description: 'Le chef-d\'œuvre de la littérature espagnole qui raconte les aventures de l\'ingénieux gentilhomme Don Quichotte et son fidèle écuyer Sancho Panza.',
      category: 'Classiques'
    }
  },
  '2': {
    es: {
      title: 'Cien Años de Soledad',
      description: 'La saga de la familia Buendía en el mítico pueblo de Macondo, una de las novelas más importantes del realismo mágico.',
      category: 'Literatura Latinoamericana'
    },
    en: {
      title: 'One Hundred Years of Solitude',
      description: 'The saga of the Buendía family in the mythical town of Macondo, one of the most important novels of magical realism.',
      category: 'Latin American Literature'
    },
    fr: {
      title: 'Cent ans de solitude',
      description: 'La saga de la famille Buendía dans la ville mythique de Macondo, l\'un des romans les plus importants du réalisme magique.',
      category: 'Littérature Latino-américaine'
    }
  },
  '3': {
    es: {
      title: '1984',
      description: 'Una distopía que explora los peligros del totalitarismo y la manipulación de la información en una sociedad vigilada.',
      category: 'Distopía'
    },
    en: {
      title: '1984',
      description: 'A dystopia exploring the dangers of totalitarianism and information manipulation in a surveilled society.',
      category: 'Dystopia'
    },
    fr: {
      title: '1984',
      description: 'Une dystopie explorant les dangers du totalitarisme et de la manipulation de l\'information dans une société surveillée.',
      category: 'Dystopie'
    }
  },
  '4': {
    es: {
      title: 'Orgullo y Prejuicio',
      description: 'La historia de Elizabeth Bennet y Mr. Darcy, una novela romántica que explora temas de clase social y amor.',
      category: 'Romance'
    },
    en: {
      title: 'Pride and Prejudice',
      description: 'The story of Elizabeth Bennet and Mr. Darcy, a romantic novel exploring themes of social class and love.',
      category: 'Romance'
    },
    fr: {
      title: 'Orgueil et Préjugés',
      description: 'L\'histoire d\'Elizabeth Bennet et Mr. Darcy, un roman romantique explorant les thèmes de la classe sociale et de l\'amour.',
      category: 'Romance'
    }
  },
  '5': {
    es: {
      title: 'El Hobbit',
      description: 'Las aventuras de Bilbo Bolsón en la Tierra Media, el preludio perfecto para El Señor de los Anillos.',
      category: 'Fantasía'
    },
    en: {
      title: 'The Hobbit',
      description: 'The adventures of Bilbo Baggins in Middle-earth, the perfect prelude to The Lord of the Rings.',
      category: 'Fantasy'
    },
    fr: {
      title: 'Le Hobbit',
      description: 'Les aventures de Bilbo Sacquet en Terre du Milieu, le prélude parfait au Seigneur des Anneaux.',
      category: 'Fantaisie'
    }
  },
  '6': {
    es: {
      title: 'Sapiens',
      description: 'Una fascinante exploración de la historia de la humanidad desde la aparición del Homo sapiens hasta la era moderna.',
      category: 'Historia'
    },
    en: {
      title: 'Sapiens',
      description: 'A fascinating exploration of human history from the appearance of Homo sapiens to the modern era.',
      category: 'History'
    },
    fr: {
      title: 'Sapiens',
      description: 'Une exploration fascinante de l\'histoire humaine depuis l\'apparition d\'Homo sapiens jusqu\'à l\'ère moderne.',
      category: 'Histoire'
    }
  },
  '7': {
    es: {
      title: 'El Código Da Vinci',
      description: 'Un thriller que combina arte, historia y misterio en una carrera contrarreloj por París y Londres.',
      category: 'Misterio'
    },
    en: {
      title: 'The Da Vinci Code',
      description: 'A thriller combining art, history and mystery in a race against time through Paris and London.',
      category: 'Mystery'
    },
    fr: {
      title: 'Da Vinci Code',
      description: 'Un thriller combinant art, histoire et mystère dans une course contre la montre à travers Paris et Londres.',
      category: 'Mystère'
    }
  },
  '8': {
    es: {
      title: 'Atomic Habits',
      description: 'Un enfoque práctico y científico para formar buenos hábitos y eliminar los malos.',
      category: 'Autoayuda'
    },
    en: {
      title: 'Atomic Habits',
      description: 'A practical and scientific approach to forming good habits and eliminating bad ones.',
      category: 'Self-Help'
    },
    fr: {
      title: 'Atomic Habits',
      description: 'Une approche pratique et scientifique pour former de bonnes habitudes et éliminer les mauvaises.',
      category: 'Développement Personnel'
    }
  }
};

export const mockBooks: Book[] = [
  {
    id: '1',
    code: 'LIB-001',
    title: 'El Quijote de la Mancha',
    author: 'Miguel de Cervantes',
    publisher: 'Editorial Planeta',
    pages: 1200,
    publicationYear: 1605,
    isbn: '978-84-376-0494-7',
    price: 24.99,
    originalPrice: 29.99,
    stock: 15,
    category: 'Clásicos',
    description: 'La obra maestra de la literatura española que narra las aventuras del ingenioso hidalgo Don Quijote y su fiel escudero Sancho Panza.',
    coverImage: 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.8,
    featured: true,
    isOnSale: true,
    reviews: [
      {
        id: 'r1',
        userId: 'u1',
        userName: 'María García',
        rating: 5,
        comment: 'Una obra maestra atemporal. Imprescindible en cualquier biblioteca.',
        date: '2024-01-15'
      }
    ]
  },
  {
    id: '2',
    code: 'LIB-002',
    title: 'Cien Años de Soledad',
    author: 'Gabriel García Márquez',
    publisher: 'Editorial Sudamericana',
    pages: 471,
    publicationYear: 1967,
    isbn: '978-84-376-0495-8',
    price: 22.95,
    stock: 8,
    category: 'Literatura Latinoamericana',
    description: 'La saga de la familia Buendía en el mítico pueblo de Macondo, una de las novelas más importantes del realismo mágico.',
    coverImage: 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.9,
    featured: true,
    isNew: true,
    reviews: []
  },
  {
    id: '3',
    code: 'LIB-003',
    title: '1984',
    author: 'George Orwell',
    publisher: 'Secker & Warburg',
    pages: 328,
    publicationYear: 1949,
    isbn: '978-84-376-0496-9',
    price: 18.50,
    stock: 0,
    category: 'Distopía',
    description: 'Una distopía que explora los peligros del totalitarismo y la manipulación de la información en una sociedad vigilada.',
    coverImage: 'https://images.pexels.com/photos/46274/pexels-photo-46274.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.7,
    reviews: []
  },
  {
    id: '4',
    code: 'LIB-004',
    title: 'Orgullo y Prejuicio',
    author: 'Jane Austen',
    publisher: 'T. Egerton',
    pages: 432,
    publicationYear: 1813,
    isbn: '978-84-376-0497-0',
    price: 19.99,
    stock: 12,
    category: 'Romance',
    description: 'La historia de Elizabeth Bennet y Mr. Darcy, una novela romántica que explora temas de clase social y amor.',
    coverImage: 'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.6,
    reviews: []
  },
  {
    id: '5',
    code: 'LIB-005',
    title: 'El Hobbit',
    author: 'J.R.R. Tolkien',
    publisher: 'George Allen & Unwin',
    pages: 310,
    publicationYear: 1937,
    isbn: '978-84-376-0498-1',
    price: 21.99,
    stock: 20,
    category: 'Fantasía',
    description: 'Las aventuras de Bilbo Bolsón en la Tierra Media, el preludio perfecto para El Señor de los Anillos.',
    coverImage: 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.8,
    featured: true,
    reviews: []
  },
  {
    id: '6',
    code: 'LIB-006',
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    publisher: 'Debate',
    pages: 512,
    publicationYear: 2011,
    isbn: '978-84-376-0499-2',
    price: 25.99,
    stock: 7,
    category: 'Historia',
    description: 'Una fascinante exploración de la historia de la humanidad desde la aparición del Homo sapiens hasta la era moderna.',
    coverImage: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.5,
    isNew: true,
    reviews: []
  },
  {
    id: '7',
    code: 'LIB-007',
    title: 'El Código Da Vinci',
    author: 'Dan Brown',
    publisher: 'Doubleday',
    pages: 689,
    publicationYear: 2003,
    isbn: '978-84-376-0500-5',
    price: 16.99,
    originalPrice: 19.99,
    stock: 25,
    category: 'Misterio',
    description: 'Un thriller que combina arte, historia y misterio en una carrera contrarreloj por París y Londres.',
    coverImage: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.3,
    isOnSale: true,
    reviews: []
  },
  {
    id: '8',
    code: 'LIB-008',
    title: 'Atomic Habits',
    author: 'James Clear',
    publisher: 'Avery',
    pages: 320,
    publicationYear: 2018,
    isbn: '978-84-376-0501-6',
    price: 23.50,
    stock: 18,
    category: 'Autoayuda',
    description: 'Un enfoque práctico y científico para formar buenos hábitos y eliminar los malos.',
    coverImage: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4.7,
    reviews: []
  }
];

export const categories = [
  'Todos',
  'Clásicos',
  'Literatura Latinoamericana',
  'Distopía',
  'Romance',
  'Fantasía',
  'Historia',
  'Misterio',
  'Autoayuda',
  'Ciencia Ficción',
  'Biografía',
  'Poesía'
];

export const categoryTranslations: Record<string, { es: string; en: string; fr: string }> = {
  'Todos': { es: 'Todos', en: 'All', fr: 'Tous' },
  'Clásicos': { es: 'Clásicos', en: 'Classics', fr: 'Classiques' },
  'Literatura Latinoamericana': { es: 'Literatura Latinoamericana', en: 'Latin American Literature', fr: 'Littérature Latino-américaine' },
  'Distopía': { es: 'Distopía', en: 'Dystopia', fr: 'Dystopie' },
  'Romance': { es: 'Romance', en: 'Romance', fr: 'Romance' },
  'Fantasía': { es: 'Fantasía', en: 'Fantasy', fr: 'Fantaisie' },
  'Historia': { es: 'Historia', en: 'History', fr: 'Histoire' },
  'Misterio': { es: 'Misterio', en: 'Mystery', fr: 'Mystère' },
  'Autoayuda': { es: 'Autoayuda', en: 'Self-Help', fr: 'Développement Personnel' },
  'Ciencia Ficción': { es: 'Ciencia Ficción', en: 'Science Fiction', fr: 'Science-Fiction' },
  'Biografía': { es: 'Biografía', en: 'Biography', fr: 'Biographie' },
  'Poesía': { es: 'Poesía', en: 'Poetry', fr: 'Poésie' }
};

export function getTranslatedBook(book: Book, language: 'es' | 'en' | 'fr'): Book {
  const translation = bookTranslations[book.id]?.[language];
  if (!translation) return book;

  return {
    ...book,
    title: translation.title,
    description: translation.description,
    category: translation.category
  };
}

export function getTranslatedCategory(category: string, language: 'es' | 'en' | 'fr'): string {
  return categoryTranslations[category]?.[language] || category;
}