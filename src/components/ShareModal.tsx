import React, { useState } from 'react';
import { X, Facebook, Twitter, Mail, MessageCircle, Copy, Check } from 'lucide-react';
import { Book } from '../types';
import '../styles/components/ShareModal.css';

interface ShareModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ book, isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const bookUrl = `${window.location.origin}/libro/${book.id}`;
  const shareText = `¡Mira este libro increíble! "${book.title}" por ${book.author} - Solo $${book.price}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      className: 'facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookUrl)}`
    },
    {
      name: 'Twitter',
      icon: Twitter,
      className: 'twitter',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(bookUrl)}`
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      className: 'whatsapp',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${bookUrl}`)}`
    },
    {
      name: 'Email',
      icon: Mail,
      className: 'email',
      url: `mailto:?subject=${encodeURIComponent(`Te recomiendo: ${book.title}`)}&body=${encodeURIComponent(`${shareText}\n\nVer más: ${bookUrl}`)}`
    }
  ];

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3 className="share-modal-title">Compartir Libro</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="book-info">
          <div className="book-cover">
            <img src={book.coverImage} alt={book.title} />
          </div>
          <div className="book-details">
            <h4 className="book-title">{book.title}</h4>
            <p className="book-author">por {book.author}</p>
            <p className="book-price">${book.price}</p>
          </div>
        </div>

        <div className="share-options">
          {shareOptions.map((option) => {
            const Icon = option.icon;
            return (
              <a
                key={option.name}
                href={option.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`share-option ${option.className}`}
              >
                <div className="share-icon">
                  <Icon size={20} />
                </div>
                <span>{option.name}</span>
              </a>
            );
          })}
        </div>

        <div className="copy-link">
          <button 
            onClick={handleCopyLink}
            className={`copy-link-btn ${copied ? 'copied' : ''}`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Enlace copiado' : 'Copiar enlace'}
          </button>
        </div>
      </div>
    </div>
  );
}