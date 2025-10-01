import { Invoice, Order, CompanyInfo } from '../types';

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2025-001',
    customerName: 'María García',
    customerEmail: 'maria.garcia@email.com',
    date: '2025-01-15',
    dueDate: '2025-02-14',
    items: [
      {
        bookId: '1',
        bookTitle: 'El Quijote de la Mancha',
        quantity: 2,
        unitPrice: 24.99,
        total: 49.98
      },
      {
        bookId: '5',
        bookTitle: 'El Hobbit',
        quantity: 1,
        unitPrice: 21.99,
        total: 21.99
      }
    ],
    subtotal: 71.97,
    tax: 7.20,
    total: 79.17,
    status: 'paid',
    paymentMethod: 'Tarjeta de Crédito'
  },
  {
    id: '2',
    invoiceNumber: 'INV-2025-002',
    customerName: 'Carlos Rodríguez',
    customerEmail: 'carlos.rodriguez@email.com',
    date: '2025-01-16',
    dueDate: '2025-02-15',
    items: [
      {
        bookId: '2',
        bookTitle: 'Cien Años de Soledad',
        quantity: 1,
        unitPrice: 22.95,
        total: 22.95
      }
    ],
    subtotal: 22.95,
    tax: 2.30,
    total: 25.25,
    status: 'pending'
  },
  {
    id: '3',
    invoiceNumber: 'INV-2025-003',
    customerName: 'Ana López',
    customerEmail: 'ana.lopez@email.com',
    date: '2025-01-10',
    dueDate: '2025-02-09',
    items: [
      {
        bookId: '6',
        bookTitle: 'Sapiens',
        quantity: 3,
        unitPrice: 25.99,
        total: 77.97
      }
    ],
    subtotal: 77.97,
    tax: 7.80,
    total: 85.77,
    status: 'overdue'
  }
];

export const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2025-001',
    customerName: 'Pedro Martínez',
    customerEmail: 'pedro.martinez@email.com',
    customerPhone: '+34 666 123 456',
    shippingAddress: 'Calle Mayor 123, 28001 Madrid, España',
    orderDate: '2025-01-17',
    expectedDelivery: '2025-01-20',
    items: [
      {
        bookId: '4',
        bookTitle: 'Orgullo y Prejuicio',
        bookAuthor: 'Jane Austen',
        quantity: 1,
        unitPrice: 19.99,
        total: 19.99
      },
      {
        bookId: '7',
        bookTitle: 'El Código Da Vinci',
        bookAuthor: 'Dan Brown',
        quantity: 2,
        unitPrice: 16.99,
        total: 33.98
      }
    ],
    subtotal: 53.97,
    shipping: 5.99,
    tax: 5.40,
    total: 65.36,
    status: 'processing',
    trackingNumber: 'TRK123456789',
    notes: 'Entrega en horario de mañana'
  },
  {
    id: '2',
    orderNumber: 'ORD-2025-002',
    customerName: 'Laura Fernández',
    customerEmail: 'laura.fernandez@email.com',
    customerPhone: '+34 677 987 654',
    shippingAddress: 'Avenida de la Paz 45, 08001 Barcelona, España',
    orderDate: '2025-01-18',
    expectedDelivery: '2025-01-22',
    items: [
      {
        bookId: '8',
        bookTitle: 'Atomic Habits',
        bookAuthor: 'James Clear',
        quantity: 1,
        unitPrice: 23.50,
        total: 23.50
      }
    ],
    subtotal: 23.50,
    shipping: 0.00,
    tax: 2.35,
    total: 25.85,
    status: 'shipped',
    trackingNumber: 'TRK987654321'
  },
  {
    id: '3',
    orderNumber: 'ORD-2025-003',
    customerName: 'Roberto Silva',
    customerEmail: 'roberto.silva@email.com',
    customerPhone: '+34 655 111 222',
    shippingAddress: 'Plaza del Sol 12, 41001 Sevilla, España',
    orderDate: '2025-01-19',
    expectedDelivery: '2025-01-23',
    items: [
      {
        bookId: '1',
        bookTitle: 'El Quijote de la Mancha',
        bookAuthor: 'Miguel de Cervantes',
        quantity: 1,
        unitPrice: 24.99,
        total: 24.99
      },
      {
        bookId: '2',
        bookTitle: 'Cien Años de Soledad',
        bookAuthor: 'Gabriel García Márquez',
        quantity: 1,
        unitPrice: 22.95,
        total: 22.95
      }
    ],
    subtotal: 47.94,
    shipping: 5.99,
    tax: 4.79,
    total: 58.72,
    status: 'delivered'
  }
];

export const mockCompanyInfo: CompanyInfo = {
  name: 'Perez Galdos S.L.',
  address: 'Calle Hortaleza 5, 28004 Madrid, España',
  phone: '+34 91 531 26 40',
  email: 'info@libreriaonline.com',
  website: 'www.perezgaldos.es',
  taxId: 'B12345678',
  logo: 'https://images.pexels.com/photos/159866/books-book-pages-read-literature-159866.jpeg?auto=compress&cs=tinysrgb&w=200'
};